import config from '../config.js'
import RecordApiSource from './record-api.js'
import MongoSource from './mongodb.js'

let configuredRecordApiSource
let configuredMongoSource

const configured = () => {
  if (config.app.dataSource === 'record-api') {
    if (!configuredRecordApiSource) {
      configuredRecordApiSource = new RecordApiSource
    }
    return configuredRecordApiSource
  } else {
    if (!configuredMongoSource) {
      configuredMongoSource = new MongoSource
    }
    return configuredMongoSource
  }
}

const requested = (req) => {
  if (req.query['recordApiUrl']) {
    return new RecordApiSource(req.query['recordApiUrl'])
  } else {
    return configured()
  }
}

export default {
  configured,
  requested
}
