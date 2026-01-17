import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const targets = [
  {
    label: 'raiz',
    envExamplePath: path.join(rootDir, '.env.example'),
    envPath: path.join(rootDir, '.env'),
  },
  {
    label: 'apps',
    envExamplePath: path.join(rootDir, 'apps', '.env.example'),
    envPath: path.join(rootDir, 'apps', '.env'),
  },
  {
    label: 'apps/agents',
    envExamplePath: path.join(rootDir, 'apps', 'agents', '.env.example'),
    envPath: path.join(rootDir, 'apps', 'agents', '.env'),
  },
  {
    label: 'apps/baileys',
    envExamplePath: path.join(rootDir, 'apps', 'baileys', '.env.example'),
    envPath: path.join(rootDir, 'apps', 'baileys', '.env'),
  },
]

const isReadableFile = (filePath) => {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

const parseEnv = (contents) => {
  const entries = []
  const errors = []
  const lines = contents.split(/\r?\n/)

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      errors.push(`Linha ${index + 1}: formato invalido (use KEY=VALUE).`)
      return
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      errors.push(`Linha ${index + 1}: chave invalida "${key}".`)
      return
    }

    entries.push({ key, value, line: index + 1 })
  })

  return { entries, errors }
}

const findDuplicates = (entries) => {
  const seen = new Map()
  const duplicates = []

  entries.forEach((entry) => {
    const existing = seen.get(entry.key)
    if (existing) {
      duplicates.push({
        key: entry.key,
        lines: [existing.line, entry.line],
      })
      return
    }
    seen.set(entry.key, entry)
  })

  return duplicates
}

const report = []
let hasErrors = false

targets.forEach(({ label, envExamplePath, envPath }) => {
  if (!isReadableFile(envExamplePath)) {
    report.push(`ERRO: (${label}) .env.example nao encontrado em ${envExamplePath}.`)
    hasErrors = true
    return
  }

  const envExample = parseEnv(fs.readFileSync(envExamplePath, 'utf8'))
  if (envExample.errors.length) {
    hasErrors = true
    report.push(`ERRO: (${label}) Problemas em .env.example:`)
    report.push(...envExample.errors.map((message) => `- ${message}`))
  }

  const duplicates = findDuplicates(envExample.entries)
  if (duplicates.length) {
    hasErrors = true
    report.push(`ERRO: (${label}) Chaves duplicadas em .env.example:`)
    duplicates.forEach((dup) => {
      report.push(`- ${dup.key} (linhas ${dup.lines.join(', ')})`)
    })
  }

  if (isReadableFile(envPath)) {
    const envFile = parseEnv(fs.readFileSync(envPath, 'utf8'))
    if (envFile.errors.length) {
      hasErrors = true
      report.push(`ERRO: (${label}) Problemas em .env:`)
      report.push(...envFile.errors.map((message) => `- ${message}`))
    }

    const envDuplicates = findDuplicates(envFile.entries)
    if (envDuplicates.length) {
      hasErrors = true
      report.push(`ERRO: (${label}) Chaves duplicadas em .env:`)
      envDuplicates.forEach((dup) => {
        report.push(`- ${dup.key} (linhas ${dup.lines.join(', ')})`)
      })
    }

    const emptyValues = envFile.entries.filter(
      (entry) => entry.value === '' || entry.value === '""' || entry.value === "''"
    )
    if (emptyValues.length) {
      hasErrors = true
      report.push(`ERRO: (${label}) Valores vazios em .env:`)
      emptyValues.forEach((entry) => {
        report.push(`- ${entry.key} (linha ${entry.line})`)
      })
    }

    const exampleKeys = new Set(envExample.entries.map((entry) => entry.key))
    const envKeys = new Set(envFile.entries.map((entry) => entry.key))
    const missingInExample = [...envKeys].filter((key) => !exampleKeys.has(key))
    if (missingInExample.length) {
      hasErrors = true
      report.push(`ERRO: (${label}) Chaves presentes em .env e ausentes em .env.example:`)
      report.push(...missingInExample.map((key) => `- ${key}`))
    }
  } else {
    report.push(`Aviso: (${label}) .env nao encontrado, validando apenas .env.example.`)
  }
})

if (report.length) {
  const output = report.join('\n')
  if (hasErrors) {
    console.error(output)
  } else {
    console.log(output)
  }
}

if (hasErrors) {
  process.exit(1)
}
