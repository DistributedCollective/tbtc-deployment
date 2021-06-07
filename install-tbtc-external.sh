#!/bin/sh
set -e

WORKDIR=$PWD

sudo apt-get install -y git docker docker-compose

git clone --depth 1 https://github.com/DistributedCollective/tbtc-deployment.git tbtc-deployment

cd tbtc-deployment
./install-tbtc-apps.sh

cd $PWD