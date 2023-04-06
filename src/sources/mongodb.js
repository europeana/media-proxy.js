import { MongoClient } from 'mongodb'
import md5 from 'md5'

import config from '../config.js'

export default class MongoSource {
  constructor (client) {
    this.mongoClient = client
  }

  get client () {
    if (!this.mongoClient) {
      this.mongoClient = new MongoClient(config.mongodb.uri)
    }
    return this.mongoClient
  }

  get db () {
    if (!this.mongoDb) {
      this.mongoDb = this.client.db(config.mongodb.database)
    }
    return this.mongoDb
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
