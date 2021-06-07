#!/bin/sh
set -e

WORKDIR=$PWD

./install-repositories.sh

MOUNT_PATH=/data
P2P_PORT_CORE=3920
P2P_PORT_ECDSA=3921
P2P_PEERS_ARRAY=[]


RSK_NODE_URL=wss://testnet.sovryn.app/ws
RSK_NODE_PORT=443

VERSION=1.0
REVISION=1
IMAGE_NAME=tbtc_app:$VERSION
docker build --build-arg VERSION=$VERSION --build-arg REVISION=$REVISION -t $IMAGE_NAME .

mkdir -p $MOUNT_PATH/core
docker run --restart=always -d \
    -e CORE_MODE=1 \
    -e P2P_PORT_CORE=$P2P_PORT \
    -e P2P_PEERS_ARRAY=$P2P_PEERS_ARRAY \
    -e RSK_NODE_PORT=$RSK_NODE_PORT \
    -e RSK_NODE_URL=$RSK_NODE_URL \
    -e OPERATOR_KEY=$OPERATOR_KEY \
    --mount type=bind,source=$MOUNT_PATH/core,target=/data \
    --mount type=bind,source=~/.aws,target=/root/.aws $IMAGE_NAME 

mkdir -p $MOUNT_PATH/ecdsa
docker run --restart=always -d \
    -e P2P_PORT_ECDSA=$P2P_PORT \
    -e P2P_PEERS_ARRAY=$P2P_PEERS_ARRAY \
    -e RSK_NODE_PORT=$RSK_NODE_PORT \
    -e RSK_NODE_URL=$RSK_NODE_URL \
    -e OPERATOR_KEY=$OPERATOR_KEY \
    --mount type=bind,source=$MOUNT_PATH/ecdsa,target=/data \
    --mount type=bind,source=~/.aws,target=/root/.aws $IMAGE_NAME 

cd $WORKDIR