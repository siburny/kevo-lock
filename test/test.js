'use strict';

var Kevo = require('../');
var should = require('should');
var assert = require('assert');
var nock = require('nock');

function Plan(count, done) {
  this.done = done;
  this.count = count;
}

Plan.prototype.ok = function () {
  if (this.count === 0) {
    assert(false, 'Too many assertions called');
  } else {
    this.count--;
  }

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
    .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' });
  it('gets the gateway info', function (done) {
    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    lock.init()
      .then(function () {
        done();
      })
      .catch(function (err) {
        throw new Error(err);
      });
  });

  http = nock('https://www.mykevo.com/')
    .get('/login')
    .reply(200, function (uri, requestBody) {
      return fs.createReadStream('tests/');
    },{ 'Location': 'https://www.mykevo.com/user/locks' });
  it('is already logged in', function (done) {

  })

});
