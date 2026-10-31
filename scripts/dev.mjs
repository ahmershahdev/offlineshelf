// `npm run dev` from the repo root: starts MariaDB and Redis in Docker, applies migrations, then
// runs the Flask API (port 5000) and the Vite dev server (port 5173, proxies /api) side by side.
// Ctrl+C stops the API and Vite; the containers keep running (`npm run dev:down` stops them).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const backend = join(root, 'backend')
const frontend = join(root, 'frontend')
const isWindows = process.platform === 'win32'

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

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows, ...options })
  if (result.status !== 0) fail(`"${cmd} ${args.join(' ')}" failed`)
}

function has(cmd) {
  return spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: isWindows }).status === 0
}

for (const tool of ['docker', 'uv', 'npm']) {
  if (!has(tool)) fail(`${tool} is not installed or not on PATH.`)
}

const fileEnv = readEnv()
const env = {
  ...process.env,
  ...fileEnv,
  OFFLINESHELF_ENV: 'dev',
  OFFLINESHELF_DATABASE_URL: `mariadb+pymysql://offlineshelf:${fileEnv.MARIADB_PASSWORD}@127.0.0.1:3306/offlineshelf`,
  OFFLINESHELF_REDIS_URL: 'redis://127.0.0.1:6379/0',
  OFFLINESHELF_SITE_URL: 'http://localhost:5173',
  OFFLINESHELF_TRUSTED_PROXIES: '0',
}

console.log('[dev] starting MariaDB and Redis')
run('docker', ['compose', 'up', '-d', '--wait', 'mariadb', 'redis'], { cwd: root })

if (!existsSync(join(backend, '.venv'))) run('uv', ['sync'], { cwd: backend })
if (!existsSync(join(frontend, 'node_modules'))) run('npm', ['ci'], { cwd: frontend })

console.log('[dev] applying migrations')
run('uv', ['run', 'alembic', 'upgrade', 'head'], { cwd: backend, env })

const children = [
  ['api', 'uv', ['run', 'flask', '--app', 'app.wsgi', 'run', '--port', '5000', '--debug'], backend],
  ['web', 'npm', ['run', 'dev'], frontend],
].map(([name, cmd, args, cwd]) => {
  const child = spawn(cmd, args, { cwd, env, shell: isWindows, stdio: ['ignore', 'pipe', 'pipe'] })
  const prefix = name === 'api' ? '\x1b[36m[api]\x1b[0m ' : '\x1b[35m[web]\x1b[0m '
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) out.write(prefix + line + '\n')
    })
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    console.log(`${prefix}exited with ${code}`)
    shutdown(code ?? 0)
  })
  return child
})

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null) continue
    // On Windows the child is a shell; taskkill /T takes the whole process tree with it.
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('\n[dev] open http://localhost:5173  (API on http://localhost:5000)\n')
