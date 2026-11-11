#!/usr/bin/env node
import { resolve } from 'node:path'
import { generateCorpus, EXPECTED_CORPUS_SIZE } from './moe-corpus-lib.mjs'

const args = process.argv.slice(2)
const outputIndex = args.indexOf('--out')
const concurrencyIndex = args.indexOf('--concurrency')
const outputDirectory = resolve(outputIndex >= 0 ? args[outputIndex + 1] : '.moe-stroke-staging')
const concurrency = concurrencyIndex >= 0 ? Number(args[concurrencyIndex + 1]) : 4
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('--concurrency must be an integer from 1 to 8')

console.log(`[MOE corpus] staging output: ${outputDirectory}`)
const manifest = await generateCorpus({
  outputDirectory,
  concurrency,
  onProgress(done, total, entry) {
    if (done % 100 === 0 || done === total) console.log(`[MOE corpus] ${done}/${total}; last=${entry.character} U+${entry.hex.toUpperCase()}`)
  },
})
console.log(JSON.stringify({
  expected: EXPECTED_CORPUS_SIZE,
  discovered: manifest.discoveredCount,
  unique: manifest.uniqueCount,
  converted: manifest.convertedCount,
  failed: manifest.failedCount,
}, null, 2))
if (manifest.convertedCount !== EXPECTED_CORPUS_SIZE || manifest.failedCount !== 0) process.exitCode = 1
