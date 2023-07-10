const express = require('express');
const router = express.Router();
const checkLogin = require('../middlewares/checkLogin.js');
const { Likes, Shares } = require('../models');

// POST /likes/:shareId (좋아요)
router.post('/likes/:shareId', checkLogin, async (req, res) => {
  const { userId } = res.locals.user;
  const { shareId } = req.params; // 파라미터에서 shareId를 가져옵니다

  const share = await Shares.findOne({
    where: { shareId: shareId },
  });

  // 게시글이 존재하는지 확인
  if (!share) {
    return res.status(404).json({
      message: '존재하지 않는 게시글입니다.',
    });
  }

  // 자신의 게시글인지 확인
  if (share.UserId === userId) {
    return res.status(403).json({
      message: '자신의 게시글은 좋아요 할 수 없습니다.',
    });
  }

  // 사용자가 이미 좋아요를 눌렀는지 확인
  const existingLike = await Likes.findOne({
    where: { UserId: userId, ShareId: shareId },
  });

  if (existingLike) {
    return res.status(400).json({
      message: '이미 좋아요를 눌렀습니다.',
    });
  }

  try {
    const like = await Likes.create({
      UserId: userId,
      ShareId: shareId,
    });

    res.status(200).json({
      message: '좋아요 성공',
      data: like,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: '좋아요 실패',
      error: error.message,
    });
  }
});

// DELETE /likes/:likeId (좋아요 취소)
router.delete('/likes/:likeId', checkLogin, async (req, res) => {
  const { likeId } = req.params;
  const { userId } = res.locals.user;
  const like = await Likes.findOne({
    where: { likeId },
  });

  // 좋아요가 존재하는지 확인
  if (!like) {
    return res.status(404).json({
      message: '존재하지 않는 좋아요입니다.',
    });
  }

  // 자신의 좋아요인지 확인
  if (like.UserId !== userId) {
    return res.status(403).json({
      message: '자신의 좋아요만 취소할 수 있습니다.',
    });
  }

  try {
    await Likes.destroy({
      where: { likeId },
    });

    res.status(200).json({
      message: '좋아요 취소 성공',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: '좋아요 취소 실패',
      error: error.message,
    });
  }
});

module.exports = router;