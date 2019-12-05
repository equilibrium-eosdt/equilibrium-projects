import {apiInstance, eqExchangeWrapper} from "../connector/connection"
import {exchangeWrapper} from "../connector/wrappers-init"
import {EosAccount} from "../interfaces/local-logic"
import {exchangeAcc} from "../params/accounts"
import {getAccName} from "../utils/utils"
import {AssertMessage} from "./assert-message"
import {AssertionsHandler} from "./assertions-handler"

export class ExchangeFailChecker {
    private assertionHandler: AssertionsHandler
    constructor(assertionHandler: AssertionsHandler) {
        this.assertionHandler = assertionHandler
    }

    public async deposit(
        actor: EosAccount | string,
        pairId: number,
        amount: number,
        currency: string
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.deposit.name}()'`

        const paramsMsg =
            `actor: ${getAccName(actor)}, pair id: ${pairId}, amount: ${amount}, ` +
            `currency: ${currency}`

        try {
            await exchangeWrapper.deposit(actor, pairId, amount, currency)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async withdraw(
        actor: EosAccount | string,
        toAccount: EosAccount | string,
        pairId: number,
        amount: number,
        currency: string
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.withdraw.name}()'`
        const paramsMsg =
            `actor: ${getAccName(actor)}, to account: ${getAccName(toAccount)}, ` +
            `pair id: ${pairId}, amount: ${amount}, currency: ${currency}`

        try {
            await exchangeWrapper.withdraw(
                actor,
                toAccount,
                pairId,
                amount,
                currency,
                "failchecker"
            )
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async addToken(
        actor: EosAccount | string,
        token: string,
        tokenAccount: string
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.addToken.name}()'`
        // prettier-ignore
        const paramsMsg = 
            `actor: ${getAccName(actor)}, token: ${token}, token account: ${tokenAccount}`

        try {
            await exchangeWrapper.addToken(actor, token, tokenAccount)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async deleteToken(actor: EosAccount | string, token: string): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.deleteToken.name}()'`
        const paramsMsg = `actor: ${getAccName(actor)}, token: ${token}`

        try {
            await exchangeWrapper.deleteToken(actor, token)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async addPair(
        actor: EosAccount | string,
        baseCurrency: string,
        quoteCurrency: string,
        buySlippage: number,
        sellSlippage: number,
        priceCurrency: string,
        priceType: 0 | 1 | 2,
        managerAccount: EosAccount | string
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.addPair.name}()'`
        const paramsMsg =
            `actor: ${getAccName(actor)}, base currency: ${baseCurrency}, ` +
            `quote currency: ${quoteCurrency}, buy slippage: ${buySlippage},` +
            `sell slippage: ${sellSlippage}, priceCurrency: ${priceCurrency}, ` +
            `priceType: ${priceType}, manager account: ${getAccName(managerAccount)}`

        try {
            await exchangeWrapper.addPair(
                actor,
                baseCurrency,
                quoteCurrency,
                buySlippage,
                sellSlippage,
                priceCurrency,
                priceType,
                managerAccount
            )
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async deletePair(actor: EosAccount | string, pairId: number): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.deletePair.name}()'`
        const paramsMsg = `actor: ${getAccName(actor)}, pair id: ${pairId}`

        try {
            await exchangeWrapper.deletePair(actor, pairId)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async updatePair(
        actor: EosAccount | string,
        pairId: number,
        buySlippage: number,
        sellSlippage: number
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.updatePair.name}()'`
        const paramsMsg =
            `actor: ${getAccName(actor)}, pair id: ${pairId}, ` +
            `buy slippage: ${buySlippage}, sell slippage: ${sellSlippage}`

        try {
            await exchangeWrapper.updatePair(actor, pairId, buySlippage, sellSlippage)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async exchange(
        actor: EosAccount | string,
        fromCurrency: string,
        toCurrency: string,
        amount: number
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.exchange.name}()'`
        const paramsMsg =
            `actor: ${getAccName(actor)}, from: ${fromCurrency}, ` +
            `to: ${toCurrency}, amount: ${amount}`

        try {
            await exchangeWrapper.exchange(actor, fromCurrency, toCurrency, amount)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async setPrice(
        actor: EosAccount | string,
        pairId: number,
        price: number,
        currency: string
    ): Promise<void> {
        const methodName = `Fail checker: exchange method '${exchangeWrapper.setPrice.name}()'`
        const paramsMsg =
            `actor: ${getAccName(actor)}, pair id: ${pairId}` +
            `price: ${price}, currency: ${currency}`

        try {
            await exchangeWrapper.setPrice(actor, pairId, price, currency)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }

    public async customTransfer(actor: string, amount: number, currency: string, memo: string) {
        const methodName = `Fail checker: custom transfer method'`
        // prettier-ignore
        const paramsMsg =
            `actor: ${actor}, amount: ${amount}, currency: ${currency}, memo: "${memo}"`
        try {
            const [account, quantity] = await Promise.all([
                eqExchangeWrapper.getTokenAccount(currency),
                eqExchangeWrapper.amountToAssetString(amount, currency),
            ])

            await apiInstance.transact({
                actions: [
                    {
                        account,
                        name: "transfer",
                        authorization: [{actor, permission: "active"}],
                        data: {
                            from: actor,
                            to: exchangeAcc.name,
                            quantity,
                            memo,
                        },
                    },
                ],
            })
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }
}
