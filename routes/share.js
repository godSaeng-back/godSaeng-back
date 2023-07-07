const express = require("express");
const router = express.Router();
const checkLogin = require("../middlewares/checkLogin.js");
const { Feeds, Users, FeedImages, Shares } = require("../models");
const { Op, Sequelize } = require("sequelize");
const path = require("path");

const aws = require("aws-sdk");
const multer = require("multer");

const multerS3 = require("multer-s3");
require("dotenv").config();

class ApiResponse {
  constructor(code, message = "", data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

// Multer Storage 설정
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "god-seangler2",
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.basename(file.originalname));
    },
  }),
});

// ◎ 공유 작성
router.post(
  "/share",
  upload.single("graphImage"),
  checkLogin,
  async (req, res) => {
    try {
      // 로그인한 사용자의 userId 가져옴
      const { userId } = res.locals.user;
      const { title, content, anonymous } = req.body;
      const graphImage = req.file; // Multer에서 업로드된 파일 정보

      const shareFeed = await Shares.create({
        UserId: userId,
        title,
        content,
        imagePath: graphImage.location, // 이미지 경로를 S3 URL로 설정
        anonymous,
      });

      const result = await Shares.findOne({
        where: {
          shareId: shareFeed.shareId,
        },
        attributes: ["title", "content", "anonymous", "imagePath"],
        include: [
          {
            model: Users, // Users 모델 추가
            attributes: ["nickname"], // 가져올 필드 설정
          },
        ],
      });

      const response = new ApiResponse(201, "공유글 작성 성공", result);

      return res.json(response);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "서버 오류입니다.!!" });
    }
  }
);

module.exports = router;
