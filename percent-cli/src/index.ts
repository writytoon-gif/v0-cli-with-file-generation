#!/usr/bin/env node
import chalk from "chalk"
import { printBanner } from "./utils/banner"
import { resolveApiKey, resolveDefaultModel, readConfig, writeConfig } from "./utils/env"
import { resolveModel, MODEL_ALIASES } from "./api/models"
import { runRepl } from "./repl"
import { clearCommand } from "./commands/clear"
import { streamChatCompletion } from "./api/openrouter"
import type { ChatMessage } from "./types"

function printHelp() {
  console.log(`
${chalk.bold("percent")} - chat with multiple AI models from your terminal

Usage:
  ${chalk.cyan("percent")} [options]
  ${chalk.cyan("percent --model chatgpt")}
  ${chalk.cyan('percent --model chatgpt "Explain quantum computing"')}
  ${chalk.cyan("percent clear")}
  ${chalk.cyan("percent --models")}

Options:
  ${chalk.yellow("--model <alias|provider/model>")}  Select model (aliases: chatgpt, gemini, grok, claude)
  ${chalk.yellow("--set-key <key>")}                 Save your OpenRouter API key to config
  ${chalk.yellow("--set-model <model>")}             Save default model to config
  ${chalk.yellow("--models")}                        List built-in model aliases
  ${chalk.yellow("--help")}                          Show help
  ${chalk.yellow("--version")}                       Show version

REPL tips:
  type ${chalk.bold("/model <alias|provider/model>")} to switch models live
  type ${chalk.bold("/clear")} to clear the screen, ${chalk.bold("/exit")} to quit
`)
}

async function printModels() {
  console.log(chalk.bold("Model aliases:"))
  for (const [alias, target] of Object.entries(MODEL_ALIASES)) {
    console.log(`  ${chalk.cyan(alias.padEnd(10))} -> ${target}`)
  }
}

async function main() {
  printBanner()

  const args = process.argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printHelp()
    process.exit(0)
  }
  if (args.includes("--version") || args.includes("-v")) {
    const pkg = await import("../package.json", { assert: { type: "json" } } as any)
    console.log(pkg.default.version)
    process.exit(0)
  }

  if (args[0] === "models" || args.includes("--models")) {
    await printModels()
    process.exit(0)
  }

  // clear command
  if (args[0] === "clear") {
    await clearCommand()
    process.exit(0)
  }

  // config commands
  const setKeyIdx = args.indexOf("--set-key")
  if (setKeyIdx >= 0 && args[setKeyIdx + 1]) {
    const cfg = readConfig()
    cfg.apiKey = args[setKeyIdx + 1]
    writeConfig(cfg)
    console.log(chalk.green("✔ API key saved to config"))
    process.exit(0)
  }
  const setModelIdx = args.indexOf("--set-model")
  if (setModelIdx >= 0 && args[setModelIdx + 1]) {
    const cfg = readConfig()
    cfg.model = args[setModelIdx + 1]
    writeConfig(cfg)
    console.log(chalk.green("✔ Default model saved to config"))
    process.exit(0)
  }

  // model selection
  const modelFlagIdx = args.indexOf("--model")
  const modelArg = modelFlagIdx >= 0 ? args[modelFlagIdx + 1] : undefined
  const defaultModel = resolveDefaultModel()
  const model = resolveModel(modelArg, defaultModel)

  // one-shot prompt (string arg not consumed by --model)
  const oneShotParts = args.filter((a, i) => {
    if (a === "--model") return false
    if (i === modelFlagIdx + 1) return false
    if (a.startsWith("--")) return false
    return true
  })
  const oneShotPrompt = oneShotParts.length ? oneShotParts.join(" ") : undefined

  // API key resolution
  const apiKey = resolveApiKey()
  if (!apiKey) {
    console.error(chalk.red("Missing OpenRouter API key. Set OPENROUTER_API_KEY env or run: percent --set-key <key>"))
    process.exit(1)
  }

  if (oneShotPrompt) {
    // run a single request and print streaming response
    const messages: ChatMessage[] = [{ role: "user", content: oneShotPrompt }]
    let first = true
    await streamChatCompletion({
      apiKey,
      model,
      messages,
      callbacks: {
        onStart: () => {
          /* no spinner for one-shot to keep output clean */
        },
        onToken: (chunk) => {
          if (first) {
            process.stdout.write(chalk.cyanBright("assistant: ") + chalk.reset(""))
            first = false
          }
          process.stdout.write(chunk)
        },
        onEnd: async (full) => {
          process.stdout.write("\n")
          // attempt code/file generation
          const { generateFilesFromOutput } = await import("./utils/codegen")
          await generateFilesFromOutput(full, process.cwd()).catch(() => {})
          process.stdout.write("\n")
        },
        onError: (err) => {
          console.error(chalk.red(`Error: ${err.message}`))
          process.exit(1)
        },
      },
    })
    return
  }

  // REPL mode
  await runRepl({ model, apiKey })
}

main().catch((err) => {
  console.error(chalk.red(`Fatal: ${err instanceof Error ? err.message : String(err)}`))
  process.exit(1)
})
