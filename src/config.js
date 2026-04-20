import { EUROPEANA_APIS } from './lib/constants.js'

let config

export default () => {
  if (!config) {
    config = {
      europeana: {
        apiKey: process.env['EUROPEANA_API_KEY'],
        apiUrl: process.env['EUROPEANA_API_URL'] || EUROPEANA_APIS.RECORD,
        permittedApiUrls: (process.env['EUROPEANA_PERMITTED_API_URLS'] || '')
          .split(',').map((url) => url.trim())
      }
    }
  }

  return config
}
