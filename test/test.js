'use strict';

require('should');
var Kevo = require('../');
var nock = require('nock');
var fs = require('fs');

function Plan(count, done) {
  this.done = done;
  this.count = count;
}

Plan.prototype.ok = function () {
  this.count.should.be.above(0, 'Too many assertions called');
  this.count--;

  if (this.count === 0) {
    this.done();
  }
};

var http;
describe('Kevo Lock', function () {
  before(function (done) {
    done();
  });

  http = nock('https://www.mykevo.com/')
    .get('/login')
    .reply(200, function () {
      return fs.createReadStream('test/response/login.txt');
    })
    .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=r7hK0OycH3tpfohWo5189JLRVW0wpSRXz0dXGfEW%2BfU%3D')
    .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' });
  it('logs in', function (done) {
    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    lock._login()
      .then(function () {
        done();
      })
      .catch(function (err) {
        throw new Error(err);
      });
  });

  http = nock('https://www.mykevo.com/')
    .get('/login')
    .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' });
  it('is already logged in', function (done) {
    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    lock._login()
      .then(function () {
        done();
      })
      .catch(function (err) {
        throw new Error(err);
      });
  });

  http = nock('https://www.mykevo.com/')
    .get('/login')
    .reply(200, function () {
      return fs.createReadStream('test/response/login.txt');
    })
    .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=r7hK0OycH3tpfohWo5189JLRVW0wpSRXz0dXGfEW%2BfU%3D')
    .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' })
    .get('/user/locks')
    .reply(200, function () {
      return fs.createReadStream('test/response/locks_found.txt');
    });
  it('logs in and lock exists', function () {
    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock.init();
  });

  http = nock('https://www.mykevo.com/')
    .get('/login')
    .reply(200, function () {
      return fs.createReadStream('test/response/login.txt');
    })
    .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=r7hK0OycH3tpfohWo5189JLRVW0wpSRXz0dXGfEW%2BfU%3D')
    .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' })
    .get('/user/locks')
    .reply(200, function () {
      return fs.createReadStream('test/response/locks_not_found.txt');
    });
  it('logs in, and lock does not exist', function () {
    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock.init().should.be.rejectedWith(Error, { message: 'Could not locate lock with ID: 00000000-0000-0000-0000-000000000000' });
  });

});
