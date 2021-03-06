#!/usr/bin/env node --experimental-modules

import Web3 from "web3"
import ProviderEngine from "web3-provider-engine"
import WebsocketSubprovider from "web3-provider-engine/subproviders/websocket.js"
import TBTC from "@keep-network/tbtc.js"
import {BitcoinHelpers} from "@keep-network/tbtc.js"
import Subproviders from "@0x/subproviders"
import {
    assertMintedTbtcAmount,
    assertTbtcAccountBalance,
    assertBtcBalance
} from "./assertions.js";
import {
    getTBTCTokenBalance,
    getBtcBalance,
    importBitcoinPrivateKey,
    generateBitcoinPrivateKey,
    sendBitcoinTransaction,
    returnBitcoinToDepositor
} from "./common.js";
import bcoin from "bcoin"
import wif from "wif"
import localProgram from "./conf-local.js"
import testnetProgram from "./conf-testnet.js"

let program

if(process.env.DEST_NETWORK === "local") {
    program = localProgram()
} else if(process.env.DEST_NETWORK === "sov") {
    program = testnetProgram()
} else {
    console.error(`err: cannot find config for ${process.env.DEST_NETWORK} network`)
    process.exit(1)
}

program.parse(process.argv)

console.log("\nScript options values: ", program.opts(), "\n")

const depositsCount = 2
const signerFeeDivisor = 0.001 // 0.1%
const satoshiMultiplier = 10000000000 // 10^10
const tbtcDepositAmount = program.lotSizeSatoshis * satoshiMultiplier
const signerFee = signerFeeDivisor * tbtcDepositAmount
const tbtcDepositAmountMinusSignerFee = tbtcDepositAmount - signerFee
const satoshiRedemptionFee = 2700

bcoin.set(program.bitcoinNetwork)

const engine = new ProviderEngine({ pollingInterval: 1000 })

engine.addProvider(
    new Subproviders.PrivateKeyWalletSubprovider(program.ethereumPk)
)
engine.addProvider(
    new WebsocketSubprovider({rpcUrl: program.ethereumNode})
)

const web3 = new Web3(engine)

engine.start()

async function run() {
    // Set first account as the default account.
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

    const tbtc = await TBTC.withConfig({
        web3: web3,
        bitcoinNetwork: program.bitcoinNetwork,
        electrum: {
            server: program.bitcoinElectrumHost,
            port: program.bitcoinElectrumPort,
            protocol: "ws"
        }
    })

    const bitcoinWalletDB = new bcoin.WalletDB({db: 'memory'})
    await bitcoinWalletDB.open()
    const bitcoinWallet = await bitcoinWalletDB.create()

    const bitcoinDepositorKeyRing = await importBitcoinPrivateKey(
        bcoin,
        wif,
        bitcoinWallet,
        program.bitcoinDepositorPk
    )

    const bitcoinRedeemerKeyRing = await generateBitcoinPrivateKey(
        bcoin,
        bitcoinWallet
    )

    const initialTbtcAccountBalance = await getTBTCTokenBalance(
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
        const deposit = await createDeposit(tbtc, program.lotSizeSatoshis, bitcoinDepositorKeyRing)
        deposits.push(deposit)

        assertMintedTbtcAmount(deposit.tbtcAmount, tbtcDepositAmountMinusSignerFee)

        const actualTbtcBalanceBn = await getTBTCTokenBalance(tbtc, deposit.address)
        // check whether signer fee went to the expected address
        await assertTbtcAccountBalance(deposit.address, actualTbtcBalanceBn, signerFee)

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

    let actualTbtcBalanceBn = await getTBTCTokenBalance(tbtc, web3.eth.defaultAccount)
    await assertTbtcAccountBalance(
        web3.eth.defaultAccount,
        actualTbtcBalanceBn,
        afterDepositsTbtcAccountBalance
    )

    console.log(`\nStarting redemption of the first deposit...\n`)
    const redeemerAddress = bitcoinRedeemerKeyRing.getAddress("string")
    console.log(`Using redeemer address: ${redeemerAddress}`)

    const beforeRedemptionBtcBalance = await getBtcBalance(BitcoinHelpers, redeemerAddress)

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

    actualTbtcBalanceBn = await getTBTCTokenBalance(tbtc, web3.eth.defaultAccount)
    await assertTbtcAccountBalance(
        web3.eth.defaultAccount,
        actualTbtcBalanceBn,
        afterRedemptionTbtcAccountBalance
    )

    const afterRedemptionBtcBalance = beforeRedemptionBtcBalance.add(
        web3.utils.toBN(program.lotSizeSatoshis).sub(web3.utils.toBN(satoshiRedemptionFee))
    )

    console.log(
        `BTC balance for redeemer address ${redeemerAddress} after ` +
        `performing redemption should be: ${afterRedemptionBtcBalance}. ` +
        `Checking assertion...`
    )

    await assertBtcBalance(
        BitcoinHelpers,
        redeemerAddress,
        afterRedemptionBtcBalance
    )

    console.log(`\nReturning redeemed bitcoins to the depositor...\n`)

    await returnBitcoinToDepositor(
        bcoin,
        BitcoinHelpers,
        bitcoinDepositorKeyRing,
        bitcoinRedeemerKeyRing
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
                const lotSize = await deposit.getLotSizeSatoshis()
                console.log(
                    "\tGot deposit address:",
                    address,
                    "; fund with:",
                    lotSize.toString(),
                    "satoshis please."
                )
                console.log("Now monitoring for deposit transaction...")

                await sendBitcoinTransaction(
                    bcoin,
                    BitcoinHelpers,
                    address,
                    lotSize,
                    keyRing
                )

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