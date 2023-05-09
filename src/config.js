import { HEADERS } from './lib/constants.js'

export default {
  app: {
    dataSource: process.env.APP_DATA_SOURCE || 'mongodb'
  },
  europeana: {
    apiKey: process.env['EUROPEANA_API_KEY'],
    apiUrl: process.env['EUROPEANA_API_URL'] || 'https://api.europeana.eu/record',
    permittedApiUrls: (process.env['EUROPEANA_PERMITTED_API_URLS'] || 'https://api.europeana.eu/record').split(',')
  },
  headersToProxy: [
    HEADERS.ACCEPT_RANGES,
    HEADERS.CONTENT_LENGTH,
    HEADERS.CONTENT_TYPE,
    HEADERS.ETAG,
    HEADERS.LAST_MODIFIED,
    HEADERS.LINK
  ],
  mongodb: {
    database: process.env.MONGODB_DATABASE,
    uri: process.env.MONGODB_URI
  },
  port: process.env.PORT || 3000
}
