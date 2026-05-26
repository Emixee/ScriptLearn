#!/usr/bin/env node
// Lance electron-vite dev en s'assurant que ELECTRON_RUN_AS_NODE n'est pas défini
const { spawn } = require('child_process')

delete process.env.ELECTRON_RUN_AS_NODE

const child = spawn(
  'npx',
  ['electron-vite', 'dev'],
  {
    stdio: 'inherit',
    shell: true,
    env: process.env
  }
)

child.on('exit', (code) => process.exit(code ?? 0))
