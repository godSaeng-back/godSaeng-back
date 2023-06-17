const jwt = require("jsonwebtoken");
const { Users } = require("../models");
// ✖︎ 응답 객체
class ApiResponse {
  constructor(code, message = "", data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

module.exports = async (req, res, next) => {
  try {
    // const { Authorization } = req.cookies; // 토큰을 쿠키로 받는경우
    const authorizationCookies = req.cookies.Authorization;
    const authorizationHeaders = req.headers.Authorization;
    const Authorization = authorizationCookies
      ? authorizationCookies
      : authorizationHeaders;

    console.log('Authorization : ', Authorization);

    // const Authorization = req.header("Authorization"); //토큰을 헤더로 받는 경우
    //토큰이 있는지 확인
    if (!Authorization) {
      const response = new ApiResponse(403, "로그인이 필요한 서비스입니다.");
      return res.status(403).json(response);
    }

    const [authType, authToken] = Authorization.split(" ");
    // console.log(Authorization, authType, authToken);

    //authTyep === Bearer인지 확인
    if (authType !== "Bearer" || !authToken) {
      const response = new ApiResponse(403, "토큰 정보 오류");
      return res.status(403).json(response);
    }

    //
    const { userId } = jwt.verify(authToken, "checkLogin_key");
    const user = await Users.findOne({ where: { userId } });

    res.locals.user = user;
    next();
  } catch (error) {
    const response = new ApiResponse(
      500,
      "예상하지 못한 서버 문제가 발생했습니다."
    );
    return res.status(500).json(response);
  }
};
