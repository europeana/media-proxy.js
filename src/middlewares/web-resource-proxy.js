import { Readable } from 'stream'
import httpError from 'http-errors'
import mime from 'mime-types'

import pkg from '../../package.json' with { type: 'json' }
import { CONTENT_DISPOSITIONS, CONTENT_TYPES, HTTP_HEADERS } from '../lib/constants.js'

const requestHeadersToProxy = [
  HTTP_HEADERS.ACCEPT_ENCODING,
  HTTP_HEADERS.ACCEPT_LANGUAGE,
  HTTP_HEADERS.ACCEPT,
  HTTP_HEADERS.IF_MATCH,
  HTTP_HEADERS.IF_MODIFIED_SINCE,
  HTTP_HEADERS.RANGE,
  HTTP_HEADERS.REFERER
]

const responseHeadersToProxy = [
  HTTP_HEADERS.ACCEPT_RANGES,
  HTTP_HEADERS.CACHE_CONTROL,
  HTTP_HEADERS.CONTENT_ENCODING,
  HTTP_HEADERS.CONTENT_LENGTH,
  HTTP_HEADERS.CONTENT_RANGE,
  HTTP_HEADERS.CONTENT_TYPE,
  HTTP_HEADERS.ETAG,
  HTTP_HEADERS.LAST_MODIFIED,
  HTTP_HEADERS.LINK
]

const contentDisposition = ({ contentType, req } = {}) => {
  const { datasetId, localId, webResourceHash } = req.params
  const attachmentOrInline = (req.query.disposition === CONTENT_DISPOSITIONS.INLINE) ?
    CONTENT_DISPOSITIONS.INLINE :
    CONTENT_DISPOSITIONS.ATTACHMENT

  const basename = `Europeana.eu-${datasetId}-${localId}-${webResourceHash}`
  // Get filename extension from content type, falling back to "bin" if that fails
  const extension = mime.extension(contentType) || mime.extension(CONTENT_TYPES.APPLICATION_OCTET_STREAM)
  const filename = `${basename}.${extension}`
  return `${attachmentOrInline}; filename="${filename}"`
}

// TODO: restore timeout handling, inc for fetch
// const handleTimeout = (req, next) => {
//   req.setTimeout(10000, () => {
//     req.abort()
//     next(httpError(504))
//   })
// }

// TODO: refactor into smaller functions
const webResourceProxyMiddleware = async(req, res, next) => {
  try {
    if (!res.locals.webResourceId) {
      next()
      return
    }
    res.set(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, res.locals.webResourceId)

    const reqHeaders = new Headers(req.headers)
    for (const headerName of reqHeaders.keys()) {
      if (!requestHeadersToProxy.includes(headerName)) {
        reqHeaders.delete(headerName)
      }
    }
    reqHeaders.set(HTTP_HEADERS.USER_AGENT, `EuropeanaMediaProxy/${pkg.version} (https://www.europeana.eu)`)

    let response
    try {
      // TODO: only stricly needs to handle GET as that's what is routed by the app
      response = await fetch(res.locals.webResourceId, {
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        headers: reqHeaders,
        method: req.method
      })
    } catch {
      // fetch error, e.g. SSL cert expired, network error
      next(httpError(502))
      return
    }

    if (!response.ok) {
      // Upstream error. Normalise to plain-text response.
      return next(httpError(response.status))
    } else if (mime.extension(response.headers.get(HTTP_HEADERS.CONTENT_TYPE)) === 'html') {
      // HTML document. Redirect to it.
      return res.redirect(302, res.locals.webResourceId)
    }

    res.status(response.status)

    // Proxy everything else.

    for (const headerName of responseHeadersToProxy) {
      if (response.headers.has(headerName)) {
        res.set(headerName, response.headers.get(headerName))
      }
    }

    // Default content-type to application/octet-stream, if not present
    if (!res.get(HTTP_HEADERS.CONTENT_TYPE)) {
      res.set(HTTP_HEADERS.CONTENT_TYPE, CONTENT_TYPES.APPLICATION_OCTET_STREAM)
    }

    res.set(HTTP_HEADERS.CONTENT_DISPOSITION, contentDisposition({
      contentType: res.get(HTTP_HEADERS.CONTENT_TYPE),
      req
    }))

    // response body may be empty, e.g. in HEAD requests
    if (response.body) {
      Readable.fromWeb(response.body)
        .pipe(res)
        .on('error', next)
    } else {
      res.end()
    }
  } catch (err) {
    next(err)
  }
}

export default webResourceProxyMiddleware
