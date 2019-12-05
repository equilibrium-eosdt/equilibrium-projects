import {Token} from "../interfaces/tokens"
import {tokensObject} from "../params/tokens-params"
import {balanceToBigNum} from "../utils/utils"
import {RatesWrapper} from "../wrappers/rates"

export class TokenVault {
    public readonly tokens: {[symbol: string]: Token}

    constructor() {
        this.tokens = tokensObject
    }

    public get(symbol: string): Token {
        const allSymbols = Object.keys(this.tokens)

        if (!allSymbols.some(s => s === symbol)) {
            const errMsg =
                `TokenVault Error: did not find token with symbol '${symbol}' among ` +
                `added tokens: '${allSymbols.join(", ")}'`
            throw new Error(errMsg)
        }
        return this.tokens[symbol]
    }

    public setRate(symbol: string, rate: string): void {
        const token = this.get(symbol)
        const prevRate = token.rate
        const newRate = balanceToBigNum(rate)
        if (newRate.isEqualTo(prevRate)) return
        token.rate = newRate.toFixed(token.decimals)
    }

    public async getRatesFromBlockchain(rates: RatesWrapper): Promise<void> {
        const currentRates = await rates.getRates()

        for (const rateObj of currentRates) {
            const symbol = rateObj.rate.match(/[A-Z]+/g)![0]
            const rateString = rateObj.rate.match(/[0-9,\.]+/g)![0]

            if (symbol.length === 0 || rateString.length === 0) {
                const errMsg =
                    `${this.getRatesFromBlockchain.name}(): ` +
                    `got zero length string while parsing. Got ` +
                    `symbol: ${symbol}, got rate: ${rateString}, from: \n${rateObj}`
                throw new Error(errMsg)
            }

            const token = this.get(symbol)
            if (token.rate === rateString) continue

            token.rate = rateString

            if (symbol === "USD") {
                // Since EOSDT and USD have the same price, EOSDT rate is updated with USD rate
                const eosdtToken = this.get("EOSDT")
                eosdtToken.rate = rateString + "00000"
            }
        }
    }
}
