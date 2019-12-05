import {logAlert, logSuccess} from "../utils/logger"
import {AssertMessage} from "./assert-message"

export class AssertionsHandler {
    private errorMsgs: AssertMessage[]
    private successMsgs: AssertMessage[]

    constructor() {
        this.errorMsgs = []
        this.successMsgs = []
    }

    public handle(testStepName: string): void {
        if (this.successMsgs.length !== 0) {
            const successMsg =
                `Successful assertion on step "${testStepName}":` +
                `${this.getResultMsg(this.successMsgs)}`
            logSuccess(successMsg)
        }
        this.successMsgs.length = 0

        if (this.errorMsgs.length !== 0) {
            const alertMsg =
                `Errors encountered on step "${testStepName}":` +
                `${this.getResultMsg(this.errorMsgs)}`
            logAlert(alertMsg)
            this.errorMsgs.length = 0
            throw new Error(`Test assertion failed on step "${testStepName}"`)
        }
    }

    public addErrors(...messages: AssertMessage[]): void {
        this.errorMsgs.push(...messages)
    }

    public addSuccesses(...messages: AssertMessage[]): void {
        this.successMsgs.push(...messages)
    }

    private getResultMsg(messages: AssertMessage[]): string {
        return messages
            .map(msg => msg.getResultMessage())
            .sort()
            .reduce((result, msg) => result + "\n" + msg, "")
    }
}
