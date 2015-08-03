'use strict';
require("babel/register");
var logger = require('@hoist/logger');

var ExecutorService = require('./lib/executor_service');
var executorService = new ExecutorService();

var gracefullShutdown = function (SIG) {
  logger.info('server stopping');
  return Promise.all([
    executorService.stop()
  ]).then(function () {
    process.kill(process.pid, SIG);
  }).catch(function (err) {
    logger.error(err);
    logger.alert(err);
    throw err;
  });
};
executorService.start().then(function () {
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
