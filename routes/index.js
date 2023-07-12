const express = require("express");
const router = express.Router();

const feedsRoutes = require("./feeds");
const usersRoutes = require("./users");
const graphRoutes = require("./graph");
const mypageRoutes = require("./mypage");
const shareRoutes = require("./share");
const likesRoutes = require("./likes");
const commentsRoutes = require("./comments");

router.use("/", [
  shareRoutes,
  feedsRoutes,
  usersRoutes,
  graphRoutes,
  mypageRoutes,
  likesRoutes,
  commentsRoutes,
]);

module.exports = router;
