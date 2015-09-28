var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var paginate = require('express-paginate');

var Schema = mongoose.Schema;



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
  body: String,
  time : { type : Date, default: Date.now },
  tags: [String],
  id: Number
});

PostSchema.plugin(require('mongoose-paginate'));

var Post = mongoose.model('Post', PostSchema);

var app = express();

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


app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(paginate.middleware(3, 50));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.locals = {
    posts: {}
};

//Routes
app.get('/', function(req, res){
  Post.find({}, function (err, posts) {
    res.render('index', {
       posts: posts
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
    body: req.body.body.replace(/(?:\r\n)/g, '\\n\\n'),
    tags: req.body.tags.split(' ')
  });
  post.save(function (err) {
    if (err) {
      var err = 'Something went wrong';
      res.render('newpost', {error: error});
    } else{
      res.redirect('/blog/post/' + req.body.title);
    };
  });
});

app.get('/dashboard/edit/:id', requireLogin, function (req, res) {
  Post.findOne({title: req.params.id}, function (err, post) {
    if (err) {
      res.redirect('/dashboard');
    } else{
      res.render('edit', {
         post: post,
         postid: req.params.id
      });
    };

  });
});

app.post('/dashboard/edit/:id', function (req, res) {
  var updates = { title:  req.body.title.trim(), body: req.body.body, tags: req.body.tags.split(' ')};
  Post.findOneAndUpdate({}, updates, { runValidators: true }, function(err) {
    res.redirect('/blog/' + req.body.title.trim());
  });
});

app.post('/login', function(req, res){
  User.findOne({userName: req.body.userName}, function (err, user) {
    if(!user){
      res.render('login', {error: 'Invalid'})
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

    res.format({
      html: function() {
        res.render('blog', {
          posts: posts,
          pageCount: pageCount,
          itemCount: itemCount,
          req: req
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
  Post.findOne({title: req.params.id}, function (err, post) {
    if (err) {
      res.redirect('/blog');
    } else{
      res.render('post', {
         post: post
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
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
