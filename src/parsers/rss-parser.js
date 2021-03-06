const Parser = require('rss-parser')

const { NotAFeedError, ParserError } = require('../errors')

const parser = new Parser()

function transform(parsed) {
  if (!parsed) return null
  const entries = parsed.items.map(entry =>
    Object.assign(
      {
        categories: [],
      },
      entry,
      {
        author: entry.author || entry['dc:creator'],
        pubDate: entry.isoDate,
      }
    )
  )
  return Object.assign({}, parsed, { entries, parser: 'RSS_PARSER' })
}

module.exports = function parseString(document, options) {
  return new Promise((resolve, reject) => {
    parser.parseString(document, function(error, parsed) {
      if (error) {
        if (/Line:/.test(error.message) && /Column:/.test(error.message)) {
          return reject(new NotAFeedError())
        }
        return reject(new ParserError(error, 'RSS_PARSER'))
      }

      resolve(transform(parsed, options))
    })
  })
}
