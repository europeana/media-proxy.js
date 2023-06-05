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
  return `${attachmentOrInline}; filename="${filename}"`
}

const normaliseProxyResHeaders = (webResource, proxyRes) => {
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

const setCustomResHeaders = (webResource, res) => {
  // Set custom x-europeana-web-resource header to URL of web resource
  res.setHeader(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, webResource)
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

const onProxyReq = (webResource) => (proxyReq, req, res) => {
  setCustomResHeaders(webResource, res)
  handleTimeout(proxyReq, res)
  handleTimeout(req, res)
}

const onProxyRes = (webResource) => (proxyRes, req, res) => {
  normaliseProxyResHeaders(webResource, proxyRes)

  if (proxyRes.statusCode > 399) {
    // Upstream error. Normalise to plain-text response.
    return res.sendStatus(proxyRes.statusCode)
  } else if (mime.extension(proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE]) === 'html') {
    // HTML document. Redirect to it.
    return res.redirect(302, webResource)
  } else {
    // Proxy everything else.
    res.setHeader(HTTP_HEADERS.CONTENT_DISPOSITION, contentDisposition({
      contentType: proxyRes.headers[HTTP_HEADERS.CONTENT_TYPE],
      req
    }))
  }
}

const onError = (err, req, res) => {
  // TODO: log errors to APM
  console.error(err)

  res.sendStatus(502)
}

export default (webResource) => {
  const webResourceUrl = new URL(webResource)

  return createProxyMiddleware({
    changeOrigin: true,
    followRedirects: true,
    logLevel: process.NODE_ENV === 'production' ? 'error' : 'info',
    onError,
    onProxyReq: onProxyReq(webResource),
    onProxyRes: onProxyRes(webResource),
    pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
    // NOTE: do not use this, as it results in empty responses
    // proxyTimeout: 10000,
    target: webResourceUrl.origin
    // NOTE: do not use this, as it results in empty responses
    // timeout: 11000
  })
}
