import {
    eosio,
    exchangeWrapper,
    ratesWrapper,
    tokens,
    tokenWrapper,
} from "../connector/wrappers-init"
import {protoNumber} from "../interfaces/proto-number"
import {EosAccount} from "../interfaces/local-logic"
import {
    eosioAcc,
    eosioTokenAcc,
    exchangeAcc,
    lolManagerAcc,
    managerAcc,
    nutManagerAcc,
    oracleAcc,
    testAccounts,
} from "../params/accounts"
import {defaultExchangeSettings} from "../params/exchange-settings"
import {defaultRatesSettings} from "../params/rates-settings"
import {logError, logMessage} from "../utils/logger"
import {toSymString} from "../utils/utils"

defaultNodeInit().catch(e => {
    logError(e)
    process.exit(13)
})

export async function defaultNodeInit() {
    const users = [...testAccounts, managerAcc, nutManagerAcc, lolManagerAcc]
    const usersNames = users.map(user => user.name)

    await Promise.all(users.map(user => eosio.createAccount(user, eosioAcc)))
    logMessage(`Account(s) created: ${usersNames.join(", ")}`)

    await Promise.all([
        exchangeWrapper.setSettings(exchangeAcc, defaultExchangeSettings),
        ratesWrapper.setSettings(oracleAcc, defaultRatesSettings),
    ])
    logMessage(`Exchange settings set`)

    await Promise.all([
        ratesWrapper.mockRateSet(exchangeAcc, "4.1369 USD", new Date()),
        ratesWrapper.mockRateSet(exchangeAcc, "0.006913000 NUT", new Date()),
    ])

    await ratesWrapper.updateTokenPrices(tokens)
    logMessage(`Rates set`)

    await Promise.all(
        users.map(user =>
            eosio.delegateBw(
                eosioAcc,
                user,
                toSymString(10000, "EOS"),
                toSymString(10000, "EOS"),
                true
            )
        )
    )

    logMessage(`Bandwidth for users ${usersNames.join(", ")} has been delegated`)

    const tokensToCreate = ["EOSDT", "NUT", "LOL"]
    await Promise.all(
        tokensToCreate.map(symbol => tokenWrapper.create(eosioAcc, tokens.get(symbol)))
    )
    logMessage(`${tokensToCreate.join(", ")} tokens were created`)

    await Promise.all(
        users.map(user => tokenWrapper.transfer(eosioTokenAcc, user, 10000, "EOS"))
    )
    logMessage(`EOS were transferred to users ${usersNames.join(", ")}`)

    await Promise.all([tokensToCreate.map(symbol => issueTokens(5000, symbol, ...users))])
    logMessage(
        `${tokensToCreate.join(", ")} tokens were issued to users ${usersNames.join(", ")}`
    )

    logMessage(`Default init complete`)
}

async function issueTokens(
    amount: protoNumber,
    tokenSymbol: string,
    ...users: EosAccount[]
): Promise<void> {
    const issueTokensRequests = users.map(user =>
        tokenWrapper.issue(eosioAcc, user, tokenSymbol, amount, "")
    )
    await Promise.all(issueTokensRequests)

    const usersNames = users.map(user => user.name)
    logMessage(`${amount} ${tokenSymbol} issued to: ${usersNames.join(", ")}`)
}
