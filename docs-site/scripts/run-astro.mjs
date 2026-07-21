import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url))
const child = spawn(process.execPath, [astroCli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
  },
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`Could not start Astro: ${error.message}`)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Astro terminated by ${signal}`)
    process.exitCode = 1
    return
  }

  process.exitCode = code ?? 1
})
