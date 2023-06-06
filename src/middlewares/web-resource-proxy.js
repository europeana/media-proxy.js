import { createProxyMiddleware } from 'http-proxy-middleware'
import mime from 'mime-types'

import config from '../config.js'
import { CONTENT_DISPOSITIONS, CONTENT_TYPES, HTTP_HEADERS } from '../lib/constants.js'

const contentDisposition = ({ contentType, req } = {}) => {
  const { datasetId, localId, webResourceHash } = req.params
  const attachmentOrInline = (req.query.disposition === CONTENT_DISPOSITIONS.INLINE) ?
    CONTENT_DISPOSITIONS.INLINE :
    CONTENT_DISPOSITIONS.ATTACHMENT

  const basename = `Europeana.eu-${datasetId}-${localId}-${webResourceHash}`
  // Get filename extension from content type, falling back to "bin" if that fails
  const extension = mime.extension(contentType) || mime.extension(CONTENT_TYPES.APPLICATION_OCTET_STREAM)
  const filename = `${basename}.${extension}`
  // return `${attachmentOrInline}; filename="${filename}"`
}

const normaliseProxyResHeaders = (proxyRes) => {
  // Delete any headers we don't want to proxy.
  for (const header in proxyRes.headers) {
    if (!config.headersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }

  // Default content-type to application/octet-stream, if not present
  if (!proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]) {
    proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE] = CONTENT_TYPES.APPLICATION_OCTET_STREAM
  }
}

const setCustomResHeaders = (webResourceId, res) => {
  // Set custom x-europeana-web-resource header to URL of web resource
  res.setHeader(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, webResourceId)
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

const onProxyReq = (webResourceId) => (proxyReq, req, res) => {
  setCustomResHeaders(webResourceId, res)
  handleTimeout(proxyReq, res)
  handleTimeout(req, res)
}

const onProxyRes = (webResourceId) => (proxyRes, req, res) => {
  normaliseProxyResHeaders(proxyRes)

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
}

const onError = (err, req, res) => {
  // TODO: log error message to APM?
  // let errorMessage = 'Bad Gateway'
  //
  // if (err.code === 'CERT_HAS_EXPIRED') {
  //   errorMessage = err.message
  // }

  return res.sendStatus(502)
}

export const webResourceProxyOptions = (webResourceId) => {
  const webResourceUrl = new URL(webResourceId)

  return {
    changeOrigin: true,
    followRedirects: true,
    logLevel: process.NODE_ENV === 'production' ? 'error' : 'info',
    onError,
    onProxyReq: onProxyReq(webResourceId),
    onProxyRes: onProxyRes(webResourceId),
    pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
    // NOTE: do not use this, as it results in empty responses
    // proxyTimeout: 10000,
    target: webResourceUrl.origin
    // NOTE: do not use this, as it results in empty responses
    // timeout: 11000
  }
}

export default (req, res, next) => {
  if (res.locals.webResourceId) {
    return createProxyMiddleware(webResourceProxyOptions(res.locals.webResourceId))(req, res, next)
  } else {
    next()
  }
}
