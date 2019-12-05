import {exchangeWrapper} from "../connector/wrappers-init"
import {IExchangeFailSettings} from "../interfaces/tests"
import {TestFramework} from "../logic/test-framework"
import {
    eosdtTokenAcc,
    eosioTokenAcc,
    exchangeAcc,
    lolManagerAcc,
    managerAcc,
    nutManagerAcc,
    nutTokenAcc,
    usrRokoBasilisk,
} from "../params/accounts"
import {operationsDelay} from "../params/config"
import {defaultExchangeSettings} from "../params/exchange-settings"
import {inspLog, logMessage} from "../utils/logger"
import {delay} from "../utils/utils"

export async function exchangeFailTest(framework: TestFramework, settings: IExchangeFailSettings) {
    async function assertExchange(testStepName: string): Promise<void> {
        await Promise.all([
            framework.asserter.assertExchangeTokens(),
            framework.asserter.assertExchangePairs(),
            framework.asserter.assertAllUsersBalances(),
        ])

        framework.assertionsHandler.handle(testStepName)
    }
    const exchangeLogic = framework.exchangeLogic
    const {exchangeFailChecker: exFail, customFailChecker} = framework.failCheckers

    const {tester} = settings

    const managerBalances = await framework.getUserBalances(managerAcc)
    const nutManagerBalances = await framework.getUserBalances(nutManagerAcc)
    const lolManagerBalances = await framework.getUserBalances(lolManagerAcc)

    //---------------------------------------- Set settings ----------------------------------------

    logMessage(`Prepare test, remove all pairs and tokens`)
    inspLog(await exchangeWrapper.getAllPairs())

    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()

    await exchangeWrapper.setSettings(exchangeAcc, {
        rate_timeout: defaultExchangeSettings.rate_timeout,
        oraclize_account: defaultExchangeSettings.oraclize_account,
    })

    await assertExchange("Assert before test")

    //---------------------------------------- Add tokens ------------------------------------------

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

    //------------------------------------ Add tokens fail checks ----------------------------------

    logMessage(`Add tokens fail checks`)
    await exFail.addToken(usrRokoBasilisk, "EOS", eosioTokenAcc.name) // invalid account

    await assertExchange("Add tokens")

    // -------------------------------------- Add pairs --------------------------------------------

    logMessage(`Add pairs`)

    await framework.addPairLocallyAndInBc("EOS", "EOSDT", 0.2, 0.4, "USD", 0, managerAcc)
    await framework.addPairLocallyAndInBc("NUT", "EOS", 0.4, 0.2, "NUT", 1, nutManagerAcc)
    await framework.addPairLocallyAndInBc("EOSDT", "LOL", 0.2, 0.4, "LOL", 2, lolManagerAcc)

    const eosEosdtPair = 0
    const eosNutPair = 1
    const eosdtLolPair = 2

    await Promise.all([
        exFail.addPair(usrRokoBasilisk, "EOS", "EOSDT", 0.1, 0.4, "USD", 0, managerAcc), // invalid account
        exFail.addPair(exchangeAcc, "EOS", "EOSDT", -0.1, 0.1, "USD", 0, managerAcc), // buy_slippage < 1
        exFail.addPair(exchangeAcc, "EOS", "EOSDT", 0.1, -0.1, "USD", 0, managerAcc), // sell_slippage < 1
        // invalid account
        customFailChecker.transact({
            contract: exchangeAcc,
            name: "addpair",
            actor: tester,
            data: {
                sell_slippage: 0.1,
                buy_slippage: 0.1,
                quote_currency: "4,EOS",
                base_currency: "9,EOSDT",
                price_currency: "4,USD",
                price_type: 0,
            },
        }),
        // no buy_slippage
        customFailChecker.transact({
            contract: exchangeAcc,
            name: "addpair",
            actor: exchangeAcc,
            data: {
                sell_slippage: 0.1,
                quote_currency: "4,EOS",
                base_currency: "9,EOSDT",
                price_currency: "4,USD",
                price_type: 0,
            },
        }),
        // no sell_slippage
        customFailChecker.transact({
            contract: exchangeAcc,
            name: "addpair",
            actor: exchangeAcc,
            data: {
                buy_slippage: 0.1,
                quote_currency: "4,EOS",
                base_currency: "9,EOSDT",
                price_currency: "4,USD",
                price_type: 0,
            },
        }),
        // no price_type
        customFailChecker.transact({
            contract: exchangeAcc,
            name: "addpair",
            actor: exchangeAcc,
            data: {
                sell_slippage: 0.1,
                buy_slippage: 0.1,
                quote_currency: "4,EOS",
                base_currency: "9,EOSDT",
                price_currency: "4,USD",
            },
        }),
        // invalid price type
        customFailChecker.transact({
            contract: exchangeAcc,
            name: "addpair",
            actor: exchangeAcc,
            data: {
                buy_slippage: 0.1,
                sell_slippage: 0.1,
                quote_currency: "4,EOS",
                base_currency: "9,EOSDT",
                price_currency: "4,USD",
                price_type: 3,
            },
        }),
    ])

    await assertExchange("Add pairs")

    // --------------------------------- Update pairs fail checks ----------------------------------

    logMessage(`Update pairs fail checks`)
    await Promise.all([
        exFail.updatePair(usrRokoBasilisk, eosEosdtPair, -0.1, 0.1), // missing signature of contract
        exFail.updatePair(managerAcc, eosEosdtPair, -0.1, 0.1), // buy_slippage < 0
        exFail.updatePair(managerAcc, eosEosdtPair, 0.1, -0.1), // sell_slippage < 0
        exFail.updatePair(managerAcc, 100, 0.1, 0.1), // pair_id does not exist
        exFail.updatePair(nutManagerAcc, eosEosdtPair, 0.1, 0.1), // with another manager
        exFail.updatePair(managerAcc, -1, 0.1, 0.1), // pair_id < 0
    ])

    await assertExchange("Update pairs")

    logMessage(`Set price fail checks`)
    await Promise.all([
        exFail.setPrice(usrRokoBasilisk, eosdtLolPair, 3.14, "LOL"), // missing signature of contract
        exFail.setPrice(managerAcc, eosdtLolPair, 3.14, "LOL"), // missing signature of contract
        exFail.setPrice(lolManagerAcc, eosdtLolPair, 3.14, "NUT"), // Wrong currency
        exFail.setPrice(lolManagerAcc, eosdtLolPair, 0, "LOL"), // Zero price
        exFail.setPrice(lolManagerAcc, eosdtLolPair, -1.5, "LOL"), // price < 0
    ])

    await assertExchange("Set price")

    // ------------------------------------------ Deposit ------------------------------------------

    logMessage(`Deposit EOS, NUT, EOSDT to pairs`)

    const amountToDeposit = 200
    await Promise.all([
        exchangeWrapper.deposit(managerAcc, eosEosdtPair, amountToDeposit, "EOS"),
        exchangeWrapper.deposit(managerAcc, eosEosdtPair, amountToDeposit, "EOSDT"),
        exchangeWrapper.deposit(nutManagerAcc, eosNutPair, amountToDeposit, "EOS"),
        exchangeWrapper.deposit(nutManagerAcc, eosNutPair, amountToDeposit, "NUT"),
        exchangeWrapper.deposit(lolManagerAcc, eosdtLolPair, amountToDeposit, "EOSDT"),
        exchangeWrapper.deposit(lolManagerAcc, eosdtLolPair, amountToDeposit, "LOL"),
    ])

    exchangeLogic.deposit(eosEosdtPair, amountToDeposit, "EOS", managerBalances)
    exchangeLogic.deposit(eosEosdtPair, amountToDeposit, "EOSDT", managerBalances)
    exchangeLogic.deposit(eosNutPair, amountToDeposit, "EOS", nutManagerBalances)
    exchangeLogic.deposit(eosNutPair, amountToDeposit, "NUT", nutManagerBalances)
    exchangeLogic.deposit(eosdtLolPair, amountToDeposit, "EOSDT", lolManagerBalances)
    exchangeLogic.deposit(eosdtLolPair, amountToDeposit, "LOL", lolManagerBalances)

    await assertExchange("Deposit EOS, EOSDT and NUT to pairs")

    // ------------------------------------ Deposit fail check -------------------------------------

    logMessage(`Deposit fail check`)

    await Promise.all([
        exFail.deposit(managerAcc, 1000, 1, "EOS"), // no pair_id
        exFail.deposit(managerAcc, eosEosdtPair, 1, "NUT"), // currency does not match pair params
    ])
    await assertExchange("Deposit fail checks")

    // ----------------------------------------- Withdraw ------------------------------------------

    logMessage(`Withdraw fail check`)

    await Promise.all([
        exFail.withdraw(managerAcc, managerAcc, 1000, 1, "EOS"), // no pair_id
        exFail.withdraw(managerAcc, managerAcc, -1, 1, "EOS"), // pair_id < 0
        exFail.withdraw(managerAcc, exchangeAcc, 0, 1, "EOS"), // transfer to self
        exFail.withdraw(nutManagerAcc, nutManagerAcc, 0, 1, "EOS"), // wrong manager
        exFail.withdraw(tester, tester, 0, 1, "EOS"),
        exFail.withdraw(managerAcc, managerAcc, 0, 1000000, "EOS"), // withdraw >balance
        // missing quantity
        customFailChecker.transact({
            actor: managerAcc,
            contract: exchangeAcc,
            name: "withdraw",
            data: {pair_id: 0, memo: "test"},
        }),
        // missing pair_id
        customFailChecker.transact({
            actor: managerAcc,
            contract: exchangeAcc,
            name: "withdraw",
            data: {quantity: "1.000 EOS", memo: "test"},
        }),
    ])

    await assertExchange("Withdraw fail check")

    // ----------------------------------------- Exchange ------------------------------------------

    logMessage(`Exchange fail check`)
    await Promise.all([
        exFail.customTransfer(tester.name, 1, "EOS", ""), // no pair_id
        exFail.customTransfer(tester.name, 1, "EOS", `{"pair_id": 4}`), // wrong pair_id
        exFail.customTransfer(tester.name, 1, "NUT", `{"pair_id": 0}`), // wrong currency
        exFail.exchange(tester, "EOS", "EOSDT", 0.00000000001), // transfer back less than 0.0001 EOS
    ])

    logMessage(`Wait ${defaultExchangeSettings.rate_timeout} seconds for rates timeout`)
    await delay(defaultExchangeSettings.rate_timeout * 1000)

    await exFail.exchange(tester, "EOS", "EOSDT", 1) // rate is too old

    // no balance on pair
    await framework.withdrawAllFromPair(eosEosdtPair, "all", managerBalances)
    await exFail.exchange(tester, "EOS", "EOSDT", 2)

    await assertExchange(`Exchange fail check`)

    // ---------------------------------------- Delete pair ----------------------------------------

    logMessage(`Delete pair fail check`)

    await framework.withdrawAllFromPair(eosNutPair, "all", nutManagerBalances)
    await Promise.all([
        exFail.deletePair(exchangeAcc, 100), // wrong pair id
        exFail.deletePair(managerAcc, 0), // not empty balances
        exFail.deletePair(tester, eosNutPair), // wrong signature
        exFail.deletePair(managerAcc, eosNutPair), // wrong manager
    ])
    await assertExchange(`Delete pair fail check`)

    // --------------------------------------- Delete token ----------------------------------------

    logMessage(`Delete token fail check`)
    await Promise.all([
        exFail.deleteToken(tester, "4,EOS"), // missing signature
        exFail.deleteToken(exchangeAcc, "9,KEK"), // invalid token
    ])
    await assertExchange(`Delete token fail check`)

    // --------------------------------- Exchange invalid settings ---------------------------------

    logMessage(`Exchange invalid settings`)
    await framework.setRates()
    // exchange no token
    logMessage(`Exchange no token`)
    await exchangeWrapper.deleteToken(exchangeAcc, "4,EOS")
    exchangeLogic.deleteToken("EOS")
    await exFail.exchange(tester, "EOS", "EOSDT", 1)

    // exchange invalid token account
    logMessage(`Exchange invalid token account`)
    await exchangeWrapper.addToken(exchangeAcc, "EOS", tester)
    await exFail.exchange(tester, "EOS", "EOSDT", 2)

    // return back valid account
    logMessage(`Return back valid token account`)
    await delay(operationsDelay)
    await exchangeWrapper.deleteToken(exchangeAcc, "4,EOS")
    exchangeLogic.deleteToken("EOS")
    await exchangeWrapper.addToken(exchangeAcc, "EOS", eosioTokenAcc.name)
    exchangeLogic.addToken("EOS", eosioTokenAcc)

    // exchange no balance
    logMessage("Exchange no balance")
    await framework.withdrawAllFromPair(eosEosdtPair, "all", managerBalances)
    await exFail.exchange(tester, "EOS", "EOSDT", 1)
    logMessage("Exchange no pair")

    await exchangeWrapper.deletePair(exchangeAcc, eosEosdtPair)
    exchangeLogic.deletePair(eosEosdtPair)
    await exFail.exchange(tester, "EOS", "EOSDT", 4)

    await delay(operationsDelay)
    await assertExchange("Exchange invalid settings")

    // -------------------------------- Remove all pairs and tokens --------------------------------

    logMessage("Remove all pairs and tokens")
    await framework.removeAllPairsLocallyAndInBc()
    await framework.removeAllTokensLocallyAndInBc()
    await assertExchange("Remove all pairs and tokens")
}
