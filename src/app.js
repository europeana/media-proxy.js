import express from 'express'
import morgan from 'morgan'
import routes from './routes/index.js'

const app = express()
app.disable('x-powered-by') // Security: do not disclose technology fingerprints
app.use(morgan('combined'))

app.get('/', routes.health)
app.get('/media/:datasetId/:localId/:webResourceHash?', routes.media)

export default app
