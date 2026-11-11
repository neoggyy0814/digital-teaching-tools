const characterCache = new Map()

export function isHanzi(character) {
  return /\p{Script=Han}/u.test(character)
}

export function normalizeHanziInput(value) {
  return [...value].filter((character) => !/\s/u.test(character))
}

export async function loadCharacterData(character) {
  if (characterCache.has(character)) return characterCache.get(character)

  const codepoint = character.codePointAt(0)
  const filename = codepoint === undefined ? '' : codepoint.toString(16)
  const request = fetch(`${import.meta.env.BASE_URL}hanzi-data/moe/${filename}.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`「${character}」目前不在台灣教育部標準字體筆順資料中。`)
      return response.json()
    })
    .catch((error) => {
      characterCache.delete(character)
      throw error
    })

  characterCache.set(character, request)
  return request
}

export async function validateCharacters(characters) {
  const uniqueCharacters = [...new Set(characters)]
  const results = await Promise.all(uniqueCharacters.map(async (character) => {
    if (!isHanzi(character)) return { character, valid: false }
    try {
      await loadCharacterData(character)
      return { character, valid: true }
    } catch {
      return { character, valid: false }
    }
  }))
  return results.filter((result) => !result.valid).map((result) => result.character)
}
