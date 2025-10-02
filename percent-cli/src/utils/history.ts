import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { randomUUID } from "node:crypto"
import type { Conversation, ChatMessage } from "../types"

function historyDir() {
  const xdg = process.env.XDG_DATA_HOME
  return xdg ? path.join(xdg, "percent") : path.join(os.homedir(), ".local", "share", "percent")
}

function historyPath() {
  return path.join(historyDir(), "history.json")
}

export function loadHistory(): Conversation[] {
  const p = historyPath()
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8")
      return JSON.parse(raw) as Conversation[]
    }
  } catch {}
  return []
}

export function saveHistory(convos: Conversation[]) {
  const dir = historyDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(historyPath(), JSON.stringify(convos, null, 2), "utf8")
}

export function startConversation(model: string): Conversation {
  return {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    model,
    messages: [],
  }
}

export function appendMessage(conv: Conversation, msg: ChatMessage) {
  conv.messages.push(msg)
}

export function upsertConversation(conv: Conversation) {
  const all = loadHistory()
  const idx = all.findIndex((c) => c.id === conv.id)
  if (idx >= 0) all[idx] = conv
  else all.unshift(conv)
  saveHistory(all)
}

export function clearHistory() {
  saveHistory([])
}
