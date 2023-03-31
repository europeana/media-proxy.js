import { createProxyMiddleware } from 'http-proxy-middleware'
import mime from 'mime-types'

import config from '../config.js'
import { CONTENT_TYPES, HEADERS, SEPARATORS } from '../lib/constants.js'

const contentFilename = ({ datasetId, localId, webResourceHash, contentType } = {}) => {
  const basename = `Europeana.eu-${datasetId}-${localId}-${webResourceHash}`
  // TODO: log unknown content type?
  const extension = mime.extension(contentType) || mime.extension(CONTENT_TYPES.APPLICATION_OCTET_STREAM)
  return `${basename}.${extension}`
}

const onProxyRes = (webResource) => (proxyRes, req, res) => {
  for (const header in proxyRes.headers) {
    if (!config.headersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }

  if (proxyRes.statusCode > 399) {
    return res.sendStatus(proxyRes.statusCode)
  }

  const contentType = proxyRes.headers[HEADERS.CONTENT_TYPE] || CONTENT_TYPES.APPLICATION_OCTET_STREAM

  if (contentType.split(SEPARATORS.HEADER)[0] === CONTENT_TYPES.TEXT_HTML) {
    return res.redirect(302, webResource)
  }

  res.setHeader(HEADERS.X_EUROPEANA_WEB_RESOURCE, webResource)

  const filename = contentFilename({ ...req.params, contentType })
  const contentDisposition = `attachment${SEPARATORS.HEADER} filename="${filename}"`
  res.setHeader(HEADERS.CONTENT_DISPOSITION, contentDisposition)
}

// TODO: don't proxy errors as-is, but send our own, standardised JSON
export default (webResourceUrl) => createProxyMiddleware({
  changeOrigin: true,
  followRedirects: true,
  logLevel: process.NODE_ENV === 'production' ? 'error' : '',
  onProxyRes: onProxyRes(webResourceUrl),
  pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
  // TODO: configurable?
  proxyTimeout: 10000,
  target: webResourceUrl.origin,
  // TODO: configurable?
  timeout: 10000
})
