import {Api, JsonRpc} from "eosjs"
import {tokenWrapper} from "../connector/wrappers-init"
import {EosAccount} from "../interfaces/local-logic"
import {protoNumber} from "../interfaces/proto-number"
import {guardianAcc} from "../params/accounts"

export class GuardianWrapper {
    private name: string
    private rpc: JsonRpc
    private api: Api

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
        this.name = guardianAcc.name
    }

    public async transferEosdt(
        sender: string | EosAccount,
        amount: protoNumber,
        memo: string
    ): Promise<any> {
        return tokenWrapper.transfer(sender, guardianAcc, amount, "EOSDT", memo)
    }
}
