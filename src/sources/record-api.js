import axios from 'axios'
import http from 'http'
import https from 'https'
import md5 from 'md5'

export default class RecordApiSource {
  #config = {}
  #axiosInstance
  #apiUrl

  constructor (config, apiUrl) {
    this.#config = config
    this.apiUrl = apiUrl || this.#config.apiUrl
    this.#axiosInstance = axios.create({
      baseURL: this.#apiUrl,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      params: {
        wskey: this.#config.apiKey
      },
      timeout: 10000
    })
  }

  set apiUrl (apiUrl) {
    if (!this.permittedApiUrls.includes(apiUrl)) {
      throw new Error('Unauthorised API URL')
    }
    this.#apiUrl = apiUrl
  }

  get permittedApiUrls () {
    return [this.#apiUrl].concat(this.#config.permittedApiUrls || [])
  }

  async find (itemId, webResourceHash) {
    let apiResponse
    try {
      apiResponse = await this.#axiosInstance({
        method: 'GET',
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
        .find((wr) => md5(wr.about) === webResourceHash)?.about
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
