import {IExchangePair, IExchangeSettings, IExchangeToken} from "@equilab/exchange"
import {Api, JsonRpc} from "eosjs"
import {eqExchangeWrapper} from "../connector/connection"
import {protoNumber} from "../interfaces/proto-number"
import {EosAccount} from "../interfaces/local-logic"
import {ExchangeInitSettings} from "../interfaces/wrappers"
import {exchangeAcc} from "../params/accounts"
import {expirationParam} from "../params/config"
import {tokensObject} from "../params/tokens-params"
import {getAccName, toBigNumber, toSymString} from "../utils/utils"

export class ExchangeWrapper {
    private name: string
    private rpc: JsonRpc
    private api: Api

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
        this.name = exchangeAcc.name
    }

    public async setSettings(
        actor: EosAccount | string,
        settings: ExchangeInitSettings
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "settingset",
                        authorization: [{actor: getAccName(actor), permission: "active"}],
                        data: settings,
                    },
                ],
            },
            expirationParam
        )
    }

    public async getSettings(): Promise<IExchangeSettings> {
        return eqExchangeWrapper.getSettings()
    }

    public async getAllPairs(): Promise<IExchangePair[]> {
        return eqExchangeWrapper.getAllPairs()
    }

    public async getAllTokens(): Promise<IExchangeToken[]> {
        return eqExchangeWrapper.getAllTokens()
    }

    public async getToken(tokenSymbol: string): Promise<IExchangeToken | undefined> {
        return eqExchangeWrapper.getToken(tokenSymbol)
    }

    public async getPair(
        fromCurrency: string,
        toCurrency: string
    ): Promise<IExchangePair | undefined> {
        return eqExchangeWrapper.getPair(fromCurrency, toCurrency)
    }

    public async addToken(
        actor: EosAccount | string,
        tokenSymbol: string,
        tokenAccount: EosAccount | string
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "addtoken",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            token_symbol: `${tokensObject[tokenSymbol].decimals},${tokenSymbol}`,
                            token_account: getAccName(tokenAccount),
                        },
                    },
                ],
            },
            expirationParam
        )
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
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "addpair",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            base_currency: `${tokensObject[baseCurrency].decimals},${baseCurrency}`,
                            quote_currency: `${tokensObject[quoteCurrency].decimals},${quoteCurrency}`,
                            buy_slippage: buySlippage,
                            sell_slippage: sellSlippage,
                            price_currency: `${tokensObject[priceCurrency].decimals},${priceCurrency}`,
                            price_type: priceType,
                            manager_account: getAccName(managerAccount),
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async updatePair(
        actor: EosAccount | string,
        pairId: number,
        buySlippage: number,
        sellSlippage: number
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "updatepair",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            pair_id: pairId,
                            buy_slippage: buySlippage,
                            sell_slippage: sellSlippage,
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async deletePair(actor: EosAccount | string, pairId: number): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "deletepair",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            pair_id: pairId,
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async deleteToken(actor: EosAccount | string, token: string): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "deletetoken",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            token_symbol: token,
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async deposit(
        actor: EosAccount | string,
        pairId: number,
        amount: protoNumber,
        token: string
    ): Promise<any> {
        const actorName = getAccName(actor)
        return this.api.transact(
            {
                actions: [
                    {
                        account: await eqExchangeWrapper.getTokenAccount(token),
                        name: "transfer",
                        authorization: [{permission: "active", actor: actorName}],
                        data: {
                            from: actorName,
                            to: this.name,
                            quantity: toSymString(amount, token),
                            memo: `{"pair_id": ${pairId}}`,
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async withdraw(
        actor: EosAccount | string,
        toAccount: EosAccount | string,
        pairId: number,
        amount: protoNumber,
        currency: string,
        memo: string
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "withdraw",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            pair_id: pairId,
                            to: getAccName(toAccount),
                            quantity: toSymString(amount, currency),
                            memo,
                        },
                    },
                ],
            },
            expirationParam
        )
    }

    public async exchange(
        actor: EosAccount | string,
        fromCurrency: string,
        toCurrency: string,
        amount: protoNumber
    ): Promise<any> {
        return eqExchangeWrapper.exchange(
            getAccName(actor),
            fromCurrency,
            toCurrency,
            toBigNumber(amount).toNumber()
        )
    }

    public async setPrice(
        actor: EosAccount | string,
        pairId: number,
        price: number,
        currency: string
    ): Promise<any> {
        return this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "setprice",
                        authorization: [{permission: "active", actor: getAccName(actor)}],
                        data: {
                            pair_id: pairId,
                            price: toSymString(price, currency),
                        },
                    },
                ],
            },
            expirationParam
        )
    }
}
