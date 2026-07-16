import { loadEnv } from './env'

async function main(): Promise<void> {
  loadEnv()
  console.log('worker: no handlers registered yet')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
