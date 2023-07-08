const express = require("express");
const router = express.Router();
const checkLogin = require("../middlewares/checkLogin.js");
const { Feeds, Users, FeedImages, Shares } = require("../models");
const { Op, Sequelize } = require("sequelize");
const path = require("path");

const aws = require("aws-sdk");
const multer = require("multer");

const multerS3 = require("multer-s3");
require("dotenv").config();

class ApiResponse {
  constructor(code, message = "", data = {}) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

aws.config.setPromisesDependency(require("bluebird"));
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
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.basename(file.originalname));
    },
  }),
});

const imageUpload = async (base64) => {
  // You can either "yarn add aws-sdk" or "npm i aws-sdk"
  const aws = require("aws-sdk");

  // Configure AWS with your access and secret key.
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_BUCKET_NAME,
  } = process.env;

  // Configure AWS to use promise
  aws.config.setPromisesDependency(require("bluebird"));
  aws.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });

  // Create an s3 instance
  const s3 = new aws.S3();

  // Ensure that you POST a base64 data to your server.
  // Let's assume the variable "base64" is one.
  const base64Data = new Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  // 파일타입 추출: 예시 ( jpeg, png, gif )
  const type = base64.split(";")[0].split("/")[1];

  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `${Date.now() + "." + type}`,
    Body: base64Data,
    ACL: "public-read",
    ContentEncoding: "base64", //
    ContentType: `image/${type}`, // required. Notice the back ticks
  };

  // The upload() is used instead of putObject() as we'd need the location url and assign that to our user profile/database
  // see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  let location = "";
  let key = "";
  try {
    const { Location, Key } = await s3.upload(params).promise();
    location = Location;
    key = Key;
  } catch (error) {
    // console.log(error)
  }

  // Save the Location (url) to your database and Key if needs be.
  // As good developers, we should return the url and let other function do the saving to database etc
  // console.log(location, key);

  return location;

  // To delete, see: https://gist.github.com/SylarRuby/b3b1430ca633bc5ffec29bbcdac2bd52
};

