const env = require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index.js');
const app = express();
const cors = require('cors');

// CORS 설정
app.use(
  cors({
    origin: [
      'https://api.go-getter2.shop', 
      'https://go-getter2.shop',
      'http://go-getter.shop',
      'http://localhost:3000',
      'http://localhost:3002',
      'https://god-saeng-life-fe-test.vercel.app',
      'https://god-saeng-life-git-master-zadragon.vercel.app',
    ],
    credentials: true,
  })
);

// EB 배포 위해 필요한 설정
const createError = require('http-errors');
const path = require('path');
const logger = require('morgan');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.get('/', (req, res) => {
  res.status(200).send('godSaeng diary backend API');
});


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
