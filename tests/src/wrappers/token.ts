import {Api, JsonRpc} from "eosjs"
import {protoNumber} from "../interfaces/proto-number"
import {EosAccount} from "../interfaces/local-logic"
import {Token} from "../interfaces/tokens"
import {eosdtTokenAcc, nutTokenAcc, eosioTokenAcc} from "../params/accounts"
import {expirationParam} from "../params/config"
import {BigNum} from "../utils/bignumber-inst"
import {balanceToBigNum, getAccName, toBigNumber, toSymString} from "../utils/utils"

export class TokenWrapper {
    private rpc: JsonRpc
    private api: Api

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
    }

    public async create(issuer: EosAccount | string, token: Token): Promise<any> {
        issuer = getAccName(issuer)

        const contractName = this.getContractName(token.symbol)
        const result = await this.api.transact(
            {
                actions: [
                    {
                        account: contractName,
                        name: "create",
                        authorization: [{actor: contractName, permission: "active"}],
                        data: {
                            issuer,
                            maximum_supply: token.maxSupply,
                        },
                    },
                ],
            },
            expirationParam
        )

        return result
    }

    public async getBalanceBigNum(
        account: EosAccount | string,
        symbol: string
    ): Promise<BigNum> {
        const balanceString = await this.getAccountBalanceRaw(account, symbol)
        return balanceToBigNum(balanceString)
    }

    public async getAccountBalanceRaw(
        account: EosAccount | string,
        symbol: string
    ): Promise<string> {
        const username = getAccName(account)
        const contractName = this.getContractName(symbol)

        const balance = (
            await this.rpc.get_currency_balance(contractName, username, symbol)
        )[0]
        return balance ?? `0 ${symbol}`
    }

    public async transfer(
        from: EosAccount | string,
        to: EosAccount | string,
        amount: protoNumber,
        symbol: string,
        memo?: string
    ): Promise<any> {
        const contractName = this.getContractName(symbol)
        const fromName = getAccName(from)
        const toName = getAccName(to)
        if (!memo) memo = ""
        amount = toBigNumber(amount)

        const result = await this.api.transact(
            {
                actions: [
                    {
                        account: contractName,
                        name: "transfer",
                        authorization: [{actor: fromName, permission: "active"}],
                        data: {
                            from: fromName,
                            to: toName,
                            quantity: `${toSymString(amount, symbol)}`,
                            memo,
                        },
                    },
                ],
            },
            expirationParam
        )

        return result
    }

    public async issue(
        issuer: EosAccount | string,
        receiver: EosAccount | string,
        symbol: string,
        amount: protoNumber,
        memo?: string
    ): Promise<any> {
        if (!memo) memo = ""

        const contractName = this.getContractName(symbol)
        amount = toBigNumber(amount)
        const issuerName = getAccName(issuer)
        const receiverName = getAccName(receiver)

        const receipt = await this.api.transact(
            {
                actions: [
                    {
                        account: contractName,
                        name: "issue",
                        authorization: [{actor: issuerName, permission: "active"}],
                        data: {
                            to: receiverName,
                            quantity: `${toSymString(amount, symbol)}`,
                            memo,
                        },
                    },
                ],
            },
            expirationParam
        )

        return receipt
    }

    private getContractName(symbol: string): string {
        switch (symbol) {
            case "EOS":
                return eosioTokenAcc.name
            case "NUT":
                return nutTokenAcc.name
            case "EOSDT":
                return eosdtTokenAcc.name
            case "LOL": // test token for local tests
                return eosioTokenAcc.name
        }
        throw new Error(
            `Util token wrapper, ${this.getContractName.name}(): ` +
                `Unknown symbol '${symbol}'`
        )
    }
}
