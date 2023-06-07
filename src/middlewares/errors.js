export default (err, req, res, next) => {
  if (err) {
    console.error(err.message)
    if (process.NODE_ENV !== 'production') {
      console.error(err.stack)
    }

    const errorStatus = err.response?.status || err.status || err.statusCode || 502
    // TODO: log error message to APM?
    // if (err.response) {
    // errorMessage = error.response.data.error
    // }

    res.sendStatus(errorStatus)
  } else {
    next()
  }
}
