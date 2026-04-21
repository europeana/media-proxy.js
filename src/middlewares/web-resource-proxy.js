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
  // NOTE: will be overwritten by `onProxyRes`, but upstream value used there,
  //       so not removed by `filterProxyResHeaders`
  // HTTP_HEADERS.CONTENT_DISPOSITION,
  HTTP_HEADERS.CONTENT_ENCODING,
  HTTP_HEADERS.CONTENT_LENGTH,
  HTTP_HEADERS.CONTENT_RANGE,
  // NOTE: will be overwritten by `onProxyRes`, but upstream value used there,
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

const filterReqHeaders = (req) => {
  // Delete any request headers we don't want to proxy.
  for (const header in req.headers) {
    if (!requestHeadersToProxy.includes(header)) {
      delete req.headers[header]
    }
  }
}

const filterProxyResHeaders = (proxyRes) => {
  // Delete any response headers we don't want to proxy.
  for (const header in proxyRes.headers) {
    if (!responseHeadersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }
}

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

const onProxyReq = (webResourceId, next) => (proxyReq, req) => {
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

const onProxyRes = (webResourceId, next) => (proxyRes, req, res) => {
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
      filterProxyResHeaders(proxyRes)
    }
  } catch (err) {
    next(err)
  }
}

export const webResourceProxyOptions = (webResourceId, next) => {
  const webResourceUrl = new URL(webResourceId)

  return {
    changeOrigin: true,
    followRedirects: true,
    logLevel: process.NODE_ENV === 'production' ? 'error' : 'info',
    onError: next,
    onProxyReq: onProxyReq(webResourceId, next),
    onProxyRes: onProxyRes(webResourceId, next),
    pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
    // NOTE: do not use this, as it results in empty responses
    // proxyTimeout: 10000,
    target: webResourceUrl.origin
    // NOTE: do not use this, as it results in empty responses
    // timeout: 11000
  }
}

const createWebResourceProxyMiddleware = (createProxyMiddleware) => (req, res, next) => {
  try {
    if (res.locals.webResourceId) {
      filterReqHeaders(req)

      // set this early so it is still available on failed request responses,
      // e.g. timeouts
      setCustomResHeaders(res.locals.webResourceId, res)

      const options = webResourceProxyOptions(res.locals.webResourceId, next)
      const proxyMiddleware = (createProxyMiddleware || createHttpProxyMiddleware)(options)
      proxyMiddleware(req, res, next)
    } else {
      next()
    }
  } catch (err) {
    next(err)
  }
}

export default createWebResourceProxyMiddleware
