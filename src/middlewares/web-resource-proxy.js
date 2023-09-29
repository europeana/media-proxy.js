import { createProxyMiddleware } from 'http-proxy-middleware'
import mime from 'mime-types'

import { CONTENT_DISPOSITIONS, CONTENT_TYPES, HTTP_HEADERS } from '../lib/constants.js'

const requestHeadersToProxy = [
  HTTP_HEADERS.ACCEPT_ENCODING,
  HTTP_HEADERS.ACCEPT_LANGUAGE,
  HTTP_HEADERS.ACCEPT,
  HTTP_HEADERS.IF_MATCH,
  HTTP_HEADERS.IF_MODIFIED_SINCE,
  HTTP_HEADERS.REFERER,
  HTTP_HEADERS.USER_AGENT
]

const responseHeadersToProxy = [
  HTTP_HEADERS.ACCEPT_RANGES,
  HTTP_HEADERS.CACHE_CONTROL,
  HTTP_HEADERS.CONTENT_LENGTH,
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

const normaliseProxyResHeaders = (proxyRes) => {
  // Default content-type to application/octet-stream, if not present
  if (!proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]) {
    proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE] = CONTENT_TYPES.APPLICATION_OCTET_STREAM
  }
}

const setCustomResHeaders = (webResourceId, res) => {
  // Set custom x-europeana-web-resource header to URL of web resource
  res.setHeader(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, new URL(webResourceId).toString())
}

// Custom timeout handling to ensure empty responses aren't sent by http-proxy
// just aborting without sending status code
// TODO: make timeout durations configurable?
// TODO: log errors to APM
const handleTimeout = (req, res) => {
  req.setTimeout(10000, () => {
    req.abort()
    res.sendStatus(504)
  })
}

// WARN: do not modify headers in this handler, as it may be called again on
//       upstream redirects, resulting in errors.
const onProxyReq = (webResourceId, next) => (proxyReq, req, res) => {
  try {
    handleTimeout(proxyReq, res)
    handleTimeout(req, res)
  } catch (err) {
    next(err)
  }
}

const onProxyRes = (webResourceId, next) => (proxyRes, req, res) => {
  try {
    filterProxyResHeaders(proxyRes)
    normaliseProxyResHeaders(proxyRes)
    setCustomResHeaders(webResourceId, res)

    if (proxyRes.statusCode > 399) {
      // Upstream error. Normalise to plain-text response.
      return res.sendStatus(proxyRes.statusCode)
    } else if (mime.extension(proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]) === 'html') {
      // HTML document. Redirect to it.
      return res.redirect(302, webResourceId)
    } else {
      // Proxy everything else.
      res.setHeader(HTTP_HEADERS.CONTENT_DISPOSITION, contentDisposition({
        contentType: proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE],
        req
      }))
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

export default async (req, res, next) => {
  try {
    if (res.locals.webResourceId) {
      filterReqHeaders(req)

      const options = webResourceProxyOptions(res.locals.webResourceId, next)
      await createProxyMiddleware(options)(req, res, next)
    } else {
      next()
    }
  } catch (err) {
    next(err)
  }
}
