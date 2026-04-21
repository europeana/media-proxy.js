import { parse as parseContentDisposition } from 'content-disposition'
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
  // NOTE: will be overwritten by `setResContentHeaders`, but upstream value used there,
  //       so not removed by `filterProxyResHeaders`
  // HTTP_HEADERS.CONTENT_DISPOSITION,
  HTTP_HEADERS.CONTENT_ENCODING,
  HTTP_HEADERS.CONTENT_LENGTH,
  HTTP_HEADERS.CONTENT_RANGE,
  // NOTE: will be overwritten by `setResContentHeaders`, but upstream value used there,
  //       so not removed by `filterProxyResHeaders`
  // HTTP_HEADERS.CONTENT_TYPE,
  HTTP_HEADERS.ETAG,
  HTTP_HEADERS.LAST_MODIFIED,
  HTTP_HEADERS.LINK
]

const resFilename = (proxyRes, req) => {
  let proxyContentType = proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]
  if (proxyContentType === CONTENT_TYPES.APPLICATION_OCTET_STREAM) {
    proxyContentType = undefined
  }
  const proxyContentDisposition = proxyRes.headers[HTTP_HEADERS.CONTENT_DISPOSITION]
  const proxyFilename = proxyContentDisposition ?
    parseContentDisposition(proxyContentDisposition)?.parameters?.filename :
    undefined

  const { datasetId, localId, webResourceHash } = req.params
  const basename = `Europeana.eu-${datasetId}-${localId}-${webResourceHash}`

  // Get filename extension from:
  // 1. upstream content-type header
  // 2. upstream content-disposition header filename
  // 3. falling back to "bin" otherwise
  const extension = mime.extension(proxyContentType) ||
    mime.extension(mime.contentType(proxyFilename)) ||
    mime.extension(CONTENT_TYPES.APPLICATION_OCTET_STREAM)

  const filename = `${basename}.${extension}`

  return filename
}

const setResContentHeaders = (proxyRes, req, res) => {
  const filename = resFilename(proxyRes, req)

  const attachmentOrInline = (req.query.disposition === CONTENT_DISPOSITIONS.INLINE) ?
    CONTENT_DISPOSITIONS.INLINE :
    CONTENT_DISPOSITIONS.ATTACHMENT

  res.setHeader(HTTP_HEADERS.CONTENT_DISPOSITION, `${attachmentOrInline}; filename="${filename}"`)
  res.setHeader(HTTP_HEADERS.CONTENT_TYPE, mime.contentType(filename) || CONTENT_TYPES.APPLICATION_OCTET_STREAM)
}

const filterResContentHeaders = (proxyRes, req, res) => {
  for (const headerName of responseHeadersToProxy) {
    if (proxyRes.headers.has(headerName)) {
      res.set(headerName, proxyRes.headers.get(headerName))
    }
  }
}

// TODO: restore timeout handling, inc for fetch
// const handleTimeout = (req, next) => {
//   req.setTimeout(10000, () => {
//     req.abort()
//     next(httpError(504))
//   })
// }

// TODO: refactor into smaller functions
const webResourceProxyMiddleware = async (req, res, next) => {
  try {
    if (!res.locals.webResourceId) {
      next()
      return
    }
    res.set(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, res.locals.webResourceId)

    const proxyReqHeaders = new Headers(req.headers)
    for (const headerName of proxyReqHeaders.keys()) {
      if (!requestHeadersToProxy.includes(headerName)) {
        proxyReqHeaders.delete(headerName)
      }
    }
    proxyReqHeaders.set(HTTP_HEADERS.USER_AGENT, `EuropeanaMediaProxy/${pkg.version} (https://www.europeana.eu)`)

    let proxyRes
    try {
      // TODO: only strictly needs to handle GET as that's what is routed by the app
      proxyRes = await fetch(res.locals.webResourceId, {
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        headers: proxyReqHeaders,
        method: req.method
      })
    } catch {
      // fetch error, e.g. SSL cert expired, network error
      next(httpError(502))
      return
    }

    if (!proxyRes.ok) {
      // Upstream error. Normalise to plain-text response.
      return next(httpError(proxyRes.status))
    } else if (mime.extension(proxyRes.headers.get(HTTP_HEADERS.CONTENT_TYPE)) === 'html') {
      // HTML document. Redirect to it.
      return res.redirect(302, res.locals.webResourceId)
    }

    // Proxy everything else.
    res.status(proxyRes.status)

    filterResContentHeaders(proxyRes, req, res)
    setResContentHeaders(proxyRes, req, res)

    // response body may be empty, e.g. in HEAD requests
    if (proxyRes.body) {
      Readable.fromWeb(proxyRes.body)
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
