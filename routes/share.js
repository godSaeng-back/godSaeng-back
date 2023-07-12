const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const path = require('path');
const checkLogin = require('../middlewares/checkLogin.js');
const {
  Shares,
  Users,
  Likes,
  ViewCounts,
  Feeds,
  FeedImages,
  sequelize,
} = require('../models');
const adjectives = require('./adjectives');
const nouns = require('./nouns');

const { Op, Sequelize } = require('sequelize');

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

// 사용자의 전체 피드를 가져와 점수를 계산하는 함수
const calculateTotalPointScore = async (userId) => {
  // 사용자의 전체 피드 가져오기
  const allFeeds = await Feeds.findAll({
    where: { UserId: userId },
    include: [
      { model: FeedImages, attributes: ['imageId', 'FeedId', 'imagePath'] },
    ],
    attributes: ['feedId', 'emotion'],
  });

  // 전체 피드 중 이미지가 있거나 감정이 있는 피드에 대한 총 점수 계산
  const totalPointScore = allFeeds.reduce((acc, feed) => {
    // FeedImages와 emotion에 대해 점수 부여해서 전체 피드에 대한 점수 총합 계산
    const pointScore =
      (feed.FeedImages.length > 0 ? 2 : 0) + (feed.emotion ? 3 : 0);
    return acc + pointScore;
  }, 0);

  return totalPointScore;
};

// 공유글 목록 전체 조회 (무한 스크롤)
router.get('/share/list', async (req, res) => {
  // 한 페이지에 보여줄 항목의 수
  const limit = 10;

  // 페이지 번호
  const page = req.query.page ? Number(req.query.page) : 1;

  try {
    const shares = await Shares.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Users,
          attributes: ['nickname'],
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
      const viewsCount = await ViewCounts.count({
        where: { ShareId: share.shareId },
      });

      share.setDataValue('likeCount', likesCount);
      share.setDataValue('viewCount', viewsCount);
      // 각 공유글에 피드 점수를 추가합니다.
      share.setDataValue(
        'totalPointScore',
        await calculateTotalPointScore(share.UserId)
      );
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
router.get('/share/:shareId', checkLogin, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { userId } = res.locals.user;

    // 먼저 Shares 테이블에서 게시글 작성자 확인
    const share = await Shares.findOne({
      where: { shareId },
      attributes: ['UserId'],
    });

    // 게시글 작성자가 아닐 때만 조회수 업데이트
    if (share.UserId !== userId) {
      // 이미 조회한 적 있는지 확인
      const viewed = await ViewCounts.findOne({
        where: { ShareId: shareId, UserId: userId },
      });

      // 사용자가 해당 게시글을 처음 조회하는 경우에만 조회수를 증가시킵니다.
      if (!viewed) {
        await ViewCounts.create({
          UserId: userId,
          ShareId: shareId,
        });
      }
    }

    // 좋아요 수를 계산합니다.
    const likesCount = await Likes.count({ where: { ShareId: shareId } });

    // 업데이트된 조회수를 계산합니다.
    const viewsCount = await ViewCounts.count({ where: { ShareId: shareId } });

    const updatedShare = await Shares.findOne({
      where: {
        shareId: shareId,
      },
      include: [
        {
          model: Users,
          attributes: ['nickname'],
        },
      ],
    });

    // 좋아요 수와 조회수를 추가합니다.
    updatedShare.setDataValue('likeCount', likesCount);
    updatedShare.setDataValue('viewCount', viewsCount);
    updatedShare.setDataValue('totalPointScore', await calculateTotalPointScore(updatedShare.UserId));

    const response = new ApiResponse(
      200,
      '공유글 상세 조회 성공',
      updatedShare
    );
    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

module.exports = router;
