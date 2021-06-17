#!/bin/bash

set -e

if [[ -z "${DEST_NETWORK}" ]]; then
  echo "DEST_NETWORK env not set. Exiting"
  exit 1
else
  echo "Using network ${DEST_NETWORK}"
fi

cd e2e

npm install --package-lock=false

node --experimental-json-modules e2e-test.js