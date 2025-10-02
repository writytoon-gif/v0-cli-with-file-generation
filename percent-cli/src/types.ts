export type Role = "system" | "user" | "assistant"

export interface ChatMessage {
  role: Role
  content: string
}

export interface Config {
  apiKey?: string
  model?: string
}

export interface Conversation {
  id: string
  startedAt: string // ISO
  model: string
  messages: ChatMessage[]
}
