#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import {BitcoinHelpers} from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {assertMintedTbtcAmount, assertTbtcAccountBalance, assertBtcBalance} from "./assertions.js";
import {getTBTCTokenBalance, getBtcBalance} from "./common.js";
import bcoin from "bcoin"
import wif from "wif"

const bitcoinElectrumHost = "127.0.0.1"
const bitcoinElectrumPort = 50003
const bitcoinNetwork = "regtest"
const bitcoinDepositorPrivateKey = "cTj6Z9fxMr4pzfpUhiN8KssVzZjgQz9zFCfh87UrH8ZLjh3hGZKF"
const bitcoinRedeemerPrivateKey = "cPvsaHbYdoPDTrPymWwxAhahz9cRT75Mp6bcQPnP6JyccN4qrTif"

const ethereumHost = "127.0.0.1"
const ethereumPort = 8546
const ethereumPrivateKey = "f95e1da038f1fd240cb0c966d8826fb5c0369407f76f34736a5c381da7ca0ecd"

const depositsCount = 2
const satoshiLotSize = 100000 // 0.001 BTC
const signerFeeDivisor = 0.0005 // 0.05%
const tbtcDepositAmount = 1000000000000000 // satoshiLotSize * satoshiMultiplier
const signerFee = signerFeeDivisor * tbtcDepositAmount
const tbtcDepositAmountMinusSignerFee = tbtcDepositAmount - signerFee
const satoshiRedemptionFee = 150

bcoin.set(bitcoinNetwork)

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
    new Subproviders.PrivateKeyWalletSubprovider(ethereumPrivateKey)
)
engine.addProvider(
    new WebsocketSubprovider({rpcUrl: `ws://${ethereumHost}:${ethereumPort}`})
)

const web3 = new Web3(engine)

engine.start()

async function run() {
    // Set first account as the default account.
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

    const tbtc = await TBTC.withConfig({
        web3: web3,
        bitcoinNetwork: bitcoinNetwork,
        electrum: {
            testnetWS: {
                server: bitcoinElectrumHost,
                port: bitcoinElectrumPort,
                protocol: "ws"
            }
        }
    })

    const bitcoinWalletDB = new bcoin.WalletDB({db: 'memory'})
    await bitcoinWalletDB.open()
    const bitcoinWallet = await bitcoinWalletDB.create()

    const bitcoinDepositorKeyRing = await importBitcoinPrivateKey(
        bitcoinWallet,
        bitcoinDepositorPrivateKey

    )

    // TODO: Try to generate a new address for each redemption.
    const bitcoinRedeemerKeyRing = await importBitcoinPrivateKey(
        bitcoinWallet,
        bitcoinRedeemerPrivateKey
    )

    const initialTbtcAccountBalance = await getTBTCTokenBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount
    )

    console.log(
        `Initial TBTC balance for account ${web3.eth.defaultAccount} ` +
        `is: ${initialTbtcAccountBalance}`
    )

    const deposits = []
    for (let i = 1; i <= depositsCount; i++) {
        console.log(`\nStarting deposit number [${i}]...\n`)
        const deposit = await createDeposit(tbtc, satoshiLotSize, bitcoinDepositorKeyRing)
        deposits.push(deposit)

        assertMintedTbtcAmount(web3, deposit, tbtcDepositAmountMinusSignerFee)

        // check whether signer fee went to the expected address
        await assertTbtcAccountBalance(web3, tbtc, deposit.address, signerFee)

        console.log(`\nDeposit ${deposit.address} has been created successfully.`)
    }

    const afterDepositsTbtcAccountBalance = initialTbtcAccountBalance.add(
        web3.utils.toBN(depositsCount).mul(
            web3.utils.toBN(tbtcDepositAmountMinusSignerFee)
        )
    )

    console.log(
        `TBTC balance for account ${web3.eth.defaultAccount} after ` +
        `performing deposits should be: ${afterDepositsTbtcAccountBalance}. ` +
        `Checking assertion...`
    )

    await assertTbtcAccountBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount,
        afterDepositsTbtcAccountBalance
    )

    console.log(`\nStarting redemption of the first deposit...\n`)
    const redeemerAddress = bitcoinRedeemerKeyRing.getAddress("string")
    console.log(`Using reedemer address: ${redeemerAddress}`)

    const beforeRedemptionBtcBalance = await getBtcBalance(web3, BitcoinHelpers, redeemerAddress)

    const message = await redeemDeposit(tbtc, deposits[0].address, redeemerAddress)
    console.log(`\nRedemption outcome: ${message}\n`)

    const afterRedemptionTbtcAccountBalance = afterDepositsTbtcAccountBalance.sub(
        web3.utils.toBN(tbtcDepositAmount)
    )

    console.log(
        `TBTC balance for account ${web3.eth.defaultAccount} after ` +
        `performing redemption should be: ${afterRedemptionTbtcAccountBalance}. ` +
        `Checking assertion...`
    )

    await assertTbtcAccountBalance(
        web3,
        tbtc,
        web3.eth.defaultAccount,
        afterRedemptionTbtcAccountBalance
    )

    const afterRedemptionBtcBalance = beforeRedemptionBtcBalance.add(
        web3.utils.toBN(satoshiLotSize).sub(web3.utils.toBN(satoshiRedemptionFee))
    )

    console.log(
        `BTC balance for redeemer address ${redeemerAddress} after ` +
        `performing redemption should be: ${afterRedemptionBtcBalance}. ` +
        `Checking assertion...`
    )

    await assertBtcBalance(
        web3,
        BitcoinHelpers,
        redeemerAddress,
        afterRedemptionBtcBalance
    )
}

