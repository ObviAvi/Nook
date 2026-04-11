import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function stripWrappingQuotes(value) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseEnvFile(content) {
  const parsed = {}
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const rawValue = trimmedLine.slice(separatorIndex + 1)

    if (!key) {
      continue
    }

    parsed[key] = stripWrappingQuotes(rawValue)
  }

  return parsed
}

export function loadServerEnv() {
  const mode = process.env.NODE_ENV ?? 'development'
  const envFilesInPrecedenceOrder = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ]
  const keysInjectedFromFile = new Set()

  for (const fileName of envFilesInPrecedenceOrder) {
    const absolutePath = resolve(process.cwd(), fileName)

    if (!existsSync(absolutePath)) {
      continue
    }

    const fileContent = readFileSync(absolutePath, 'utf8')
    const parsedEntries = parseEnvFile(fileContent)

    for (const [key, value] of Object.entries(parsedEntries)) {
      // Keep values explicitly provided by the host environment.
      if (process.env[key] !== undefined && !keysInjectedFromFile.has(key)) {
        continue
      }

      process.env[key] = value
      keysInjectedFromFile.add(key)
    }
  }
}
