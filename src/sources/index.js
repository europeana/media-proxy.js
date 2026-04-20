import RecordApiSource from './record-api.js'

let configuredRecordApiSource

const configured = (config) => {
  if (!configuredRecordApiSource) {
    configuredRecordApiSource = new RecordApiSource(config.europeana)
  }
  return configuredRecordApiSource
}

const requested = (req, config) => {
  if (req.query['recordApiUrl']) {
    return new RecordApiSource(config.europeana, req.query['recordApiUrl'])
  } else {
    return configured(config)
  }
}

export default {
  configured,
  requested
}
