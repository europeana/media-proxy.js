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
  HTTP_HEADERS.CONTENT_ENCODING,
  HTTP_HEADERS.CONTENT_LENGTH,
  HTTP_HEADERS.CONTENT_RANGE,
  HTTP_HEADERS.ETAG,
  HTTP_HEADERS.LAST_MODIFIED,
  HTTP_HEADERS.LINK
]

const resFilename = (proxyRes, req) => {
  let proxyContentType = proxyRes.headers.get(HTTP_HEADERS.CONTENT_TYPE)
  if (proxyContentType === CONTENT_TYPES.APPLICATION_OCTET_STREAM) {
    proxyContentType = undefined
  }
  const proxyContentDisposition = proxyRes.headers.get(HTTP_HEADERS.CONTENT_DISPOSITION)
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

const setProxiedReqHeaders = (proxyReq, req) => {
  const reqHeaders = new Headers(req.headers)
  for (const headerName of requestHeadersToProxy) {
    if (reqHeaders.has(headerName)) {
      proxyReq.headers.set(headerName, reqHeaders.get(headerName))
    }
  }
}

const setProxyReqUserAgentHeader = (proxyReq) => {
  proxyReq.headers.set(HTTP_HEADERS.USER_AGENT, `EuropeanaMediaProxy/${pkg.version} (https://www.europeana.eu)`)
}

const setProxiedResHeaders = (proxyRes, req, res) => {
  for (const headerName of responseHeadersToProxy) {
    if (proxyRes.headers.has(headerName)) {
      res.set(headerName, proxyRes.headers.get(headerName))
    }
  }
}

const setResContentHeaders = (proxyRes, req, res) => {
  const filename = resFilename(proxyRes, req)

  const attachmentOrInline = (req.query?.disposition === CONTENT_DISPOSITIONS.INLINE) ?
    CONTENT_DISPOSITIONS.INLINE :
    CONTENT_DISPOSITIONS.ATTACHMENT

  res.set(HTTP_HEADERS.CONTENT_DISPOSITION, `${attachmentOrInline}; filename="${filename}"`)
  res.set(HTTP_HEADERS.CONTENT_TYPE, mime.contentType(filename) || CONTENT_TYPES.APPLICATION_OCTET_STREAM)
}

// TODO: refactor into smaller functions
const webResourceProxyMiddleware = async (req, res, next) => {
  try {
    if (!res.locals.webResourceId) {
      next()
      return
    }
    // do this early so that errors/redirects still get it
    res.set(HTTP_HEADERS.X_EUROPEANA_WEB_RESOURCE, new URL(res.locals.webResourceId).toString())

    const proxyReq = {
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      headers: new Headers(),
      method: req.method
      // NOTE: this does not work as a connection timeout handler as it triggers if the download takes
      //       more than 10 seconds too
      // signal: AbortSignal.timeout(10_000)
    }
    setProxiedReqHeaders(proxyReq, req)
    setProxyReqUserAgentHeader(proxyReq)

    let proxyRes
    try {
      proxyRes = await fetch(res.locals.webResourceId, proxyReq)
    } catch (err) {
      if (err.name === 'TimeoutError') {
        next(httpError(504))
      } else {
        // other fetch error, e.g. SSL cert expired, network error
        next(httpError(502))
      }
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

    setProxiedResHeaders(proxyRes, req, res)
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
    console.error(err)
    next(err)
  }
}

export default webResourceProxyMiddleware
