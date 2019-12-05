import {Api, JsonRpc} from "eosjs"
import {EosAccount} from "../interfaces/local-logic"
import {expirationParam} from "../params/config"

export class EosWrapper {
    private rpc: JsonRpc
    private api: Api
    private name: string

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
        this.name = "eosio"
    }

    public async createAccount(createdAccount: EosAccount, creator: EosAccount): Promise<any> {
        const result = await this.api.transact(
            {
                actions: [
                    {
                        account: "eosio",
                        name: "newaccount",
                        authorization: [{actor: creator.name, permission: "active"}],
                        data: {
                            creator: creator.name,
                            name: createdAccount.name,
                            owner: {
                                threshold: 1,
                                keys: [{key: createdAccount.publicKey, weight: 1}],
                                accounts: [],
                                waits: [],
                            },
                            active: {
                                name: createdAccount.publicKey,
                                threshold: 1,
                                keys: [{key: createdAccount.publicKey, weight: 1}],
                                accounts: [],
                                waits: [],
                            },
                        },
                    },
                    {
                        account: "eosio",
                        name: "buyrambytes",
                        authorization: [{actor: creator.name, permission: "active"}],
                        data: {
                            payer: creator.name,
                            receiver: createdAccount.name,
                            bytes: 65536,
                        },
                    },
                    {
                        account: "eosio",
                        name: "delegatebw",
                        authorization: [{actor: creator.name, permission: "active"}],
                        data: {
                            from: creator.name,
                            receiver: createdAccount.name,
                            stake_net_quantity: "10.0000 EOS",
                            stake_cpu_quantity: "10.0000 EOS",
                            transfer: true,
                        },
                    },
                ],
            },
            expirationParam
        )

        return result
    }

    public async delegateBw(
        from: EosAccount,
        receiver: EosAccount,
        net: string,
        cpu: string,
        transfer: boolean
    ): Promise<any> {
        const result = await this.api.transact(
            {
                actions: [
                    {
                        account: "eosio",
                        name: "delegatebw",
                        authorization: [{actor: from.name, permission: "active"}],
                        data: {
                            from: from.name,
                            receiver: receiver.name,
                            stake_net_quantity: net,
                            stake_cpu_quantity: cpu,
                            transfer,
                        },
                    },
                ],
            },
            expirationParam
        )

        return result
    }
}
