#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const runtimeRoot = path.join(root, '.tmp-playwright', 'app')

fs.rmSync(runtimeRoot, { recursive: true, force: true })
fs.mkdirSync(path.join(runtimeRoot, 'cache'), { recursive: true })
fs.mkdirSync(path.join(runtimeRoot, 'config'), { recursive: true })
fs.mkdirSync(path.join(runtimeRoot, 'data'), { recursive: true })

process.env.NO_OPEN_BROWSER = '1'
process.env.HOST = process.env.HOST || '127.0.0.1'
process.env.PORT = process.env.PORT || '3015'
process.env.TTDASH_DATA_DIR = path.join(runtimeRoot, 'data')
process.env.TTDASH_CONFIG_DIR = path.join(runtimeRoot, 'config')
process.env.TTDASH_CACHE_DIR = path.join(runtimeRoot, 'cache')
process.env.XDG_CACHE_HOME = path.join(runtimeRoot, 'cache')
process.env.XDG_CONFIG_HOME = path.join(runtimeRoot, 'config')
process.env.XDG_DATA_HOME = path.join(runtimeRoot, 'data')

require(path.join(root, 'server.js'))
