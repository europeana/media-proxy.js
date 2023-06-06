import RecordApiSource from './record-api.js'
import MongoSource from './mongodb.js'

let configuredRecordApiSource
let configuredMongoSource

const configured = (config) => {
  if (config.app.dataSource === 'record-api') {
    if (!configuredRecordApiSource) {
      configuredRecordApiSource = new RecordApiSource(config.europeana)
    }
    return configuredRecordApiSource
  } else {
    if (!configuredMongoSource) {
      configuredMongoSource = new MongoSource(config.mongodb)
    }
    return configuredMongoSource
  }
}

const requested = (req, config) => {
  if (req.query['recordApiUrl']) {
    return new RecordApiSource(req.query['recordApiUrl'])
  } else {
    return configured(config)
  }
}

export default {
  configured,
  requested
}
