import {tokens} from "../connector/wrappers-init"
import {BigNum} from "../utils/bignumber-inst"
import {logAlert, logMessage} from "../utils/logger"
import {ExchangeLogic} from "./exchange"
import {UserBalances} from "./user-balances"

export class GuardianLogic {
    public badDebt: number = 0
    public liquidatorDiscount: number = 0
    private readonly exchangeLogic: ExchangeLogic

    constructor(exchange: ExchangeLogic) {
        this.exchangeLogic = exchange
    }

    public transfer(user: UserBalances, amount: number) {
        const excess = Math.max(amount - this.badDebt, 0)
        const toConvert = amount - excess

        if (toConvert <= 0) return

        const savedEosBalance: BigNum = user.balances.get("EOS")!
        const savedEosdtBalance: BigNum = user.balances.get("EOSDT")!

        const pair = this.exchangeLogic.pairs.find(
            p =>
                (p.baseCurrency === "EOS" && p.quoteCurrency === "EOSDT") ||
                (p.baseCurrency === "EOSDT" && p.quoteCurrency === "EOS")
        )
        if (pair === undefined) {
            logAlert("Pair EOS/EOSDT does not exist")
            return
        }

        const savedBaseBalance = pair!.totalBaseBalance
        const savedQuoteBalance = pair!.totalQuoteBalance

        const eosAmount = new BigNum(toConvert)
            .div(tokens.get("EOSDT").rate)
            .div(new BigNum(1).minus(this.liquidatorDiscount))
            .dp(4)

        user.decreaseBalance("EOSDT", toConvert)
        user.increaseBalance("EOS", eosAmount)

        this.exchangeLogic.exchange(user, "EOS", "EOSDT", eosAmount.toNumber())

        if (user.balances.get("EOSDT")!.isLessThan(savedEosdtBalance)) {
            const converted = user.balances
                .get("EOSDT")!
                .minus(savedEosdtBalance)
                .plus(toConvert)
            logMessage(`Bad guardian conditions. Before: ${toConvert}, after: ${converted}`)

            user.setBalance("EOS", savedEosBalance)
            user.setBalance("EOSDT", savedEosdtBalance)
            pair.totalBaseBalance = savedBaseBalance
            pair.totalQuoteBalance = savedQuoteBalance
        }

        this.badDebt -= toConvert
    }
}
