import { useEffect, useState } from 'react'
import { loadCharacterData } from './hanziData.js'

export default function HanziGlyph({ character }) {
  const [strokes, setStrokes] = useState([])

  useEffect(() => {
    let active = true
    loadCharacterData(character)
      .then((data) => { if (active) setStrokes(data.strokes) })
      .catch(() => { if (active) setStrokes([]) })
    return () => { active = false }
  }, [character])

  return (
    <svg className="hanzi-glyph" viewBox="0 0 1024 1024" aria-label={character} role="img">
      <g transform="translate(0 900) scale(1 -1)">
        {strokes.map((path, index) => <path d={path} key={`${character}-${index}`} />)}
      </g>
    </svg>
  )
}
