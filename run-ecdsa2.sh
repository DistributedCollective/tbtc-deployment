#!/bin/bash

docker run -m 2048m -e P2P_PORT=3920 -e P2P_PEERS_ARRAY=["/ip4/127.0.0.1/tcp/3920/ipfs/16Uiu2HAm7VzUmEhEXnEVgQqZ4CkLbmQz92TqrFdbdCeery5ABzVT"] -e RSK_NODE_PORT=443 -e RSK_NODE_URL=wss://testnet.sovryn.app/ws -e OPERATOR_KEY=5016fa7c77006fb268e1b37ea1166fbbec2e20197dee54c7a57b36af11f29c89  --mount type=bind,source=/home/michal/Documents/ecdsa/data2,target=/data 7a62e4f424ab
