FROM golang:1.13.6-alpine3.10 AS gobuild

ARG VERSION
ARG REVISION

ENV GOPATH=/go \
	GOBIN=/go/bin \
	APP_NAME_CORE=keep-core \
	APP_NAME_ECDSA=keep-ecdsa \
	APP_DIR_CORE=keep-core \
	APP_DIR_ECDSA=keep-ecdsa \
	BIN_PATH=/usr/local/bin \
	LD_LIBRARY_PATH=/usr/local/lib/ \
	GO111MODULE=on

RUN apk add --update --no-cache \
	g++ \
	linux-headers \
	protobuf \
	jq \
	git \
  nodejs \
  npm \
	make \
	python && \
	rm -rf /var/cache/apk/ && mkdir /var/cache/apk/ && \
	rm -rf /usr/share/man

COPY --from=ethereum/solc:0.5.17 /usr/bin/solc /usr/bin/solc


WORKDIR /app

COPY . .

RUN ./fix-links.sh

RUN cd $APP_DIR_ECDSA && go mod download

RUN cd /go/pkg/mod/github.com/gogo/protobuf@v1.3.1/protoc-gen-gogoslick && go install .
RUN cd /go/pkg/mod/github.com/ethereum/go-ethereum@v1.9.10/cmd/abigen && go install .

RUN cd $APP_DIR_ECDSA && export PATH=$PATH:$GOPATH/bin && GOOS=linux go generate ./...


RUN cd $APP_DIR_ECDSA && GOOS=linux go build -ldflags "-X main.version=$VERSION -X main.revision=$REVISION" -a -o $APP_NAME_ECDSA ./ && \
	mv $APP_NAME_ECDSA $BIN_PATH

RUN cd $APP_DIR_CORE && GOOS=linux go build -ldflags "-X main.version=$VERSION -X main.revision=$REVISION" -a -o $APP_NAME_CORE ./ && \
	mv $APP_NAME_CORE $BIN_PATH



FROM node:15-alpine

ENV APP_NAME_CORE=keep-core \
	APP_NAME_ECDSA=keep-ecdsa \
	BIN_PATH=/usr/local/bin

RUN apk add --update --no-cache git geth jq curl python3 && ln -sf python3 /usr/bin/python


ENV GLIBC_VER=2.31-r0
RUN apk --no-cache add \
        binutils \
    && curl -sL https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub -o /etc/apk/keys/sgerrand.rsa.pub \
    && curl -sLO https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VER}/glibc-${GLIBC_VER}.apk \
    && curl -sLO https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VER}/glibc-bin-${GLIBC_VER}.apk \
    && curl -sLO https://github.com/sgerrand/alpine-pkg-glibc/releases/download/${GLIBC_VER}/glibc-i18n-${GLIBC_VER}.apk \
    && apk add --no-cache \
        glibc-${GLIBC_VER}.apk \
        glibc-bin-${GLIBC_VER}.apk \
        glibc-i18n-${GLIBC_VER}.apk \
    && /usr/glibc-compat/bin/localedef -i en_US -f UTF-8 en_US.UTF-8 \
    && curl -sL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip \
    && unzip awscliv2.zip \
    && aws/install \
    && rm -rf \
        awscliv2.zip \
        aws \
        /usr/local/aws-cli/v2/*/dist/aws_completer \
        /usr/local/aws-cli/v2/*/dist/awscli/data/ac.index \
        /usr/local/aws-cli/v2/*/dist/awscli/examples \
        glibc-*.apk \
    && apk --no-cache del \
        binutils \
    && rm -rf /var/cache/apk/*

RUN npm i -g pm2

WORKDIR /

COPY --from=gobuild $BIN_PATH/$APP_NAME_CORE $BIN_PATH
COPY --from=gobuild $BIN_PATH/$APP_NAME_ECDSA $BIN_PATH

COPY ./keep-core/configs/config.local.1.toml ./config-core.toml
COPY ./keep-ecdsa/configs/config.local.1.toml ./config-ecdsa.toml
COPY entrypoint.sh .

RUN git clone https://github.com/rumblefishdev/tbtc-rsk-proxy.git proxy
RUN cd proxy/node-http-proxy && npm install
RUN cd proxy && npm install

ENTRYPOINT ["./entrypoint.sh"]

# docker caches more when using CMD [] resulting in a faster build.
CMD []
