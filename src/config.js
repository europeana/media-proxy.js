import expressPkg from 'express/package.json' assert { type: 'json' }
import pkg from '../package.json' assert { type: 'json' }

export default {
  elasticApm: {
    environment: process.env['ELASTIC_APM_ENVIRONMENT'] || 'development',
    frameworkName: 'Express.js',
    frameworkVersion: expressPkg.version,
    logLevel: process.env['ELASTIC_APM_LOG_LEVEL'] || 'info',
    serverUrl: process.env['ELASTIC_APM_SERVER_URL'],
    serviceName: 'media-proxy-js',
    serviceVersion: pkg.version
  },
  europeana: {
    apiKey: process.env['EUROPEANA_API_KEY'],
    apiUrl: process.env['EUROPEANA_API_URL'] || 'https://api.europeana.eu/record'
  },
  port: process.env.PORT || 3000
}