async function createDeposit(tbtc, satoshiLotSize, keyRing) {
    const deposit = await tbtc.Deposit.withSatoshiLotSize(
        web3.utils.toBN(satoshiLotSize)
    )

    deposit.autoSubmit()

    return new Promise(async (resolve, reject) => {
        deposit.onBitcoinAddressAvailable(async address => {
            try {
                const lotSize = await deposit.getSatoshiLotSize()
                console.log(
                    "\tGot deposit address:",
                    address,
                    "; fund with:",
                    lotSize.toString(),
                    "satoshis please."
                )
                console.log("Now monitoring for deposit transaction...")

                await sendBitcoinTransaction(address, lotSize, keyRing)

                console.log("Deposit transaction sent")
            } catch (err) {
                reject(err)
            }
        })

        deposit.onActive(async () => {
            try {
                console.log("Deposit is active, minting...")
                const tbtcAmount = await deposit.mintTBTC()

                resolve({
                    address: deposit.address,
                    tbtcAmount: tbtcAmount,
                })
            } catch (err) {
                reject(err)
            }
        })
    })
}

async function importBitcoinPrivateKey(wallet, privateKey) {
    const decodedPrivateKey = wif.decode(privateKey);

    const keyRing = new bcoin.KeyRing({
        witness: true,
        privateKey: decodedPrivateKey.privateKey,
        compressed: decodedPrivateKey.compressed
    });

    await wallet.importKey(0, keyRing)

    return keyRing
}

async function sendBitcoinTransaction(targetAddress, amount, keyRing) {
    const sourceAddress = keyRing.getAddress("string");

    console.log(`Sending transaction from ${sourceAddress} to ${targetAddress}`)

    const utxos = await BitcoinHelpers.Transaction.findAll(sourceAddress)

    const coins = []
    let coinsAmount = 0

    // Start from the oldest UTXO.
    for (const utxo of utxos.reverse()) {
        // Make sure the selected coins amount covers the 110% of the amount.
        // The additional 10% is taken as a big reserve to make sure that input
        // coins will cover the transaction fee.
        if (coinsAmount >= 1.1 * amount.toNumber()) {
            break
        }

        const tx = await BitcoinHelpers.withElectrumClient(async electrumClient => {
            return electrumClient.getTransaction(utxo.transactionID)
        })

        coins.push(bcoin.Coin.fromTX(
            bcoin.MTX.fromRaw(tx.hex, 'hex'),
            utxo.outputPosition,
            -1
        ))

        coinsAmount += utxo.value
    }

    const transaction = new bcoin.MTX()

    transaction.addOutput({
        script: bcoin.Script.fromAddress(targetAddress),
        value: amount.toNumber(),
    })

    await transaction.fund(
        coins,
        {
            rate: await estimateBitcoinTransactionRate(),
            changeAddress: sourceAddress,
        }
    )

    transaction.sign(keyRing)

    const broadcastOutcome = await BitcoinHelpers.Transaction.broadcast(
        transaction.toRaw().toString('hex')
    )

    console.log(`Transaction ${broadcastOutcome.transactionID} sent`)
}

async function estimateBitcoinTransactionRate() {
    try {
        return await BitcoinHelpers.Transaction.estimateFeePerKb()
    } catch (e) {
        return null
    }
}

async function redeemDeposit(tbtc, depositAddress, redeemerAddress) {
    return new Promise(async (resolve, reject) => {
        try {
            const deposit = await tbtc.Deposit.withAddress(depositAddress)
            const redemption = await deposit.requestRedemption(redeemerAddress)
            redemption.autoSubmit()

            redemption.onWithdrawn(transactionID => {
                console.log()

                resolve(
                    `Redeemed deposit ${deposit.address} with Bitcoin transaction ` +
                    `${transactionID}.`
                )
            })
        } catch (err) {
            reject(err)
        }
    })
}

run()
    .then(result => {
        console.log("Test completed successfully")

        process.exit(0)
    })
    .catch(error => {
        console.error("Test errored out with error: ", error)

        process.exit(1)
    })