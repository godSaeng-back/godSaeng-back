const express = require("express");
const router = express.Router();

const feedsRoutes = require("./feeds");
const usersRoutes = require("./users");
const graphRoutes = require("./graph");

router.use('/', [feedsRoutes, usersRoutes, graphRoutes]);

module.exports = router;