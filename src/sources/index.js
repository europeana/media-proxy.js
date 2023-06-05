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
  if (req.query['recordApiUrl']) {
    return RecordApiSource.forUrl(req.query['recordApiUrl'])
  } else {
    return configuredSource
  }
}

export default configuredSource
