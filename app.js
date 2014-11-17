'use strict';
var runner = require('./lib/runner');

process.on('message', function (msg) {

  if (msg === 'shutdown') {
    console.log('closing connection');
    // Your process is going to be reloaded
    // You have to close all database/socket.io/* connections

    console.log('Closing all connections...');

    // You will have 4000ms to close all connections before
    // the reload mechanism will try to do its job
    setTimeout(function () {
      runner.stop(function () {
        process.exit(0);
      });
    }, 1500);
  }
});


runner.start();
