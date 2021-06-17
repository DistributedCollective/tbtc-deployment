import program from "commander"

const getProgram = () => {
    program
        .option('--bitcoin-electrum-host <host>', "electrum server host", "18.116.199.63")
        .option('--bitcoin-electrum-port <port>', "electrum server port", (port) => parseInt(port, 10), 9020)
        .option('--bitcoin-network <network>', "type of the bitcoin network (\"regtest\"|\"testnet\")", "testnet")
        .option('--bitcoin-depositor-pk <privateKey>', "private key of the Bitcoin depositor in WIF format", "cUpZKHNPuJ8KAdsRTyB7N1yFRjDajTfHQ8Z4xcjQQ3HyHbttwcbW")
        .option('--ethereum-node <url>', "ethereum node url", "wss://testnet.sovryn.app/ws")
        .option('--ethereum-pk <privateKey>', "private key of ethereum account", "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd")
        .option('--lot-size-satoshis <lot>', "lot size in satoshis", (lot) => parseInt(lot, 10), 1000000)

    return program
}

export default getProgram
