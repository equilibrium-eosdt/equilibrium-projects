import {tokenWrapper} from "../connector/wrappers-init"
import {protoNumber} from "../interfaces/proto-number"
import {BigNum} from "../utils/bignumber-inst"
import {logAlert} from "../utils/logger"

export async function createUser(name: string): Promise<UserBalances> {
    const balances = new UserBalances(name)
    await balances.init()
    return balances
}

export class UserBalances {
    public readonly name: string
    public readonly balances: Map<string, BigNum>
    private initiated: boolean = false

    constructor(name: string) {
        this.name = name
        this.balances = new Map()
    }

    public increaseBalance(symbol: string, amount: protoNumber) {
        let currentBalance = this.balances.get(symbol)
        if (!currentBalance) currentBalance = new BigNum(0)

        const balanceAfter = currentBalance.plus(amount)

        if (balanceAfter.isLessThan(0)) {
            const logMsg =
                `${this.increaseBalance.name}() ALERT: ` +
                `balance after increase is less than zero - ${balanceAfter.toFixed(9)}. ` +
                `Before: ${currentBalance.toFixed(9)}, change: ${amount}`
            logAlert(logMsg)
        }
        this.balances.set(symbol, balanceAfter)
    }

    public decreaseBalance(symbol: string, amount: protoNumber) {
        let currentBalance = this.balances.get(symbol)
        if (!currentBalance) currentBalance = new BigNum(0)

        const balanceAfter = currentBalance.minus(amount)
        if (balanceAfter.isLessThan(0)) {
            const logMsg =
                `${this.decreaseBalance.name}() ALERT: ` +
                `balance after decrease is less than zero - ${balanceAfter.toFixed(9)}. ` +
                `Before: ${currentBalance.toFixed(9)}, change: ${amount}`
            logAlert(logMsg)
        }

        this.balances.set(symbol, balanceAfter)
    }

    public setBalance(symbol: string, amount: string | number | BigNum) {
        this.balances.set(symbol, new BigNum(amount))
    }

    public async init() {
        if (this.initiated) return
        this.initiated = true

        await Promise.all(
            ["EOS", "EOSDT", "NUT", "LOL"].map(symbol => this.updateTokenBalance(symbol))
        )
    }

    private async updateTokenBalance(symbol: string) {
        const balance = await tokenWrapper.getBalanceBigNum(this.name, symbol)
        this.balances.set(symbol, balance)
    }
}
