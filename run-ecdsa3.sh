#!/bin/bash

docker run -m 2048m -e P2P_PORT=3920 -e P2P_PEERS_ARRAY=["/ip4/127.0.0.1/tcp/3920/ipfs/16Uiu2HAm7VzUmEhEXnEVgQqZ4CkLbmQz92TqrFdbdCeery5ABzVT"] -e RSK_NODE_PORT=443 -e RSK_NODE_URL=wss://testnet.sovryn.app/ws -e OPERATOR_KEY=dbae2e8845522660a3ecf276d2ea780fa7aef7c3e5d6bcc7acd02514dfb8799e  --mount type=bind,source=/home/michal/Documents/ecdsa/data3,target=/data 7a62e4f424ab
