import config from '../config.js'
import RecordApiSource from './record-api.js'
import MongoSource from './mongodb.js'

let configuredSource
if (config.app.dataSource === 'api') {
  configuredSource = new RecordApiSource
} else {
  configuredSource = new MongoSource
}

export const requestDataSource = (req) => {
  if (req.query['api_url']) {
    return RecordApiSource.forUrl(req.query['api_url'])
  } else {
    return configuredSource
  }
}

export default configuredSource
