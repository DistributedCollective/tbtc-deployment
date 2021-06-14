FROM python:3.7-alpine3.11

COPY ./bin /usr/local/bin

RUN chmod a+x /usr/local/bin/* && \
    apk add --no-cache git build-base openssl && \
    apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.11/main leveldb-dev && \
    apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing rocksdb-dev && \
    pip install aiohttp pylru plyvel websockets python-rocksdb uvloop

RUN git clone https://github.com/liamzebedee/electrumx

RUN cd electrumx && \
    python setup.py install && \
    apk del git build-base && \
    rm -rf /tmp/*

ENV HOME /data
ENV EVENT_LOOP_POLICY uvloop
ENV ALLOW_ROOT 1
ENV DB_DIRECTORY /data/db
ENV SSL_CERTFILE ${DB_DIRECTORY}/electrumx.crt
ENV SSL_KEYFILE ${DB_DIRECTORY}/electrumx.key
ENV HOST ""
WORKDIR /data

CMD ["init"]