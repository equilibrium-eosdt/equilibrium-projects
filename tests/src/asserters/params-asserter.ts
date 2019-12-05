import {IExchangePair} from "@equilab/exchange"
import {exchangeWrapper, tokenWrapper} from "../connector/wrappers-init"
import {ExchangeLogic} from "../logic/exchange"
import {UserBalances} from "../logic/user-balances"
import {eosDelta, tokensDelta} from "../params/config"
import {BigNum} from "../utils/bignumber-inst"
import {balanceToBigNum, bnsInDelta} from "../utils/utils"
import {AssertMessage} from "./assert-message"
import {AssertionsHandler} from "./assertions-handler"

export class ContractParamsAsserter {
    private readonly users: UserBalances[]

    private readonly exchangeLogic: ExchangeLogic
    private readonly assertsHandler: AssertionsHandler

    constructor(
        assertsHandler: AssertionsHandler,
        users: UserBalances[],
        exchangeLogic: ExchangeLogic
    ) {
        this.users = users
        this.exchangeLogic = exchangeLogic
        this.assertsHandler = assertsHandler
    }

    public async assertAllUsersBalances(): Promise<void> {
        const assertions = this.users.map(user => this.assertUser(user))
        await Promise.all(assertions)
    }

    public async assertUser(user: UserBalances) {
        const errorMsgsArr: string[] = []
        const successMsgsArr: string[] = []

        const localEosBalance = user.balances.get("EOS") || new BigNum(0)
        const localEosdtBalance = user.balances.get("EOSDT") || new BigNum(0)
        const localNutBalance = user.balances.get("NUT") || new BigNum(0)
        const localLolBalance = user.balances.get("LOL") || new BigNum(0)

        const [
            actualEosBalance,
            actualEosdtBalance,
            actualNutBalance,
            actualLolBalance,
        ] = await Promise.all(
            ["EOS", "EOSDT", "NUT", "LOL"].map(symbol =>
                tokenWrapper.getBalanceBigNum(user.name, symbol)
            )
        )

        if (bnsInDelta(actualEosBalance, localEosBalance, eosDelta)) {
            successMsgsArr.push(`EOS balance is correct: ${actualEosBalance}`)
            user.setBalance("EOS", actualEosBalance)
        } else {
            const errorMsg =
                `EOS balances - local: ${localEosBalance}, blockchain: ${actualEosBalance}, ` +
                `delta: ${localEosBalance.minus(actualEosBalance).abs()}`
            errorMsgsArr.push(errorMsg)
        }

        if (bnsInDelta(actualEosdtBalance, localEosdtBalance, tokensDelta)) {
            successMsgsArr.push(`EOSDT balance is correct: ${actualEosdtBalance}`)
            user.setBalance("EOSDT", actualEosdtBalance)
        } else {
            const errorMsg =
                `EOSDT balances - local: ${localEosdtBalance}, ` +
                `blockchain: ${actualEosdtBalance}, ` +
                `delta: ${localEosdtBalance.minus(actualEosdtBalance).abs()}`
            errorMsgsArr.push(errorMsg)
        }

        if (bnsInDelta(actualNutBalance, localNutBalance, tokensDelta)) {
            successMsgsArr.push(`NUT balance is correct: ${actualNutBalance}`)
            user.setBalance("NUT", actualNutBalance)
        } else {
            const errorMsg =
                `NUT balances - local: ${localNutBalance}, blockchain: ${actualNutBalance}, ` +
                `delta: ${localNutBalance!.minus(actualNutBalance).abs()}`
            errorMsgsArr.push(errorMsg)
        }

        if (bnsInDelta(actualLolBalance, localLolBalance!, eosDelta)) {
            successMsgsArr.push(`LOL balance is correct: ${actualLolBalance}`)
            user.setBalance("LOL", actualLolBalance)
        } else {
            const errorMsg =
                `LOL balances - local: ${localLolBalance}, blockchain: ${actualLolBalance}, ` +
                `delta: ${localLolBalance!.minus(actualLolBalance).abs()}`
            errorMsgsArr.push(errorMsg)
        }

        this.sendMessagesToHandler(
            successMsgsArr,
            `User '${user.name}' balances correct`,
            errorMsgsArr,
            `User '${user.name}' balances NOT correct`
        )
    }

