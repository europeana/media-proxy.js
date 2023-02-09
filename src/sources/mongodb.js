import { MongoClient } from 'mongodb'
import md5 from 'md5'
import config from '../config.js'

let mongoClient

export default async (itemId, webResourceHash) => {
  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodb.uri)
  }

  const mongoDb = mongoClient.db(config.mongodb.database)
  const mongoCollection = mongoDb.collection('Aggregation')
  const aggregation = await mongoCollection.findOne({ about: `/aggregation/provider${itemId}` })
  // TODO: fetch and return the rights statement, from the EuropeanaAggregation
  //       collection, but also looking for WR-specific rights

  let webResource
  if (webResourceHash) {
    webResource = [aggregation.edmIsShownBy]
      .concat(aggregation.hasView)
      .find((wr) => md5(wr) === webResourceHash)
  } else {
    webResource = aggregation.edmIsShownBy
  }

  return webResource
}
