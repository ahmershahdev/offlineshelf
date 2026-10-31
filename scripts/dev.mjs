// `npm run dev` from the repo root: MariaDB and Redis in Docker, migrations, then the Flask API
// (port 5000) and Vite (port 5173, proxies /api). Ctrl+C stops both; `npm run dev:down` also
// stops the containers.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const backend = join(root, 'backend')
const frontend = join(root, 'frontend')
const isWindows = process.platform === 'win32'
const API_PORT = 5000
const WEB_PORT = 5173

function fail(message) {
  console.error(`\n[dev] ${message}\n`)
  process.exit(1)
}

function readEnv() {
  const file = join(root, '.env')
  if (!existsSync(file)) fail('No .env file. Run: cp .env.example .env, then fill in the secrets.')
  const env = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return env
}

// npm, npx and uv are .cmd shims or need PATHEXT lookup on Windows, so these one-off setup
// commands go through the shell. The long-running servers below do not (see start()).
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  })
  if (result.status !== 0) fail(`"${cmd} ${args.join(' ')}" failed`)
}

function has(cmd) {
  return spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: isWindows }).status === 0
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

function whoHolds(port) {
  if (!isWindows) {
    const out = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    })
    return out.stdout?.trim().split('\n').filter(Boolean) ?? []
  }
  const out = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' }).stdout ?? ''
  return [
    ...new Set(
      out
        .split(/\r?\n/)
        .filter((l) => l.includes('LISTENING') && new RegExp(`:${port}\\s`).test(l))
        .map((l) => l.trim().split(/\s+/).at(-1)),
    ),
  ]
}

for (const tool of ['docker', 'uv', 'npm']) {
  if (!has(tool)) fail(`${tool} is not installed or not on PATH.`)
}
if (spawnSync('docker', ['info'], { stdio: 'ignore', shell: isWindows }).status !== 0) {
  fail('Docker is installed but not running. Start Docker Desktop and try again.')
}

for (const port of [API_PORT, WEB_PORT]) {
  if (!(await portFree(port))) {
    const pids = whoHolds(port)
    const kill = isWindows ? `taskkill /PID ${pids.join(' /PID ')} /T /F` : `kill ${pids.join(' ')}`
    fail(
      `Port ${port} is already in use${pids.length ? ` by PID ${pids.join(', ')}` : ''}.\n` +
        `      Probably an earlier "npm run dev" that did not shut down. Stop it with:\n` +
        `      ${pids.length ? kill : '(find the process using the port and stop it)'}`,
    )
  }
}

const fileEnv = readEnv()
const env = {
  ...process.env,
  ...fileEnv,
  OFFLINESHELF_ENV: 'dev',
  OFFLINESHELF_DATABASE_URL: `mariadb+pymysql://offlineshelf:${fileEnv.MARIADB_PASSWORD}@127.0.0.1:3306/offlineshelf`,
  OFFLINESHELF_REDIS_URL: 'redis://127.0.0.1:6379/0',
  OFFLINESHELF_SITE_URL: `http://localhost:${WEB_PORT}`,
  OFFLINESHELF_TRUSTED_PROXIES: '0',
  FORCE_COLOR: '1',
}

console.log('[dev] starting MariaDB and Redis')
run('docker', ['compose', 'up', '-d', '--wait', 'mariadb', 'redis'], {
  cwd: root,
})

console.log('[dev] syncing dependencies')
run('uv', ['sync', '--frozen'], { cwd: backend })
if (!existsSync(join(frontend, 'node_modules'))) run('npm', ['ci'], { cwd: frontend })

console.log('[dev] applying migrations')
run('uv', ['run', 'alembic', 'upgrade', 'head'], { cwd: backend, env })

const python = isWindows
  ? join(backend, '.venv', 'Scripts', 'python.exe')
  : join(backend, '.venv', 'bin', 'python')
const vite = join(frontend, 'node_modules', 'vite', 'bin', 'vite.js')

const children = []
let stopping = false

// Started without a shell so child.pid is the server itself; killing a shell on Windows
// leaves its children running and holding the port.
function start(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(prefix + line + '\n')
    })
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${prefix}stopped unexpectedly (exit ${code}); shutting down`)
      shutdown(code || 1)
    }
  })
  children.push(child)
}

// Matched by command line, not PID: on Windows .venv\Scripts\python.exe is a launcher that
// starts the real interpreter separately, and Flask's reloader child inherits the listening
// socket, so neither the launcher's tree nor the port owner reliably leads to every process.
const OWN_PROCESSES = [`app.wsgi run --port ${API_PORT}`, `vite.js --port ${WEB_PORT}`]

function killChildren() {
  for (const child of children) {
    if (child.exitCode === null && child.pid !== undefined && !isWindows) child.kill('SIGTERM')
  }
  for (const pattern of OWN_PROCESSES) {
    if (isWindows) {
      const ps = `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*${pattern}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
      spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore' })
    } else {
      spawnSync('pkill', ['-f', pattern], { stdio: 'ignore' })
    }
  }
}

function shutdown(code) {
  if (stopping) return
  stopping = true
  killChildren()
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('SIGHUP', () => shutdown(0))
process.on('exit', () => {
  stopping = true
  killChildren()
})

start(
  'api',
  '36',
  python,
  ['-m', 'flask', '--app', 'app.wsgi', 'run', '--port', String(API_PORT), '--debug'],
  backend,
)
start('web', '35', process.execPath, [vite, '--port', String(WEB_PORT), '--strictPort'], frontend)

console.log(`\n[dev] open http://localhost:${WEB_PORT}  (API on http://localhost:${API_PORT})\n`)
