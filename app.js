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
      // '*.go-getter.shop', 
      'http://localhost:3002',
      'https://go-getter.shop',
      'http://go-getter.shop',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

// const indexRouter = require('./routes/index.js');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', [indexRouter]);
// app.use('/', indexRouter);

app.get('/', (req, res) => {
  res.status(200).send('godSaeng diary backend API');
});

app.listen(3000, () => {
  console.log('3000 포트로 서버 연결');
});
