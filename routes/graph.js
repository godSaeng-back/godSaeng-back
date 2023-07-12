const express = require('express');
const router = express.Router();
const checkLogin = require('../middlewares/checkLogin.js');
const { Op } = require('sequelize');
const { Feeds, Users, FeedImages } = require('../models');

// GET /graph/:type/:period? (주간 혹은 월간 그래프)
router.get('/graph/:type/:period?', checkLogin, async (req, res) => {
  try {
    // 로그인한 사용자의 userId를 가져옵니다.
    const { userId } = res.locals.user;

    // period 파라미터가 있으면 정수로 변환하고, 없으면 0을 기본값으로 사용합니다.
    // 이때 period가 1이면 이후 기간, -1이면 이전 기간을 나타냅니다.
    const period = req.params.period ? -parseInt(req.params.period, 10) : 0;

    const today = new Date();
    let startDate, endDate, periodDays;

    if (req.params.type === 'week') {
      // 오늘 요일을 구하고 월요일로 설정합니다.
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;

      // 시작 날짜와 종료 날짜를 설정합니다.
      startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + diffToMonday - period * 7
      );
      endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + 6
      );
      endDate.setHours(23, 59, 59, 999);
      periodDays = 7;
    } else if (req.params.type === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - period, 1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999); // 종료 날짜의 시간을 23시 59분 59초 999밀리초로 설정합니다.
      periodDays = endDate.getDate();
    } else {
      return res.status(400).json({ error: '타입은 week 혹은 month 입니다.' });
    }

    // 모든 피드를 불러옵니다.
    const allFeeds = await Feeds.findAll({
      where: {
        UserId: userId,
      },
      include: [
        {
          model: FeedImages,
          attributes: ['imageId', 'FeedId', 'imagePath'],
        },
      ],
      attributes: ['createdAt', 'howEat', 'didGym', 'goodSleep', 'emotion'],
    });

    // 피드 통계를 계산합니다.
    const totalFeedDays = allFeeds.length;
    const totalPointScore = allFeeds.reduce((acc, feed) => {
      const pointScore = (feed.FeedImages.length > 0 ? 2 : 0) + (feed.emotion ? 3 : 0);
      return acc + pointScore;
    }, 0);

    // 기간에 해당하는 피드를 필터링합니다.
    const periodFeeds = allFeeds.filter((feed) => {
      const createdAt = new Date(feed.createdAt);
      return createdAt >= startDate && createdAt < endDate;
    });

    let howEatScore = 0;
    let didGymScore = 0;
    let goodSleepScore = 0;

    periodFeeds.forEach((feed) => {
      if (feed.howEat) {
        howEatScore++;
      }
      if (feed.didGym) {
        didGymScore++;
      }
      if (feed.goodSleep) {
        goodSleepScore++;
      }
    });

    // 각 기간에 대한 데이터를 생성합니다.
    const periodData = new Array(periodDays).fill().map((_, index) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + index);

      const feed = allFeeds.find((feed) => {
        const feedDate = new Date(feed.createdAt);
        return feedDate.toDateString() === currentDate.toDateString();
      });

      return {
        graphScore: feed
          ? (feed.howEat ? 1 : 0) +
            (feed.didGym ? 1 : 0) +
            (feed.goodSleep ? 1 : 0)
          : 0,
        howEat: feed ? feed.howEat : null,
        didGym: feed ? feed.didGym : null,
        goodSleep: feed ? feed.goodSleep : null,
        emotion: feed ? feed.emotion : null,
        date: currentDate.toLocaleDateString(),
      };
    });

    // 결과를 반환합니다.
    return res.json({
      totalFeedDays,
      totalPointScore,
      howEatScore,
      didGymScore,
      goodSleepScore,
      periodData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류입니다.' });
  }
});

module.exports = router;
