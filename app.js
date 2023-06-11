const env = require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const cors = require("cors");

const indexRouter = require("./routes/index.js");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/", [indexRouter]);

// CORS 설정
app.use(
  cors({
    // origin: ["", "http://localhost:3000"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).send("godSaeng diary backend API");
});

app.listen(3001, () => {
  console.log("3002 포트로 서버 연결");
});
