import prompts from "prompts"
import chalk from "chalk"
import { startThinkingSpinner } from "./utils/spinner"
import { streamChatCompletion } from "./api/openrouter"
import { generateFilesFromOutput } from "./utils/codegen"
import { appendMessage, startConversation, upsertConversation } from "./utils/history"
import type { ChatMessage } from "./types"
import { resolveModel } from "./api/models" // allow live model switching
import { readConfig, writeConfig } from "./utils/env"
import { MODEL_ALIASES } from "./api/models"

export async function runRepl({
  model,
  apiKey,
}: {
  model: string
  apiKey: string
}) {
  let currentModel = model // track active model
  let currentApiKey = apiKey // track active API key

  console.log(chalk.gray(`Model: ${chalk.bold(currentModel)}`))
  console.log(
    chalk.dim(
      `Type ${chalk.bold("/help")} for commands. ${chalk.bold("/exit")} to quit, ${chalk.bold("/clear")} to clear, ${chalk.bold(
        "/model <name>",
      )} to switch.`,
    ),
  )

  const conversation = startConversation(currentModel)
  const messages: ChatMessage[] = [
    // You can add a lightweight system prompt here if desired
  ]

  while (true) {
    const { input } = await prompts({
      type: "text",
      name: "input",
      message: chalk.greenBright(`you:`), // Claude-like "you:" prompt
    })

    if (input === undefined) {
      process.stdout.write("\n")
      break
    }
    const trimmed = String(input).trim()
    if (!trimmed) continue

    if (trimmed === "/exit") {
      break
    }
    if (trimmed === "/clear") {
      console.clear()
      console.log(chalk.gray(`Model: ${chalk.bold(currentModel)}`)) // re-show context after clear
      console.log(chalk.dim(`Type ${chalk.bold("/help")} for commands.`))
      continue
    }
    if (trimmed === "/help") {
      console.log(`
${chalk.bold("Commands")}
  ${chalk.cyan("/help")}                          Show this help
  ${chalk.cyan("/models")}                        List model aliases
  ${chalk.cyan("/model <alias|provider/model>")}  Switch model
  ${chalk.cyan("/key <OPENROUTER_API_KEY>")}      Set and save API key
  ${chalk.cyan("/clear")}                         Clear the screen
  ${chalk.cyan("/exit")}                          Exit
`)
      continue
    }
    if (trimmed === "/models") {
      console.log(chalk.bold("Model aliases:"))
      for (const [alias, target] of Object.entries(MODEL_ALIASES)) {
        console.log(`  ${chalk.cyan(alias.padEnd(10))} -> ${target}`)
      }
      continue
    }
    if (trimmed.startsWith("/key ")) {
      const nextKey = trimmed.slice(5).trim()
      if (!nextKey) {
        console.log(chalk.yellow(`Usage: /key <OPENROUTER_API_KEY>`))
      } else {
        const cfg = readConfig()
        cfg.apiKey = nextKey
        writeConfig(cfg)
        currentApiKey = nextKey
        console.log(chalk.green("✔ API key saved."))
      }
      continue
    }
    if (trimmed.startsWith("/model ")) {
      const next = trimmed.slice(7).trim()
      if (next) {
        const resolved = resolveModel(next, currentModel)
        currentModel = resolved
        console.log(chalk.yellow(`→ Switched model to ${chalk.bold(currentModel)}`))
      } else {
        console.log(chalk.yellow(`Usage: /model <alias|provider/model>`))
      }
      continue
    }

    // user message
    messages.push({ role: "user", content: trimmed })
    appendMessage(conversation, { role: "user", content: trimmed })

    const spinner = startThinkingSpinner()
    let firstToken = true

    process.stdout.write("\n")
    await streamChatCompletion({
      apiKey: currentApiKey, // use active API key
      model: currentModel, // use active model
      messages,
      callbacks: {
        onStart: () => {
          spinner.stop()
        },
        onToken: (chunk) => {
          if (firstToken) {
            process.stdout.write(chalk.cyanBright("assistant: ") + chalk.reset(""))
            firstToken = false
          }
          process.stdout.write(chunk)
        },
        onEnd: async (full) => {
          process.stdout.write("\n")
          messages.push({ role: "assistant", content: full })
          appendMessage(conversation, { role: "assistant", content: full })
          upsertConversation(conversation)

          try {
            await generateFilesFromOutput(full, process.cwd())
          } catch (e) {
            console.error(chalk.red(`Code generation error: ${(e as Error).message}`))
          }
          process.stdout.write("\n")
        },
        onError: (err) => {
          spinner.stop()
          console.error(chalk.red(`Error: ${err.message}`))
        },
      },
    })
  }
}
