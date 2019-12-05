import {CustomFailChecker} from "../asserters/custom-fail-checker"
import {ExchangeFailChecker} from "../asserters/exchange-fail-checker"
import {GuardianFailChecker} from "../asserters/guardian-fail-checker"
import {EosAccount} from "../interfaces/local-logic"
import {TestFramework} from "../logic/test-framework"

export interface ITestResult {
    testName: string
    errorMessage: string
}

export interface ICommonTestSettings {
    testName: string
    iterationsAmount: number
}

export type testScript<TSettings extends ICommonTestSettings> = (
    framework: TestFramework,
    settings: TSettings
) => Promise<void>

export interface ITestObject<TSettings extends ICommonTestSettings> {
    settings: TSettings
    script: testScript<TSettings>
}

export interface IFailCheckersObject {
    exchangeFailChecker: ExchangeFailChecker
    customFailChecker: CustomFailChecker
    guardianFailChecker: GuardianFailChecker
}

export interface IExchangeFailSettings extends ICommonTestSettings {
    tester: EosAccount
}

export interface IExchangeFlowSettings extends ICommonTestSettings {
    tester: EosAccount
    minSlippage: number
    maxSlippage: number
    minExchange: number
    maxExchange: number
}

export interface IGuardianFlowSettings extends ICommonTestSettings {
    tester: EosAccount
    liqDiscount: number
    badDebt: number
    minSlippage: number
    maxSlippage: number
    minAmount: number
    maxAmount: number
    transferCount?: number
}
