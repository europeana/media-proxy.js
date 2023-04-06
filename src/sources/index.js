import config from '../config.js'
import RecordApiSource from './record-api.js'
import MongoSource from './mongodb.js'

let configuredSource
if (config.app.dataSource === 'api') {
  configuredSource = new RecordApiSource
} else {
  configuredSource = new MongoSource
}

export default configuredSource
