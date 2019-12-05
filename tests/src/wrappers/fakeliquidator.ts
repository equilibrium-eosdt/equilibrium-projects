import {Api, JsonRpc} from "eosjs"
import {tokenWrapper} from "../connector/wrappers-init"
import {protoNumber} from "../interfaces/proto-number"
import {EosAccount} from "../interfaces/local-logic"
import {fakeLiqdatrAcc} from "../params/accounts"
import {expirationParam} from "../params/config"
import {BigNum} from "../utils/bignumber-inst"
import {getAccName, toSymString} from "../utils/utils"

export class FakeLiquidatorWrapper {
    private name: string
    private rpc: JsonRpc
    private api: Api

    constructor(eosJsonRpc: JsonRpc, eosApi: Api) {
        this.rpc = eosJsonRpc
        this.api = eosApi
        this.name = fakeLiqdatrAcc.name
    }

    public async setParameters(
        actor: EosAccount | string,
        surplusDebt: protoNumber,
        badDebt: protoNumber,
        eosUsdRate: protoNumber,
        discount: protoNumber
    ): Promise<any> {
        const actorName = getAccName(actor)
        const receipt = await this.api.transact(
            {
                actions: [
                    {
                        account: this.name,
                        name: "setparams",
                        authorization: [{actor: actorName, permission: "active"}],
                        data: {
                            surplus_debt: toSymString(surplusDebt, "EOSDT"),
                            bad_debt: toSymString(badDebt, "EOSDT"),
                            rate: new BigNum(1.0)
                                .div(eosUsdRate)
                                .div(new BigNum(1.0).minus(discount)),
                        },
                    },
                ],
            },
            expirationParam
        )
        return receipt
    }

    public async transfer(
        sender: string | EosAccount,
        amount: protoNumber,
        symbol: string,
        memo: string
    ): Promise<any> {
        return tokenWrapper.transfer(sender, this.name, amount, symbol, memo)
    }
}
