#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color

WORKDIR=$PWD

printf "${LOG_START}Building Keep Dashboard...${LOG_END}"

cd $WORKDIR/keep-core/solidity/dashboard

npm run build

printf "${LOG_START}Building docker...${LOG_END}"

docker-compose build keep-dashboard

printf "${LOG_START}Starting docker...${LOG_END}"

docker-compose up keep-dashboard
