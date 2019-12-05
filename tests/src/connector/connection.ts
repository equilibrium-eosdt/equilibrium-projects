import {ExchangeContract} from "@equilab/exchange"
import {Api, JsonRpc} from "eosjs"
import {JsSignatureProvider} from "eosjs/dist/eosjs-jssig"
import Fetch from "node-fetch"
import {TextDecoder, TextEncoder} from "text-encoding"
import {
    eosdtTokenAcc,
    eosioAcc,
    exchangeAcc,
    lolManagerAcc,
    managerAcc,
    nutManagerAcc,
    nutTokenAcc,
    oracleAcc,
    testAccounts,
} from "../params/accounts"
import {localNode} from "../params/config"

const fetch: any = Fetch // Workaround to avoid incompatibility of fetch types in 'eosjs' and 'node-fetch'
export const rpcInstance = new JsonRpc(localNode.address, {fetch})

const privateKeys = [
    exchangeAcc.privateKey,
    eosioAcc.privateKey,
    managerAcc.privateKey,
    nutManagerAcc.privateKey,
    lolManagerAcc.privateKey,
    eosdtTokenAcc.privateKey,
    nutTokenAcc.privateKey,
    oracleAcc.privateKey,
    ...testAccounts.map(acc => acc.privateKey),
]

const signatureProvider = new JsSignatureProvider(privateKeys)

export const apiInstance = new Api({
    rpc: rpcInstance,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
})

export const eqExchangeWrapper = new ExchangeContract({rpc: rpcInstance, api: apiInstance})
