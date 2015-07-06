'use strict';
import Agenda from 'agenda';
import config from 'config';
import logger from '@hoist/logger';
import {
  Publisher
}
from '@hoist/broker';
import {
  Event,
  EventMetric,
  _mongoose
}
from '@hoist/model';
import Moment from 'moment';
import uuid from 'uuid';
import Bluebird from 'bluebird';

Bluebird.promisifyAll(_mongoose);

class Runner {
  constructor() {
    this._publisher = new Publisher();
    this._logger = logger.child({
      cls: this.constructor.name
    });

  }
  processEvents(job, done) {
    this._logger.info({
      job: job
    }, 'processing schedule job');
    var data = job.attrs.data;
    if (process.env.NODE_ENV === 'production') {
      if (data.application !== 'demo-connect-app') {
        return Promise.resolve();
      }
    }
    return Promise.resolve()
      .then(() => {
        Promise.all(data.events.map((eventName) => {
          return this.createEvent(data, eventName);
        }));
      }).then(() => {
        done();
      }).catch((err) => {
        this._logger.error(err);
        done(err);
      });
  }
  createEvent(data, eventName) {
    var ev = new Event({
      eventId: uuid.v4().split('-').join(''),
      applicationId: data.application,
      eventName: eventName,
      environment: data.environment,
      correlationId: require('uuid').v4()
    });

    this._logger.info({
      eventId: ev.messageId,
      applicationId: ev.applicationId,
      correlationId: ev.correlationId,
      eventName: eventName
    }, 'raising scheduled event');
    return this._publisher.publish(ev)
      .then(() => {
        var raisedDate = new Moment();
        var update = {
          $inc: {}
        };
        update.$inc.totalRaised = 1;
        update.$inc['raised.' + raisedDate.utc().minutes()] = 1;
        EventMetric.updateAsync({
          application: ev.applicationId,
          environment: 'live',
          eventName: ev.eventName,
          timestampHour: raisedDate.utc().startOf('hour').toDate()
        }, update, {
          upsert: true
        }).catch((err) => {
          this._logger.alert(err);
          this._logger.error(err);
        });
        return ev;
      })
      .catch((err) => {
        err.eventName = eventName;
        this._logger.error(err, 'unable to publish event');
        this._logger.alert(err, data.application, {
          source: 'Runner#createEvent',
          eventName: eventName
        });
      });
  }
  start() {
    return _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString')).
    then(() => {
      this._agenda = new Agenda({
        db: {
          address: config.get('Hoist.mongo.core.connectionString')
        }
      });
      Bluebird.promisifyAll(this._agenda);
      this._agenda.define('create:event', (job, done) => {
        return this.processEvents(job, done);
      });
      this._agenda.start();
      logger.info('waiting on schedule');
    });

  }
  stop() {
    return this._agenda.stopAsync().then(() => {
      delete this._agenda;
      return _mongoose.disconnectAsync();
    });
  }
}


export default Runner;
