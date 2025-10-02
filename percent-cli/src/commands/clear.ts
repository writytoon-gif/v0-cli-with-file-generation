import chalk from "chalk"
import { clearHistory } from "../utils/history"

export async function clearCommand() {
  clearHistory()
  console.log(chalk.green("✔ History cleared"))
}
