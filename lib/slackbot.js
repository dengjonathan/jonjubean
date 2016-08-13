'use strict';

// required modules
var util = require('util');
var fs = require('fs');
var Bot = require('slackbots');
var path = require('path');
var SQLite = require('sqlite3').verbose();

var settings = {
  token: 'xoxb-69109099271-vFOifKMSaspYpDeL0lvguWo4',
  name: 'jonjubean'
}

class AptBot extends Bot {
  // FIXME settings needs to draw API key from somewhere
  constructor(settings) {
    super(settings);
    this.settings = settings;
    this.name = settings.name || 'JonJuBean'
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'norrisbot.db');
    this.user = null;
    this.db = null;
  }
  run() {
    // access super (Bot) constructor with child class as this and this.settings as argument
    // inits a new instance of theparent class with this as the contect
    super.call(this, this.settings);

    // TODO: need to create these functions to respond to event listeners below
    // what bot does when it's first started
    this.on('start', this._onStart);
    // what bot does when you send it a message
    this.on('message', this._onMessage);
  }

  _onStart() {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
  }

  _loadBotUser() {
    // when Bot class connects to Slack server, will download array of users
    // this function just retrieves object that matches its own username
    var self = this;
    this.user = this.users.filter(function(user) {
      return self.name === user.name;
    });
  }

  _connectDb() {
    if (!fs.existsSync(this.dbPath)) {
      console.log('DB Path', this.dbPath, 'does not exist.');
      process.exit(1);
    }

    this.db = newSQLite.Database(this.dbPath);
  }

  _firstRunCheck() {
    var self = this;
    // check in database to see if a 'lastrun' record exists
    self.db.get('SELECT val FROM info WHERE name="last run" LIMIT 1',
      function(err, record) {
        if (err) {
          return console.error('Database ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();
        // if first run, send welcome message and insert new row
        if (!record) {
          self._welcomeMessage();
          return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)',
            currentTime);
        }

        // update database with new last running time
        self.db.run('UPDATE info SET val=? WHERE name="lastrun"', currentTime);
    });
  }

  _welcomeMessage() {
    this.postMessagetoChannel(this.channels[0].name, 'Hello World, I am JonJuBean!')
  }
}

// exports the AptBot class for use by other js files
module.exports = AptBot;

var c = new AptBot(settings);
console.log(c.hasOwnProperty('run'));
