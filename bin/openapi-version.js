import fs from 'fs'
import { parse, stringify } from 'yaml'

const versionOpenapiYaml = () => {
  const openApiYamlFilePath = new URL('../docs/api/openapi.yaml', import.meta.url)

  let openApiYaml = parse(fs.readFileSync(openApiYamlFilePath, { encoding: 'utf8' }))
  openApiYaml.info.version = process.env.npm_package_version

  fs.writeFileSync(openApiYamlFilePath, stringify(openApiYaml))
}

versionOpenapiYaml()
