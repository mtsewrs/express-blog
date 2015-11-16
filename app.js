'use strict'

var express = require('express');
var helmet = require('helmet');
var mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var paginate = require('express-paginate');
var ExpressBrute = require('express-brute');
var MongoStore = require('express-brute-mongo');
var MongoClient = require('mongodb').MongoClient;
var showdown  = require('showdown');
var device = require('express-device');


var converter = new showdown.Converter();
var Schema = mongoose.Schema;

var store = new MongoStore(function (ready) {
  MongoClient.connect('mongodb://localhost/db', function(err, db) {
    if (err) throw err;
    ready(db.collection('bruteforce-store'));
  });
});

var bruteforce = new ExpressBrute(store);

mongoose.connect('mongodb://localhost/db', function(err){
  if (err) {
    console.log(err);
  }
});

var User = mongoose.model('User', new Schema({
  firstName: String,
  lastName: String,
  userName: {type: String, unique: true},
  password: String
}));

var PostSchema = new Schema({
  title: String,
  url: String,
  body: String,
  time : { type : Date, default: Date.now },
  tags: [String],
  id: Number,
  image_url: String,
  image_url_large: String
});

PostSchema.plugin(require('mongoose-paginate'));

var Post = mongoose.model('Post', PostSchema);

var app = express();
app.set('trust proxy', true);
app.use(helmet());
app.use(helmet.noCache({ noEtag: true }));
app.use(helmet.frameguard());
app.use(helmet.xssFilter({ setOnOldIE: true }));
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.xframe('allow-from', '*.disqus.com'));

app.use(session({
  cookieName: "session",
  secret: "pwenfpi5346hrfakmoqw34apwcmcdpq53468klfiubqv",
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true

}));

app.use(function(req, res, next){

  if(req.session && req.session.user){
    User.findOne({userName: req.session.user.userName}, function (err, user) {
      if(user){
        req.user = user;
        delete req.user.password;
        req.session.user = req.user;
        res.locals.user = req.user;
      }
      next();
    });
  } else {
    next();
  }
});

function requireLogin (req, res, next) {
  if(!req.user){
    res.redirect('/login');
  } else{
    next();
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'), { maxAge: '2592000000' }));
app.use(paginate.middleware(2, 50));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(device.capture());
app.use('/static', express.static(__dirname + '/public', {maxAge: '2592000000'}));

app.locals = {
    posts: {}
};

device.enableDeviceHelpers(app);
device.enableViewRouting(app);

//Routes
app.get('/', function(req, res){
  Post.find({}, function (err, posts) {
    res.render('index', {
       posts: posts,
       url: ''
    });
  });
});

app.get('/login', function(req, res){
  res.render('login', {
    error: ''
  });
});

app.get('/dashboard', requireLogin, function(req, res){
  Post.find({}).sort({time: -1}).exec(function(err, posts) {
    if (!posts){
      res.render('dashboard', {
         posts: {title: 'no posts'}
      });
    } else {
      res.render('dashboard', {
         posts: posts
      });
    };

  });
});

app.get('/dashboard/new', requireLogin, function (req, res) {
  res.render('newpost');
});

app.post('/dashboard/new', function (req, res) {
  var post = new Post({
    title: req.body.title,
    url: req.body.title.replace(/\s+/g, ''),
    body: req.body.body.replace(/(?:\r\n)/g, '\\n\\n'),
    tags: req.body.tags.split(' '),
    image_url: `https://unsplash.it/1080/720?image=${req.body.url}`,
    image_url_large: `https://unsplash.it/2560/1246?image=${req.body.url_large}`
  });

  post.save(function (err) {
    if (err) {
      var err = 'Something went wrong';
      res.render('newpost', {error: err});
    } else{
      res.redirect('/blog/' + req.body.title.replace(/\s+/g, ''));
    };
  });

});



app.get('/dashboard/edit/:id', requireLogin, function (req, res) {
  Post.findOne({url: req.params.id}, function (err, post) {
    if (!post) {
      res.redirect('/dashboard');
    } else{
      var url = post.image_url.split('');
      var id = url.map(function(word){ if(!isNaN(word)) return word}).join('');
      res.render('edit', {
         post: post,
         tags: post.tags,
         url: id.substr(id.length - 3)
      });
    };

  });
});

app.post('/dashboard/edit/:id', function (req, res) {
  var updates = {
    url: req.body.title.replace(/\s+/g, ''),
    title:  req.body.title.trim(),
    body: req.body.body,
    tags: req.body.tags,
    image_url: `https://unsplash.it/1080/720?image=${req.body.url}`,
    image_url_large: `https://unsplash.it/2560/1246?image=${req.body.url_large}`
  };
  Post.findOneAndUpdate({url: req.body.title.replace(/\s+/g, '')}, updates, { runValidators: true }, function(err) {
    res.redirect('/blog/' + req.body.title.replace(/\s+/g, ''));
  });
});

app.post('/login', bruteforce.prevent, function(req, res){
  User.findOne({userName: req.body.userName}, function (err, user) {
    if(!user){
      res.redirect('/');
    } else{
      if (req.body.password === user.password){
        req.session.user = user;
        res.redirect('/dashboard');
      } else{
        res.render('login', {error: 'wrong password'})
      }
    }
  });
});

app.get('/logout', function(req, res){
  req.session.reset();
  res.redirect('/');
});

app.get('/blog', function(req, res, next){

  Post.paginate({}, { page: req.query.page, limit: req.query.limit }, function(err, posts, pageCount, itemCount) {

    if (err) return next(err);
    var page = 0;
    res.format({
      html: function() {
        res.render('blog', {
          posts: posts,
          pageCount: pageCount,
          itemCount: itemCount,
          req: req,
          page: page,
          url: 'blog'
        });
      },
      json: function() {
        // inspired by Stripe's API response for list objects
        res.json({
          object: 'list',
          has_more: paginate.hasNextPages(req)(pageCount),
          data: posts
        });
      }
    });

  });

});

app.get('/blog/:id', function(req, res){
  Post.findOne({url: req.params.id}, function (err, post) {
    if (!post) {
      res.redirect('/blog');
    } else{
      res.render('post', {
         post: post,
         url: post.url,
         article: converter.makeHtml(post.body)
      });
    };

  });
});

// Misc

app.use(function(err, req, res, next) {
  // Do logging and user-friendly error message display
  console.error(err);
  res.status(500).send({status:500, message: 'internal error', type:'internal'});

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
      req: req
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    req: req
  });
});


module.exports = app;
