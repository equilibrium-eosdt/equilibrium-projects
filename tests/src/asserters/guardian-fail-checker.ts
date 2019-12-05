import {guardianWrapper} from "../connector/wrappers-init"
import {EosAccount} from "../interfaces/local-logic"
import {getAccName} from "../utils/utils"
import {AssertMessage} from "./assert-message"
import {AssertionsHandler} from "./assertions-handler"

export class GuardianFailChecker {
    private assertionHandler: AssertionsHandler
    constructor(assertionHandler: AssertionsHandler) {
        this.assertionHandler = assertionHandler
    }

    public async transferEosdt(
        actor: string | EosAccount,
        amount: number,
        memo: string
    ): Promise<void> {
        const methodName = `Fail checker: guardian method '${guardianWrapper.transferEosdt.name}()'`
        const paramsMsg = `actor: ${getAccName(actor)}, amount: ${amount}, memo: "${memo}"`

        try {
            await guardianWrapper.transferEosdt(actor, amount, memo)
            this.assertionHandler.addErrors(
                new AssertMessage(`${methodName} expected to fail but worked`, [paramsMsg])
            )
        } catch (e) {
            this.assertionHandler.addSuccesses(
                new AssertMessage(`${methodName} failed successfully`, [
                    paramsMsg,
                    `error message: '${e.message}'`,
                ])
            )
        }
    }
}
