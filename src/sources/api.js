import axios from 'axios'
import md5 from 'md5'
import config from '../config.js'

export default async (itemId, webResourceHash) => {
  const apiResponse = await axios({
    baseURL: config.europeana.apiUrl,
    method: 'GET',
    params: {
      wskey: config.europeana.apiKey
    },
    timeout: 10000,
    url: `${itemId}.json`
  })
  // TODO: handle API errors like 404

  const item = apiResponse.data.object
  const providerAggregation = item.aggregations.find((agg) => agg.about === `/aggregation/provider${itemId}`)

  let webResource
  if (webResourceHash) {
    webResource = providerAggregation.webResources
      .find((wr) => md5(wr.about) === webResourceHash).about
  } else {
    webResource = providerAggregation.edmIsShownBy
  }
  // TODO: fetch and return the rights statement

  return webResource
}
