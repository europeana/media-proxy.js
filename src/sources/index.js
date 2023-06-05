import config from '../config.js'
import RecordApiSource from './record-api.js'
import MongoSource from './mongodb.js'

const configured = () => {
  if (config.app.dataSource === 'record-api') {
    return new RecordApiSource
  } else {
    return new MongoSource
  }
}

const requested = (req) => {
  if (req.query['recordApiUrl']) {
    return RecordApiSource.forUrl(req.query['recordApiUrl'])
  } else {
    return configured()
  }
}

export default {
  configured,
  requested
}
