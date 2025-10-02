import fs from "node:fs"
import path from "node:path"
import prompts from "prompts"
import chalk from "chalk"

const LANG_TO_EXT: Record<string, string> = {
  js: "js",
  jsx: "jsx",
  ts: "ts",
  tsx: "tsx",
  json: "json",
  md: "md",
  html: "html",
  css: "css",
  scss: "scss",
  py: "py",
  python: "py",
  sh: "sh",
  bash: "sh",
  yaml: "yaml",
  yml: "yml",
  sql: "sql",
}

export interface GeneratedFile {
  path: string
  mode: "write" | "append"
}

function inferFilePathFromFenceHeader(header: string): string | undefined {
  // support patterns like: ```ts file="src/index.ts" or ```ts file=src/index.ts or ```file: src/index.ts
  const fileEqMatch = header.match(/file\s*=\s*"?([^"\s]+)"?/i)
  if (fileEqMatch) return fileEqMatch[1]
  const fileColon = header.match(/file:\s*([^\s]+)/i)
  if (fileColon) return fileColon[1]
  return undefined
}

function inferFilePathFromBody(body: string): string | undefined {
  // support hints like: // file: src/index.ts or # file: src/index.ts
  const lines = body.split(/\r?\n/).slice(0, 3)
  for (const line of lines) {
    const m = line.match(/(?:\/\/|#)\s*file:\s*(.+)$/i)
    if (m) return m[1].trim()
  }
  return undefined
}

export async function generateFilesFromOutput(
  fullText: string,
  projectRoot: string = process.cwd(),
): Promise<GeneratedFile[]> {
  const blocks = [...fullText.matchAll(/```([a-zA-Z0-9_-]+)?([^`\n]*)\n([\s\S]*?)```/g)]
  const results: GeneratedFile[] = []
  let autoIndex = 1

  for (const match of blocks) {
    const lang = (match[1] || "").toLowerCase().trim()
    const headerRest = match[2] || ""
    const body = match[3] || ""

    const ext = LANG_TO_EXT[lang] || (lang ? lang : "txt")

    // Try to infer a path
    const relPath =
      inferFilePathFromFenceHeader(headerRest) || inferFilePathFromBody(body) || `snippet-${autoIndex}.${ext}`
    autoIndex++

    const absPath = path.isAbsolute(relPath) ? relPath : path.join(projectRoot, relPath)
    const dir = path.dirname(absPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let mode: "write" | "append" = "write"
    if (fs.existsSync(absPath)) {
      const { action } = await prompts({
        type: "select",
        name: "action",
        message: `File exists: ${relPath}. What do you want to do?`,
        choices: [
          { title: "Overwrite", value: "overwrite" },
          { title: "Append", value: "append" },
          { title: "Skip", value: "skip" },
        ],
      })
      if (action === "skip") {
        console.log(chalk.yellow(`• Skipped: ${relPath}`))
        continue
      }
      if (action === "append") {
        fs.appendFileSync(absPath, body.endsWith("\n") ? body : body + "\n", "utf8")
        mode = "append"
      } else {
        fs.writeFileSync(absPath, body, "utf8")
        mode = "write"
      }
    } else {
      fs.writeFileSync(absPath, body, "utf8")
    }

    console.log(chalk.green(`✔ File ${mode === "append" ? "updated" : "generated"}: ${relPath}`))
    results.push({ path: absPath, mode })
  }

  return results
}
