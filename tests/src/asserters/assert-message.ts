import {indentation} from "../params/config"

export class AssertMessage {
    private header: string
    private messagesArr: string[]

    constructor(header: string, messagesArr: string[]) {
        this.header = header
        this.messagesArr = messagesArr
    }

    public getResultMessage(): string {
        let arr = this.messagesArr.sort()
        const resultMsg = this.header
        return resultMsg.concat(...arr.map(msg => `\n${indentation}- ` + msg))
    }
}
