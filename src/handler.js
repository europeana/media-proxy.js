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
 */

import { createProxyMiddleware } from 'http-proxy-middleware'
import config from './config.js'
import getWebResourceFromRecordAPI from './data-sources/api.js'
import getWebResourceFromMongo from './data-sources/mongodb.js'

const getWebResource = config.app.dataSource === 'api' ? getWebResourceFromRecordAPI : getWebResourceFromMongo

// TODO: filenames, inc hash & extension
//       https://www.npmjs.com/package/mime-types
// TODO: download/inline
export default async (req, res) => {
  const itemId = `/${req.params.datasetId}/${req.params.localId}`

  try {
    const webResource = await getWebResource(itemId, req.params.webResourceHash)

    // Handle no isShownBy and no hash, or invalid hash
    if (!webResource) {
      return res.sendStatus(404)
    }

    // TODO: if no hash, redirect to the URL with the hash

    const webResourceUrl = new URL(webResource)

    // TODO: don't proxy errors
    // TODO: don't proxy upstream CORS headers
    const proxy = createProxyMiddleware({
      changeOrigin: true,
      followRedirects: true,
      logLevel: 'error',
      pathRewrite: () => `${webResourceUrl.pathname}${webResourceUrl.search}`,
      proxyTimeout: 10000,
      target: webResourceUrl.origin,
      timeout: 10000
    })
    proxy(req, res)
  } catch ({ message }) {
    res.status(502).json({ message })
  } finally {
    // mongoClient.close()
  }
}