    public async assertExchangePairs(): Promise<void> {
        const pairs = await exchangeWrapper.getAllPairs()
        await Promise.all(pairs.map(p => this.assertExchangePair(p)))
    }

    public async assertExchangePair(actualPair: IExchangePair): Promise<void> {
        const localPairs = this.exchangeLogic.pairs
        const localPair = localPairs.find(p => actualPair.pair_id === p.id)
        const errorMsgsArr: string[] = []
        const successMsgsArr: string[] = []

        if (!localPair) {
            const msgToPush = `Undefined local pair, attempt to assert failed`
            errorMsgsArr.push(msgToPush)
            const assertMsg =
                `Pair ${actualPair.base_currency}/${actualPair.quote_currency} ` +
                `(id: ${actualPair.pair_id}) is present on the blockchain but not locally.`
            this.assertsHandler.addErrors(new AssertMessage(assertMsg, errorMsgsArr))
            return
        }

        if (actualPair.base_currency.split(",")[1] === localPair.baseCurrency) {
            successMsgsArr.push(`base currency is correct: "${actualPair.base_currency}"`)
        } else {
            const errMsg =
                `actual base currency "${actualPair.base_currency}" does not match expected ` +
                `"${localPair.baseCurrency}"`
            errorMsgsArr.push(errMsg)
        }

        if (actualPair.quote_currency.split(",")[1] === localPair.quoteCurrency) {
            successMsgsArr.push(`quote currency is correct: "${actualPair.quote_currency}"`)
        } else {
            const errMsg =
                `actual quote currency "${actualPair.quote_currency}" does not match expected ` +
                `"${localPair.quoteCurrency}"`
            errorMsgsArr.push(errMsg)
        }

        const bnActualBaseBalance = balanceToBigNum(actualPair.total_base_balance)
        if (
            bnsInDelta(
                balanceToBigNum(actualPair.total_base_balance),
                localPair.totalBaseBalance,
                eosDelta
            )
        ) {
            successMsgsArr.push(`base total balance is correct: ${actualPair.total_base_balance}`)
            localPair.totalBaseBalance = bnActualBaseBalance
        } else {
            const errMsg =
                `actual base total balance ${actualPair.total_base_balance} does not match ` +
                `expected ${localPair.totalBaseBalance.toString()}. Delta: ` +
                `${bnActualBaseBalance.minus(localPair.totalBaseBalance).abs()}`
            errorMsgsArr.push(errMsg)
        }

        const bnActualQuoteBalance = balanceToBigNum(actualPair.total_quote_balance)
        if (bnsInDelta(bnActualQuoteBalance, localPair.totalQuoteBalance, eosDelta)) {
            successMsgsArr.push(`quote total balance is correct: ${actualPair.total_quote_balance}`)
            localPair.totalQuoteBalance = bnActualQuoteBalance
        } else {
            const errMsg =
                `actual quote total balance ${actualPair.total_quote_balance} does not match ` +
                `expected ${localPair.totalQuoteBalance.toString()}. Delta: ` +
                `${bnActualQuoteBalance.minus(localPair.totalQuoteBalance).abs()}`
            errorMsgsArr.push(errMsg)
        }

        if (bnsInDelta(actualPair.buy_slippage, localPair.buySlippage, eosDelta)) {
            successMsgsArr.push(`buy slippage is correct: ${actualPair.buy_slippage}`)
        } else {
            const delta = localPair.buySlippage.minus(actualPair.buy_slippage).abs()
            const errMsg =
                `actual buy slippage ${actualPair.buy_slippage} does not match expected ` +
                `${localPair.buySlippage.toString()}. Delta: ${delta}`
            errorMsgsArr.push(errMsg)
        }

        if (bnsInDelta(actualPair.sell_slippage, localPair.sellSlippage, eosDelta)) {
            successMsgsArr.push(`sell slippage is correct: ${actualPair.sell_slippage}`)
        } else {
            const delta = localPair.sellSlippage.minus(actualPair.sell_slippage).abs()
            const errMsg =
                `actual sell slippage ${actualPair.sell_slippage} does not match expected ` +
                `${localPair.sellSlippage.toString()}. Delta: ${delta}`
            errorMsgsArr.push(errMsg)
        }

        if (actualPair.price_currency.split(",")[1] === localPair.priceCurrency) {
            successMsgsArr.push(`price currency is correct: "${actualPair.price_currency}"`)
        } else {
            const errMsg =
                `actual price currency "${actualPair.price_currency}" does not match expected ` +
                `"${localPair.priceCurrency}"`
            errorMsgsArr.push(errMsg)
        }

        if (actualPair.price_type === localPair.priceType) {
            successMsgsArr.push(`price type is correct: ${actualPair.price_type}`)
        } else {
            const errMsg =
                `actual price type ${actualPair.price_type} does not match expected ` +
                `${localPair.priceType}`
            errorMsgsArr.push(errMsg)
        }

        if (bnsInDelta(parseFloat(actualPair.price), localPair.price, tokensDelta)) {
            successMsgsArr.push(`price is correct: ${actualPair.price}`)
        } else {
            const delta = new BigNum(actualPair.price).minus(localPair.price).abs()
            const errMsg =
                `actual price ${actualPair.price} does not match expected ${localPair.price}. ` +
                `Delta: ${delta}`
            errorMsgsArr.push(errMsg)
        }

        if (actualPair.manager_account === localPair.manager) {
            successMsgsArr.push(`manager account is correct: "${actualPair.manager_account}"`)
        } else {
            const errMsg =
                `actual manager account "${actualPair.manager_account}" does not match expected ` +
                `"${localPair.manager}"`
            errorMsgsArr.push(errMsg)
        }

        const pairName = `${localPair.baseCurrency}/${localPair.quoteCurrency}`
        this.sendMessagesToHandler(
            successMsgsArr,
            `Exchange pair ${pairName} parameters are correct`,
            errorMsgsArr,
            `Exchange pair ${pairName} parameters errors`
        )
    }

