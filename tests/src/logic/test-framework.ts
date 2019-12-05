import {AssertionsHandler} from "../asserters/assertions-handler"
import {CustomFailChecker} from "../asserters/custom-fail-checker"
import {ExchangeFailChecker} from "../asserters/exchange-fail-checker"
import {GuardianFailChecker} from "../asserters/guardian-fail-checker"
import {ContractParamsAsserter} from "../asserters/params-asserter"
import {apiInstance, rpcInstance} from "../connector/connection"
import {exchangeWrapper, ratesWrapper, tokens} from "../connector/wrappers-init"
import {EosAccount, LocalExchangePair} from "../interfaces/local-logic"
import {
    ICommonTestSettings,
    IFailCheckersObject,
    ITestResult,
    testScript,
} from "../interfaces/tests"
import {RatesObject} from "../interfaces/wrappers"
import {exchangeAcc} from "../params/accounts"
import {crossChar, dashes, indentation, operationsDelay, tickChar} from "../params/config"
import {BigNum} from "../utils/bignumber-inst"
import {logAlert, logError, logSuccess} from "../utils/logger"
import {balanceToBigNum, delay, getAccName, newDateFromEosDateString} from "../utils/utils"
import {ExchangeLogic} from "./exchange"
import {GuardianLogic} from "./guardian"
import {createUser, UserBalances} from "./user-balances"

export async function bootstrapTestFramework(
    accounts: Array<string | EosAccount>
): Promise<TestFramework> {
    await tokens.getRatesFromBlockchain(ratesWrapper)

    const userBalRequests: Array<Promise<UserBalances>> = []
    for (const acc of accounts) {
        const accName = getAccName(acc)
        userBalRequests.push(createUser(accName))
    }

    const [actualTokens, actualPairs] = await Promise.all([
        exchangeWrapper.getAllTokens(),
        exchangeWrapper.getAllPairs(),
    ])

    const assertedUserBalances: UserBalances[] = await Promise.all(userBalRequests)
    const otherUserBalances: UserBalances[] = []
    const exchangeLogic = new ExchangeLogic(actualTokens, actualPairs)
    const guardianLogic = new GuardianLogic(exchangeLogic)
    const assertsHandler = new AssertionsHandler()
    const asserter = new ContractParamsAsserter(assertsHandler, assertedUserBalances, exchangeLogic)
    const failCheckers: IFailCheckersObject = {
        exchangeFailChecker: new ExchangeFailChecker(assertsHandler),
        customFailChecker: new CustomFailChecker(apiInstance, assertsHandler),
        guardianFailChecker: new GuardianFailChecker(assertsHandler),
    }

    const framework = new TestFramework(
        exchangeLogic,
        guardianLogic,
        assertedUserBalances,
        otherUserBalances,
        asserter,
        assertsHandler,
        failCheckers
    )

    await Promise.all([
        framework.asserter.assertAllUsersBalances(),
        framework.asserter.assertExchangePairs(),
    ])

    framework.assertionsHandler.handle(`Assertion after test framework bootstrap`)

    return framework
}
export class TestFramework {
    public readonly exchangeLogic: ExchangeLogic
    public readonly guardianLogic: GuardianLogic
    public readonly assertedUsersBalances: UserBalances[]
    public readonly otherUsersBalances: UserBalances[]

    public readonly asserter: ContractParamsAsserter

    public readonly assertionsHandler: AssertionsHandler
    public readonly failCheckers: IFailCheckersObject

    public lastBlockchainDate: Date = new Date()

    constructor(
        exchangeLogic: ExchangeLogic,
        guardianLogic: GuardianLogic,
        assertedUsersBalances: UserBalances[],
        otherUserBalances: UserBalances[],
        asserter: ContractParamsAsserter,
        assertionsHandler: AssertionsHandler,
        failCheckers: IFailCheckersObject
    ) {
        this.exchangeLogic = exchangeLogic
        this.guardianLogic = guardianLogic
        this.assertedUsersBalances = assertedUsersBalances
        this.otherUsersBalances = otherUserBalances
        this.asserter = asserter
        this.assertionsHandler = assertionsHandler
        this.failCheckers = failCheckers
    }

