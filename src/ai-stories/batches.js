import firstBatch from './first-batch.json'

export const storyBatches = [
  { id: 'first', label: '第一彈', episodes: firstBatch },
].filter(({ episodes }) => episodes.length > 0)
