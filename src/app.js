import express from 'express'

import middlewares from './middlewares.js'
import routes from './routes/index.js'

const app = express()
app.disable('x-powered-by') // Security: do not disclose technology fingerprints
app.use(middlewares.logging)
app.use(middlewares.cors)

app.get('/', routes.health)
app.get('/media/:datasetId/:localId/:webResourceHash?', routes.media)

export default app
