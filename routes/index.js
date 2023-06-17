const express = require("express");
const router = express.Router();

const feedsRoutes = require("./feeds");
const usersRoutes = require("./users");

router.use('/', [feedsRoutes, usersRoutes]);

module.exports = router;