    public async sequenceRunner(testObjects: any[]) {
        const fails: ITestResult[] = []
        const successes: string[] = []

        console.log(`\n${dashes}STARTING TEST SEQUENCE`)

        // For each set of settings, run test function n times
        for (const testObject of testObjects) {
            const settings = testObject.settings as ICommonTestSettings
            console.log(`\n${dashes.repeat(2)}Starting test: ${settings.testName}\n`)
            try {
                if (settings.iterationsAmount === 1) {
                    await testObject.script(this, testObject.settings)
                } else {
                    for (let i = 0; i < settings.iterationsAmount; i++) {
                        console.log()
                        console.log(`${dashes.repeat(3)}Starting cycle ${i + 1}\n`)
                        await testObject.script(this, testObject.settings)
                    }
                }
                successes.push(settings.testName)
            } catch (e) {
                logAlert(`${settings.testName.toUpperCase()} TEST UNEXPECTEDLY FAILED`)
                logError(e)
                fails.push({testName: settings.testName, errorMessage: e.message})
            }

            await delay(operationsDelay)
        }

        // Handling test results, showing which were successful and which failed
        console.log(`\n${dashes}TEST SEQUENCE RESULTS\n`)
        successes.forEach(test => logSuccess(`[${tickChar}] Test "${test}" successfully completed`))
        fails.forEach(test => {
            const alertMsg =
                `[${crossChar}] Test "${test.testName}" threw an error message:\n` +
                `${indentation}- ${test.errorMessage}`
            logAlert(alertMsg)
        })

        if (fails.length > 0) process.exit(13)
    }

    /**
     * Finds `UserBalances` object in array of existing users balances (both asserted and
     * other arrays). If none found, creates one and adds it to array.
     * @param addToAsserted flags balances object to add to assertion, even if it is already
     * in `otherUsersBalances` array
     */
    public async getUserBalances(
        user: string | EosAccount,
        addToAsserted?: boolean
    ): Promise<UserBalances> {
        const userName = getAccName(user)

        // Finding balances in existing arrays
        let balances = this.assertedUsersBalances.find(bal => bal.name === userName)
        if (balances) return balances
        balances = this.otherUsersBalances.find(bal => bal.name === userName)
        if (balances) {
            if (addToAsserted) this.assertedUsersBalances.push(balances)
            return balances
        }

        // Did not find balances in existing arrays
        balances = await createUser(userName)
        if (addToAsserted) {
            this.assertedUsersBalances.push(balances)
        } else {
            this.otherUsersBalances.push(balances)
        }
        return balances
    }

    public async addPairLocallyAndInBc(
        baseCurrency: string,
        quoteCurrency: string,
        buySlippage: number,
        sellSlippage: number,
        priceCurrency: string,
        priceType: 0 | 1 | 2,
        managerAccount: EosAccount | string
    ): Promise<void> {
        await exchangeWrapper.addPair(
            exchangeAcc,
            baseCurrency,
            quoteCurrency,
            buySlippage,
            sellSlippage,
            priceCurrency,
            priceType,
            managerAccount
        )
        await delay(operationsDelay)
        const bcPair = await exchangeWrapper.getPair(baseCurrency, quoteCurrency)
        if (!bcPair) throw Error(`Pair ${baseCurrency}/${quoteCurrency} does not exists`)

        const localPair: LocalExchangePair = {
            id: bcPair.pair_id,
            baseCurrency,
            quoteCurrency,
            buySlippage: new BigNum(buySlippage),
            sellSlippage: new BigNum(sellSlippage),
            priceCurrency,
            priceType,
            totalBaseBalance: new BigNum(0),
            totalQuoteBalance: new BigNum(0),
            price: 0,
            manager: getAccName(managerAccount),
        }
        this.exchangeLogic.addPair(localPair)
    }

