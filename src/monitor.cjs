const elasticApmNode = require('elastic-apm-node')

const expressPkg = require('express/package.json')
const pkg = require('../package.json')

const elasticApmConfig = {
  environment: process.env['ELASTIC_APM_ENVIRONMENT'] || 'development',
  frameworkName: 'Express.js',
  frameworkVersion: expressPkg.version,
  logLevel: process.env['ELASTIC_APM_LOG_LEVEL'] || 'info',
  serverUrl: process.env['ELASTIC_APM_SERVER_URL'],
  serviceName: 'media-proxy-js',
  serviceVersion: pkg.version
}

if (elasticApmConfig.serverUrl) {
  elasticApmNode.start(elasticApmConfig)
}
