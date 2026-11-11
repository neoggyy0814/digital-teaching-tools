#!/usr/bin/env node
import { resolve } from 'node:path'
import { publishValidatedCorpus } from './moe-corpus-lib.mjs'

const stagingDirectory = resolve(process.argv[2] ?? '.moe-stroke-staging')
const publicDirectory = resolve(process.argv[3] ?? 'public/hanzi-data/moe')
const result = await publishValidatedCorpus(stagingDirectory, publicDirectory)
console.log(JSON.stringify({ publicDirectory, ...result }, null, 2))
