var request = require('request').defaults({ jar: true });
var cheerio = require('cheerio');
var Q = require('q');
var debug = require('debug')('kevo-lock');

var STATUS_LOCKED = 'Locked';
var STATUS_UNLOCKED = 'Unlocked';

function KevoLock(username, password, lock_id) {
  this.username = username;
  this.password = password;
  this.lockId = lock_id;
}

KevoLock.prototype.init = function () {
  var lock = this;
  return this._login()
    .then(function () {
      return lock._checkLockExists();
    })
    .then(function () {
      debug('Lock initialized.');
    });
};

KevoLock.prototype._login = function () {
  var deferred = Q.defer();

  var self = this;
  var url = 'https://www.mykevo.com/login';

  var followRedirect = function (response) {
    if (response.headers.location === 'https://www.mykevo.com/user/locks') {
      debug('Already logged in.');
      return false;
    }
    return true; // ok redirect, sure
  };

  request(url, { followRedirect: followRedirect }, function (err, response, body) {
    if (!err && response.statusCode === 302 && response.headers.location === 'https://www.mykevo.com/user/locks') {
      deferred.resolve();
      return;
    }

    if (!err && response.statusCode === 200) {
      var form = {
        'user[username]': self.username,
        'user[password]': self.password,
        'commit': 'Sign In'
      };

      var $ = cheerio.load(body);
      var action = $('form#new_user').attr('action');

      $('form#new_user input[type=hidden]').each(function (i, input) {
        var name = $(input).attr('name');
        var value = $(input).val();
        form[name] = value;
      });

      if (!action) {
        debug('Couldn\'t find form action.');
        deferred.reject(new Error('Couldn\'t find form action.'));
        return;
      }

      request.post(action, { form: form }, function (err, response) {
        if (!err && response.statusCode === 302) {
          debug('Login successful.');
          deferred.resolve();
        } else {
          err = err || new Error('Bad status code ' + response.statusCode);
          debug('Error submitting login page: %s', err);
          deferred.reject(new Error(err));
        }
      });

    } else {
      err = err || new Error('Invalid response code ' + response.statusCode);
      debug('Error requesting login page: %s', err);
      deferred.reject(new Error(err));
    }
  });

  return deferred.promise;
};

KevoLock.prototype._checkLockExists = function () {
  var deferred = Q.defer();
  var self = this;
  var url = 'https://www.mykevo.com/user/locks';

  request(url, function (err, response, body) {
    if (!err && response.statusCode === 200) {
      var $ = cheerio.load(body);

      var locks = $('*[data-lock-id]');
      for (var i = 0; i < locks.length; i++) {
        var lockId = $(locks[i]).attr('data-lock-id');

        if (lockId === self.lockId) {
          deferred.resolve();
          return;
        }
      }

      err = 'Could not locate lock with ID: ' + self.lockId;
      debug(err);
      deferred.reject(new Error(err));
    } else {
      err = err || new Error('Error fetching lock: Invalid status code ' + response.statusCode);
      debug(err.message);
      deferred.reject(err);
    }
  });

  return deferred.promise;
};

KevoLock.prototype._getLockStatus = function () {
  var deferred = Q.defer();
  var url = 'https://www.mykevo.com/user/remote_locks/command/lock.json';
  var qs = {
    arguments: this.lockId
  };

  request(url, { qs: qs }, function (err, response, body) {
    if (!err && response.statusCode === 200) {
      return deferred.resolve(JSON.parse(body));
    } else {
      err = err || new Error('Invalid status code ' + response.statusCode);
      debug('Error getting lock status: %s', err);
      deferred.reject(err);
    }
  });

  return deferred.promise;
};

KevoLock.prototype._setLockStatus = function (status) {
  var url;
  var self = this;

  if (status === STATUS_LOCKED) {
    url = 'https://www.mykevo.com/user/remote_locks/command/remote_lock.json';
  } else if (status === STATUS_UNLOCKED) {
    url = 'https://www.mykevo.com/user/remote_locks/command/remote_unlock.json';
  } else {
    var err = 'Invalid lock status: ' + status;
    debug(err);
    return Q.fcall(function () { throw new Error(err); });
  }

  var qs = {
    arguments: self.lockId
  };

  var deferred = Q.defer();

  request(url, { qs: qs }, function (err, response, body) {
    if (!err && response.statusCode === 200) {
      var json = JSON.parse(body);

      if (json.status_code !== 201) {
        deferred.reject('Unexpected status_code ' + json.status_code);
        return;
      }

      deferred.resolve();
    } else {
      err = 'Error setting lock status: Invalid status code ' + response.statusCode;
      debug(err);
      deferred.reject(err);
    }
  });

  return deferred.promise;
};

KevoLock.prototype.isLocked = function () {
  var err;

  return this.status()
    .then(function (status) {
      if (status && status.bolt_state) {
        var state = status.bolt_state;
        if (state === STATUS_LOCKED) {
          return true;
        } else if (state === STATUS_UNLOCKED) {
          return false;
        } else {
          err = 'Error getting state: Invalid lock state \'' + state + '\'.';
          debug(err);
          throw new Error(err);
        }
      } else {
        err = 'Error getting state: no status returned.';
        debug(err);
        throw new Error(err);
      }
    });
};

KevoLock.prototype.status = function () {
  var self = this;

  if (!self.lockId) {
    var err = 'Lock has no ID assigned; can\'t get current state.';
    debug(err);
    return Q.fcall(function () { throw new Error(err); });
  }

  debug('Getting current status.');

  return self._login()
    .then(function () {
      return self._getLockStatus();
    })
    .then(function (status) {
      debug('Lock status success');
      return status;
    });
};

KevoLock.prototype.lock = function (state) {
  if (!this.lockId) {
    debug('Lock has no ID assigned; can\'t set lock/unlock');
    return;
  }

  this.isLocked()
    .then(function (isLocked) {
      if (state && !isLocked) {

      } else if (!state && isLocked) {

      }
    });
};

module.exports = KevoLock;
