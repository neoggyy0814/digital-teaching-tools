// Only public respondent and Publish-to-web URLs. Never use a Sheet /edit URL.
export const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfScWZ0SNBtAp7MmS_8khdB_rr_-yvVgCShph9DpdG_b0pbdA/viewform'
export const sheetPublishedUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhjfXPtvKQ4FSliKlq26HsdjChQLs8qeRSABj6i1KGtjhqWpi51jZXeGrBgdYedsEduiCUBDrPL1y8/pubhtml?gid=26982722&single=true&widget=true&headers=false'

function embedUrl(value) {
  try {
    const url = new URL(value)
    if (url.origin !== 'https://docs.google.com' || !/^\/spreadsheets\/d\/(?:e\/)?[\w-]+\/pubhtml$/.test(url.pathname) || url.searchParams.get('gid') !== '26982722') return ''
    url.searchParams.set('single', 'true')
    url.searchParams.set('widget', 'false')
    url.searchParams.set('headers', 'false')
    url.searchParams.set('chrome', 'false')
    return url.href
  } catch { return '' }
}

export const sheetEmbedUrl = embedUrl(sheetPublishedUrl)
