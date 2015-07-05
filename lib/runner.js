'use strict';
var Agenda = require('agenda');
var config = require('config');
var _ = require('lodash');
var EventBroker = require('broker');
var ApplicationEvent = EventBroker.events.ApplicationEvent;
var BBPromise = require('bluebird');
var logger = require('hoist-logger');

function Runner() {

  this.eventBroker = new EventBroker();
  _.bindAll(this);
}

Runner.prototype = {
  processEvents: function (job, done) {

    logger.info({
      job: job
    }, 'processing schedule job');
    var data = job.attrs.data;
    if (process.env.NODE_ENV === 'production') {
      if (data.application === 'demo-connect-app') {
        return Promise.resolve();
      }
    }
    BBPromise.try(function () {
        return BBPromise.all(_.map(data.events, function (eventName) {
          return this.createEvent(data, eventName);
        }, this));
      }, [], this).catch(
        /* istanbul ignore next */
        function (err) {
          logger.error(err);
          var application;
          if (data) {
            application = data.application;
          }
          logger.alert(err, application, {
            source: 'Runner#processEvents',
          });
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
    return this.eventBroker.send(applicationEvent).catch(function (err) {
      err.eventName = eventName;
      logger.error(err, 'unable to publish event');
      logger.alert(err, data.application, {
        source: 'Runner#createEvent',
        eventName: eventName
      });
    });
  },
  start: function () {
    EventBroker.ModelResolver.get()._mongoose.connect(config.get('Hoist.mongo.db'));
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
    EventBroker.ModelResolver.get()._mongoose.disconnect();
    this.agenda.stop(cb || /* istanbul ignore next */ function () {});
  }
};


module.exports = new Runner();
