import {Token} from "../interfaces/tokens"
import {eosioAcc} from "./accounts"

export const tokensObject: {[tokenSymbol: string]: Token} = {
    EOSDT: {
        symbol: "EOSDT",
        decimals: 9,
        rate: "4.136900000",
        maxSupply: "999999999.000000000 EOSDT",
        issuer: eosioAcc.name,
    },
    BP: {
        symbol: "BP",
        decimals: 9,
        rate: "0.007123000",
        maxSupply: "1000000000.000000000 BP",
        issuer: eosioAcc.name,
    },
    NUT: {
        symbol: "NUT",
        decimals: 9,
        rate: "0.006913000",
        maxSupply: "1000000000.000000000 NUT",
        issuer: eosioAcc.name,
    },
    EOS: {
        symbol: "EOS",
        decimals: 4,
        rate: "1.0000",
        maxSupply: "1000000000.0000 EOS",
        issuer: eosioAcc.name,
    },
    USD: {
        symbol: "USD",
        decimals: 4,
        rate: "4.1369",
        maxSupply: "1000000000.0000 USD",
        issuer: eosioAcc.name,
    },
    LOL: {
        symbol: "LOL",
        decimals: 4,
        rate: "0.0000",
        maxSupply: "1000000000.0000 LOL",
        issuer: eosioAcc.name,
    },
}
