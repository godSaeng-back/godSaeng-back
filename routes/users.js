const express = require("express");
const router = express.Router();
const { Users } = require("../models");
const jwt = require("jsonwebtoken");
const checkLogin = require("../middlewares/checkLogin.js"); //유저아이디받기
const crypto = require("crypto");

// ✖︎ 응답 객체
class ApiResponse {
  constructor(code, message = "", data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

// ◎ 회원가입 API
authos_router.post("/signup", async (req, res, next) => {
  const { email, password, nickname, age } = req.body;
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
      res
        .status(412)
        .json({ errorMessage: "이메일 형식이 올바르지 않습니다." });
      return;
    }
    // 닉네임 형식확인: 알파벳 대소문자, 숫자, 4~20자
    const nickCheck = /^[0-9a-zA-Z_-]{4,20}$/;
    if (!nickCheck.test(nickname)) {
      res
        .status(412)
        .json({ errorMessage: "닉네임의 형식이 올바르지 않습니다." });
      return;
    }

    // 패스워드 형식 확인: 알파벳 소문자 의무포함, 대문자 가능, 4~20자

    const pwCheck = /^(?=.*[a-z])[A-Za-z\d@$!%*?&]{4,20}$/;

    if (!pwCheck.test(password)) {
      res
        .status(412)
        .json({ errorMessage: "패스워드 형식이 올바르지 않습니다." });
      return;
    }
    // 패스워드가 닉네임 포함하는지 여부 확인
    if (password.includes(nickname)) {
      res
        .status(412)
        .json({ errorMessage: "패스워드에 닉네임이 포함되어 있습니다." });
      return;
    }
    const crypyedPw = crypto
      .createHash("sha512")
      .update(password)
      .digest("base64");
    const date = new Date();
    const koreantime = date.setHours(date.getHours() + 9);

    await Users.create({
      email,
      password: crypyedPw,
      nickname,
      age,
      createdAt: koreantime,
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
