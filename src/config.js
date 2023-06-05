import { EUROPEANA_APIS, HTTP_HEADERS } from './lib/constants.js'

export default {
  app: {
    dataSource: process.env.APP_DATA_SOURCE || 'mongodb'
  },
  europeana: {
    apiKey: process.env['EUROPEANA_API_KEY'],
    apiUrl: process.env['EUROPEANA_API_URL'] || EUROPEANA_APIS.RECORD,
    permittedApiUrls: (process.env['EUROPEANA_PERMITTED_API_URLS'] || EUROPEANA_APIS.RECORD).split(',')
  },
  headersToProxy: [
    HTTP_HEADERS.ACCEPT_RANGES,
    HTTP_HEADERS.CACHE_CONTROL,
    HTTP_HEADERS.CONTENT_LENGTH,
    HTTP_HEADERS.CONTENT_TYPE,
    HTTP_HEADERS.ETAG,
    HTTP_HEADERS.LAST_MODIFIED,
    HTTP_HEADERS.LINK
  ],
  mongodb: {
    database: process.env.MONGODB_DATABASE,
    uri: process.env.MONGODB_URI
  },
  port: process.env.PORT || 3000
}
