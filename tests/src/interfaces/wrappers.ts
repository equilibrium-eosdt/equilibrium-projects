import {EosAccount} from "./local-logic"

export interface ICustomTransactParams {
    name: string
    contract: EosAccount | string
    actor: EosAccount | string
    data: any
}

export interface RatesInitSettings {
    rate_timeout: number
    query_timeout: number
    provablecb1a_interval: number
    delphioracle_interval: number
    equilibriumdsp_interval: number
}

export interface ExchangeInitSettings {
    oraclize_account: string
    rate_timeout: number
}

export interface RatesObject {
    EOSDT?: string
    NUT?: string
    LOL?: string
}

export interface OracleRates {
    rate: string
    update: string
    provablecb1a_price: string
    provablecb1a_update: string
    delphioracle_price: string
    delphioracle_update: string
    equilibriumdsp_price: string
    equilibriumdsp_update: string
}
