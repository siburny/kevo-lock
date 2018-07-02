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

  afterEach(function (done) {
    nock.cleanAll();
    done();
  });

  it('logs in', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login();
  });

  it('error logging in - wrong username/password', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(200, function () {
        return fs.createReadStream('test/response/login_error.txt');
      });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login().should.be.rejectedWith(Error, { message: 'Error submitting login page: bad status code 200 [Expected: 302]' });
  });

  it('error logging in - internal error #1', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/error' });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login().should.be.rejectedWith(Error, { message: 'Error getting login page: bad redirect location https://www.mykevo.com/error [Expected: https://www.mykevo.com/user/locks]' });
  });

  it('error logging in - internal error #2', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/error' });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login().should.be.rejectedWith(Error, { message: 'Error submitting login page: bad redirect location https://www.mykevo.com/error [Expected: https://www.mykevo.com/user/locks]' });
  });

  it('error logging in - internal error #3', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(404, 'Not Found');

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login().should.be.rejectedWith(Error, { message: 'Error getting login page: invalid response code 404' });
  });

  it('error logging in - bad form', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login_badform.txt');
      });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login().should.be.rejectedWith(Error, { message: 'Error getting login page: can\'t find form action.' });
  });

  it('is already logged in', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock._login();
  });

  it('logs in and lock exists', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' })
      .get('/user/locks')
      .reply(200, function () {
        return fs.createReadStream('test/response/locks_found.txt');
      });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock.init();
  });

  it('logs in, and lock does not exist', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' })
      .get('/user/locks')
      .reply(200, function () {
        return fs.createReadStream('test/response/locks_not_found.txt');
      });

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock.init().should.be.rejectedWith(Error, { message: 'Could not locate lock with ID: 00000000-0000-0000-0000-000000000000' });
  });

  it('logs in and lock exists - internal error', function () {
    http = nock('https://www.mykevo.com/')
      .get('/login')
      .reply(200, function () {
        return fs.createReadStream('test/response/login.txt');
      })
      .post('/signin', 'user%5Busername%5D=test%40test.com&user%5Bpassword%5D=password&commit=Sign%20In&utf8=%E2%9C%93&authenticity_token=25OSFMcktltfVZf5VQdh3ZMGpbieZTXklCluaEbPsEY%3D')
      .reply(302, 'Moved', { 'Location': 'https://www.mykevo.com/user/locks' })
      .get('/user/locks')
      .reply(404, 'Not Found');

    var lock = new Kevo('test@test.com', 'password', '00000000-0000-0000-0000-000000000000');

    return lock.init().should.be.rejectedWith(Error, { message: 'Error fetching lock: Invalid status code 404' });
  });

});
