import { createHash } from 'node:crypto'
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const EXPECTED_CORPUS_SIZE = 6063
export const MOE_ORIGIN = 'https://stroke-order.learningweb.moe.edu.tw'
export const MOE_DISCOVERY_URL = `${MOE_ORIGIN}/download/6063png.zip`
export const CORPUS_FORMAT_VERSION = 1
export const OUTPUT_DIRECTORY_NAME = 'hanzi-json'

const XML_COMMAND_TAGS = new Set(['MoveTo', 'LineTo', 'QuadTo', 'CubicTo'])
const PATH_TOKEN_RE = /[MLQCZ]|-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/gi

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function toHexCodepoint(character) {
  const codepoint = character.codePointAt(0)
  if (codepoint === undefined) throw new Error('Character is empty')
  return codepoint.toString(16)
}

export function validateCorpusCharacters(characters, expectedCount = EXPECTED_CORPUS_SIZE) {
  const seenCharacters = new Set()
  const seenCodepoints = new Set()
  const entries = []

  for (const character of characters) {
    const codepoint = character?.codePointAt(0)
    const expectedLength = codepoint !== undefined && codepoint > 0xffff ? 2 : 1
    if (!character || codepoint === undefined || character.length !== expectedLength) {
      throw new Error(`Corpus entry is not one Unicode codepoint: ${JSON.stringify(character)}`)
    }
    if (seenCharacters.has(character)) throw new Error(`Duplicate corpus character: ${character}`)
    if (seenCodepoints.has(codepoint)) throw new Error(`Duplicate corpus codepoint: U+${codepoint.toString(16).toUpperCase()}`)
    seenCharacters.add(character)
    seenCodepoints.add(codepoint)
    entries.push({ character, codepoint, hex: codepoint.toString(16) })
  }

  if (entries.length !== expectedCount) {
    throw new Error(`Corpus size mismatch: expected ${expectedCount}, found ${entries.length}`)
  }
  return entries.sort((a, b) => a.codepoint - b.codepoint)
}

export function decodeZipEntryName(rawName, flags) {
  if (flags & 0x800) return rawName.toString('utf8')
  return new TextDecoder('big5').decode(rawName)
}

export function listZipEntryNames(buffer) {
  let eocdOffset = -1
  const minimumOffset = Math.max(0, buffer.length - 0x10015)
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset
      break
    }
  }
  if (eocdOffset < 0) throw new Error('ZIP end-of-central-directory record not found')

  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  if (centralDirectoryOffset + centralDirectorySize > buffer.length) {
    throw new Error('ZIP central directory extends beyond the file')
  }

  const names = []
  let offset = centralDirectoryOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central-directory signature at byte ${offset}`)
    }
    const flags = buffer.readUInt16LE(offset + 8)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const rawName = buffer.subarray(offset + 46, offset + 46 + nameLength)
    names.push(decodeZipEntryName(rawName, flags))
    offset += 46 + nameLength + extraLength + commentLength
  }
  if (offset !== centralDirectoryOffset + centralDirectorySize) {
    throw new Error('ZIP central-directory byte count does not match its header')
  }
  return names
}

export function discoverCorpusFromZip(buffer) {
  const characters = listZipEntryNames(buffer)
    .filter((name) => !name.endsWith('/'))
    .map((name) => name.slice(name.lastIndexOf('/') + 1))
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => name.slice(0, -4))
  return validateCorpusCharacters(characters)
}

function decodeJavascriptStringLiteral(value) {
  try {
    return JSON.parse(`"${value}"`)
  } catch (error) {
    throw new Error(`Cannot decode embedded XML JavaScript string: ${error.message}`)
  }
}

export function extractStrokeXml(html, expectedCharacter) {
  const codepoint = expectedCharacter.codePointAt(0)
  const pattern = new RegExp(`xml\\[${codepoint}\\]\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  const match = pattern.exec(html)
  if (!match) throw new Error('Embedded stroke XML was not found')
  const xml = decodeJavascriptStringLiteral(match[1])
  const unicode = /<Word\b[^>]*\bunicode="([^"]+)"/.exec(xml)?.[1]
  const warnings = []
  if (unicode !== expectedCharacter) {
    const escapedCharacter = expectedCharacter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pageIdentityMatches = new RegExp(`var\\s+word\\s*=\\s*['"]${escapedCharacter}['"]\\s*,\\s*uni\\s*=\\s*${codepoint}\\b`).test(html)
    if (codepoint > 0xffff && unicode === '?' && pageIdentityMatches) {
      warnings.push('xml-unicode-attribute-lossy-non-bmp')
    } else {
      throw new Error(`XML character mismatch: expected ${expectedCharacter}, received ${unicode ?? 'none'}`)
    }
  }
  return { xml, warnings }
}

