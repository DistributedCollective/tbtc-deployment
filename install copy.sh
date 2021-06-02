#!/bin/bash

set -e

WORKDIR=$PWD

git clone --depth 1 git@github.com:DistributedCollective/keep-ecdsa.git || true 
git clone --depth 1 git@github.com:DistributedCollective/keep-core.git || true 
git clone --depth 1 git@github.com:DistributedCollective/tbtc.git || true 



cd keep-core/solidity
rm -rf node_modules package-lock.json
npm install --production

cd $WORKDIR
cd keep-ecdsa/solidity
rm -rf node_modules package-lock.json
npm install --production

cd $WORKDIR
cd tbtc/solidity
rm -rf node_modules package-lock.json
npm install --production

cd $WORKDIR

