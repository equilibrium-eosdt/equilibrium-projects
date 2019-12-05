import BigNumber from "bignumber.js"

// We are using BigNumber package to ensure precise calculations.

BigNumber.config({
    DECIMAL_PLACES: 19,
    POW_PRECISION: 19,
    ROUNDING_MODE: BigNumber.ROUND_FLOOR,
    EXPONENTIAL_AT: 15,
})

export {BigNumber as BigNum}
