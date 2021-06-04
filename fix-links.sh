#!/bin/sh

# tbtc => ecdsa => core

set -e

NODE_ENV=production
WORKDIR=$PWD

cd keep-core/solidity
jq "del(.devDependencies)" ./package.json > package2.json
mv package2.json package.json
npm link --package-lock=false

cd $WORKDIR
cd keep-ecdsa/solidity
jq "del(.devDependencies)" ./package.json > package2.json
mv package2.json package.json
npm link --package-lock=false
npm link @keep-network/keep-core

cd $WORKDIR
cd tbtc/solidity
jq "del(.devDependencies)" ./package.json > package2.json
mv package2.json package.json
npm install --package-lock=false
npm link @keep-network/keep-ecdsa

cd $WORKDIR

for d in $(find . -type d  -print | grep  node_modules/@keep-network$)
do
  for destination in $(find $WORKDIR${d#.} -maxdepth 2 -type l)
  do
    source=$(readlink -f $destination)
    printf "Replacing $destination link with $source...\n\n"

    rm $destination
    cp -r $source/. $destination
  done
  cd $WORKDIR
done
