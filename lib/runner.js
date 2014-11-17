'use strict';
var Agenda = require('agenda');
var config = require('config');
var _ = require('lodash');
var ApplicationEvent = require('broker/lib/event_types/application_event');
var EventBroker = require('broker/lib/event_broker');
var BBPromise = require('bluebird');
var logger = require('hoist-logger');

function Runner() {
  _.bindAll(this);
}

Runner.prototype = {
  processEvents: function (job, done) {
    logger.info({
      job: job
    }, 'processing schedule job');
    BBPromise.all(_.map(job.data.events, function (eventName) {
      return this.createEvent(job, eventName);
    }, this)).nodeify(done);
  },
  createEvent: function (job, eventName) {
    var applicationEvent = new ApplicationEvent({
      applicationId: job.data.application,
      environment: job.data.environment,
      eventName: eventName
    });
    logger.info({
      eventId: applicationEvent.messageId,
      applicationId: applicationEvent.applicationId,
      correlationId: applicationEvent.correlationId,
      eventName: eventName
    }, 'raising scheduled event');
    return EventBroker.publish(applicationEvent);
  },
  start: function () {

    this.agenda = new Agenda({
      db: {
        address: config.get('Hoist.mongo.db')
      }
    });
    this.agenda.define('create:event', this.processEvents);
    logger.info('waiting on schedule');
  },
  stop: function (cb) {
    this.agenda.stop(cb || /* istanbul ignore next */ function () {});
  }
};


module.exports = new Runner();
