export default {
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js'
  ],
  coverageProvider: 'v8',
  coverageReporters: [
    'html',
    'lcov',
    'text'
  ],
  moduleFileExtensions: [
    'js',
    'json'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: [
    '<rootDir>/tests/unit/setup.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tmp/',
    '<rootDir>/dist/'
  ],
  transform: {}
}
