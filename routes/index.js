const express = require("express");
const app = express();

const feeds = require("./feeds");
const users = require("./users");

module.exports = [feeds, users];
