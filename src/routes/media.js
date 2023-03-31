/**
 * Test items:
 * - times out /2048005/Athena_Plus_ProvidedCHO_Nationalmuseum__Sweden_83982
 *   not being handled properly yet, for some reason
 * - from download validation errors:
 *   /207/https___binadi_navarra_es_registro_oai_binadi_navarra_es_00006093_aggregation
 *   /9200517/ark__12148_btv1b53098798q
 *   /08625/FILM00055500c_6
 *   /761/_nh8fW8R
 *   /2022709/oai_fototeca_mcu_es_fototeca_WUNDERLICH_WUN_17964
 * - redirect to media:
 *   /2020702/raa_fmi_10036300590001
 * - redirect to web page:
 *   /2021012/app_si_A_II_841_3A98
 * - image w/ application/octet-stream content-type:
 *   /2021803/C10002457770
 * - 400
 *   /91622/raa_kmb_16000200017076
 * - 403
 *   /794/ark__12148_bc6p070269f
 * - 404
 *   /2022709/oai_fototeca_mcu_es_fototeca_LOTY_LOTY_10117/417317fb0211e24cf6db811e08e07823
 * - 415
 *   /2064108/Museu_ProvidedCHO_Vorderasiatisches_Museum__Staatliche_Museen_zu_Berlin_DE_MUS_815718_1981597
 * - 500
 *   /2048220/europeana_fashion_AM_020323
 * - SSL error resulting in JS error, resulting in 500 error (should be 502)
 *   /536/urn___mint_think_code_io_europeana_cyprus_E_0709
 */

import { createProxyMiddleware } from 'http-proxy-middleware'
import md5 from 'md5'
import mime from 'mime-types'

import config from '../config.js'
import getWebResourceFromRecordAPI from '../sources/api.js'
import getWebResourceFromMongoDB from '../sources/mongodb.js'

const getWebResource = config.app.dataSource === 'api' ? getWebResourceFromRecordAPI : getWebResourceFromMongoDB

const headersToProxy = [
  'accept-ranges',
  'content-length',
  'content-type',
  'etag',
  'last-modified',
  'link'
]

const onProxyRes = (proxyRes, req, res) => {
  for (const header in proxyRes.headers) {
    if (!headersToProxy.includes(header)) {
      delete proxyRes.headers[header]
    }
  }

  if (proxyRes.statusCode > 399) {
    res.sendStatus(proxyRes.statusCode)
    return;
  }

  const contentType = proxyRes.headers['content-type'] || 'application/octet-stream'

  if (contentType.split(';')[0] === 'text/html') {
    return res.redirect(302, res.getHeader('x-europeana-web-resource'))
  }

  const basename = `Europeana.eu-${req.params.datasetId}-${req.params.localId}-${req.params.webResourceHash}`
  // TODO: log unknown content type
  const extension = mime.extension(contentType) || 'bin'
  res.setHeader('content-disposition', `attachment; filename="${basename}.${extension}"`)
}

export default async (req, res) => {
  const itemId = `/${req.params.datasetId}/${req.params.localId}`

  try {
    const webResource = await getWebResource(itemId, req.params.webResourceHash)

    if (!webResource) {
      // No isShownBy and no hash, or invalid hash
      return res.sendStatus(404)
    } else if (!req.params.webResourceHash) {
      // 302 redirect to the URL with the hash
      return res.redirect(302, `/media/${req.params.datasetId}/${req.params.localId}/${md5(webResource)}`)
    }

    // TODO: if rights statement prohibits download, 403

    const webResourceUrl = new URL(webResource)

    res.setHeader('x-europeana-web-resource', webResource)

    // TODO: don't proxy errors
    const proxy = createProxyMiddleware({
      changeOrigin: true,
      followRedirects: true,
      logLevel: process.NODE_ENV === 'production' ? 'error' : '',
      onProxyRes,
      pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
      proxyTimeout: 10000,
      target: webResourceUrl.origin,
      timeout: 10000
    })

    proxy(req, res)
  } catch (error) {
    // TODO: log errors to APM
    console.error(error)
    res.sendStatus(502)
  }
}
