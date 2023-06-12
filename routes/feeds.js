const express = require("express");
const router = express.Router();
const checkLogin = require("../middlewares/checkLogin.js"); //유저아이디받기
const { sequelize } = require("../models");

module.exports = router;
