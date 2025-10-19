require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin')

const dbName = 'projectcoop_db';
const localMongoURI = 'mongodb://localhost:27017/ProjectCOOP'
const expressLayouts = require('express-ejs-layouts');

var app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.use(expressLayouts);
app.set('layout', 'layout/mainlayout');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// ====== เชื่อม MongoDB ======
mongoose.connect(localMongoURI)
  .then(() => console.log(`MongoDB connected to local database: ${dbName}`))
  .catch(err => console.error(err));
// ====== start server ======
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(session({
  secret: 'ProjectCOOP', 
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 ชั่วโมง
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// ทำให้ตัวแปร user จาก session พร้อมใช้งานในไฟล์ .ejs ทุกไฟล์
app.use(function(req, res, next) {
  res.locals.user = req.session.user;
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin',adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});



// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
