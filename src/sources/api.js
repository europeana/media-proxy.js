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

  let webResourceId
  if (webResourceHash) {
    webResourceId = providerAggregation.webResources
      .find((wr) => md5(wr.about) === webResourceHash).about
  } else {
    webResourceId = providerAggregation.edmIsShownBy
  }

  if (!webResourceId) {
    return null
  }

  let edmRights = providerAggregation.edmRights.def[0]

  const webResource = providerAggregation.webResources
    .find((wr) => wr.about === webResourceId)
  if (webResource.webResourceEdmRights) {
    edmRights = webResource.webResourceEdmRights.def[0]
  }

  return {
    edmRights,
    id: webResourceId
  }
}