    public async removeAllPairsLocallyAndInBc(transferTo?: UserBalances): Promise<void> {
        const pairs = await exchangeWrapper.getAllPairs()

        await Promise.all(pairs.map(p => this.withdrawAllFromPair(p.pair_id, "all", transferTo)))
        await delay(operationsDelay)

        await Promise.all(pairs.map(p => exchangeWrapper.deletePair(exchangeAcc, p.pair_id)))
        this.exchangeLogic.pairs.length = 0
    }

    public async removeAllTokensLocallyAndInBc(): Promise<void> {
        const bcTokens = await exchangeWrapper.getAllTokens()

        await Promise.all(
            bcTokens.map(token => exchangeWrapper.deleteToken(exchangeAcc, token.token_symbol))
        )
        this.exchangeLogic.tokens.clear()
    }

    public async withdrawAllFromPair(
        pairId: number,
        type: "base" | "quote" | "all",
        transferTo?: UserBalances
    ) {
        const bcPairs = await exchangeWrapper.getAllPairs()
        const pair = bcPairs.find(p => p.pair_id === pairId)
        const localPair = this.exchangeLogic.pairs.find(p => p.id === pairId)
        if (!pair || !localPair) {
            logAlert(`Pair ${pairId} does not exist in blockchain`)
            return
        }
        const totalBaseBalance = balanceToBigNum(pair.total_base_balance)
        const totalQuoteBalance = balanceToBigNum(pair.total_quote_balance)
        const baseCurrency = pair.base_currency.split(",")[1]
        const quoteCurrency = pair.quote_currency.split(",")[1]

        const receiverBalance = transferTo
            ? transferTo
            : await this.getUserBalances(pair.manager_account)

        if (totalBaseBalance.isGreaterThan(0) && type !== "quote") {
            await exchangeWrapper.withdraw(
                pair.manager_account,
                receiverBalance.name,
                pair.pair_id,
                totalBaseBalance.toNumber(),
                baseCurrency,
                "allmoney"
            )
            receiverBalance.increaseBalance(baseCurrency, totalBaseBalance)
            localPair.totalBaseBalance = new BigNum(0)
        }

        if (totalQuoteBalance.isGreaterThan(0) && type !== "base") {
            await exchangeWrapper.withdraw(
                pair.manager_account,
                receiverBalance.name,
                pair.pair_id,
                totalQuoteBalance.toNumber(),
                quoteCurrency,
                "allmoney"
            )
            receiverBalance.increaseBalance(quoteCurrency, totalQuoteBalance)
            localPair.totalQuoteBalance = new BigNum(0)
        }
    }

    public async getBlockchainDate(): Promise<Date> {
        const bcInfo = await rpcInstance.get_info()

        if (!bcInfo || !bcInfo.head_block_time) {
            // prettier-ignore
            const errMsg = 
                `${this.getBlockchainDate.name}() failed to get current time from blockchain`
            throw new Error(errMsg)
        }
        return newDateFromEosDateString(bcInfo.head_block_time)
    }

    public async setRates(newRate?: RatesObject): Promise<void> {
        if (newRate) {
            if (newRate.EOSDT !== undefined) {
                tokens.setRate("EOSDT", newRate.EOSDT)
                tokens.setRate("USD", newRate.EOSDT)
            }
            if (newRate.NUT !== undefined) tokens.setRate("NUT", newRate.NUT)
            if (newRate.LOL !== undefined) tokens.setRate("LOL", newRate.LOL)
        }

        const date = await this.getBlockchainDate()
        const usdRate = tokens.get("USD").rate
        const nutRate = tokens.get("NUT").rate
        const lolRate = tokens.get("LOL").rate

        await Promise.all([
            ratesWrapper.mockRateSet(exchangeAcc, usdRate + " USD", date),
            ratesWrapper.mockRateSet(exchangeAcc, nutRate + " NUT", date),
        ])

        if (newRate?.LOL !== undefined) {
            await ratesWrapper.mockRateSet(exchangeAcc, lolRate + " LOL", date)
        }

        await tokens.getRatesFromBlockchain(ratesWrapper)
    }
}
