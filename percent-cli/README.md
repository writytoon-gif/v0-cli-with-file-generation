# percent

A Claude-style terminal chat CLI with streaming, local conversation history, and automatic code/file generation from AI responses. Powered by the OpenRouter API.

## Installation

- Global install:
  - npm i -g percent-cli

- Run:
  - percent
  - or: npm run percent (from this folder after building)

> Note: The package name is `percent-cli`. If you prefer local usage, run `npm run build` then `npm run percent` inside this folder.

## Configuration

- API Key:
  - Set environment variable: OPENROUTER_API_KEY=your_key
  - Or save to config: percent --set-key your_key

- Default model:
  - percent --set-model openai/gpt-4o-mini

## Usage

- Interactive chat:
  - percent
  - percent --model chatgpt
  - percent --model gemini

- One-shot prompt:
  - percent --model chatgpt "Explain quantum computing"

- Clear history:
  - percent clear

- Help / Version:
  - percent --help
  - percent --version

- List available aliases:
  - percent --models
  - percent models

- Switch model in REPL:
  - type: /model claude
  - or: /model openai/gpt-4o-mini

## REPL Commands

- /help — show available commands
- /models — list built-in model aliases
- /model <alias|provider/model> — switch model on the fly (aliases: chatgpt, gemini, grok, claude, clude, grok-4, grok4)
- /key <OPENROUTER_API_KEY> — set and save your API key to config
- /clear — clear the screen
- /exit — quit the REPL

## Features

- REPL-style chat with streaming responses (Claude-like typing).
- Model aliases: chatgpt, gemini, grok, claude, or pass any `provider/model`.
- Local history saved to JSON in your config/data directory.
- Code/file generation:
  - Detects fenced code blocks and writes them to files.
  - Supports `file="path"` or `file: path` in fence header.
  - Also supports top-of-file hints like `// file: src/index.ts`.
  - Safe overwrite prompt with Overwrite / Append / Skip.
  - Shows success message like: ✔ File generated: src/index.ts

## Development

- Build: npm run build
- Start (built): npm start

This project uses TypeScript and ES modules. Streaming is implemented via SSE parsing against OpenRouter's OpenAI-compatible chat completions endpoint.
