import {EosAccount} from "../interfaces/local-logic"
import {
    IExchangeFailSettings,
    IExchangeFlowSettings,
    IGuardianFlowSettings,
    ITestObject,
} from "../interfaces/tests"
import {bootstrapTestFramework} from "../logic/test-framework"
import {
    lolManagerAcc,
    managerAcc,
    nutManagerAcc,
    usrCoolDancer,
    usrGoodWitch,
} from "../params/accounts"
import {exchangeFailTest} from "../test-logic/exchange-fail-checkers"
import {exchangeFlow} from "../test-logic/exchange-flow"
import {guardianFlow} from "../test-logic/guardian"
import {guardianFailTest} from "../test-logic/guardian-fail-checkers"
import {logError} from "../utils/logger"

const exchangeFailSettings: IExchangeFailSettings[] = [
    {
        testName: `Exchange fail check test`,
        iterationsAmount: 3,
        tester: usrGoodWitch,
    },
]

const exchangeFlowSettings: IExchangeFlowSettings[] = [
    {
        testName: `Exchange tests `,
        iterationsAmount: 3,
        tester: usrGoodWitch,
        minSlippage: 0.01,
        maxSlippage: 0.5,
        minExchange: 1,
        maxExchange: 10,
    },
]

const guardianFailSettings: IGuardianFlowSettings[] = [
    {
        testName: `Guardian fail tests - slippage more than discount`,
        iterationsAmount: 2,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 100,
        minAmount: 1,
        maxAmount: 100,
        minSlippage: 0.04,
        maxSlippage: 0.05,
    },
    {
        testName: `Guardian fail tests - amount is too small`,
        iterationsAmount: 2,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 100,
        minAmount: 0.0000001,
        maxAmount: 0.0000002,
        minSlippage: 0.01,
        maxSlippage: 0.02,
    },
    {
        testName: `Guardian fail tests - amount is zero`,
        iterationsAmount: 2,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 100,
        minAmount: 0,
        maxAmount: 0,
        minSlippage: 0.01,
        maxSlippage: 0.02,
    },
    {
        testName: `Guardian tests - zero bad debt`,
        iterationsAmount: 2,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 0,
        minAmount: 11,
        maxAmount: 100,
        minSlippage: 0.01,
        maxSlippage: 0.02,
    },
]

const guardianFlowSettings: IGuardianFlowSettings[] = [
    {
        testName: `Guardian tests`,
        iterationsAmount: 1,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 100,
        minSlippage: 0.01,
        maxSlippage: 0.02,
        minAmount: 1,
        maxAmount: 9,
        transferCount: 10,
    },
    {
        testName: `Guardian tests - with excess from liquidator`,
        iterationsAmount: 3,
        tester: usrCoolDancer,
        liqDiscount: 0.03,
        badDebt: 10,
        minAmount: 11,
        maxAmount: 100,
        minSlippage: 0.01,
        maxSlippage: 0.02,
    },
]

function generateTestObjects(): any[] {
    const resultArr = []

    for (const settings of exchangeFlowSettings) {
        const settingsObject: ITestObject<IExchangeFlowSettings> = {
            settings,
            script: exchangeFlow,
        }

        resultArr.push(settingsObject)
    }

    for (const settings of exchangeFailSettings) {
        const settingsObject: ITestObject<IExchangeFailSettings> = {
            settings,
            script: exchangeFailTest,
        }

        resultArr.push(settingsObject)
    }

    for (const settings of guardianFlowSettings) {
        const settingsObject: ITestObject<IGuardianFlowSettings> = {
            settings,
            script: guardianFlow,
        }

        resultArr.push(settingsObject)
    }

    for (const settings of guardianFailSettings) {
        const settingsObject: ITestObject<IGuardianFlowSettings> = {
            settings,
            script: guardianFailTest,
        }

        resultArr.push(settingsObject)
    }

    return resultArr
}

test().catch(e => {
    logError(e)
    process.exit(13)
})

async function test() {
    const uniqueTesters: Set<string | EosAccount> = new Set([
        managerAcc,
        nutManagerAcc,
        lolManagerAcc,
        usrCoolDancer,
        usrCoolDancer,
    ])

    const testObjects = generateTestObjects()

    const framework = await bootstrapTestFramework([...uniqueTesters])
    await framework.sequenceRunner(testObjects)
}
