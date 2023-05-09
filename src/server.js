import config from './config.js'
import app from './app.js'

const server = app.listen(config.port, () => {
  console.log('Listening on port ' + server.address().port)
})
