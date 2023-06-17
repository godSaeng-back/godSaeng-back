const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기
const { Feeds, Users, FeedImages } = require('../models');

// Multer Storage 설정
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // 파일명 중복을 피하기 위해 Date.now() 사용
  }
});

const upload = multer({ storage: storage });

// GET / (메인페이지)
router.get('/main', checkLogin, async (req, res) => {
  const { user } = res.locals;
  
  if (user) {
    try {
      const feeds = await Feeds.findAll({
        where: { UserId: user.userId },
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
router.post('/feed/write', upload.array('images'), checkLogin, async (req, res) => {
  const { emotion, howEat, didGym, goodSleep, calendarDay, didShare } = req.body;
  const { userId } = res.locals.user;
  const images = req.files; // Multer에서 업로드된 파일 정보

  if (emotion === undefined || howEat === undefined || didGym === undefined || goodSleep === undefined) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
  }

  try {
    // 먼저 Feed를 생성합니다.
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
      images.forEach((image) => {
        const imagePath = image.path; // 이미지 경로
        // 이미지 경로를 DB에 저장합니다.
        FeedImages.create({
          FeedId: feed.feedId,
          imagePath,
        });
        imagePaths.push(imagePath);
      });
    }

    return res.json({ feed, imagePaths, message: '피드 작성이 완료되었습니다.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

  // GET /feed/:feedId (피드 상세 조회)
  router.get('/feed/:feedId', checkLogin, async (req, res) => {
    const { feedId } = req.params;

    try {
      const feed = await Feeds.findOne({
        where: { feedId },
        include: [ // 피드 작성자 정보를 가져옵니다.
          {
            model: Users,
            as: 'User',
            attributes: ['userId', 'email', 'profileImage', 'nickname', 'createdAt', 'updatedAt'],
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
  router.put('/feed/:feedId', upload.array('images'), checkLogin, async (req, res) => {
    const { feedId } = req.params;
    const { emotion, howEat, didGym, goodSleep, calendarDay, didShare } = req.body;
    const { userId } = res.locals.user;
    const images = req.files; // Multer에서 업로드된 파일 정보

    if (emotion === undefined || howEat === undefined || didGym === undefined || goodSleep === undefined) {
      return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    }

    try {
      // 현재 유저가 피드의 소유자인지 확인
      const feed = await Feeds.findOne({ where: { feedId, UserId: userId } });
      
      if (!feed) {
        return res.status(403).json({ error: '해당 피드를 수정할 권한이 없습니다.' });
      }

      // 피드 수정
      await Feeds.update({
        emotion,
        howEat,
        didGym,
        goodSleep,
        calendarDay,
        didShare,
      }, {
        where: { feedId },
      });

      // TODO: 이미지 업데이트 로직 추가

      res.json({ message: '피드 수정이 완료되었습니다.' });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: '피드 수정에 실패했습니다.' });
    }
  });

  // DELETE /feed/:feedId (피드 삭제)
  router.delete('/feed/:feedId', checkLogin, async (req, res) => {
    const { feedId } = req.params;
    const { userId } = res.locals.user;

    try {
      // 현재 유저가 피드의 소유자인지 확인
      const feed = await Feeds.findOne({ where: { feedId, UserId: userId } });

      if (!feed) {
        return res.status(403).json({ error: '해당 피드를 삭제할 권한이 없습니다.' });
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
        return res.status(403).json({ error: '해당 피드의 이미지를 삭제할 권한이 없습니다.' });
      }

      // 피드 이미지 삭제
      await FeedImages.destroy({ where: { imageId } });

      res.json({ message: '피드 이미지 삭제가 완료되었습니다.' });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: '피드 이미지 삭제에 실패했습니다.' });
    }
  });

module.exports = router;
