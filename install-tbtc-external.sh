#!/bin/sh
set -e

WORKDIR=$PWD

sudo apt-get install -y git docker docker-compose unzip

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws

git clone --depth 1 https://github.com/DistributedCollective/tbtc-deployment.git tbtc-deployment

cd tbtc-deployment
./install-tbtc-apps.sh

cd $PWD