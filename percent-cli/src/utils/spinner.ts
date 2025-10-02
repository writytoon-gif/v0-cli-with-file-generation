import ora from "ora"

export function startThinkingSpinner(text = "Thinking…") {
  const spinner = ora({ text, spinner: "dots" }).start()
  return spinner
}
