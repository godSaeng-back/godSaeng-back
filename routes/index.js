const express = require("express");
const router = express.Router();

const feedsRoutes = require("./feeds");
const usersRoutes = require("./users");
const graphRoutes = require("./graph");
const mypageRoutes = require("./mypage");

router.use('/', [feedsRoutes, usersRoutes, graphRoutes, mypageRoutes]);

module.exports = router;