import {exchangeWrapper, fakeLiquidatorWrapper, tokenWrapper} from "../connector/wrappers-init"
import {IGuardianFlowSettings} from "../interfaces/tests"
import {TestFramework} from "../logic/test-framework"
import {
    eosdtTokenAcc,
    eosioAcc,
    eosioTokenAcc,
    exchangeAcc,
    fakeLiqdatrAcc,
    guardianAcc,
    managerAcc,
    nutTokenAcc,
} from "../params/accounts"
import {logMessage} from "../utils/logger"
import {randomFloatBn, randomRealBetween} from "../utils/utils"

export async function guardianFailTest(framework: TestFramework, settings: IGuardianFlowSettings) {
    async function assertGuardian(testStepName: string): Promise<void> {
        await Promise.all([
            framework.asserter.assertExchangePairs(),
            framework.asserter.assertAllUsersBalances(),
        ])
        framework.assertionsHandler.handle(testStepName)
    }

    const {exchangeLogic, guardianLogic} = framework
    const {guardianFailChecker, customFailChecker} = framework.failCheckers
    const {tester, badDebt, liqDiscount} = settings

    const [managerBalances, testerBalances] = await Promise.all(
        [managerAcc, tester].map(acc => framework.getUserBalances(acc))
    )

    //---------------------------------------- Set settings ----------------------------------------
    const randomAmount = randomFloatBn(settings.minAmount, settings.maxAmount, 9).toNumber()

    logMessage(`Prepare test, recreate eos/eosdt pair and tokens in exchange`)
    const newEosdtRate = randomFloatBn(1, 15, 4).toString()
    await framework.setRates({EOSDT: newEosdtRate})

    await fakeLiquidatorWrapper.setParameters(fakeLiqdatrAcc, 0, badDebt, newEosdtRate, liqDiscount)

    guardianLogic.badDebt = badDebt
    guardianLogic.liquidatorDiscount = liqDiscount

    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()

    logMessage(`Issue tokens to fakeliquidator`)
    await Promise.all([
        tokenWrapper.issue(eosioAcc, fakeLiqdatrAcc, "EOSDT", 1000, "ignore this transfer"),
        tokenWrapper.issue(eosioAcc, fakeLiqdatrAcc, "EOS", 1000, "ignore this transfer"),
    ])

    //------------------------------ Guardian with unprepared exchange -----------------------------

    logMessage(`Transfer EOSDT to guardian with unprepared exchange`)
    await guardianFailChecker.transferEosdt(tester, randomAmount, "")

    await Promise.all([
        exchangeWrapper.addToken(exchangeAcc, "EOSDT", eosdtTokenAcc),
        exchangeWrapper.addToken(exchangeAcc, "EOS", eosioTokenAcc),
    ])

    //---------------------------------------- Add tokens ------------------------------------------

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

    //-------------------------------- Guardian with empty exchange --------------------------------
    logMessage(`Transfer EOSDT to guardian with empty balances on exchange`)
    await guardianFailChecker.transferEosdt(tester, randomAmount, "")

    //------------------------------------ Preparing exchange --------------------------------------

    await Promise.all([
        exchangeWrapper.deposit(managerAcc, 0, 1000, "EOS"),
        exchangeWrapper.deposit(managerAcc, 0, 1000, "EOSDT"),
    ])

    exchangeLogic.deposit(0, 1000, "EOS", managerBalances)
    exchangeLogic.deposit(0, 1000, "EOSDT", managerBalances)

    await assertGuardian("Test preparing")

    //-------------------------------------- EOSDT transfer ----------------------------------------

    logMessage(`Transfer EOSDT to guardian`)
    await guardianFailChecker.transferEosdt(tester, randomAmount, "")
    guardianLogic.transfer(testerBalances, randomAmount)
    await assertGuardian("EOSDT Transferred")

    //--------------------------------- Transferring wrong token -----------------------------------

    logMessage(`Transfer NUT to guardian`)
    await customFailChecker.transact({
        actor: tester,
        contract: nutTokenAcc.name,
        name: "transfer",
        data: {from: tester.name, to: guardianAcc.name, quantity: "1.000000000 NUT", memo: ""},
    })

    logMessage(`Transfer EOS to guardian`)
    await customFailChecker.transact({
        actor: tester,
        contract: eosioTokenAcc.name,
        name: "transfer",
        data: {from: tester.name, to: guardianAcc.name, quantity: "1.0000 EOS", memo: ""},
    })

    // -------------------------------- Remove all pairs and tokens --------------------------------

    logMessage("Remove all pairs and tokens")
    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()
    await assertGuardian("Clean all")
}
