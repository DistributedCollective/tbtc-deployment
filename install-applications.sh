#!/bin/bash

set -e

if [[ -z "${BTC_NETWORK}" ]]; then
  echo "BTC_NETWORK env not set. Exiting"
  exit 1
else
  echo "Using network ${BTC_NETWORK}"
fi

if [[ -z "${DEST_NETWORK}" ]]; then
  echo "DEST_NETWORK env not set. Exiting"
  exit 1
else
  echo "Using network ${DEST_NETWORK}"
fi

# Install KEEP-CORE.
./install-keep-core.sh

# Install KEEP-ECDSA.
./install-keep-ecdsa.sh

# Install tBTC.
./install-tbtc.sh

# Install tBTC dApp.
./install-tbtc-dapp.sh

# Do not install keep dashboard dApp for e2e nightly test
if [[ $E2E_TEST != true ]]
then
    # Install Keep Dashboard.
    ./install-keep-dashboard.sh
fi
