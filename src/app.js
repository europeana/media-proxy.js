import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import routes from './routes/index.js'

const app = express()
app.disable('x-powered-by') // Security: do not disclose technology fingerprints
app.use(morgan('combined'))
app.use(cors({
  origin: true
  // origin: (origin, callback) => {
  //   console.log('origin', origin)
  //   // TODO: move to config
  //   const permittedHosts = ['europeana.github.io']
  //   const permittedDomains = ['.eanadev.org', '.europeana.eu']
  //   let permitted = false
  //   if (permittedHosts.some((host) => origin === `https://${host}`)) {
  //     permitted = true
  //   } else if (permittedDomains.some((domain) => origin.startsWith('https://') && origin.endsWith(domain))) {
  //     permitted = true
  //   } else if (process.NODE_ENV !== 'production') {
  //     if (origin.endsWith('//localhost') || origin.includes('//localhost:')) {
  //       permitted = true
  //     }
  //   }
  //   callback(null, permitted)
  // }
}))

app.get('/', routes.health)
app.get('/media/:datasetId/:localId/:webResourceHash?', routes.media)

export default app
