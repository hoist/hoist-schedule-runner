'use strict';
process.env.NODE_ENV = 'test';

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var BBPromise = require('bluebird');
var unhandledPromises = [];
BBPromise.onPossiblyUnhandledRejection(function (reason, promise) {
  unhandledPromises.push(promise);
  //Update some debugger UI
});

BBPromise.onUnhandledRejectionHandled(function (promise) {
  var index = unhandledPromises.indexOf(promise);
  unhandledPromises.splice(index, 1);
  //Update the debugger UI
});

after(function () {
  if (unhandledPromises.length > 0) {
    console.error('unhandled promise exceptions', unhandledPromises);

  }
  chai.expect(unhandledPromises.length).to.eql(0);
});
