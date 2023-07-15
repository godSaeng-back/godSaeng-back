const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const path = require('path');
const checkLogin = require('../middlewares/checkLogin.js');
const jwt = require('jsonwebtoken');
const jwtSecret = "checkLogin_key";
const { Shares, Users, Likes, Comment } = require('../models');
const adjectives = require('./adjectives');
const nouns = require('./nouns');

const { Op, Sequelize } = require('sequelize');
const { log } = require('console');

require('dotenv').config();

class ApiResponse {
  constructor(code, message = '', data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

aws.config.setPromisesDependency(require('bluebird'));
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
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.basename(file.originalname));
    },
  }),
});

const imageUpload = async (base64) => {
  // You can either "yarn add aws-sdk" or "npm i aws-sdk"
  const aws = require('aws-sdk');

  // Configure AWS with your access and secret key.
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_BUCKET_NAME,
  } = process.env;

  // Configure AWS to use promise
  aws.config.setPromisesDependency(require('bluebird'));
  aws.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });

  // Create an s3 instance
  const s3 = new aws.S3();

  // Ensure that you POST a base64 data to your server.
  // Let's assume the variable "base64" is one.
  const base64Data = new Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  // 파일타입 추출: 예시 ( jpeg, png, gif )
  const type = base64.split(';')[0].split('/')[1];

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `${Date.now() + '.' + type}`,
    Body: base64Data,
    ACL: 'public-read',
    ContentEncoding: 'base64', //
    ContentType: `image/${type}`, // required. Notice the back ticks
  };

  // The upload() is used instead of putObject() as we'd need the location url and assign that to our user profile/database
  // see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  let location = '';
  let key = '';
  try {
    const { Location, Key } = await s3.upload(params).promise();
    location = Location;
    key = Key;
  } catch (error) {
    console.log(error);
  }

  return location;
};

// 공유글 목록 전체 조회 (무한 스크롤)
router.get('/share/list', async (req, res) => {
  // 한 페이지에 보여줄 항목의 수
  const limit = 10;

  // 페이지 번호
  const page = req.query.page ? Number(req.query.page) : 1;

  try {
    const shares = await Shares.findAll({
      attributes: ['shareId','UserId', 'title', 'content', 'shareName', 'imagePath', 'anonymous', 'viewCount', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Users,
          attributes: ['nickname', 'profileImage', 'totalPointScore'],
        },
      ],
      offset: (page - 1) * limit,
      limit: limit,
    });

    // 각 공유글의 좋아요 수와 조회수를 계산합니다.
    for (let share of shares) {
      const likesCount = await Likes.count({
        where: { ShareId: share.shareId },
      });

      const commentCount = await Comment.count({
        where: { ShareId: share.shareId },
      });

      share.setDataValue('likeCount', likesCount);
      share.setDataValue('commentCount', commentCount);
    }

    const response = new ApiResponse(200, '공유글 목록 조회 성공', shares);
    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

// ◎ 공유 작성
router.post('/share', checkLogin, async (req, res) => {
  function generateFunnyNickname() {
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdjective + ' ' + randomNoun;
  }
  const randomNickname = generateFunnyNickname();

  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;
    const { title, content, anonymous, base64 } = req.body;
    // const graphImage = req.file; // Multer에서 업로드된 파일 정보

    const imgLocation = base64 ? await imageUpload(base64) : null;
    const sharer = await Users.findOne({
      where: {
        UserId: userId,
      },
    });

    // 사용자가 공유글을 익명으로 설정했다면 shareName을 랜덤닉네임으로 저장함.
    // 일반 공유글은 그냥 Users 테이블의 nickname으로 shareName을 저장함.
    const shareName = anonymous ? randomNickname : sharer.nickname;
    const shareFeed = await Shares.create({
      UserId: userId,
      title,
      content,
      anonymous,
      shareName: shareName,
      imagePath: `${imgLocation}`, // 이미지 경로를 S3 URL로 설정
    });
    const result = {
      title,
      content,
      anonymous,
      shareName: shareName,
      imagePath: `${imgLocation}`,
    };
    const response = new ApiResponse(201, '공유글 작성 성공', result);

    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: '서버 오류입니다.!!' });
  }
});

// 공유글 상세 조회
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    let userId = null;

    const token = req.headers.authorization?.split('Bearer ')[1]; // 토큰에서 userId 추출
    if (token) {
      const decoded = jwt.verify(token, jwtSecret); // 토큰 검증
      userId = decoded.userId;
    }

    // Shares 테이블에서 게시글 가져오기
    const share = await Shares.findOne({
      where: { shareId }, 
      attributes: ['shareId','UserId', 'title', 'content', 'shareName', 'imagePath', 'anonymous', 'viewCount', 'createdAt', 'updatedAt'], 
      include: [
        {
          model: Users,   // 게시글 작성자 정보
          attributes: ['nickname', 'profileImage', 'totalPointScore'],
        },
      ],
    });

    // 공유글이 존재하지 않는 경우
    if (!share) {
      const response = new ApiResponse(404, '공유글이 존재하지 않습니다.');
      return res.status(404).json(response);
    }

    // 조회수를 증가시킵니다.
    share.viewCount += 1;
    await share.save();

    // 좋아요 수를 계산합니다.
    const likesCount = await Likes.count({ where: { ShareId: shareId } });
    
    // 댓글의 수를 계산합니다.
    const commentsCount = await Comment.count({ where: { ShareId: shareId } });

    // 로그인한 사용자가 있다면, 좋아요를 누른 사용자 목록을 가져옵니다.
    let likers = null;
    if (userId) {
      likers = await Likes.findOne({
        where: { UserId: userId, ShareId: shareId },
        attributes: ['likeId'],
        include: [
          {
            model: Users,
            attributes: [ 'userId', 'nickname', 'profileImage', 'totalPointScore'],
          },
        ],
      });
    } else {
      likers = null;
    }

    // 좋아요 수 추가합니다.
    share.setDataValue('likeCount', likesCount);
    share.setDataValue('commentCount', commentsCount);
    share.setDataValue('likers', likers);

    const response = new ApiResponse(200, '공유글 상세 조회 성공', share);
    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

module.exports = router;
