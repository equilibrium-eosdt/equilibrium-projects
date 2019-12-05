import {ExchangeInitSettings} from "../interfaces/wrappers"
import {oracleAcc} from "./accounts"

export const defaultExchangeSettings: ExchangeInitSettings = {
    oraclize_account: oracleAcc.name,
    rate_timeout: 10,
}
