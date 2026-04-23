import { parse as parseContentDisposition } from 'content-disposition'
import { createProxyMiddleware as createHttpProxyMiddleware } from 'http-proxy-middleware'
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
  HTTP_HEADERS.ETAG,
  HTTP_HEADERS.LAST_MODIFIED,
  HTTP_HEADERS.LINK
]

/**
 * @param {IncomingMessage} proxyRes
 * @param {IncomingMessage} req
 */
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

/**
 * @param {IncomingMessage} proxyRes
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
const setResContentHeaders = (proxyRes, req, res) => {
  const webResource = res.locals?.webResource
  const filename = resFilename(proxyRes, req)

  const attachmentOrInline = (req.query.disposition === CONTENT_DISPOSITIONS.INLINE) ?
    CONTENT_DISPOSITIONS.INLINE :
    CONTENT_DISPOSITIONS.ATTACHMENT

  res.setHeader(HTTP_HEADERS.CONTENT_DISPOSITION, `${attachmentOrInline}; filename="${filename}"`)
  res.setHeader(HTTP_HEADERS.CONTENT_TYPE, mime.contentType(filename) || CONTENT_TYPES.APPLICATION_OCTET_STREAM)

  // request downstream intermediaries not to alter responses
  res.setHeader(HTTP_HEADERS.CACHE_CONTROL, 'no-transform')

  // no content-length supplied, so set from EDM if available, but not if
  // response is compressed
  if (!res.getHeader(HTTP_HEADERS.CONTENT_LENGTH) && !res.getHeader(HTTP_HEADERS.CONTENT_ENCODING)) {
    if ((webResource?.ebucoreFileByteSize || 0) > 0) {
      res.setHeader(HTTP_HEADERS.CONTENT_LENGTH, webResource.ebucoreFileByteSize)
    }
  }
}

/**
 * @param {IncomingMessage} req
 */
const filterReqHeaders = (req) => {
  // Delete any request headers we don't want to proxy.
  for (const header in req.headers) {
    if (!requestHeadersToProxy.includes(header)) {
      delete req.headers[header]
    }
  }
}

/**
 * @param {IncomingMessage} proxyRes
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 */
const filterProxyResHeaders = (proxyRes, req, res) => {
  // Delete any response headers we don't want to proxy.
  // They need to be deleted from the proxyRes as otherwise will be
  // copied over to res by http-proxy-middleware later on.
  for (const header in proxyRes.headers) {
    if (!responseHeadersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }

  // if a range was requested but response is not a 206 with content-range header,
  // range support is incomplete, so remove accept-ranges and content-range from response
  if (req.headers[HTTP_HEADERS.RANGE]) {
    if (!res.getHeader(HTTP_HEADERS.CONTENT_RANGE) || (res.status !== 206)) {
      delete proxyRes.headers[HTTP_HEADERS.ACCEPT_RANGES]
      delete proxyRes.headers[HTTP_HEADERS.CONTENT_RANGE]
    }
  }
}

/**
 * @param {string} webResourceId
 * @param {ServerResponse} res
 */
const setCustomResHeaders = (webResourceId, res) => {
  // Set custom x-europeana-web-resource header to URL of web resource
  res.setHeader(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, new URL(webResourceId).toString())
}

// Custom timeout handling to ensure empty responses aren't sent by http-proxy
// just aborting without sending status code
// TODO: make timeout durations configurable?
const handleTimeout = (req, next) => {
  req.setTimeout(10000, () => {
    req.abort()
    next(httpError(504))
  })
}

export const webResourceProxyOptions = (webResourceId, next) => {
  const { origin, pathname, search } = new URL(webResourceId)

  const onProxyReq = (proxyReq, req) => {
    // redirects already have headers sent, so do not attempt to re-modify
    if (!proxyReq['_isRedirect']) {
      // Set custom user-agent header
      proxyReq.setHeader(HTTP_HEADERS.USER_AGENT, `EuropeanaMediaProxy/${pkg.version} (https://www.europeana.eu)`)
    }

    try {
      handleTimeout(proxyReq, next)
      handleTimeout(req, next)
    } catch (err) {
      next(err)
    }
  }

  const onProxyRes = (proxyRes, req, res) => {
    try {
      if (proxyRes.statusCode > 399) {
        // Upstream error. Normalise to plain-text response.
        next(httpError(proxyRes.statusCode))
      } else if (mime.extension(proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]) === 'html') {
        // HTML document. Redirect to it.
        return res.redirect(302, webResourceId)
      } else {
        // Proxy everything else.
        setResContentHeaders(proxyRes, req, res)
        filterProxyResHeaders(proxyRes, req, res)
      }
    } catch (err) {
      next(err)
    }
  }

  const pathRewrite = () => `${pathname}${search}`

  return {
    changeOrigin: true,
    followRedirects: true,
    logLevel: process.NODE_ENV === 'production' ? 'error' : 'info',
    onError: next,
    onProxyReq,
    onProxyRes,
    pathRewrite,
    // NOTE: do not use this, as it results in empty responses
    // proxyTimeout: 10000,
    target: origin
    // NOTE: do not use this, as it results in empty responses
    // timeout: 11000
  }
}

const createWebResourceProxyMiddleware = (createProxyMiddleware) => (req, res, next) => {
  try {
    const webResource = res.locals.webResource
    const webResourceId = webResource?.about
    if (!webResourceId) {
      next()
      return
    }

    filterReqHeaders(req)

    // set this early so it is still available on failed request responses,
    // e.g. timeouts
    setCustomResHeaders(webResourceId, res)

    const options = webResourceProxyOptions(webResourceId, next)
    const proxyMiddleware = (createProxyMiddleware || createHttpProxyMiddleware)(options)
    proxyMiddleware(req, res, next)
  } catch (err) {
    next(err)
  }
}

export default createWebResourceProxyMiddleware