// ◎ 공유 작성
router.post("/share", checkLogin, async (req, res) => {
  const adjectives = [
    "착한",
    "똑똑한",
    "유쾌한",
    "기분좋은",
    "즐거운",
    "활기찬",
    "열정적인",
    "창의적인",
    "대담한",
    "용감한",
    "친절한",
    "품위있는",
    "명랑한",
    "상냥한",
    "영리한",
    "빠른",
    "재빠른",
    "자유로운",
    "긍정적인",
    "꾸준한",
    "따뜻한",
    "느긋한",
    "재치있는",
    "끈기있는",
    "용맹스러운",
    "귀여운",
    "아름다운",
    "풍부한",
    "자신감있는",
    "발랄한",
    "유능한",
    "다재다능한",
    "도전적인",
    "용기있는",
    "기민한",
    "명석한",
    "유익한",
    "신선한",
    "짜릿한",
    "뛰어난",
    "아기자기한",
    "반짝이는",
    "창조적인",
    "침착한",
    "성실한",
    "의욕적인",
    "악동같은",
    "예술적인",
    "경쾌한",
    "노래하는",
    "싱그러운",
    "아주배고픈",
    "어마어마한",
    "파란",
    "따스한",
    "비행하는",
    "투명한",
    "신기한",
    "놀라운",
    "소중한",
    "기다리는",
    "외로운",
    "빛나는",
    "눈부신",
    "따끔한",
    "정교한",
    "별빛나는",
    "행복추구하는",
    "애정하는",
    "유순한",
    "영원한",
    "사랑스러운",
    "원숭이같은",
    "초록색",
    "푸른",
    "금빛",
    "활발한",
    "매혹적인",
    "편안한",
    "화려한",
    "지혜로운",
    "사랑받는",
    "맛있는",
    "다정다감한",
    "존경스러운",
    "묵직한",
    "가벼운",
    "밝은",
    "젠틀한",
    "정열적인",
    "신비로운",
    "무서운",
    "예의바른",
    "자상한",
    "적극적인",
    "마음씨좋은",
    "사려깊은",
    "참을성있는",
    "자연스러운",
    "애정어린",
    "소박한",
    "다채로운",
    "탁월한",
    "바람직한",
    "유명한",
    "헌신적인",
    "신중한",
    "진지한",
    "무던한",
    "평화로운",
    "시원한",
    "감동적인",
    "고급스러운",
    "훌륭한",
    "상큼한",
    "포근한",
    "기뻐하는",
    "당당한",
    "쾌활한",
    "기적적인",
    "예리한",
    "낭만적인",
    "가뿐한",
    "신나는",
    "상쾌한",
    "서툴른",
    "잔잔한",
    "이국적인",
    "고요한",
    "웅장한",
  ];

  const nouns = [
    "파이터",
    "아파치",
    "눈코입",
    "감자",
    "돌멩이",
    "요정",
    "괴물",
    "우주선",
    "로봇",
    "피자",
    "치킨",
    "용사",
    "마법사",
    "탐험가",
    "도적",
    "검사",
    "무사",
    "집사",
    "흑마법사",
    "정령",
    "주술사",
    "마녀",
    "요술사",
    "기사",
    "장군",
    "제왕",
    "공주",
    "왕자",
    "마왕",
    "달",
    "영웅",
    "천사",
    "별똥별",
    "유니콘",
    "공룡",
    "거미",
    "날개",
    "무지개",
    "강철",
    "용",
    "헬멧",
    "창",
    "인어",
    "소녀",
    "왕비",
    "곰",
    "토끼",
    "바다",
    "하늘",
    "바람",
    "구름",
    "태양",
    "달빛",
    "별빛",
    "검",
    "망치",
    "방패",
    "고리",
    "왕관",
    "마스크",
    "햇빛",
    "별",
    "새벽",
    "일출",
    "일몰",
    "강",
    "산",
    "들",
    "숲",
    "꽃",
    "나무",
    "물고기",
    "새",
    "뱀",
    "거북이",
    "나비",
    "벌",
    "고양이",
    "개",
    "소",
    "말",
    "원숭이",
    "사자",
    "호랑이",
    "늑대",
    "오리",
    "펭귄",
    "독수리",
    "상어",
    "돌고래",
    "표범",
    "기린",
    "코끼리",
    "물소",
    "늙은이",
    "아이",
    "여자",
    "남자",
    "아빠",
    "엄마",
    "가족",
    "친구",
    "사람",
    "학생",
    "선생님",
    "나라",
    "도시",
    "집",
    "마을",
    "차",
    "비행기",
    "선박",
    "기차",
    "자전거",
    "시계",
    "전화",
    "컴퓨터",
    "카메라",
    "책",
    "신문",
    "볼펜",
    "의자",
    "선풍기",
    "스피커",
    "램프",
    "책상",
    "텔레비전",
    "건축가",
    "맹수",
    "수학자",
  ];

  function generateFunnyNickname() {
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return randomAdjective + " " + randomNoun;
  }
  const randomNickname = generateFunnyNickname();

  try {
    // 로그인한 사용자의 userId 가져옴
    const { userId } = res.locals.user;
    const { title, content, anonymous } = req.body;
    // const graphImage = req.file; // Multer에서 업로드된 파일 정보
    const imgLocation = await imageUpload(req.body.base64);
    console.log(imgLocation);
    const sharer = await Users.findOne({
      where: {
        UserId: userId,
      },
    });

    // 사용자가 공유글을 익명으로 설정했다면 shareName을 랜덤닉네임으로 저장함.
    // 일반 공유글은 그냥 Users 테이블의 nickname으로 shareName을 저장함.
    const shareName = anonymous ? randomNickname : sharer.nickname;
    const shareFeed = await Shares.create({
      UserId: userId,
      title,
      content,
      anonymous,
      shareName: shareName,
      imagePath: `${imgLocation}`, // 이미지 경로를 S3 URL로 설정
    });
    const result = {
      title,
      content,
      anonymous,
      shareName: shareName,
      imagePath: `${imgLocation}`,
    };
    const response = new ApiResponse(201, "공유글 작성 성공", result);

    return res.json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "서버 오류입니다.!!" });
  }
});

module.exports = router;
