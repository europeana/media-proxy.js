import { EUROPEANA_APIS } from './lib/constants.js'

let config

export default () => {
  if (!config) {
    config = {
      app: {
        dataSource: process.env.APP_DATA_SOURCE || 'mongodb'
      },
      europeana: {
        apiKey: process.env['EUROPEANA_API_KEY'],
        apiUrl: process.env['EUROPEANA_API_URL'] || EUROPEANA_APIS.RECORD,
        permittedApiUrls: (process.env['EUROPEANA_PERMITTED_API_URLS'] || '')
          .split(',').map((url) => url.trim())
      },
      mongodb: {
        database: process.env.MONGODB_DATABASE,
        uri: process.env.MONGODB_URI
      }
    }
  }

  return config
}
