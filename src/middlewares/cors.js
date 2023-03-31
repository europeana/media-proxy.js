import cors from 'cors'

const originValidator = (origin, callback) => {
  // TODO: move to config
  const permittedHosts = ['europeana.github.io']
  const permittedDomains = ['.eanadev.org', '.europeana.eu']

  let permitted = false

  if (permittedHosts.some((host) => origin === `https://${host}`)) {
    permitted = true
  } else if (permittedDomains.some((domain) => origin.startsWith('https://') && origin.endsWith(domain))) {
    permitted = true
  } else if (process.NODE_ENV !== 'production') {
    if (origin.endsWith('//localhost') || origin.includes('//localhost:')) {
      permitted = true
    }
  }

  callback(null, permitted)
}

const corsOptions = {
  // origin: true
  origin: originValidator
}

export default cors(corsOptions)
