import {
    exchangeWrapper,
    fakeLiquidatorWrapper,
    guardianWrapper,
    tokenWrapper,
} from "../connector/wrappers-init"
import {IGuardianFlowSettings} from "../interfaces/tests"
import {TestFramework} from "../logic/test-framework"
import {
    eosdtTokenAcc,
    eosioAcc,
    eosioTokenAcc,
    exchangeAcc,
    fakeLiqdatrAcc,
    managerAcc,
} from "../params/accounts"
import {logMessage} from "../utils/logger"
import {randomFloatBn, randomRealBetween} from "../utils/utils"

export async function guardianFlow(framework: TestFramework, settings: IGuardianFlowSettings) {
    async function assertGuardian(testStepName: string): Promise<void> {
        await Promise.all([
            framework.asserter.assertExchangePairs(),
            framework.asserter.assertAllUsersBalances(),
        ])

        framework.assertionsHandler.handle(testStepName)
    }

    const {exchangeLogic, guardianLogic} = framework
    const {tester, badDebt, liqDiscount} = settings

    const [managerBalances, testerBalances] = await Promise.all(
        [managerAcc, tester].map(acc => framework.getUserBalances(acc))
    )

    // ---------------------------------------- Set Setting ----------------------------------------

    logMessage(`Prepare test, recreate eos/eosdt pair and tokens in exchange`)
    const newEosdtRate = randomFloatBn(1, 15, 4).toString()
    await framework.setRates({EOSDT: newEosdtRate})

    await fakeLiquidatorWrapper.setParameters(fakeLiqdatrAcc, 0, badDebt, newEosdtRate, liqDiscount)
    guardianLogic.badDebt = badDebt
    guardianLogic.liquidatorDiscount = liqDiscount

    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()

    await Promise.all([
        exchangeWrapper.addToken(exchangeAcc, "EOSDT", eosdtTokenAcc),
        exchangeWrapper.addToken(exchangeAcc, "EOS", eosioTokenAcc),
    ])

    // ---------------------------------- Adding tokens and pairs ----------------------------------

    exchangeLogic.addToken("EOSDT", eosdtTokenAcc)
    exchangeLogic.addToken("EOS", eosioTokenAcc)

    await framework.addPairLocallyAndInBc(
        "EOS",
        "EOSDT",
        randomRealBetween(settings.minSlippage, settings.maxSlippage),
        randomRealBetween(settings.minSlippage, settings.maxSlippage),
        "USD",
        0,
        managerAcc
    )

    await Promise.all([
        exchangeWrapper.deposit(managerAcc, 0, 1000, "EOS"),
        exchangeWrapper.deposit(managerAcc, 0, 1000, "EOSDT"),
    ])
    exchangeLogic.deposit(0, 1000, "EOS", managerBalances)
    exchangeLogic.deposit(0, 1000, "EOSDT", managerBalances)

    logMessage(`Issue tokens to fakeliquidator`)
    await Promise.all([
        tokenWrapper.issue(eosioAcc, fakeLiqdatrAcc, "EOSDT", 1000, "ignore this transfer"),
        tokenWrapper.issue(eosioAcc, fakeLiqdatrAcc, "EOS", 1000, "ignore this transfer"),
    ])

    await assertGuardian("Test preparing")

    // ------------------------------------- Transferring eosdt ------------------------------------

    logMessage(`Transfer EOSDT to guardian`)

    const transferCount: number = settings.transferCount ?? 1

    for (let i = 0; i < transferCount; ++i) {
        const randomAmount = randomFloatBn(settings.minAmount, settings.maxAmount, 9).toNumber()
        await guardianWrapper.transferEosdt(tester, randomAmount, "")

        guardianLogic.transfer(testerBalances, randomAmount)
        await assertGuardian(`EOSDT Transferred, step ${i}`)
    }

    // --------------------------------- Removing pairs and tokens ---------------------------------

    logMessage("Remove all pairs and tokens")
    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()
    await assertGuardian("Clean all")
}
