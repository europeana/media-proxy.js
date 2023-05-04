// TODO: this duplicates the code from the same file in europeana/portal.js:
//       extract to a reusable helper script
import fs from 'fs';

const versionSonarProjectProperties = () => {
  const sonarProjectPropertiesFilePath = new URL('../sonar-project.properties', import.meta.url);

  let sonarProjectProperties = fs.readFileSync(sonarProjectPropertiesFilePath, { encoding: 'utf8' });
  sonarProjectProperties = sonarProjectProperties.replace(/sonar\.projectVersion=.*/, `sonar.projectVersion=${process.env.npm_package_version}`);

  fs.writeFileSync(sonarProjectPropertiesFilePath, sonarProjectProperties);
};

versionSonarProjectProperties();
