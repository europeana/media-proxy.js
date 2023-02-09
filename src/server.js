import elasticApmNode from 'elastic-apm-node'
import app from './app.js'
import config from './config.js'

if (config.elasticApm.serverUrl) {
  elasticApmNode.start(config.elasticApm)
}

const server = app.listen(config.port, () => {
  console.log('Listening on port ' + server.address().port)
})
