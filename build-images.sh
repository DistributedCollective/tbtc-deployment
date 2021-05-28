#!/bin/bash
set -e

VERSION=$1
REVISION=$2

if [ -z "$VERSION" ]; then
    echo "ERROR: please provide the VERSION as first cmd arg."
    exit 1
fi

if [ -z "$REVISION" ]; then
    echo "ERROR: please provide the REVISION as first cmd arg."
    exit 1
fi

echo "Building tbtc-core..."
cd keep-core
docker build -t sovryn/tbtc-core:${version} --build-arg VERSION=${version} --build-arg REVISION=${revision} .
docker push sovryn/tbtc-core:$version
cd ..

echo "Building tbtc-ecdsa..."
cd keep-ecdsa
docker build -t sovryn/tbtc-ecdsa:$version --build-arg VERSION=${version} --build-arg REVISION=${revision} .
docker push sovryn/tbtc-ecdsa:$version
cd ..