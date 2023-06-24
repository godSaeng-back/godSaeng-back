const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const path = require('path');
// const Sequelize = require('sequelize');
const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기
const { Feeds, Users, FeedImages } = require('../models');
const { Op, Sequelize } = require('sequelize');
require('dotenv').config();

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
    bucket: 'god-seangler2',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.extname(file.originalname));
    },
  }),
});

// upload
router.post(
  '/check',
  async (req, res) => {
    return res.status(400).json(upload);
    
  }
);

// GET / (메인페이지)
router.get('/main', checkLogin, async (req, res) => {
  const { user } = res.locals;

  if (user) {
    try {

      // 각 날짜의 최신 피드의 createdAt 얻기
      const feedDates = await Feeds.findAll({
        attributes: [
          [Sequelize.fn('date', Sequelize.col('createdAt')), 'date'],
          [Sequelize.fn('max', Sequelize.col('createdAt')), 'latestCreatedAt']
        ],
        where: { UserId: user.userId },
        group: [Sequelize.fn('date', Sequelize.col('createdAt'))],
      });
      console.log(feedDates)
      // return res.json({ feedDates });

      // 각 날짜의 최신 피드 조회
      const feeds = await Promise.all(feedDates.map(async (feedDate) => {
        return await Feeds.findOne({
          where: {
            UserId: user.userId,
            createdAt: feedDate.getDataValue('latestCreatedAt'),
          },
          include: [{
            model: FeedImages,  // FeedImages 모델 추가
            as: 'FeedImages',   // alias 설정
            attributes: ['imageId', 'FeedId', 'imagePath'],  // 가져올 필드 설정
          }],
        });
      }));

      return res.json({ feeds });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류입니다.' });
    }
  } else {
    return res.json({ feeds: [] });
  }
});


