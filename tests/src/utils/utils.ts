import {protoNumber} from "../interfaces/proto-number"
import {EosAccount} from "../interfaces/local-logic"
import {tokensObject} from "../params/tokens-params"
import {BigNum} from "./bignumber-inst"

export function balanceToBigNum(balance: string): BigNum {
    if (balance === undefined) balance = "0"
    const matchedNumbersArr = balance.match(/[0-9,\.]+/g)
    if (matchedNumbersArr === null)
        throw new Error(
            `${balanceToBigNum.name}(): received null as regex match. Arg string: ${balance}`
        )
    return new BigNum(matchedNumbersArr[0])
}

export function bnsInDelta(bn1: protoNumber, bn2: protoNumber, delta: protoNumber): boolean {
    // tslint:disable-next-line
    ;[bn1, bn2] = manyNumbersToBns(bn1, bn2)
    const actualDelta = bn1.minus(bn2).abs()
    return actualDelta.isLessThanOrEqualTo(delta)
}

export async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function getAccName(acc: EosAccount | string): string {
    return typeof acc === "string" ? acc : acc.name
}

/**
 * A fast workaround to parse EOS strings as UTC, not as local machine time zone
 */
export function newDateFromEosDateString(eosDateString: string): Date {
    const processedDateString = /.+\.\d{3}/.test(eosDateString)
        ? eosDateString.concat("Z")
        : eosDateString.concat(".000Z")
    // Test returns "true" if string finishes with ".ddd" (for ".000" and ".500")

    return new Date(processedDateString)
}

export function manyNumbersToBns(...numbers: protoNumber[]): BigNum[] {
    const result: BigNum[] = numbers.map(num => toBigNumber(num))
    return result
}

export function randomFloatBn(min: protoNumber, max: protoNumber, decimals: number) {
    // tslint:disable-next-line
    ;[min, max] = manyNumbersToBns(min, max)

    if (max.isLessThan(min)) {
        throw new Error(`randomFloatBn(): max arg (${max}) is less than min (${min})`)
    }
    if (max.isEqualTo(min)) return max.dp(decimals, 1)

    return max
        .minus(min)
        .times(Math.random())
        .plus(min)
        .dp(decimals, 1)
}

export function randomReal(): number {
    return Math.random()
}

export function toBigNumber(x: protoNumber): BigNum {
    if (typeof x === "string" || typeof x === "number") return new BigNum(x)
    return x
}

export function toEosDate(date: Date): string {
    return date.toISOString().slice(0, -5)
}

export function toSymString(amount: protoNumber, symbol: string): string {
    amount = toBigNumber(amount)
    const token = tokensObject[symbol]
    if (!token)
        throw new Error(
            `${toSymString.name}() could not find token with symbol '${symbol}' in tokens object`
        )
    return `${amount.toFixed(token.decimals)} ${symbol}`
}

export function randomRealBetween(min: number, max: number) {
    return randomReal() * (max - min) + min
}
