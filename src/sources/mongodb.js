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

    if (!aggregation) {
      return null
    }

    let webResourceId
    if (webResourceHash) {
      webResourceId = [aggregation.edmIsShownBy].concat(aggregation.hasView)
        .filter((wr) => !!wr)
        .find((wr) => md5(wr) === webResourceHash)
    } else {
      webResourceId = aggregation.edmIsShownBy
    }

    if (!webResourceId) {
      return null
    }

    return {
      id: webResourceId
    }
  }
}
