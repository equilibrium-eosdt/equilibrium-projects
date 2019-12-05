import {Api} from "eosjs"
import {ICustomTransactParams} from "../interfaces/wrappers"
import {expirationParam} from "../params/config"
import {getAccName} from "../utils/utils"
import {AssertMessage} from "./assert-message"
import {AssertionsHandler} from "./assertions-handler"

export class CustomFailChecker {
    private api: Api
    private assertsHandler: AssertionsHandler

    constructor(api: Api, assertionHandler: AssertionsHandler) {
        this.api = api
        this.assertsHandler = assertionHandler
    }

    public async transact(...params: ICustomTransactParams[]): Promise<any> {
        const actionsArr = params.map(param => {
            return {
                account: getAccName(param.contract),
                name: param.name,
                authorization: [
                    {
                        actor: getAccName(param.actor),
                        permission: "active",
                    },
                ],
                data: param.data,
            }
        })
        const methodName = `Fail checker custom: transaction`
        const paramsMsg = params.map(
            param =>
                `name: ${param.name}, contract: ${getAccName(param.contract)}, ` +
                `actor: ${getAccName(param.actor)}, data: ${JSON.stringify(param.data)}`
        )

        try {
            const receipt = await this.api.transact(
                {
                    actions: actionsArr,
                },
                expirationParam
            )
            this.assertsHandler.addErrors(
                new AssertMessage(`${methodName}: expected to fail but worked`, paramsMsg)
            )
            return receipt
        } catch (e) {
            this.assertsHandler.addSuccesses(
                new AssertMessage(`${methodName}: failed successfully`, [
                    ...paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }
}
