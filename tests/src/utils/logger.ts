import chalk from "chalk"
import util from "util"

function getCurrentTime(): string {
    return new Date().toLocaleString("en-EN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
}

export function logError(error: any): void {
    logAlert(inspObj(error))
}

export function inspObj(obj: object): string {
    return util.inspect(obj, false, null, true)
}

export function inspLog(object: any): void {
    console.log(inspObj(object))
}

export function logSuccess(message: string) {
    console.log(chalk.green(`[${getCurrentTime()}] ${message}`))
}

export function logMessage(message: string) {
    console.log(chalk.white(`[${getCurrentTime()}] ${message}`))
}

export function logAlert(message: string) {
    console.error(chalk.red(`[${getCurrentTime()}] ${message}`))
}
