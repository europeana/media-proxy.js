import axios from 'axios'
import http from 'http'
import https from 'https'
import md5 from 'md5'

export default class RecordApiSource {
  #config = {}
  #axiosInstance
  apiUrl

  constructor (config, apiUrl) {
    this.#config = config
    this.validateApiUrlPermitted(apiUrl)
    this.apiUrl = this.apiUrlWithRecordSuffix(apiUrl || this.#config.apiUrl)
    this.#axiosInstance = axios.create({
      baseURL: this.apiUrl,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      params: {
        wskey: this.#config.apiKey
      },
      timeout: 10000
    })
  }

  apiUrlWithRecordSuffix (apiUrl) {
    return apiUrl.endsWith('/record') ? apiUrl : `${apiUrl}/record`
  }

  validateApiUrlPermitted (apiUrl) {
    if (apiUrl && !this.permittedApiUrls.includes(apiUrl)) {
      throw new Error(`Unauthorised API URL: "${apiUrl}"`)
    }
  }

  get permittedApiUrls () {
    return [this.#config.apiUrl].concat(this.#config.permittedApiUrls || [])
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

    return {
      id: webResourceId
    }
  }
}
