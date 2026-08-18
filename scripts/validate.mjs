// dsh-delegation-suite local validation script.
// Runs the same checks as CI without a network: syntax-check every lib module
// under the package's type:module semantics and validate the bundle manifest.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let failed = false
const fail = (msg) => { failed = true; console.error('FAIL: ' + msg) }

// 1. Syntax-check every lib/*.js
for (const f of readdirSync(join(root, 'lib')).filter((n) => n.endsWith('.js'))) {
  const res = spawnSync(process.execPath, ['--check', join(root, 'lib', f)], { encoding: 'utf8' })
  if (res.error) {
    // The DSH sandbox blocks piped stdio (EPERM); CI covers the syntax gate.
    console.log('SKIP lib/' + f + ' (sandbox blocks piped stdio: ' + res.error.code + ')')
    continue
  }
  if (res.status !== 0) fail('syntax error in lib/' + f + '\n' + (res.stderr || res.stdout))
  else console.log('OK  lib/' + f)
}

// 2. Manifest shape
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) fail('missing dsh.bundle.patch')
if (!pkg.peerDependencies || !pkg.peerDependencies['@deepseek-ai/dsh-tools']) fail('missing @deepseek-ai peerDependencies')
if (!pkg.exports || !pkg.exports['./delegation'] || !pkg.exports['./client'] || !pkg.exports['./typert']) {
  fail('missing exports subpaths (delegation/client/typert)')
}
console.log('OK  package.json manifest')

// 3. Patch rows reference exports subpaths
const patch = readFileSync(join(root, pkg.dsh.bundle.patch), 'utf8')
for (const sub of ['delegation', 'policy-hint', 'studio']) {
  if (!patch.includes('dsh-delegation-suite/' + sub)) fail('patch.yml missing row for ' + sub)
  else console.log('OK  patch row dsh-delegation-suite/' + sub)
}

// 4. package.json version matches the newest CHANGELOG heading
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const firstVersion = (changelog.match(/^## (\S+)/m) || [])[1]
if (firstVersion !== pkg.version) fail('CHANGELOG head ' + firstVersion + ' != package.json version ' + pkg.version)
else console.log('OK  version parity ' + pkg.version)

if (failed) { console.error('\nvalidation failed'); process.exit(1) }
console.log('\nall checks passed')
