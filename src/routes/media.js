// TODO: move & rename to s'thing like middlewares/validate-media-request

import httpError from 'http-errors'
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
        return next(httpError(404))
      } else if (!req.params.webResourceHash) {
        // Redirect to the URL with the hash, preserving the query
        // TODO: include the upstreamPath param?
        let redirectPath = `/media/${req.params.datasetId}/${req.params.localId}/${md5(webResource.id)}`
        const query = new URLSearchParams(req.query).toString()
        if (query !== '') {
          redirectPath = `${redirectPath}?${query}`
        }
        return res.redirect(302, redirectPath)
      }

      const webResourceUrl = new URL(webResource.id)
      if (req.params.upstreamPath) {
        // replace the final part of the path with the upstream path param
        webResourceUrl.pathname = webResourceUrl.pathname.replace(/[^/]+$/, req.params.upstreamPath)
      }
      res.locals.webResourceId = webResourceUrl.toString()

      next()
    } catch (err) {
      next(err)
    }
  }
}
