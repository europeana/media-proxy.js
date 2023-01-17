/**
 * Test items:
 * - times out /2048005/Athena_Plus_ProvidedCHO_Nationalmuseum__Sweden_83982
 *   not being handled properly yet, for some reason
 */

import axios from 'axios'
import md5 from 'md5'
import { createProxyMiddleware } from 'http-proxy-middleware'
import config from './config.js'

// TODO: filenames, inc hash & extension
//       https://www.npmjs.com/package/mime-types
// TODO: download/inline
export default async(req, res) => {
  const itemId = `/${req.params.datasetId}/${req.params.localId}`

  try {
    // TODO: use http-proxy-middleware here instead?
    const apiResponse = await axios({
      baseURL: 'https://api.europeana.eu',
      method: 'GET',
      params: {
        wskey: config.europeana.apiKey
      },
      timeout: 10000,
      url: `/record${itemId}.json`
    })
    // TODO: handle API errors like 404
    const item = apiResponse.data.object
    const providerAggregation = item.aggregations.find((agg) => agg.about === `/aggregation/provider${itemId}`)

    let webResource
    if (req.params.webResourceHash) {
      webResource = providerAggregation.webResources.find((wr) => md5(wr.about) === req.params.webResourceHash).about
    } else {
      // TODO: redirect to the URL with the hash? would result in rerequesting record from api...
      webResource = providerAggregation.edmIsShownBy
    }

    // Handle no isShownBy and no hash, or invalid hash
    if (!webResource) {
      return res.sendStatus(404)
    }

    const webResourceUrl = new URL(webResource)

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
  }
}
