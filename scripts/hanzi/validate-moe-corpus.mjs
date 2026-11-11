#!/usr/bin/env node
import { resolve } from 'node:path'
import { validateGeneratedCorpus } from './moe-corpus-lib.mjs'

const args = process.argv.slice(2)
const directory = resolve(args[0] ?? '.moe-stroke-staging')
const report = await validateGeneratedCorpus(directory)
console.log(JSON.stringify(report.counts, null, 2))
if (!report.pass) {
  console.error(JSON.stringify(report.failures.slice(0, 50), null, 2))
  process.exitCode = 1
}
