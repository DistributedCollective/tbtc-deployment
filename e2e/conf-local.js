import program from "commander"

const getProgram = () => {
    program
        .option('--bitcoin-electrum-host <host>', "electrum server host", "127.0.0.1")
        .option('--bitcoin-electrum-port <port>', "electrum server port", (port) => parseInt(port, 10), 50003)
        .option('--bitcoin-network <network>', "type of the bitcoin network (\"regtest\"|\"testnet\")", "regtest")
        .option('--bitcoin-depositor-pk <privateKey>', "private key of the Bitcoin depositor in WIF format", "cTj6Z9fxMr4pzfpUhiN8KssVzZjgQz9zFCfh87UrH8ZLjh3hGZKF")
        .option('--ethereum-node <url>', "ethereum node url", "ws://127.0.0.1:8546")
        .option('--ethereum-pk <privateKey>', "private key of ethereum account", "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd")
        .option('--lot-size-satoshis <lot>', "lot size in satoshis", (lot) => parseInt(lot, 10), 1000000)
  
    return program
}

export default getProgram
