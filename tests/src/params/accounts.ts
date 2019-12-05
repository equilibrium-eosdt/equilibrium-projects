import {EosAccount} from "../interfaces/local-logic"

// spell-checker: disable

export const eosioAcc: EosAccount = {
    name: "eosio",
    publicKey: "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
    privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
}

export const eosioTokenAcc: EosAccount = {
    name: "eosio.token",
    publicKey: eosioAcc.publicKey,
    privateKey: eosioAcc.privateKey,
}

export const exchangeAcc: EosAccount = {
    name: "eos2dtdotcom",
    publicKey: "EOS5G3y7H2ft1HkMZP8KX4ajPjLK1yCnW7czRteHzeTFKvtCp9aD8",
    privateKey: "5K1GNGZ3pEgKBWEPwChBxh29sL2YsjfSjutjbRMs9sbgRqDu4Wb",
}

export const managerAcc: EosAccount = {
    name: "eosdtmanager",
    publicKey: "EOS7UJySYPUndN7f48VXfB1sBhkUmyjNSPuvCz7f29ELuwd7brk6g",
    privateKey: "5KdNwGyQH6t8jBR1oEi47CeAwSnGSKKUNic9rvs1V5smTZ8EK9R",
}

export const nutManagerAcc: EosAccount = {
    name: "nutmanager11",
    publicKey: "EOS8bTYV2q44GwAWbNz8HEwyTjHQ1K3GBrtYTyuHTxVvTuYK4Rv2U",
    privateKey: "5Jq2r8bSUwRkBJJFixVTSVNqaEni64NWqHtdW5guTnjUkG7Hm8u",
}

export const lolManagerAcc: EosAccount = {
    name: "lolmanager11",
    publicKey: "EOS6ERg2tgvWMBqfoNkG9Y4FydCHEGprukkZ4azMWrU1BEP6SaT3f",
    privateKey: "5K3gwNo2aupuijN9Srdop4krqPquvNUsWa5fGHc4jiEf3ftuuiq",
}

export const utilTokenAcc: EosAccount = {
    name: "eosdtutility",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const oracleAcc: EosAccount = {
    name: "eosdtorclize",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const eosdtTokenAcc: EosAccount = {
    name: "eosdtsttoken",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const nutTokenAcc: EosAccount = {
    name: "eosdtnutoken",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const guardianAcc: EosAccount = {
    name: "equiguardian",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const fakeLiqdatrAcc: EosAccount = {
    name: "fakeeliqdatr",
    publicKey: exchangeAcc.publicKey,
    privateKey: exchangeAcc.privateKey,
}

export const usrCoolDancer: EosAccount = {
    name: "cooldancer12",
    publicKey: "EOS5rVEBFiZt2iEZYr24RfQjCYUn9n2DuSfVuLX3LsCCLfCT6s5T2",
    privateKey: "5JnSA6QvxzhA8ZGfSuGMPNE24psNb6fWB8EEFkHsW9Vum71c8AU",
}

export const usrMadLion: EosAccount = {
    name: "madlion12345",
    publicKey: "EOS7Xsor8xevEVYVcAEfwkHzY5BYbYrVwNo63sPRZnf9NeK5WYEKV",
    privateKey: "5JTfRDneDJksDJhxrpUbbLKWYukxFWau1kjkc3hiSwCQ7aCoYhH",
}

export const usrGoodWitch: EosAccount = {
    name: "goodwitch123",
    publicKey: "EOS8k2q94YUjgEU5Cim8BX1iSFZ3oaAhEibtNqL4PD5wrBaX9dger",
    privateKey: "5K8bzxuzbFMgbJch3zT8XT7cd1mEnbxn5yqtuoaZiAF21aNdzgg",
}

export const usrFirstBorn: EosAccount = {
    name: "firstborn123",
    publicKey: "EOS8Hb3853LWH4Nb28vGgmNo4h9o9EY1Z14UfYitVVgTooo9UymnS",
    privateKey: "5JvMo4mdvTrXiiLgmJv8dibMiU6NHHWCfqnxkKckh5zF3fwdJvL",
}

export const usrRokoBasilisk: EosAccount = {
    name: "rokobasilisk",
    publicKey: "EOS8KVJJR3saR4ZMTGEfrfC2WhZg2s3frkZxkA17Zg7AxrqSry3X9",
    privateKey: "5JtZiuNjkpHGGg7meFBBKVYH7Eq75ZHNqRn5h4Ch9VaM8hmNcBm",
}

export const testAccounts = [
    usrCoolDancer,
    usrMadLion,
    usrGoodWitch,
    usrFirstBorn,
    usrRokoBasilisk,
]
