import {IExchangePair, IExchangeToken} from "@equilab/exchange"
import {tokens} from "../connector/wrappers-init"
import {EosAccount, LocalExchangePair} from "../interfaces/local-logic"
import {BigNum} from "../utils/bignumber-inst"
import {logAlert} from "../utils/logger"
import {balanceToBigNum, getAccName, toBigNumber} from "../utils/utils"
import {UserBalances} from "./user-balances"

export class ExchangeLogic {
    public readonly tokens: Map<string, string>
    public readonly pairs: LocalExchangePair[]

    constructor(bcTokens: IExchangeToken[], bcPairs: IExchangePair[]) {
        this.pairs = bcPairs.map(pair => {
            return {
                id: pair.pair_id,
                baseCurrency: pair.base_currency.split(",")[1],
                quoteCurrency: pair.quote_currency.split(",")[1],
                totalBaseBalance: balanceToBigNum(pair.total_base_balance),
                totalQuoteBalance: balanceToBigNum(pair.total_base_balance),
                buySlippage: new BigNum(pair.buy_slippage),
                sellSlippage: new BigNum(pair.sell_slippage),
                priceCurrency: pair.price_currency.split(",")[1],
                priceType: pair.price_type,
                price: parseFloat(pair.price),
                manager: pair.manager_account,
            }
        })

        this.tokens = new Map(
            bcTokens.map(token => {
                return [token.token_symbol.split(",")[1], token.token_account]
            })
        )
    }

    public addToken(tokenSymbol: string, tokenAccount: EosAccount | string): void {
        this.tokens.set(tokenSymbol, getAccName(tokenAccount))
    }
    public deleteToken(tokenSymbol: string): void {
        this.tokens.delete(tokenSymbol)
    }

    public addPair(pair: LocalExchangePair): void {
        this.pairs.push(pair)
    }

    public updatePair(pairId: number, buySlippage: BigNum, sellSlippage: BigNum): void {
        const pair = this.pairs.find(p => p.id === pairId)
        if (!pair) {
            logAlert(`Pair ${pairId} does not exist`)
            return
        }
        pair.sellSlippage = sellSlippage
        pair.buySlippage = buySlippage
    }

    public deletePair(pairId: number): void {
        const pairIndex = this.pairs.findIndex(pair => pair.id === pairId)
        if (pairIndex >= 0) {
            this.pairs.splice(pairIndex, 1)
        } else {
            logAlert(`Pair ${pairId} does not exist`)
        }
    }

    public deposit(
        pairId: number,
        amount: number,
        currency: string,
        managerBalances: UserBalances
    ): void {
        const pair = this.pairs.find(p => p.id === pairId)
        if (!pair) {
            logAlert(`Pair ${pairId} not found`)
            return
        }
        if (pair.baseCurrency === currency)
            pair.totalBaseBalance = pair.totalBaseBalance.plus(amount)
        if (pair.quoteCurrency === currency)
            pair.totalQuoteBalance = pair.totalQuoteBalance.plus(amount)
        managerBalances.decreaseBalance(currency, amount)
    }

    public withdraw(
        pairId: number,
        amount: number,
        currency: string,
        toAccount: UserBalances
    ): void {
        const pair = this.pairs.find(p => p.id === pairId)
        if (!pair) {
            logAlert(`Pair ${pairId} does not exist`)
            return
        }
        if (pair.baseCurrency === currency)
            if (pair.totalBaseBalance.isLessThan(amount)) {
                toAccount.increaseBalance(currency, pair.totalBaseBalance)
                pair.totalBaseBalance = new BigNum(0)
            } else {
                pair.totalBaseBalance = pair.totalBaseBalance.minus(amount)
                toAccount.increaseBalance(currency, amount)
            }

        if (pair.quoteCurrency === currency) {
            if (pair.totalQuoteBalance.isLessThan(amount)) {
                toAccount.increaseBalance(currency, pair.totalQuoteBalance)
                pair.totalQuoteBalance = new BigNum(0)
            } else {
                pair.totalQuoteBalance = pair.totalQuoteBalance.minus(amount)
                toAccount.increaseBalance(currency, amount)
            }
        }
    }

    public exchange(
        user: UserBalances,
        fromCurrency: string,
        toCurrency: string,
        amount: number
    ): void {
        const pair = this.pairs.find(
            p =>
                (p.baseCurrency === fromCurrency && p.quoteCurrency === toCurrency) ||
                (p.baseCurrency === toCurrency && p.quoteCurrency === fromCurrency)
        )
        if (!pair) {
            logAlert(`pair ${fromCurrency}/${toCurrency} does not exist`)
            return
        }
        const convertedAmount =
            pair.priceType !== 2
                ? toBigNumber(amount)
                      .times(tokens.get(toCurrency).rate)
                      .div(tokens.get(fromCurrency).rate)
                : toBigNumber(amount).times(
                      pair.baseCurrency === fromCurrency
                          ? toBigNumber(pair.price)
                          : toBigNumber(1.0).div(pair.price)
                  )

        const type = pair.baseCurrency === fromCurrency ? "sell" : "buy"

        let received: BigNum
        if (type === "sell") {
            received = convertedAmount
                .times(new BigNum(1).minus(pair.sellSlippage))
                .dp(tokens.get(toCurrency).decimals)
            if (pair.totalQuoteBalance.isLessThan(received)) {
                const logMsg =
                    `Cannot exchange from ${fromCurrency} to ${toCurrency}. ` +
                    `Need to receive ${received.toNumber()}, but pair have ` +
                    `only ${pair.totalQuoteBalance.toNumber()}`
                logAlert(logMsg)
                return
            }

            pair.totalBaseBalance = pair.totalBaseBalance.plus(amount)
            pair.totalQuoteBalance = pair.totalQuoteBalance.minus(received)
        } else {
            received = convertedAmount
                .div(pair.buySlippage.plus(1))
                .dp(tokens.get(toCurrency).decimals)
            if (pair.totalBaseBalance.isLessThan(received)) {
                const logMsg =
                    `cannot exchange ${fromCurrency} to ${toCurrency}. ` +
                    `Need to receive ${received.toNumber()}, but pair have ` +
                    `only${pair.totalBaseBalance.toNumber()}`
                logAlert(logMsg)
                return
            }

            pair.totalBaseBalance = pair.totalBaseBalance.minus(received)
            pair.totalQuoteBalance = pair.totalQuoteBalance.plus(amount)
        }

        user.decreaseBalance(fromCurrency, amount)
        user.increaseBalance(toCurrency, received)
    }

    public setPrice(pairId: number, amount: number): void {
        const pair = this.pairs.find(p => p.id === pairId)
        if (!pair) {
            logAlert(`Pair ${pairId} does not exist`)
            return
        }
        pair.price = amount
    }
}
