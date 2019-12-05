import {TokenVault} from "../logic/token-vault"
import {EosWrapper} from "../wrappers/eos"
import {ExchangeWrapper} from "../wrappers/exchange"
import {FakeLiquidatorWrapper} from "../wrappers/fakeliquidator"
import {GuardianWrapper} from "../wrappers/guardian"
import {RatesWrapper} from "../wrappers/rates"
import {TokenWrapper} from "../wrappers/token"
import {apiInstance, rpcInstance} from "./connection"

export const tokens = new TokenVault()
export const tokenWrapper = new TokenWrapper(rpcInstance, apiInstance)
export const ratesWrapper = new RatesWrapper(rpcInstance, apiInstance)
export const exchangeWrapper = new ExchangeWrapper(rpcInstance, apiInstance)
export const eosio = new EosWrapper(rpcInstance, apiInstance)
export const guardianWrapper = new GuardianWrapper(rpcInstance, apiInstance)
export const fakeLiquidatorWrapper = new FakeLiquidatorWrapper(rpcInstance, apiInstance)
