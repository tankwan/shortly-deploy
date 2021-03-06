var request = require('request');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var util = require('../lib/utility');

var Promise = require('bluebird');

var db = require('../app/config');
var User = require('../app/models/user');
var Link = require('../app/models/link');
// var Users = require('../app/collections/users');
// var Links = require('../app/collections/links');

exports.renderIndex = function(req, res) {
  res.render('index');
};

exports.signupUserForm = function(req, res) {
  res.render('signup');
};

exports.loginUserForm = function(req, res) {
  res.render('login');
};

exports.logoutUser = function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
};

exports.fetchLinks = function(req, res) {
  Link.reset().find().then(function(links) {
    res.status(200).send(links.models);
  });
};

exports.saveLink = function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  var utilGetUrlTitle = Promise.promisify(util.getUrlTitle, { context: util });

  Link.findOne({ url: uri }).then(function(found) {
    if (found) {
      res.status(200).send(found);
    } else {
      utilGetUrlTitle(uri)
      .then(function(title) {
        var newLink = new Link({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        });
        newLink.save().then(function(newLink) {
          res.status(200).send(newLink);
        });
      })
      .catch(function(err) {
        console.log('Error reading URL heading: ', err);
        return res.sendStatus(404);
      });
    //   util.getUrlTitle(uri, function(err, title) {
    //     if (err) {
    //       console.log('Error reading URL heading: ', err);
    //       return res.sendStatus(404);
    //     }
    //     var newLink = new Link({
    //       url: uri,
    //       title: title,
    //       baseUrl: req.headers.origin
    //     });
    //     newLink.save().then(function(newLink) {
    //       res.status(200).send(newLink);
    //     });
    //   });
    }
  });
};

exports.loginUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.findOne({ username: username })
    .then(function(user) {

      if (!user) {
        res.redirect('/login');
      } else {
        var userComparePassword = Promise.promisify(user.comparePassword, { context: user });
        userComparePassword(password)
        .then(function(match) {
          if (match) {
            util.createSession(req, res, user);
          } else {
            res.redirect('/login');
          }
        })
        .catch(function(error) {
          console.log('error!', error);
        });
        // user.comparePassword(password, function(match) {
        //   if (match) {
        //     util.createSession(req, res, user);
        //   } else {
        //     res.redirect('/login');
        //   }
        // });
      }
    });
};

exports.signupUser = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.findOne({ username: username })
    .then(function(user) {
      if (!user) {
        var newUser = new User({
          username: username,
          password: password
        });
        newUser.save()
          .then(function(newUser) {
            util.createSession(req, res, newUser);
          });
      } else {
        console.log('Account already exists');
        res.redirect('/signup');
      }
    });
};

exports.navToLink = function(req, res) {
  Link.findOne({ code: req.params[0] }).then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      link.set({ visits: link.get('visits') + 1 })
        .save()
        .then(function() {
          return res.redirect(link.get('url'));
        });
    }
  });
};