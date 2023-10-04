// TODO: move & rename to s'thing like middlewares/validate-media-request

import md5 from 'md5'

import dataSources from '../sources/index.js'

let config

export default (options) => {
  config = options

  return async (req, res, next) => {
    try {
      const source = dataSources.requested(req, config)

      const itemId = `/${req.params.datasetId}/${req.params.localId}`

      const webResource = await source.find(itemId, req.params.webResourceHash)

      if (!webResource) {
        // No isShownBy and no hash, or invalid hash
        return res.sendStatus(404)
      } else if (!req.params.webResourceHash) {
        // Redirect to the URL with the hash, preserving the query
        let redirectPath = `/media/${req.params.datasetId}/${req.params.localId}/${md5(webResource.id)}`
        const query = new URLSearchParams(req.query).toString()
        if (query !== '') {
          redirectPath = `${redirectPath}?${query}`
        }
        return res.redirect(302, redirectPath)
      }

      res.locals.webResourceId = webResource.id
      next()
    } catch (err) {
      next(err)
    }
  }
}
