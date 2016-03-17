'use strict';
import {
  Publisher
}
from '@hoist/broker';
import sinon from 'sinon';
import Runner from '../../lib/runner';
import {
  expect
}
from 'chai';
import {
  _mongoose,
  Event
}
from '@hoist/model';
import Bluebird from 'bluebird';
import Agenda from 'agenda';

describe('Runner', function () {
  let runner;
  before(() => {
    sinon.stub(Publisher.prototype, 'publish').returns(Promise.resolve(null));
    runner = new Runner();
  });
  after(() => {
    Publisher.prototype.publish.restore();
  });
  describe('Runner#createEvent', function () {
    var data = {
      application: 'appid',
      environment: 'live'
    };
    before(function () {
      return runner.createEvent(data, 'my:event');
    });
    after(function () {
      Publisher.prototype.publish.reset();
    });
    it('publishes event', function () {
      expect(Publisher.prototype.publish)
        .to.have.been.calledWith(sinon.match.instanceOf(Event));
    });
  });
  describe('Runner#processEvents', function () {
    var job = {
      attrs: {
        data: {
          application: 'appid',
          events: ['event:1', 'event:2']
        }
      }
    };
    before(function (done) {
      sinon.stub(runner, 'createEvent').returns(Promise.resolve(null));
      runner.processEvents(job, done);
    });
    after(function () {
      runner.createEvent.restore();
    });
    it('creates events', function () {
      expect(runner.createEvent)
        .to.have.been.calledWith(job.attrs.data, 'event:1')
        .and.calledWith(job.attrs.data, 'event:2');
    });

  });

  describe('#start', function () {
    before(function () {
      sinon.stub(_mongoose, 'connect').yields();
      sinon.stub(Agenda.prototype, 'database').yields();
      sinon.stub(Agenda.prototype, 'define');
      sinon.stub(Agenda.prototype, 'start');
      return runner.start();
    });
    after(function () {
      _mongoose.connect.restore();
      Agenda.prototype.database.restore();
      Agenda.prototype.start.restore();
      Agenda.prototype.define.restore();
      delete runner._agenda;
    });
    it('calls start', function () {
      return expect(Agenda.prototype.start)
        .to.have.been.called;
    });
    it('defines create:event runner', function () {
      return expect(Agenda.prototype.define)
        .to.be.calledWith('create:event2', sinon.match.func);
    });
    it('defines a local agenda', () => {
      return expect(runner._agenda).to.exist;
    });
    it('promisifys agenda', () => {
      return expect(runner._agenda).to.respondTo('mongoAsync');
    });
  });

  describe('#stop', function () {
    before(function () {

      sinon.stub(_mongoose, 'disconnect').yields();
      sinon.stub(Agenda.prototype, 'stop').yields();
      runner._agenda = new Agenda();
      Bluebird.promisifyAll(runner._agenda);
      return runner.stop();
    });
    after(function () {
      _mongoose.disconnect.restore();
      Agenda.prototype.stop.restore();
    });
    it('calls stop', function () {
      return expect(Agenda.prototype.stop).to.have.been.called;
    });
    it('removes agenda', () => {
      return expect(runner._agenda).to.not.exist;
    });
  });

});
