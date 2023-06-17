const express = require("express");
const router = express.Router();
const { Users } = require("../models");
const jwt = require("jsonwebtoken");
const checkLogin = require("../middlewares/checkLogin.js"); //유저아이디받기
const crypto = require("crypto");
const XRegExp = require('xregexp');

// ✖︎ 응답 객체
class ApiResponse {
  constructor(code, message = "", data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

// ◎ 회원가입 API
router.post("/signup", async (req, res, next) => {
  const { email, password, nickname } = req.body;
  try {
    // 닉네임으로 중복가입 여부 확인

    const isExistNick = await Users.findOne({
      where: { nickname: nickname },
    });
    if (isExistNick) {
      // 이미 해당 닉네임으로 가입했다면,
      res.status(412).json({ errorMessage: "중복된 닉네임입니다." });
      return;
    }
    const isExistEmail = await Users.findOne({
      where: { email: email },
    });
    if (isExistEmail) {
      // 이미 해당 이메일로 가입했다면,
      res.status(412).json({ errorMessage: "중복된 이메일입니다." });
      return;
    }

    // 이메일 형식확인
    const emailCheck =
      /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
    if (!emailCheck.test(email)) {
      const response = new ApiResponse(
        412,
        "이메일의 형식이 올바르지 않습니다"
      );
      res.status(412).json(response);
      return;
    }
    // 닉네임 형식확인: 알파벳 대소문자, 숫자, 4~20자
    const nickCheck = XRegExp('^([\\p{L}\\p{N}!@#$%^&*()\\-_=?/+]{1,8})$');
    if (!nickCheck.test(nickname)) {
      const response = new ApiResponse(
        412,
        "닉네임의 형식이 올바르지 않습니다"
      );
      res.status(412).json(response);
      return;
    }

    // 패스워드 형식 확인: 알파벳 소문자 의무포함, 대문자 가능, 4~20자

    const pwCheck = /^(?=.*[a-z])[A-Za-z\d@$!%*?&]{4,20}$/;

    if (!pwCheck.test(password)) {
      const response = new ApiResponse(
        412,
        "패스워드 형식이 올바르지 않습니다"
      );
      res.status(412).json(response);
      return;
    }
    // 패스워드가 닉네임 포함하는지 여부 확인
    if (password.includes(nickname)) {
      const response = new ApiResponse(
        412,
        "패스워드에 닉네임이 포함되어 있습니다."
      );
      res
        .status(412)
        .json({ errorMessage: "패스워드에 닉네임이 포함되어 있습니다." });
      return;
    }
    const cryptedPw = crypto
      .createHash("sha512")
      .update(password)
      .digest("base64");
    const date = new Date();
    const koreantime = date.setHours(date.getHours() + 9);

    await Users.create({
      email,
      password: cryptedPw,
      nickname,
      createdAt: koreantime,
      updatedAt: koreantime,
    });
    const response = new ApiResponse(201, "회원가입 성공");
    return res.status(201).json(response);
  } catch (error) {
    const response = new ApiResponse(
      500,
      "예상하지 못한 서버 문제가 발생했습니다."
    );
    return res.status(500).json(response);
  }
});

// ◎  로그인 API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginUser = await Users.findOne({
      where: { email },
    });
    //패스워드 암호화
    const crypyedPw = crypto
      .createHash("sha512")
      .update(password)
      .digest("base64");

    //디비에 저장된 이메일이 없거나 패스워드가 틀린 경우
    if (!loginUser || crypyedPw !== loginUser.password) {
      const response = new ApiResponse(
        412,
        "이메일 또는 패스워드를 확인해주세요."
      );
      return res.status(412).json(response);
    }

    //jwt
    const token = jwt.sign({ userId: loginUser.userId }, "checkLogin_key", {
      expiresIn: "1d",
    });
    //쿠키보내기
    res.cookie("Authorization", `Bearer ${token}`, {
      // secure: true,
      // maxAge: 3600000,
      // httpOnly: true,
      // sameSite: "none",
      // domain: ".gptclone.cz",
    });

    //헤더에 JWT 넣기
    res.set({ Authorization: `Bearer ${token}` });

    //토큰보내기
    const response = new ApiResponse(200, "로그인 성공", {
      Authorization: `Bearer ${token}`,
    });
    return res.status(200).json(response);
  } catch (error) {
    const response = new ApiResponse(
      500,
      "예상하지 못한 서버 문제가 발생했습니다."
    );
    return res.status(500).json(response);
  }
});

// ◎  로그아웃 API
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("Authorization");
    const response = new ApiResponse(200, "로그아웃 성공");
    return res.status(200).json(response);
  } catch {
    const response = new ApiResponse(
      500,
      "예상하지 못한 서버 문제가 발생했습니다."
    );
    return res.status(500).json(response);
  }
});

module.exports = router;
