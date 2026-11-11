import assert from 'node:assert/strict'
import test from 'node:test'
import {
  convertMoeXmlToHanziData,
  extractStrokeXml,
  transformMoePoint,
  validateHanziCharacterData,
  validateSvgPath,
} from './moe-corpus-lib.mjs'

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Word version="1.0" unicode="測">
  <Stroke>
    <Outline>
      <MoveTo x="0" y="0" />
      <LineTo flexible="false" x="2048" y="2048" />
      <QuadTo flexible="false" x1="100" y1="200" x2="300" y2="400" />
      <CubicTo flexible="false" x1="500" y1="600" x2="700" y2="800" x3="900" y3="1000" />
    </Outline>
    <Track><MoveTo x="0" y="0" /><MoveTo x="2048" y="2048" /></Track>
  </Stroke>
</Word>`

test('uses the single fixed MOE-to-Hanzi-Writer coordinate transform', () => {
  assert.deepEqual(transformMoePoint([0, 0]), [0, 900])
  assert.deepEqual(transformMoePoint([2048, 2048]), [1024, -124])
})

test('converts the supported MOE outline and ordered track schema', () => {
  const converted = convertMoeXmlToHanziData(SAMPLE_XML)
  assert.deepEqual(converted.data.medians, [[[0, 900], [1024, -124]]])
  assert.match(converted.data.strokes[0], /^M 0 900 L 1024 -124 Q /)
  assert.match(converted.data.strokes[0], / C .* Z$/)
  assert.deepEqual(validateHanziCharacterData(converted.data), [])
})

test('extracts the matching character XML from the page JavaScript literal', () => {
  const embedded = JSON.stringify(SAMPLE_XML)
  const html = `<script>xml[28204]=${embedded};</script>`
  assert.deepEqual(extractStrokeXml(html, '測'), { xml: SAMPLE_XML, warnings: [] })
})

test('rejects malformed paths and one-point medians', () => {
  assert.equal(validateSvgPath('M 0 0 L nope Z'), false)
  assert.deepEqual(validateHanziCharacterData({ strokes: ['M 0 0 L 1 1 Z'], medians: [[[0, 0]]] }), ['short-median:0'])
})

test('accepts MoveTo and LineTo track points in document order like the MOE renderer', () => {
  const converted = convertMoeXmlToHanziData(SAMPLE_XML.replace('<MoveTo x="2048" y="2048" />', '<LineTo x="2048" y="2048" />'))
  assert.deepEqual(converted.data.medians, [[[0, 900], [1024, -124]]])
})

test('uses the keyed official page identity when a non-BMP XML attribute is lossy', () => {
  const character = '𥑮'
  const codepoint = character.codePointAt(0)
  const xml = SAMPLE_XML.replace('unicode="測"', 'unicode="?"')
  const html = `<script>var word='${character}', uni=${codepoint}; xml[${codepoint}]=${JSON.stringify(xml)};</script>`
  const extracted = extractStrokeXml(html, character)
  assert.equal(extracted.xml, xml)
  assert.deepEqual(extracted.warnings, ['xml-unicode-attribute-lossy-non-bmp'])
})
