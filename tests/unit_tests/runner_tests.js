'use strict';
require('../broker');
var EventBroker = require('broker');
var sinon = require('sinon');
var runner = require('../../lib/runner');
var BBPromise = require('bluebird');
var expect = require('chai').expect;
var Agenda = require('agenda');
describe('Runner', function () {
  describe('#createEvent', function () {
    var data = {
      application: 'appid',
      environment: 'live'
    };
    before(function () {
      sinon.stub(runner.eventBroker, 'send').returns(BBPromise.resolve(null));
      return runner.createEvent(data, 'my:event');
    });
    after(function () {
      runner.eventBroker.send.restore();
    });
    it('publishes event', function () {
      expect(runner.eventBroker.send)
        .to.have.been.calledWith(sinon.match.instanceOf(EventBroker.events.ApplicationEvent));
    });
  });
  describe('#processEvents', function () {
    var job = {
      attrs: {
        data: {
          application: 'appid',
          events: ['event:1', 'event:2']
        }
      }
    };
    before(function (done) {
      sinon.stub(runner, 'createEvent').returns(BBPromise.resolve(null));
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
      sinon.stub(Agenda.prototype, 'database').returnsThis();
      sinon.stub(Agenda.prototype, 'define');
      sinon.stub(Agenda.prototype, 'start');
      runner.start();
    });
    after(function () {
      Agenda.prototype.database.restore();
      Agenda.prototype.start.restore();
      Agenda.prototype.define.restore();
    });
    it('calls start', function () {
      return expect(Agenda.prototype.start)
        .to.have.been.called;
    });
    it('defines create:event runner', function () {
      expect(Agenda.prototype.define)
        .to.be.calledWith('create:event', sinon.match.func);
    });
  });
  describe('#stop', function () {
    before(function (done) {
      sinon.stub(Agenda.prototype, 'stop').callsArg(0);
      runner.stop(done);
    });
    after(function () {
      Agenda.prototype.stop.restore();
    });
    it('calls stop', function () {
      return expect(Agenda.prototype.stop).to.have.been.called;
    });
  });
});
