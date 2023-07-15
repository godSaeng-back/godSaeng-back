const express = require('express');
const router = express.Router();
const checkLogin = require('../middlewares/checkLogin.js');
const { Shares, Users, Comment } = require('../models');
const adjectives = require('./adjectives');
const nouns = require('./nouns');

// 댓글 목록 조회
router.get('/comment/:shareId', async (req, res) => {
  const { shareId } = req.params;

  // 한 페이지에 보여줄 항목의 수
  const limit = 10;

  // 페이지 번호
  const page = req.query.page ? Number(req.query.page) : 1;

  const share = await Shares.findOne({
    where: { shareId: shareId },
  });

  // 게시글이 존재하는지 확인
  if (!share) {
    return res.status(404).json({
      message: '존재하지 않는 게시글입니다.',
    });
  }

  try {
    const comments = await Comment.findAll({
      where: { shareId: shareId },
      include: [
        {
          model: Users,
          attributes: ['profileImage', 'totalPointScore'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: limit,
    });

    res.status(200).json({
      message: '댓글 목록 조회 성공',
      data: comments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: '댓글 목록 조회 실패',
      error: error.message,
    });
  }
});


// 댓글 작성
router.post('/comment/:shareId', checkLogin, async (req, res) => {
  const { userId } = res.locals.user;
  const { shareId } = req.params;
  const { content } = req.body;

  const share = await Shares.findOne({
    where: { shareId: shareId },
  });

  // 게시글이 존재하는지 확인
  if (!share) {
    return res.status(404).json({
      message: '존재하지 않는 게시글입니다.',
    });
  }

  // 댓글 내용이 있는지 확인
  if (!content) {
    return res.status(400).json({
      message: '댓글 내용을 입력해주세요.',
    });
  }

  // 로그인하지 않은 사용자가 댓글을 작성하는 경우
  if (!userId) {
    return res.status(401).json({
      message: '로그인 후 이용해주세요.',
    });
  }

  function generateFunnyNickname() {
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdjective + ' ' + randomNoun;
  }
  const randomNickname = generateFunnyNickname();

  try {
    // 공유글을 작성한 사용자가 댓글을 작성하는 경우, 공유글 작성 시 사용한 닉네임을 사용하고
    // 그 외의 경우에는 임의의 닉네임을 사용
    const commentName = share.UserId === userId ? share.shareName : randomNickname;

    const comment = await Comment.create({
      UserId: userId,
      ShareId: shareId,
      commentName: commentName,
      content: content,
    });

    res.status(200).json({
      message: '댓글 작성 성공',
      data: comment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: '댓글 작성 실패',
      error: error.message,
    });
  }
});

module.exports = router;
