# Europeana Media Proxy

[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=europeana_media-proxy.js&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=europeana_media-proxy.js)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=europeana_media-proxy.js&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=europeana_media-proxy.js)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=europeana_media-proxy.js&metric=security_rating)](https://sonarcloud.io/dashboard?id=europeana_media-proxy.js)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=europeana_media-proxy.js&metric=coverage)](https://sonarcloud.io/summary/new_code?id=europeana_media-proxy.js)

Micro-service for proxying Europeana `edm:hasView` and `edm:isShownBy` web
resources from providers' websites.

## Documentation

Documentation is available at https://europeana.github.io/media-proxy.js/api/.

## Requirements

* Node.js 18
* Data store credentials; one of:
  * Europeana item metadata MongoDB access credentials (recommended)
  * [Europeana API key](https://pro.europeana.eu/get-api)


## Configuration

Configuration is by environment variable.

### Required

#### Data source

Either a Europeana item metadata MongoDB, or a Europeana Record API is required
as a data source. MongoDB is recommended.

#### MongoDB

```sh
APP_DATA_SOURCE=mongodb
MONGODB_DATABASE=europeana-item-metadata
MONGODB_URI=mongodb://user:pass@server1.example.org:27017,server2.example.org:27017
```

#### Record API

```sh
APP_DATA_SOURCE=record-api
EUROPEANA_API_KEY=YOUR_API_KEY
EUROPEANA_API_URL=https://api.europeana.eu/record
```

### Optional

#### Alternative Europeana Record APIs

Should you need to permit the use of alternative Europeana Record APIs on a
per-request basis, these need to be specified as a comma-separated list:
```sh
EUROPEANA_PERMITTED_API_URLS="https://api2.europeana.eu/record,https://api3.europeana.eu/record"
```

#### Elastic APM

To enable transaction logging to Elastic APM:
```sh
ELASTIC_APM_SERVER_URL=https://apm.example.org
ELASTIC_APM_LOG_LEVEL=info
ELASTIC_APM_ENVIRONMENT=development
```

## Development

The Europeana Media Proxy is written as an Express.js app for Node.js.


### Install

```
npm ci
```

### Build & run for production

* Building for production uses rollup
* Running in production does not support use of .env files

```
npm run build
npm run start
```

The service will be available at http://localhost:3000/

### Run for development

* Runs with hot-reload of source
* .env file support

```
npm run dev
```

The service will be available at http://localhost:3000/

### Test

Run unit tests:
```
npm run test
```

### Writing documentation

Documentation is generated by RapiDoc from the [OpenAPI Specification v3 manifest](https://spec.openapis.org/oas/v3.1.0) in [`./docs/api/openapi.yaml`](./docs/api/openapi.yaml). To view locally, run the documentation web server:

```
npm run docs
```

The documentation will now be available at http://localhost:4000/. Reload the
page after making changes to the manifest to see the latest documentation.


## License

Licensed under the EUPL v1.2.

For full details, see [LICENSE.md](LICENSE.md).
