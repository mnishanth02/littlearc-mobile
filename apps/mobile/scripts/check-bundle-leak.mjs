#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BANNED_PATTERNS = [
  'fastify',
  'drizzle-orm',
  'node-postgres',
  'pg-pool',
  'pg-connection-string',
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
]

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDirectory = mkdtempSync(join(tmpdir(), 'littlearc-bundle-leak-'))

try {
  execFileSync(
    'pnpm',
    [
      'exec',
      'expo',
      'export',
      '--platform',
      'ios',
      '--no-bytecode',
      '--no-minify',
      '--output-dir',
      outputDirectory,
    ],
    { cwd: projectRoot, stdio: 'inherit' },
  )

  const javascriptFiles = readdirSync(outputDirectory, { recursive: true })
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => join(outputDirectory, entry))
    .filter((filePath) => statSync(filePath).isFile())

  if (javascriptFiles.length === 0) {
    console.error(`Bundle leak check FAILED: no exported .js files found under ${outputDirectory}.`)
    process.exitCode = 1
  } else {
    const matches = []

    for (const filePath of javascriptFiles) {
      const contents = readFileSync(filePath, 'utf8')
      for (const pattern of BANNED_PATTERNS) {
        if (contents.includes(pattern)) matches.push({ filePath, pattern })
      }
    }

    if (matches.length > 0) {
      console.error('Bundle leak check FAILED. Found banned identifiers:')
      for (const { filePath, pattern } of matches) {
        console.error(`  "${pattern}" in ${filePath}`)
      }
      process.exitCode = 1
    } else {
      console.log(
        `Bundle leak check passed: scanned ${javascriptFiles.length} exported .js file(s), no server-only identifiers found.`,
      )
    }
  }
} finally {
  rmSync(outputDirectory, { recursive: true, force: true })
}
