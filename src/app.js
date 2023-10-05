import express from 'express'

import getConfig from './config.js'
import middlewares from './middlewares/index.js'
import routes from './routes/index.js'

const config = getConfig()

const app = express()
app.disable('x-powered-by') // Security: do not disclose technology fingerprints
app.use(middlewares.logging)
app.use(middlewares.cors)

app.get('/', routes.health)
app.get('/media/:datasetId/:localId/:webResourceHash?', routes.media(config), middlewares.webResourceProxy())
app.get('/:datasetId/:localId', routes.legacy)

app.use(middlewares.errors)

export default app
