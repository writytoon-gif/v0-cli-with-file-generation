import "undici/global" // provides fetch/EventSource types
import { createParser, type ParsedEvent, type ReconnectInterval } from "eventsource-parser"

import type { ChatMessage } from "../types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export interface StreamCallbacks {
  onStart?: () => void
  onToken?: (token: string) => void
  onEnd?: (fullText: string) => void
  onError?: (err: Error) => void
}

export async function streamChatCompletion({
  apiKey,
  model,
  messages,
  callbacks,
}: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  callbacks: StreamCallbacks
}) {
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional but recommended per OpenRouter docs
        "HTTP-Referer": "https://github.com/percent-cli",
        "X-Title": "percent-cli",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "")
      throw new Error(`OpenRouter error (${res.status}): ${text || res.statusText}`)
    }

    callbacks.onStart?.()

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let fullText = ""

    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      if (typeof event === "object" && event.type === "event") {
        if (event.data === "[DONE]") {
          callbacks.onEnd?.(fullText)
          return
        }
        try {
          const json = JSON.parse(event.data)
          const delta = json.choices?.[0]?.delta?.content ?? ""
          if (delta) {
            fullText += delta
            callbacks.onToken?.(delta)
          }
        } catch (e) {
          // non-JSON heartbeat or irrelevant event
        }
      }
    })

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      parser.feed(chunk)
    }

    callbacks.onEnd?.(fullText)
  } catch (err: any) {
    callbacks.onError?.(err)
  }
}
