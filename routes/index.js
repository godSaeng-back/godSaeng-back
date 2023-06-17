// const express = require("express");
// const app = express();

// const feeds = require("./feeds");
// const users = require("./users");

// module.exports = [feeds, users];

const express = require("express");
const router = express.Router();

const feedsRoutes = require("./feeds");
const usersRoutes = require("./users");

router.use('/feeds', feedsRoutes);
router.use('/users', usersRoutes);

module.exports = router;
