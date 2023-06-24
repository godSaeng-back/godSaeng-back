const express = require("express");
const router = express.Router();
const checkLogin = require('../middlewares/checkLogin.js');
const { Feeds, Users, FeedImages } = require('../models');

// GET /graph/week (주간 그래프)
router.get('/graph/:type', checkLogin, async (req, res) => {
    try {
        // 로그인한 사용자의 userId 가져옴
        const { userId } = res.locals.user;

        // 조회할 타입 (week or month)
        const type = req.params.type;
        const today = new Date();

        // 전체 피드 데이터를 가져옴
        const allFeeds = await Feeds.findAll({
            where: {
                UserId: userId,
            },
            include: [{
                model: FeedImages,
                attributes: ['imageId', 'FeedId', 'imagePath'],
            }],
            attributes: ['createdAt', 'howEat', 'didGym', 'goodSleep', 'emotion'],
        });

        const totalFeedDays = allFeeds.length; // 전체 피드 작성한 총 날짜 수
        const totalPointScore = allFeeds.reduce((acc, feed) => {
            // FeedImages와 emotion에 대해 점수 부여해서 전체 피드에 대한 점수 총합 계산
            const pointScore = (feed.FeedImages.length > 0 ? 2 : 0) + (feed.emotion ? 3 : 0);
            return acc + pointScore;
        }, 0);

        // 조회할 시작과 끝 날짜 설정
        let startDate, endDate;
        if (type === 'week') {
            // 주간 데이터 조회일 경우
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (type === 'month') {
            // 월간 데이터 조회일 경우
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // 다음 달 1일로 설정
        } else {
            return res.status(400).json({ error: '알 수 없는 타입입니다. 파라미터는 week or month 입니다.' });
        }

        const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)); // 주 혹은 월의 총 일수 계산
        
        // 주 혹은 월의 일수에 맞는 데이터 구조를 생성
        const periodData = new Array(periodDays).fill().map(() => ({
            graphScore: 0,
            howEat: null,
            didGym: null,
            goodSleep: null,
            emotion: null,
            date: '',
        }));

        // 각 피드 데이터에 대해 점수를 계산하고, 해당 날짜의 데이터 구조에 저장
        for (let i = 0; i < allFeeds.length; i++) {
            const feed = allFeeds[i];
            const feedDate = new Date(feed.createdAt);
            const dayIndex = Math.floor((feedDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

            // howEat, didGym, goodSleep에 대해 점수 부여
            const graphScore = (feed.howEat ? 1 : 0) + (feed.didGym ? 1 : 0) + (feed.goodSleep ? 1 : 0);

            // 해당 날짜의 데이터 구조에 피드의 정보와 계산한 점수를 저장
            periodData[dayIndex] = {
                graphScore: graphScore,
                howEat: feed.howEat ? true : false,
                didGym: feed.didGym ? true : false,
                goodSleep: feed.goodSleep ? true : false,
                emotion: feed.emotion,
                date: feedDate.toLocaleDateString(),
            };
        }
        
        // 전체 피드 작성한 총 날짜 수, 전체 피드에 대한 포인트 점수의 총합, 기간 동안의 피드 데이터를 응답으로 반환
        return res.json({totalFeedDays, totalPointScore, periodData});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: '서버 오류입니다.' });
    }
});
            
module.exports = router;