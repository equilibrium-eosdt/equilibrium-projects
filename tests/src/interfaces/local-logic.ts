import {BigNum} from "../utils/bignumber-inst"

export interface UserBalances {
    [tokenSymbol: string]: number
}

export interface UsersBalancesObj {
    [account: string]: UserBalances
}

export interface EosAccount {
    name: string
    publicKey: string
    privateKey: string
}

export interface LocalExchangePair {
    id: number
    baseCurrency: string
    quoteCurrency: string
    totalBaseBalance: BigNum
    totalQuoteBalance: BigNum
    buySlippage: BigNum
    sellSlippage: BigNum
    priceCurrency: string
    priceType: 0 | 1 | 2
    price: number
    manager: string
}
