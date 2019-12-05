import {exchangeWrapper} from "../connector/wrappers-init"
import {IExchangeFlowSettings} from "../interfaces/tests"
import {TestFramework} from "../logic/test-framework"
import {
    eosdtTokenAcc,
    eosioTokenAcc,
    exchangeAcc,
    lolManagerAcc,
    managerAcc,
    nutManagerAcc,
    nutTokenAcc,
} from "../params/accounts"
import {defaultExchangeSettings} from "../params/exchange-settings"
import {logMessage} from "../utils/logger"
import {delay, randomFloatBn, randomRealBetween} from "../utils/utils"

export async function exchangeFlow(framework: TestFramework, settings: IExchangeFlowSettings) {
    async function assertExchange(testStepName: string): Promise<void> {
        await Promise.all([
            framework.asserter.assertExchangeTokens(),
            framework.asserter.assertExchangePairs(),
            framework.asserter.assertAllUsersBalances(),
        ])

        framework.assertionsHandler.handle(testStepName)
    }

    const exchangeLogic = framework.exchangeLogic
    const {tester, minSlippage, maxSlippage, minExchange, maxExchange} = settings

    const [
        managerBalances,
        testerBalances,
        nutManagerBalances,
        lolManagerBalances,
    ] = await Promise.all(
        [managerAcc, tester, nutManagerAcc, lolManagerAcc].map(acc =>
            framework.getUserBalances(acc)
        )
    )

    async function randomExchange(min: number, max: number) {
        const randomAmount = randomFloatBn(min, max, 4).toNumber()

        logMessage(`Exchange ${randomAmount} EOSDT for EOS`)
        await exchangeWrapper.exchange(tester, "EOSDT", "EOS", randomAmount)
        exchangeLogic.exchange(testerBalances, "EOSDT", "EOS", randomAmount)
        await assertExchange(`exchange ${randomAmount} EOSDT for EOS`)

        logMessage(`Exchange ${randomAmount} EOS for EOSDT`)
        await exchangeWrapper.exchange(tester, "EOS", "EOSDT", randomAmount)
        exchangeLogic.exchange(testerBalances, "EOS", "EOSDT", randomAmount)
        await assertExchange(`exchange ${randomAmount} EOS for EOSDT`)

        logMessage(`Exchange ${randomAmount} NUT for EOS`)
        await exchangeWrapper.exchange(tester, "NUT", "EOS", randomAmount)
        exchangeLogic.exchange(testerBalances, "NUT", "EOS", randomAmount)
        await assertExchange(`exchange ${randomAmount} NUT for EOS`)

        logMessage(`Exchange ${randomAmount} EOS for NUT`)
        await exchangeWrapper.exchange(tester, "EOS", "NUT", randomAmount)
        exchangeLogic.exchange(testerBalances, "EOS", "NUT", randomAmount)
        await assertExchange(`exchange ${randomAmount} EOS for NUT`)

        logMessage(`Exchange ${randomAmount} EOSDT for LOL`)
        await exchangeWrapper.exchange(tester, "EOSDT", "LOL", randomAmount)
        exchangeLogic.exchange(testerBalances, "EOSDT", "LOL", randomAmount)
        await assertExchange(`exchange ${randomAmount} EOSDT for LOL`)

        logMessage(`Exchange ${randomAmount} LOL for EOSDT`)
        await exchangeWrapper.exchange(tester, "LOL", "EOSDT", randomAmount)
        exchangeLogic.exchange(testerBalances, "LOL", "EOSDT", randomAmount)
        await assertExchange(`exchange ${randomAmount} LOL for EOSDT`)
    }

    // --------------------------------------- Setting rates ---------------------------------------

    logMessage(`Prepare test, remove all pairs and tokens, set rates`)

    let newEosdtRate = randomFloatBn(1, 15, 4).toString()
    let newNutRate = randomFloatBn(1, 15, 9).toString()
    await framework.setRates({EOSDT: newEosdtRate, NUT: newNutRate})

    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()

    await assertExchange("Assert before test")

    // --------------------------------------- Adding tokens ---------------------------------------

    logMessage(`Add tokens`)

    await Promise.all([
        exchangeWrapper.addToken(exchangeAcc, "NUT", nutTokenAcc),
        exchangeWrapper.addToken(exchangeAcc, "EOSDT", eosdtTokenAcc),
        exchangeWrapper.addToken(exchangeAcc, "EOS", eosioTokenAcc),
        exchangeWrapper.addToken(exchangeAcc, "LOL", eosioTokenAcc),
    ])
    exchangeLogic.addToken("NUT", nutTokenAcc)
    exchangeLogic.addToken("EOSDT", eosdtTokenAcc)
    exchangeLogic.addToken("EOS", eosioTokenAcc)
    exchangeLogic.addToken("LOL", eosioTokenAcc)

    await assertExchange("Add tokens")

    // --------------------------------- Adding pairs to exchange ----------------------------------

    logMessage(`Add pairs`)
    await framework.addPairLocallyAndInBc(
        "EOS",
        "EOSDT",
        randomRealBetween(minSlippage, maxSlippage),
        randomRealBetween(minSlippage, maxSlippage),
        "USD",
        0,
        managerAcc
    )
    await framework.addPairLocallyAndInBc(
        "NUT",
        "EOS",
        randomRealBetween(minSlippage, maxSlippage),
        randomRealBetween(minSlippage, maxSlippage),
        "NUT",
        1,
        nutManagerAcc
    )
    await framework.addPairLocallyAndInBc(
        "EOSDT",
        "LOL",
        randomRealBetween(minSlippage, maxSlippage),
        randomRealBetween(minSlippage, maxSlippage),
        "LOL",
        2,
        lolManagerAcc
    )

    const eosEosdtPair = 0
    const eosNutPair = 1
    const eosdtLolPair = 2

    await assertExchange("Add pairs")

    let newLolPrice = randomFloatBn(0.1, 10.0, 4).toNumber()
    await exchangeWrapper.setPrice(lolManagerAcc, eosdtLolPair, newLolPrice, "LOL")
    exchangeLogic.setPrice(eosdtLolPair, newLolPrice)
    await assertExchange("Set rate for EOSDT/LOL pair")

    // ------------------------------------- Depositing tokens -------------------------------------

    await Promise.all([
        exchangeWrapper.deposit(managerAcc, eosEosdtPair, 1000, "EOS"),
        exchangeWrapper.deposit(managerAcc, eosEosdtPair, 1000, "EOSDT"),
    ])

    exchangeLogic.deposit(eosEosdtPair, 1000, "EOS", managerBalances)
    exchangeLogic.deposit(eosEosdtPair, 1000, "EOSDT", managerBalances)

    await assertExchange("Depositing EOS and EOSDT")

    await Promise.all([
        exchangeWrapper.deposit(nutManagerAcc, eosNutPair, 1000, "EOS"),
        exchangeWrapper.deposit(nutManagerAcc, eosNutPair, 1000, "NUT"),
    ])

    exchangeLogic.deposit(eosNutPair, 1000, "EOS", nutManagerBalances)
    exchangeLogic.deposit(eosNutPair, 1000, "NUT", nutManagerBalances)

    await assertExchange("Depositing EOS and NUT")

    await Promise.all([
        exchangeWrapper.deposit(lolManagerAcc, eosdtLolPair, 1000, "EOSDT"),
        exchangeWrapper.deposit(lolManagerAcc, eosdtLolPair, 1000, "LOL"),
    ])

    exchangeLogic.deposit(eosdtLolPair, 1000, "EOSDT", lolManagerBalances)
    exchangeLogic.deposit(eosdtLolPair, 1000, "LOL", lolManagerBalances)

    await assertExchange("Depositing EOSDT and LOL")

    // ------------------------------------- Exchanging tokens -------------------------------------

    logMessage("Exchange")
    await randomExchange(minExchange, maxExchange)

    logMessage("Wait and set new rates")
    await delay(defaultExchangeSettings.rate_timeout * 1000)
    newEosdtRate = randomFloatBn(1, 15, 4).toString()
    newNutRate = randomFloatBn(1, 15, 9).toString()
    const newLolRate = randomFloatBn(1, 15, 9).toString()
    await framework.setRates({EOSDT: newEosdtRate, NUT: newNutRate, LOL: newLolRate})

    newLolPrice = randomFloatBn(0.1, 10.0, 4).toNumber()
    await exchangeWrapper.setPrice(lolManagerAcc, eosdtLolPair, newLolPrice, "LOL")
    exchangeLogic.setPrice(eosdtLolPair, newLolPrice)

    logMessage("Exchange after new rates")
    await randomExchange(minExchange, maxExchange)

    logMessage("Update EOS/EOSDT pair")
    const buySlippage = randomFloatBn(minSlippage, maxSlippage, 9)
    const sellSlippage = randomFloatBn(minSlippage, maxSlippage, 9)

    await exchangeWrapper.updatePair(
        managerAcc,
        eosEosdtPair,
        buySlippage.toNumber(),
        sellSlippage.toNumber()
    )
    exchangeLogic.updatePair(eosEosdtPair, buySlippage, sellSlippage)
    await assertExchange("Update EOS/EOSDT")

    logMessage("Exchange after update pair")
    await randomExchange(minExchange, maxExchange)

    // ----------------------------------- Withdrawing deposits ------------------------------------

    logMessage("Withdraw partial from EOS/EOSDT pair")
    const withdrawAmount = randomFloatBn(0, exchangeLogic.pairs[0].totalBaseBalance, 4).toNumber()

    await exchangeWrapper.withdraw(managerAcc, tester, 0, withdrawAmount, "EOS", "test")
    exchangeLogic.withdraw(eosEosdtPair, withdrawAmount, "EOS", testerBalances)
    await assertExchange("Withdraw partial from EOS/EOSDT pair")

    logMessage("Withdraw all from EOS/NUT pair")
    await framework.withdrawAllFromPair(eosNutPair, "all", nutManagerBalances)
    await assertExchange("Withdraw all from EOS/EOSDT pair")

    // --------------------------------- Removing pairs and tokens ---------------------------------

    logMessage(`Remove all pairs`)
    await framework.removeAllPairsLocallyAndInBc()
    await assertExchange("Remove all pairs")

    logMessage(`Remove all tokens`)
    await framework.removeAllTokensLocallyAndInBc()
    await assertExchange("Remove all tokens")

    logMessage(`Test finished successfully`)
}
