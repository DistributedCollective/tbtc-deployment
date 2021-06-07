#!/bin/bash
set -e

WORKDIR=$PWD

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

echo "Building tbtc-app..."
docker build -t sovryn/tbtc-app:${VERSION} --build-arg VERSION=${VERSION} --build-arg REVISION=${REVISION} .
docker push sovryn/tbtc-app:${VERSION}

cd $WORKDIR
