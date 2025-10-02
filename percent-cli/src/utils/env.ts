import os from "node:os"
import path from "node:path"
import fs from "node:fs"

import type { Config } from "../types"

function getConfigDir() {
  const xdg = process.env.XDG_CONFIG_HOME
  return xdg ? path.join(xdg, "percent") : path.join(os.homedir(), ".config", "percent")
}

export function ensureConfigDir() {
  const dir = getConfigDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getConfigPath() {
  return path.join(ensureConfigDir(), "config.json")
}

export function readConfig(): Config {
  const p = getConfigPath()
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, "utf8")
      return JSON.parse(raw) as Config
    } catch {
      return {}
    }
  }
  return {}
}

export function writeConfig(cfg: Config) {
  const p = getConfigPath()
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf8")
}

export function resolveApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || readConfig().apiKey
}

export function resolveDefaultModel(): string {
  return readConfig().model || "openai/gpt-4o-mini"
}
