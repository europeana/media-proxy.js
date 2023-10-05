import apm from 'elastic-apm-node'

export default (err, req, res, next) => {
  if (err) {
    console.error(err.message)
    if (process.NODE_ENV !== 'production') {
      console.error(err.stack)
    }

    const errorStatus = err.response?.status || err.status || err.statusCode || 502

    if (apm.isStarted()) {
      apm.captureError(err, { message: err.response?.data?.error, request: req, response: res })
    }

    res.sendStatus(errorStatus)
  } else {
    next()
  }
}
