import config from '../config.js'
import getWebResourceFromRecordAPI from './api.js'
import getWebResourceFromMongoDB from './mongodb.js'

export default config.app.dataSource === 'api' ? getWebResourceFromRecordAPI : getWebResourceFromMongoDB
