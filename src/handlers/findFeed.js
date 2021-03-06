const cheerio = require('cheerio')
const normalizeUrl = require('normalize-url')

const { parseFromString, parseFromQuery } = require('./feed')

const request = require('../request')

const normalizeOptions = { removeTrailingSlash: false }

module.exports = async function findFeed({ url, normalize }) {
  const normalizedUrl = normalize ? normalizeUrl(url, normalizeOptions) : url
  let response = null
  let content

  try {
    response = await request(normalizedUrl)
    content = response.text
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.log(error) // eslint-disable-line no-console
    }
    return []
  }

  if (
    /application\/(rss|atom)/.test(response.contentType) ||
    /(application|text)\/xml/.test(response.contentType)
  ) {
    try {
      const { title } = await parseFromString({ content })
      return [{ title, link: normalizedUrl }]
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        console.log(error) // eslint-disable-line no-console
      }
    }
  }

  const dom = cheerio.load(response.text)

  if (dom('rss')) {
    try {
      const { title } = await parseFromString({ content })
      return [{ title, link: normalizedUrl }]
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        console.log(error) // eslint-disable-line no-console
      }
    }
  }

  const $linkTags = dom('link[rel="alternate"][type="application/rss+xml"]').add(
    'link[rel="alternate"][type="application/atom+xml"]'
  )

  const urls = $linkTags
    .map((index, $linkTag) => {
      const link = $linkTag.attribs.href
      return normalizeUrl(/^\//.test(link) ? url + link : link, normalizeOptions)
    })
    .toArray()

  const result = (
    await Promise.all(
      urls.map(async url => {
        try {
          const { title } = await parseFromQuery({ url })
          return { title, link: url }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
            console.log(error) // eslint-disable-line no-console
          }
        }
      })
    )
  ).filter(item => item !== undefined && item !== null)

  if (result.length === 0 && normalize) {
    return findFeed({ url, normalize: false })
  }

  return result
}
