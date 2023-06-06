import { MongoClient } from 'mongodb'
import md5 from 'md5'

export default class MongoSource {
  #config = {}
  #client
  #db

  constructor (config, client) {
    this.#config = config
    this.#client = client
  }

  get client () {
    if (!this.#client) {
      this.#client = new MongoClient(this.#config.uri)
    }
    return this.#client
  }

  get db () {
    if (!this.#db) {
      this.#db = this.client.db(this.#config.database)
    }
    return this.#db
  }

  async find (itemId, webResourceHash) {
    const aggregation = await this.db.collection('Aggregation')
      .findOne({ about: `/aggregation/provider${itemId}` })

    let webResourceId
    if (webResourceHash) {
      webResourceId = [aggregation.edmIsShownBy].concat(aggregation.hasView)
        .find((wr) => md5(wr) === webResourceHash)
    } else {
      webResourceId = aggregation.edmIsShownBy
    }

    if (!webResourceId) {
      return null
    }

    let edmRights = aggregation.edmRights.def[0]

    const webResourceDoc = await this.db.collection('WebResource')
      .findOne({ about: webResourceId })
    if (webResourceDoc?.webResourceEdmRights) {
      edmRights = webResourceDoc.webResourceEdmRights.def[0]
    }

    return {
      edmRights,
      id: webResourceId
    }
  }
}
