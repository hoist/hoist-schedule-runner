'use strict';
require('babel-register');
var Runner = require('./lib/runner').default;
var logger = require('@hoist/logger');
var runner = new Runner();
process.title = 'hoist-schedule-runner';



var gracefullShutdown = function (SIG) {
  logger.info('server stopping');
  return Promise.all([
    runner.stop()
  ]).then(function () {
    process.kill(process.pid, SIG);
  }).catch(function (err) {
    logger.error(err);
    logger.alert(err);
    process.kill(1);
  });
};

runner.start().then(function () {
  logger.info('service started');
  process.once('SIGUSR2', function () {
    return gracefullShutdown('SIGUSR2');
  });
  process.once('SIGTERM', function () {
    return gracefullShutdown('SIGTERM');
  });
  process.once('SIGINT', function () {
    return gracefullShutdown('SIGINT');
  });
}).catch(function (err) {
  logger.error(err);
  logger.alert(err);
  process.exit(1);
});