    public async assertExchangeTokens(): Promise<void> {
        const bcTokens = await exchangeWrapper.getAllTokens()
        const errorMsgsArr: string[] = []
        const successMsgsArr: string[] = []

        bcTokens.forEach(bcToken => {
            const symbol = bcToken.token_symbol.split(",")[1]
            const tokenAccount = this.exchangeLogic.tokens.get(symbol)

            if (!tokenAccount) {
                errorMsgsArr.push(`Token ${symbol} does not exist`)
                return
            }

            if (tokenAccount !== bcToken.token_account) {
                const errMsg =
                    `Blockchain token ${symbol} account ${bcToken.token_account} ` +
                    `does not match expected ${tokenAccount}`
                errorMsgsArr.push(errMsg)
            } else {
                successMsgsArr.push(`${symbol}: token account ${bcToken.token_account} is correct`)
            }
        })

        for (const localToken of this.exchangeLogic.tokens.keys()) {
            if (
                bcTokens.findIndex(token => token.token_symbol.split(",")[1] === localToken) === -1
            ) {
                errorMsgsArr.push(`Token '${localToken}' expected to exist but it does not`)
            }
        }

        this.sendMessagesToHandler(
            successMsgsArr,
            "Token parameters are correct",
            errorMsgsArr,
            "Token parameters are incorrect"
        )
    }

    private sendMessagesToHandler(
        successMsgsArr: string[],
        successHeader: string,
        errorMsgsArr: string[],
        errorHeader: string
    ): void {
        const checksAmount = successMsgsArr.length + errorMsgsArr.length

        if (successMsgsArr.length !== 0) {
            this.assertsHandler.addSuccesses(
                new AssertMessage(
                    successHeader + ` [${successMsgsArr.length} of ${checksAmount}]:`,
                    successMsgsArr
                )
            )
        }

        if (errorMsgsArr.length !== 0) {
            this.assertsHandler.addErrors(
                new AssertMessage(
                    errorHeader + ` [${errorMsgsArr.length} of ${checksAmount}]:`,
                    errorMsgsArr
                )
            )
        }
    }
}