// GET / (식단사진 전체 조회)
router.get('/allmeal', checkLogin, async (req, res) => {
  const { user } = res.locals;
  console.log('user : ', user);
  if (user) {
    try {
      const feeds = await Feeds.findAll({
        where: { UserId: user.userId },
        include: [
          {
            model: FeedImages,
            as: 'FeedImages',
            attributes: ['imageId', 'FeedId', 'imagePath'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      return res.json({ feeds });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류입니다.' });
    }
  } else {
    return res.json({ feeds: [] });
  }
});

// POST /feed/write (피드 작성)
router.post(
  '/feed/write',
  upload.array('images'),
  checkLogin,
  async (req, res) => {
    // const images = req.files; // Multer에서 업로드된 파일 정보

    // return res.status(400).json({ '성공':'성공', images });

    const { emotion, howEat, didGym, goodSleep, calendarDay, didShare } =
      req.body;
    const { userId } = res.locals.user;
    const images = req.files; // Multer에서 업로드된 파일 정보

    if (
      emotion === undefined ||
      howEat === undefined ||
      didGym === undefined ||
      goodSleep === undefined
    ) {
      return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    }

    try {
      const date = new Date();
      const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      // 같은 날짜에 이미 작성한 피드가 있는지 확인합니다.
      const existingFeedCount = await Feeds.count({
        where: {
          UserId: userId,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lt]: endDate
          }
        }
      });

      // if (existingFeedCount > 0) {
      //   return res.status(400).json({ error: '오늘은 이미 피드를 작성하셨습니다.' });
      // }

      // 피드를 생성합니다.
      const feed = await Feeds.create({
        UserId: userId,
        emotion,
        howEat,
        didGym,
        goodSleep,
        calendarDay,
        didShare,
      });

      // 각 이미지를 서버에 저장하고 경로를 DB에 저장합니다.
      const imagePaths = [];
      if (images && images.length > 0) {
        for (const image of images) {
          const feedImage = await FeedImages.create({
            FeedId: feed.feedId,
            imagePath: image.location, // 이미지 경로를 S3 URL로 설정
          });
          imagePaths.push(feedImage.imagePath);
        }
      }

      return res.json({
        feed,
        imagePaths,
        message: '피드 작성이 완료되었습니다.',
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류입니다.' });
    }
  }
);

// GET /feed/:feedId (피드 상세 조회)
router.get('/feed/:feedId', checkLogin, async (req, res) => {
  const { feedId } = req.params;

  try {
    const feed = await Feeds.findOne({
      where: { feedId },
      include: [
        // 피드 작성자 정보를 가져옵니다.
        {
          model: Users,
          as: 'User',
          attributes: [
            'userId',
            'email',
            'profileImage',
            'nickname',
            'createdAt',
            'updatedAt',
          ],
        },
        {
          model: FeedImages, // FeedImages 정보를 가져옵니다.
          as: 'FeedImages',
          attributes: ['imageId', 'FeedId', 'imagePath'],
        },
      ],
    });

    if (!feed) {
      return res.status(400).json({ error: '해당하는 피드가 없습니다.' });
    }

    return res.json({ feed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

// PUT /feed/:feedId (피드 수정)
router.put('/feed/:feedId', upload.array('images'),  checkLogin,  async (req, res) => {
    const { feedId } = req.params;
    const { emotion, howEat, didGym, goodSleep, calendarDay, didShare } =
      req.body;
    const { userId } = res.locals.user;
    const images = req.files; // Multer에서 업로드된 파일 정보

    if (
      emotion === undefined ||
      howEat === undefined ||
      didGym === undefined ||
      goodSleep === undefined
    ) {
      return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    }

    try {
      // 현재 유저가 피드의 소유자인지 확인
      const feed = await Feeds.findOne({ where: { feedId, UserId: userId } });

      if (!feed) {
        return res
          .status(403)
          .json({ error: '해당 피드를 수정할 권한이 없습니다.' });
      }

      // 피드 수정
      await Feeds.update(
        {
          emotion,
          howEat,
          didGym,
          goodSleep,
          calendarDay,
          didShare,
        },
        {
          where: { feedId },
        }
      );

      // 기존에 연결된 이미지들을 삭제
      await FeedImages.destroy({
        where: { FeedId: feedId },
      });

      // 각 이미지를 서버에 저장하고 경로를 DB에 저장합니다.
      const imagePaths = [];
      if (images && images.length > 0) {
        for (const image of images) {
          // 이미지 경로를 DB에 저장합니다.
          const feedImage = await FeedImages.create({
            FeedId: feed.feedId,
            imagePath: image.location, // 이미지 경로를 S3 URL로 설정
          });
          imagePaths.push(feedImage.imagePath);
        }
      }

      res.json({ message: '피드 수정이 완료되었습니다.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: '피드 수정에 실패했습니다.' });
    }
  }
);

// DELETE /feed/:feedId (피드 삭제)
router.delete('/feed/:feedId', checkLogin, async (req, res) => {
  const { feedId } = req.params;
  const { userId } = res.locals.user;

  try {
    // 현재 유저가 피드의 소유자인지 확인
    const feed = await Feeds.findOne({ where: { feedId, UserId: userId } });

    if (!feed) {
      return res
        .status(403)
        .json({ error: '해당 피드를 삭제할 권한이 없습니다.' });
    }

    // 피드 삭제
    await Feeds.destroy({ where: { feedId } });

    res.json({ message: '피드 삭제가 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '피드 삭제에 실패했습니다.' });
  }
});

// DELETE /feed/image/:imageId (피드 이미지 삭제)
router.delete('/feed/image/:imageId', checkLogin, async (req, res) => {
  const { imageId } = req.params;
  const { userId } = res.locals.user;

  try {
    // 현재 유저가 피드의 소유자인지 확인
    const feedImage = await FeedImages.findOne({
      where: { imageId },
      include: [
        {
          model: Feeds,
          as: 'Feed',
          attributes: ['feedId', 'UserId'],
        },
      ],
    });

    if (feedImage.Feed.UserId !== userId) {
      return res
        .status(403)
        .json({ error: '해당 피드의 이미지를 삭제할 권한이 없습니다.' });
    }

    // 피드 이미지 삭제
    await FeedImages.destroy({ where: { imageId } });

    res.json({ message: '피드 이미지 삭제가 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '피드 이미지 삭제에 실패했습니다.' });
  }
});

// GET /feed/least (최근 피드 사진 조회)
router.get('/image/latest', checkLogin, async (req, res) => {
  const { userId } = res.locals.user;

  try {
    const feedImages = await FeedImages.findAll({
      limit: 3, // 최근 3개의 피드 사진만 조회
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Feeds,
          as: 'Feed',
          attributes: ['feedId', 'UserId'],
          where: { UserId: userId },
          required: true,
        },
      ],
    });

    if (feedImages.length === 0) {
      return res.status(400).json({ error: '최근 피드 사진이 없습니다.' });
    }

    return res.json({ feedImages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

module.exports = router;
