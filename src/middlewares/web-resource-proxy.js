import { createProxyMiddleware } from 'http-proxy-middleware'
import mime from 'mime-types'

import config from '../config.js'
import { CONTENT_TYPES, HEADERS } from '../lib/constants.js'

const contentDisposition = ({ datasetId, localId, webResourceHash, contentType } = {}) => {
  const basename = `Europeana.eu-${datasetId}-${localId}-${webResourceHash}`
  // Get filename extension from content type, falling back to "bin" if that fails
  const extension = mime.extension(contentType) || mime.extension(CONTENT_TYPES.APPLICATION_OCTET_STREAM)
  const filename = `${basename}.${extension}`
  return `attachment; filename="${filename}"`
}

const normaliseResHeaders = (webResource, proxyRes, res) => {
  // Delete any headers we don't want to proxy.
  for (const header in proxyRes.headers) {
    if (!config.headersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }

  // Default content-type to application/octet-stream, if not present
  if (!proxyRes.headers[HEADERS.CONTENT_TYPE]) {
    proxyRes.headers[HEADERS.CONTENT_TYPE] = CONTENT_TYPES.APPLICATION_OCTET_STREAM
  }

  // Set custom x-europeana-web-resource header to URL of web resource
  res.setHeader(HEADERS.X_EUROPEANA_WEB_RESOURCE, webResource)
}

const onProxyRes = (webResource) => (proxyRes, req, res) => {
  normaliseResHeaders(webResource, proxyRes, res)

  if (proxyRes.statusCode > 399) {
    // Upstream error. Normalise to plain-text response.
    return res.sendStatus(proxyRes.statusCode)
  } else if (mime.extension(proxyRes.headers[HEADERS.CONTENT_TYPE]) === 'html') {
    // HTML document. Redirect to it.
    return res.redirect(302, webResource)
  } else {
    // Proxy everything else.
    res.setHeader(HEADERS.CONTENT_DISPOSITION, contentDisposition({
      ...req.params, contentType: proxyRes.headers[HEADERS.CONTENT_TYPE]
    }))
  }
}

export default (webResource) => {
  const webResourceUrl = new URL(webResource)

  return createProxyMiddleware({
    changeOrigin: true,
    followRedirects: true,
    logLevel: process.NODE_ENV === 'production' ? 'error' : 'info',
    onProxyRes: onProxyRes(webResource),
    pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
    // TODO: make configurable?
    proxyTimeout: 10000,
    target: webResourceUrl.origin,
    // TODO: make configurable?
    timeout: 10000
  })
}