function parseAttributes(text, context) {
  const attributes = {}
  const consumed = []
  const pattern = /([A-Za-z][\w-]*)="([^"]*)"/g
  for (const match of text.matchAll(pattern)) {
    attributes[match[1]] = match[2]
    consumed.push([match.index, match.index + match[0].length])
  }
  let remainder = text
  for (const [start, end] of consumed.reverse()) {
    remainder = remainder.slice(0, start) + remainder.slice(end)
  }
  if (remainder.trim()) throw new Error(`${context}: malformed attributes: ${remainder.trim()}`)
  return attributes
}

function finiteNumber(value, context) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${context}: non-finite or missing coordinate ${JSON.stringify(value)}`)
  return number
}

function coordinatePair(attributes, xName, yName, context) {
  return [finiteNumber(attributes[xName], `${context}.${xName}`), finiteNumber(attributes[yName], `${context}.${yName}`)]
}

function parseSelfClosingTags(block, context) {
  const matches = [...block.matchAll(/<([A-Za-z][\w-]*)\b([^>]*)\/>/g)]
  let remainder = block
  for (const match of [...matches].reverse()) {
    remainder = remainder.slice(0, match.index) + remainder.slice(match.index + match[0].length)
  }
  if (remainder.trim()) throw new Error(`${context}: unsupported or malformed XML content`)
  return matches.map((match, index) => ({
    name: match[1],
    attributes: parseAttributes(match[2], `${context}[${index}]`),
  }))
}

export function transformMoePoint([x, y]) {
  return [x / 2, 900 - y / 2]
}

function formatNumber(value) {
  if (Object.is(value, -0)) return '0'
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function pathCommand(tag, strokeIndex, commandIndex, sourceCoordinates) {
  const context = `stroke ${strokeIndex + 1} outline command ${commandIndex + 1}`
  const { name, attributes } = tag
  if (!XML_COMMAND_TAGS.has(name)) throw new Error(`${context}: unsupported command ${name}`)
  if (name === 'MoveTo' || name === 'LineTo') {
    const [x, y] = transformMoePoint(coordinatePair(attributes, 'x', 'y', context))
    return { text: `${name === 'MoveTo' ? 'M' : 'L'} ${formatNumber(x)} ${formatNumber(y)}`, sourceCoordinates }
  }
  if (name === 'QuadTo') {
    const [x1, y1] = transformMoePoint(coordinatePair(attributes, 'x1', 'y1', context))
    const [x2, y2] = transformMoePoint(coordinatePair(attributes, 'x2', 'y2', context))
    return { text: `Q ${formatNumber(x1)} ${formatNumber(y1)} ${formatNumber(x2)} ${formatNumber(y2)}`, sourceCoordinates }
  }
  const [x1, y1] = transformMoePoint(coordinatePair(attributes, 'x1', 'y1', context))
  const [x2, y2] = transformMoePoint(coordinatePair(attributes, 'x2', 'y2', context))
  const [x3, y3] = transformMoePoint(coordinatePair(attributes, 'x3', 'y3', context))
  return { text: `C ${formatNumber(x1)} ${formatNumber(y1)} ${formatNumber(x2)} ${formatNumber(y2)} ${formatNumber(x3)} ${formatNumber(y3)}`, sourceCoordinates }
}

function collectCoordinateValues(attributes) {
  return Object.entries(attributes)
    .filter(([name]) => /^x\d?$|^y\d?$/.test(name))
    .map(([name, value]) => ({ axis: name[0], value: finiteNumber(value, `attribute ${name}`) }))
}

export function convertMoeXmlToHanziData(xml) {
  const strokeMatches = [...xml.matchAll(/<Stroke\b[^>]*>([\s\S]*?)<\/Stroke>/g)]
  if (!strokeMatches.length) throw new Error('XML contains no Stroke elements')

  const strokes = []
  const medians = []
  const warnings = []
  let minimumX = Infinity
  let maximumX = -Infinity
  let minimumY = Infinity
  let maximumY = -Infinity

  const observeCoordinates = (attributes, context) => {
    for (const { axis, value } of collectCoordinateValues(attributes)) {
      if (axis === 'x') {
        minimumX = Math.min(minimumX, value)
        maximumX = Math.max(maximumX, value)
      } else {
        minimumY = Math.min(minimumY, value)
        maximumY = Math.max(maximumY, value)
      }
      if (value < 0 || value > 2048) warnings.push(`${context}: ${axis}=${value} is outside 0..2048`)
    }
  }

  strokeMatches.forEach((strokeMatch, strokeIndex) => {
    const block = strokeMatch[1]
    const outlineMatch = /<Outline\b[^>]*>([\s\S]*?)<\/Outline>/.exec(block)
    const trackMatch = /<Track\b[^>]*>([\s\S]*?)<\/Track>/.exec(block)
    if (!outlineMatch || !trackMatch) throw new Error(`stroke ${strokeIndex + 1}: missing Outline or Track`)
    const outside = block.replace(outlineMatch[0], '').replace(trackMatch[0], '').trim()
    if (outside) throw new Error(`stroke ${strokeIndex + 1}: unsupported XML beside Outline/Track`)

    const outlineTags = parseSelfClosingTags(outlineMatch[1], `stroke ${strokeIndex + 1} Outline`)
    if (!outlineTags.length) throw new Error(`stroke ${strokeIndex + 1}: empty Outline`)
    if (outlineTags[0].name !== 'MoveTo') throw new Error(`stroke ${strokeIndex + 1}: Outline must begin with MoveTo`)
    const commandTexts = outlineTags.map((tag, commandIndex) => {
      observeCoordinates(tag.attributes, `stroke ${strokeIndex + 1} outline command ${commandIndex + 1}`)
      return pathCommand(tag, strokeIndex, commandIndex).text
    })

    const trackTags = parseSelfClosingTags(trackMatch[1], `stroke ${strokeIndex + 1} Track`)
    if (!trackTags.length) throw new Error(`stroke ${strokeIndex + 1}: empty Track`)
    if (trackTags.some((tag) => tag.name !== 'MoveTo' && tag.name !== 'LineTo')) {
      throw new Error(`stroke ${strokeIndex + 1}: Track contains a command other than MoveTo or LineTo`)
    }
    if (trackTags.length < 2) throw new Error(`stroke ${strokeIndex + 1}: Track has fewer than two points`)
    const median = trackTags.map((tag, pointIndex) => {
      observeCoordinates(tag.attributes, `stroke ${strokeIndex + 1} track point ${pointIndex + 1}`)
      return transformMoePoint(coordinatePair(tag.attributes, 'x', 'y', `stroke ${strokeIndex + 1} track point ${pointIndex + 1}`))
    })

    strokes.push(`${commandTexts.join(' ')} Z`)
    medians.push(median)
  })

  return {
    data: { strokes, medians },
    diagnostics: {
      strokeCount: strokes.length,
      warnings,
      sourceBounds: { minimumX, maximumX, minimumY, maximumY },
    },
  }
}

export function validateSvgPath(path) {
  if (typeof path !== 'string' || !path.trim()) return false
  const tokens = path.match(PATH_TOKEN_RE) ?? []
  const compactOriginal = path.replace(/[\s,]+/g, '')
  const compactTokens = tokens.join('')
  if (compactOriginal.toUpperCase() !== compactTokens.toUpperCase()) return false
  const arity = { M: 2, L: 2, Q: 4, C: 6, Z: 0 }
  let index = 0
  let sawMove = false
  while (index < tokens.length) {
    const command = tokens[index].toUpperCase()
    if (!(command in arity)) return false
    if (!sawMove && command !== 'M') return false
    if (command === 'M') sawMove = true
    index += 1
    for (let count = 0; count < arity[command]; count += 1) {
      if (index >= tokens.length || /^[MLQCZ]$/i.test(tokens[index]) || !Number.isFinite(Number(tokens[index]))) return false
      index += 1
    }
  }
  return sawMove && tokens.at(-1)?.toUpperCase() === 'Z'
}

export function validateHanziCharacterData(data) {
  const failures = []
  if (!data || !Array.isArray(data.strokes) || !Array.isArray(data.medians)) {
    return ['missing strokes or medians arrays']
  }
  if (!data.strokes.length) failures.push('zero-stroke')
  if (data.strokes.length !== data.medians.length) failures.push('strokes-medians-mismatch')
  data.strokes.forEach((path, index) => {
    if (!validateSvgPath(path)) failures.push(`malformed-path:${index}`)
  })
  data.medians.forEach((median, strokeIndex) => {
    if (!Array.isArray(median) || !median.length) {
      failures.push(`empty-median:${strokeIndex}`)
      return
    }
    if (median.length < 2) failures.push(`short-median:${strokeIndex}`)
    median.forEach((point, pointIndex) => {
      if (!Array.isArray(point) || point.length !== 2 || point.some((value) => !Number.isFinite(value))) {
        failures.push(`non-finite-coordinate:${strokeIndex}:${pointIndex}`)
      }
    })
  })
  return failures
}

function retryDelay(attempt, retryAfter) {
  const parsed = Number(retryAfter)
  if (Number.isFinite(parsed) && parsed >= 0) return parsed * 1000
  return Math.min(30_000, 750 * (2 ** attempt)) + Math.floor(Math.random() * 250)
}

export async function fetchWithRetry(url, options = {}, attempts = 7) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`HTTP ${response.status} from ${url}`)
      }
      lastError = new Error(`HTTP ${response.status} from ${url}`)
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, response.headers.get('retry-after'))))
    } catch (error) {
      lastError = error
      if (attempt === attempts - 1) break
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)))
    }
  }
  throw lastError
}

export async function loadCheckpoint(path, outputDirectory) {
  const completed = new Map()
  if (!existsSync(path)) return completed
  const text = await readFile(path, 'utf8')
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (record.status !== 'ok' || !record.hex || !record.sha256) continue
    const filePath = join(outputDirectory, OUTPUT_DIRECTORY_NAME, `${record.hex}.json`)
    if (!existsSync(filePath)) continue
    const bytes = await readFile(filePath)
    if (sha256(bytes) !== record.sha256 || bytes.length !== record.bytes) continue
    try {
      const failures = validateHanziCharacterData(JSON.parse(bytes.toString('utf8')))
      if (failures.length) continue
    } catch { continue }
    completed.set(record.hex, record)
  }
  return completed
}

export async function generateCorpus({ outputDirectory, concurrency = 4, onProgress = () => {} }) {
  const sourceDirectory = join(outputDirectory, 'source')
  const xmlDirectory = join(outputDirectory, 'source-xml')
  const jsonDirectory = join(outputDirectory, OUTPUT_DIRECTORY_NAME)
  const zipPath = join(sourceDirectory, '6063png.zip')
  const checkpointPath = join(outputDirectory, 'checkpoint.ndjson')
  await Promise.all([mkdir(sourceDirectory, { recursive: true }), mkdir(xmlDirectory, { recursive: true }), mkdir(jsonDirectory, { recursive: true })])

  let zipBytes
  if (existsSync(zipPath)) zipBytes = await readFile(zipPath)
  else {
    const response = await fetchWithRetry(MOE_DISCOVERY_URL, { headers: { 'User-Agent': 'Digital_teaching_tools MOE stroke corpus generator (noncommercial education)' } })
    zipBytes = Buffer.from(await response.arrayBuffer())
    await writeFile(zipPath, zipBytes)
  }
  const corpus = discoverCorpusFromZip(zipBytes)
  const completed = await loadCheckpoint(checkpointPath, outputDirectory)
  const failures = []
  let cursor = 0
  let processed = completed.size

  async function worker() {
    while (cursor < corpus.length) {
      const entry = corpus[cursor]
      cursor += 1
      if (completed.has(entry.hex)) continue
      const sourceUrl = `${MOE_ORIGIN}/dictView.jsp?ID=${entry.codepoint}`
      try {
        const response = await fetchWithRetry(sourceUrl, { headers: { 'User-Agent': 'Digital_teaching_tools MOE stroke corpus generator (noncommercial education)' } })
        const html = await response.text()
        const extracted = extractStrokeXml(html, entry.character)
        const { xml } = extracted
        const converted = convertMoeXmlToHanziData(xml)
        converted.diagnostics.warnings.unshift(...extracted.warnings)
        const validationFailures = validateHanziCharacterData(converted.data)
        if (validationFailures.length) throw new Error(validationFailures.join(', '))
        const body = `${JSON.stringify(converted.data)}\n`
        const bodyBytes = Buffer.from(body)
        const manifestEntry = {
          character: entry.character,
          codepoint: entry.codepoint,
          hex: entry.hex,
          sourceUrl,
          strokeCount: converted.diagnostics.strokeCount,
          sourceBounds: converted.diagnostics.sourceBounds,
          warnings: converted.diagnostics.warnings,
          sha256: sha256(bodyBytes),
          bytes: bodyBytes.length,
          status: 'ok',
        }
        await Promise.all([
          writeFile(join(xmlDirectory, `${entry.hex}.xml`), xml, 'utf8'),
          writeFile(join(jsonDirectory, `${entry.hex}.json`), bodyBytes),
        ])
        await appendFile(checkpointPath, `${JSON.stringify(manifestEntry)}\n`, 'utf8')
        completed.set(entry.hex, manifestEntry)
      } catch (error) {
        const failure = { character: entry.character, codepoint: entry.codepoint, hex: entry.hex, sourceUrl, error: error.message }
        failures.push(failure)
        await appendFile(checkpointPath, `${JSON.stringify({ ...failure, status: 'error' })}\n`, 'utf8')
      } finally {
        processed += 1
        onProgress(processed, corpus.length, entry)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), 8) }, () => worker()))
  const entries = corpus.map((entry) => completed.get(entry.hex)).filter(Boolean)
  const manifest = {
    formatVersion: CORPUS_FORMAT_VERSION,
    authority: 'Ministry of Education, Republic of China (Taiwan)',
    title: '國字標準字體筆順學習網 2025',
    purpose: 'Noncommercial teaching use only',
    license: 'CC BY-NC-ND 3.0 Taiwan',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/3.0/tw/',
    sourceUrl: MOE_ORIGIN,
    discoveryUrl: MOE_DISCOVERY_URL,
    generatedAt: new Date().toISOString(),
    expectedCount: EXPECTED_CORPUS_SIZE,
    discoveredCount: corpus.length,
    uniqueCount: new Set(corpus.map((entry) => entry.character)).size,
    convertedCount: entries.length,
    failedCount: failures.length,
    adapter: {
      x: "x' = x / 2",
      y: "y' = 900 - y / 2",
      outline: 'MoveTo/LineTo/QuadTo/CubicTo to SVG M/L/Q/C/Z',
      track: 'MoveTo/LineTo endpoints retained in source order as Hanzi Writer medians',
    },
    discoverySha256: sha256(zipBytes),
    entries,
    failures,
  }
  await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

export async function validateGeneratedCorpus(directory) {
  const manifestPath = join(directory, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const jsonDirectory = join(directory, OUTPUT_DIRECTORY_NAME)
  const jsonFiles = (await readdir(jsonDirectory)).filter((name) => name.endsWith('.json')).sort()
  const counts = {
    expected: EXPECTED_CORPUS_SIZE,
    discovered: manifest.discoveredCount,
    unique: manifest.uniqueCount,
    converted: manifest.convertedCount,
    files: jsonFiles.length,
    failed: manifest.failures?.length ?? 0,
    warnings: 0,
    strokesMediansMismatch: 0,
    zeroStroke: 0,
    emptyMedian: 0,
    malformedPath: 0,
    nonFiniteCoordinates: 0,
    outOfExpectedSourceRange: 0,
  }
  const failures = []
  const warnings = []
  const manifestEntries = new Map(manifest.entries.map((entry) => [entry.hex, entry]))

  for (const filename of jsonFiles) {
    const hex = filename.slice(0, -5)
    const entry = manifestEntries.get(hex)
    if (!entry) {
      failures.push({ hex, issues: ['file-not-in-manifest'] })
      continue
    }
    const bytes = await readFile(join(jsonDirectory, filename))
    const issues = []
    if (sha256(bytes) !== entry.sha256) issues.push('sha256-mismatch')
    if (bytes.length !== entry.bytes) issues.push('byte-length-mismatch')
    let data
    try { data = JSON.parse(bytes.toString('utf8')) } catch { issues.push('invalid-json') }
    if (data) issues.push(...validateHanziCharacterData(data))
    if (issues.some((issue) => issue === 'strokes-medians-mismatch')) counts.strokesMediansMismatch += 1
    if (issues.some((issue) => issue === 'zero-stroke')) counts.zeroStroke += 1
    if (issues.some((issue) => issue.startsWith('empty-median') || issue.startsWith('short-median'))) counts.emptyMedian += 1
    if (issues.some((issue) => issue.startsWith('malformed-path'))) counts.malformedPath += 1
    if (issues.some((issue) => issue.startsWith('non-finite-coordinate'))) counts.nonFiniteCoordinates += 1
    if (issues.length) failures.push({ character: entry.character, hex, issues })
    if (entry.warnings?.length) {
      counts.warnings += entry.warnings.length
      counts.outOfExpectedSourceRange += entry.warnings.filter((warning) => warning.includes('outside 0..2048')).length
      warnings.push({ character: entry.character, hex, warnings: entry.warnings })
    }
  }

  for (const entry of manifest.entries) {
    if (!jsonFiles.includes(`${entry.hex}.json`)) failures.push({ character: entry.character, hex: entry.hex, issues: ['manifest-file-missing'] })
  }
  const requiredCountsPass = [counts.discovered, counts.unique, counts.converted, counts.files].every((count) => count === EXPECTED_CORPUS_SIZE)
  const pass = requiredCountsPass && counts.failed === 0 && failures.length === 0
  const report = {
    generatedAt: new Date().toISOString(),
    pass,
    counts,
    failures,
    warnings,
    manifestPath,
  }
  await writeFile(join(directory, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return report
}

export async function publishValidatedCorpus(stagingDirectory, publicDirectory) {
  const report = JSON.parse(await readFile(join(stagingDirectory, 'validation-report.json'), 'utf8'))
  if (!report.pass || report.counts.converted !== EXPECTED_CORPUS_SIZE || report.counts.files !== EXPECTED_CORPUS_SIZE) {
    throw new Error('Refusing to publish: staging corpus has not passed 6063/6063 validation')
  }
  const sourceDirectory = join(stagingDirectory, OUTPUT_DIRECTORY_NAME)
  await mkdir(publicDirectory, { recursive: true })
  const sourceFiles = (await readdir(sourceDirectory)).filter((name) => name.endsWith('.json'))
  if (sourceFiles.length !== EXPECTED_CORPUS_SIZE) throw new Error('Refusing to publish: source file count changed')
  for (const filename of sourceFiles) {
    await writeFile(join(publicDirectory, filename), await readFile(join(sourceDirectory, filename)))
  }
  await writeFile(join(publicDirectory, 'manifest.json'), await readFile(join(stagingDirectory, 'manifest.json')))
  return { count: sourceFiles.length, bytes: (await Promise.all(sourceFiles.map((filename) => stat(join(publicDirectory, filename))))).reduce((sum, value) => sum + value.size, 0) }
}

export async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true })
}
