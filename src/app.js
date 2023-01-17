import express from 'express'
import morgan from 'morgan'
import elasticApmNode from 'elastic-apm-node'
import config from './config.js'
import handler from './handler.js'

if (config.elasticApm.serverUrl) {
  elasticApmNode.start(config.elasticApm)
}

const app = express()
app.use(morgan('combined'))

app.get('/media/:datasetId/:localId/:webResourceHash?', handler)

const server = app.listen(config.port, () => {
  console.log('Listening on port ' + server.address().port)
})
