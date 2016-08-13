'use strict';

// required modules
var util = require('util');
var fs = require('fs');
var Bot = require('slackbots');
var path = require('path');
var SQLite = require('sqlite3').verbose();

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

  // on every message, bot will parse to see if it relevant and it needs to respond
  _onMessage(message) {
    if (this._isChatMessage(message) &&
      this._isChannelConversation(message) &&
      !this._isFromThisBot(message) &&
      this._isMentioningThisBot(message)
    ) {
      this._replyWithRandomJoke(message);
    }
  }

  // checks if incoming API message is a chat message with text
  _isChatMessage(message) {
    return message.type === 'message' && Boolean(message.text);
  }

  _isChannelConversation(message) {
    // for chat channels, the first character of the ID is always 'C'
    return typeof message.channel === 'string' && message.channel[0] === 'C';
  }

  _isFromThisBot(message) {
    return message.user === this.user.id;
  }

  _isMentioningThisBot(message) {
    return message.text.toLowerCase().indexOf(this.name) > -1;
  }

  _replyWithRandomJoke(originalMessage) {
    var self = this;
    self.db.get('SELECT id, joke by jokes ORDER by ASC, RANDOM() LIMIT 1',
      function(err, record) {
        if (err) {
          return console.error('DATABASE ERROR:', err);
        }

        var channel = self._getChannelById(originalMessage.channel);
        self.postMessagetoChannel(channel.name, record.joke, {as_user: true});
        self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    });
  }

  _getChannelById(ID) {
    return this.channels.filter(function(item) {
      item.id === ID;
    })[0];
  }
}

// exports the AptBot class for use by other js files
module.exports = AptBot;
