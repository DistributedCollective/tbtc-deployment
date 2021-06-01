#!/bin/bash

docker run -m 2048m -e P2P_PORT=3920 -e P2P_PEERS_ARRAY=[] -e RSK_NODE_PORT=443 -e RSK_NODE_URL=wss://testnet.sovryn.app/ws -e OPERATOR_KEY=7a44401e3585f9d177b7ef8dfd6573d420018268a6e35c8a277668deee055fb6  --mount type=bind,source=/home/michal/Documents/ecdsa/data,target=/data 7a62e4f424ab
