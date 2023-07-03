const express = require('express');
const router = express.Router();
const checkLogin = require('../middlewares/checkLogin.js');
const { Feeds, Users, FeedImages } = require('../models');
const XRegExp = require('xregexp');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
require('dotenv').config();

// 이메일 전송을 위한 nodemailer 객체 생성
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

// 이메일 전송 함수
async function sendMail(to, subject, template, context) {
  const emailTemplate = path.join(
    __dirname,
    '..',
    'templates',
    `${template}.ejs`
  );
  const html = await ejs.renderFile(emailTemplate, context);
  await transporter.sendMail({
    from: process.env.NODEMAILER_USER,
    to,
    subject,
    html,
  });
}

// GET /mypage(마이페이지)
router.get('/mypage', checkLogin, async (req, res) => {
  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;

    // 유저 이미지, 닉네임, 이메일 가져옴
    const user = await Users.findOne({
      where: {
        userId: userId,
      },
      attributes: [
        'userId',
        'email',
        'profileImage',
        'nickname',
        'createdAt',
        'updatedAt',
      ],
    });

    // 공유한 피드 가져오기
    const sharedFeeds = await Feeds.findAll({
      where: {
        UserId: userId,
        didShare: true,
      },
      include: [
        {
          model: FeedImages,
          attributes: ['imageId', 'FeedId', 'imagePath'],
        },
      ],
      attributes: [
        'feedId',
        'UserId',
        'emotion',
        'howEat',
        'didGym',
        'goodSleep',
        'createdAt',
        'updatedAt',
      ],
    });

    return res.status(200).json({
      user: user,
      sharedFeeds: sharedFeeds,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

// PUT /mypage/nickname (닉네임 변경)
router.put('/mypage/nickname', checkLogin, async (req, res) => {
  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;

    // 변경할 닉네임 가져옴
    const { nickname } = req.body;

    // 닉네임이 없을 경우
    if (!nickname) {
      return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    }

    // 닉네임 중복 체크
    const existNickname = await Users.findOne({
      where: {
        nickname: nickname,
      },
    });

    if (existNickname) {
      return res.status(409).json({ error: '이미 존재하는 닉네임입니다.' });
    }

    // 닉네임 정규식
    const nicknameRegex = XRegExp('^[가-힣a-zA-Z0-9]{1,8}$'); // 한글, 영문, 숫자 1~10자리

    if (!nicknameRegex.test(nickname)) {
      return res
        .status(401)
        .json({ error: '닉네임은 한글, 영문, 숫자 1~8자리로 입력해주세요.' });
    }

    // 닉네임 변경
    await Users.update(
      {
        nickname: nickname,
      },
      {
        where: {
          userId: userId,
        },
      }
    );

    return res.status(200).json({ message: '닉네임 변경 성공' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

// PUT /mypage/mailcode (비밀번호 변경)
router.put('/mypage/mailcode', checkLogin, async (req, res) => {
  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;

    // 변경할 비밀번호 가져옴
    const { password } = req.body;

    // 비밀번호가 없을 경우
    if (!password) {
      return res.status(400).json({ error: '변경할 비밀번호를 입력해주세요.' });
    }

    // 비밀번호 정규식
    const passwordRegex = /^(?=.*[a-z])[A-Za-z\d@$!%*?&]{4,20}$/;

    if (!passwordRegex.test(password)) {
      return res
        .status(401)
        .json({ error: '비밀번호는 영문, 숫자 4~20자리로 입력해주세요.' });
    }

    // 인증 코드 생성
    const authCode = Math.random().toString().substr(2, 6);

    // 로그인한 사용자의 이메일 가져옴
    const user = await Users.findOne({
      where: {
        userId: userId,
      },
      attributes: ['email'],
    });

    // 이메일 전송
    await sendMail(user.email, '비밀번호 변경 인증 코드', 'authCode', {
      authCode,
    });

    // 인증 코드를 사용하여 비밀번호 변경
    await Users.update(
      {
        authCode: authCode,
      },
      {
        where: {
          userId: userId,
        },
      }
    );

    return res
      .status(200)
      .json({ message: '이메일로 인증 코드를 전송했습니다.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

// PUT /mypage/password (비밀번호 변경 인증)
router.put('/mypage/password', checkLogin, async (req, res) => {
  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;

    // 인증 코드 가져옴
    const { authCode, password } = req.body;

    // 비밀번호가 없을 경우
    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    }

    // 인증 코드가 없을 경우
    if (!authCode) {
      return res
        .status(401)
        .json({ error: '인증 코드를 입력해주세요.' });
    }

    // 로그인한 사용자의 정보를 다시 불러옴
    const user = await Users.findOne({
      where: {
        userId: userId,
      },
    });

    // 인증 코드가 일치하지 않을 경우
    if (authCode !== user.authCode) {
      return res.status(402).json({ error: '인증 코드가 일치하지 않습니다.' });
    }

    // 비밀번호 해싱
    const cryptedPw = crypto
      .createHash('sha512')
      .update(password)
      .digest('base64');

    // 해싱된 비밀번호를 사용하여 비밀번호 변경
    await Users.update(
      {
        password: cryptedPw,
        authCode: null,
      },
      {
        where: {
          userId: userId,
        },
      }
    );

    return res.status(200).json({ message: '비밀번호 변경 성공' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

// 회원탈퇴
router.delete('/mypage/userdel', checkLogin, async (req, res) => {
    try {
        // 로그인한 사용자의 userId 가져옴
        const { userId } = res.locals.user;

        // 사용자 정보 삭제
        await Users.destroy({
            where: {
                userId: userId,
            },
        });

        return res.status(200).json({ message: "회원탈퇴 성공" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "서버 에러" });
    }
});

module.exports = router;
