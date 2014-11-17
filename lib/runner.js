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
    var data = job.attrs.data;
    BBPromise.try(function () {
        return BBPromise.all(_.map(data.events, function (eventName) {
          return this.createEvent(data, eventName);
        }, this));
      }, [], this).catch(
        /* istanbul ignore next */
        function (err) {
          logger.info(err);
          logger.error(err);
          var application;
          if (data) {
            application = data.application;
          }
          logger.alert(err, application);
          throw err;
        })
      .nodeify(done);
  },
  createEvent: function (data, eventName) {
    var applicationEvent = new ApplicationEvent({
      applicationId: data.application,
      environment: data.environment,
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
    this.agenda.start();
    logger.info('waiting on schedule');
  },
  stop: function (cb) {
    this.agenda.stop(cb || /* istanbul ignore next */ function () {});
  }
};


module.exports = new Runner();
