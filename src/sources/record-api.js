import axios from 'axios'
import md5 from 'md5'
import config from '../config.js'

export default class RecordApiSource {
  static forUrl (apiUrl) {
    if (typeof apiUrl === 'string') {
      apiUrl = new URL(apiUrl)
    }
    if (apiUrl.pathname === '/api') {
      apiUrl.pathname = '/record'
    }
    apiUrl = apiUrl.toString()
    if (!config.europeana.permittedApiUrls.includes(apiUrl)) {
      throw new Error('Unauthorised API URL')
    }
    return new RecordApiSource(apiUrl)
  }

  constructor (apiUrl) {
    this.apiUrl = apiUrl || config.europeana.apiUrl
  }

  async find (itemId, webResourceHash) {
    let apiResponse
    try {
      apiResponse = await axios({
        baseURL: this.apiUrl,
        method: 'GET',
        params: {
          wskey: config.europeana.apiKey
        },
        timeout: 10000,
        url: `${itemId}.json`
      })
    } catch (apiError) {
      if (apiError.response?.status === 404) {
        return null
      }
      throw apiError
    }

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
}
