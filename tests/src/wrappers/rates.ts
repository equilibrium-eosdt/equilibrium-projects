import {Api, JsonRpc} from "eosjs"
import {EosAccount} from "../interfaces/local-logic"
import {OracleRates, RatesInitSettings} from "../interfaces/wrappers"
import {TokenVault} from "../logic/token-vault"
import {oracleAcc} from "../params/accounts"
import {expirationParam} from "../params/config"
import {BigNum} from "../utils/bignumber-inst"
import {balanceToBigNum, getAccName, toEosDate} from "../utils/utils"

export class RatesWrapper {
    private contractName: string = oracleAcc.name
    private rpc: JsonRpc
    private api: Api

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
    }

    public async getRates(): Promise<OracleRates[]> {
        const table = await this.rpc.get_table_rows({
            code: oracleAcc.name,
            scope: oracleAcc.name,
            table: "orarates",
            json: true,
            limit: 100,
        })
        return table.rows
    }

    public async updateTokenPrices(tokens: TokenVault): Promise<void> {
        const rates = await this.getRates()

        for (const rate of rates) {
            const symbol = rate.rate.match(/[A-Z]+/g)![0]
            tokens.setRate(symbol, rate.rate)
        }
    }

    public async getTokenRateBySymbol(tokenSymbol: string): Promise<BigNum> {
        const rates = await this.getRates()

        for (const rate of rates) {
            const symbol = rate.rate.match(/[A-Z]+/g)![0]
            if (symbol === tokenSymbol) return balanceToBigNum(rate.rate)
        }
        throw Error(`Cannot find rate for token with symbol ${tokenSymbol}`)
    }

    public async getSettings(): Promise<RatesInitSettings> {
        const table = await this.rpc.get_table_rows({
            code: oracleAcc.name,
            scope: oracleAcc.name,
            table: "orasettings",
            json: true,
            limit: 1,
        })
        return table.rows[0]
    }

    public async setSettings(
        sender: EosAccount | string,
        settings: RatesInitSettings
    ): Promise<any> {
        const accountName = getAccName(sender)
        const receipt = await this.api.transact(
            {
                actions: [
                    {
                        account: this.contractName,
                        name: "settingset",
                        authorization: [{actor: accountName, permission: "active"}],
                        data: settings,
                    },
                ],
            },
            expirationParam
        )

        return receipt
    }

    public async mockRateSet(
        actor: EosAccount | string,
        rate: string,
        updateDate: Date
    ): Promise<void> {
        const receipt = await this.api.transact(
            {
                actions: [
                    {
                        account: this.contractName,
                        name: "mockrateset",
                        authorization: [{actor: getAccName(actor), permission: "active"}],
                        data: {rate, update: toEosDate(updateDate)},
                    },
                ],
            },
            expirationParam
        )
        return receipt
    }
}
