#!/usr/bin/env node

const { createAppRuntime } = require('./server/app-runtime');

if (require.main === module) {
  createAppRuntime().bootstrapCli();
}
