const nconf = require('nconf')
const itauscraper = require('./itauscraper.js')

var argv = require('yargs')
  .env()
  .usage('Usage: node $0 [options]')
  .option('branch', {
    alias: 'b',
    describe: 'Itaú branch number, format: 0000',
    required: true,
    type: 'string'
  })
  .option('account', {
    alias: 'c',
    describe: 'Itaú account number, format: 00000-0',
    required: true,
    type: 'string'
  })
  .option('password', {
    alias: 'p',
    describe: 'Itaú account digital password(6 digits)',
    required: true,
    type: 'number'
  })
  .option('days', {
    alias: 'd',
    describe: 'Transaction log days',
    required: true,
    type: 'number',
    choices: [3, 5, 7, 15, 30, 60, 90]
  })
  .option('file_format', {
    alias: 'f',
    describe: 'File format to export',
    default: 'ofx',
    choices: ['pdf', 'xls', 'txt', 'ofx', 'ofc10', 'ofc106']
  })
  .option('node_env', {
    describe: 'Node environment',
    default: 'production',
    choices: ['development', 'production', 'docker']
  })

// Config
nconf.env({ lowerCase: true }).argv(argv)
const environment = nconf.get('node_env')
nconf.file(environment, './config/' + environment.toLowerCase() + '.json')
nconf.file('default', './config/default.json')

const options = nconf.get()

console.log('Starting using node environment: ' + environment)
// Run
itauscraper(options)
