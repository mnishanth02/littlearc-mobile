import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootEnvPath = fileURLToPath(new URL('../../.env', import.meta.url))

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath)
}
