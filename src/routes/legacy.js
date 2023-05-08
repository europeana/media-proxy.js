import md5 from 'md5'

const redirectLocation = ({ datasetId, localId, webResourceHash, query } = {}) => {
  let location = `/media/${datasetId}/${localId}`

  if (webResourceHash) {
    location = `${location}/${webResourceHash}`
  }

  const queryString = new URLSearchParams(query).toString()
  if (queryString !== '') {
    location = `${location}?${queryString}`
  }

  return location
}

// Handles legacy media proxy URLs, redirecting to current ones
export default async (req, res) => {
  const redirectOptions = { ...req.params, query: { ...req.query } }

  if (redirectOptions.query.view) {
    redirectOptions.webResourceHash = md5(redirectOptions.query.view)
    delete redirectOptions.query.view
  }

  res.redirect(301, redirectLocation(redirectOptions))
}
