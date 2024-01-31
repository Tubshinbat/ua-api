const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const MyError = require("../utils/myError");
const sendEmail = require("../utils/email");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const paginate = require("../utils/paginate");
const sharp = require("sharp");
const fs = require("fs");
const { imageDelete } = require("../lib/fileUpload");
const { valueRequired } = require("../lib/check");
const { RegexOptions, userSearch } = require("../lib/searchOfterModel");

// Register
exports.register = asyncHandler(async (req, res, next) => {
  req.body.email = req.body.email.toLowerCase();
  const user = await User.create(req.body);

  const jwt = user.getJsonWebToken();

  res.status(200).json({
    success: true,
    token: jwt,
    data: user,
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  // Оролтыгоо шалгана
  if (!email || !password)
    throw new MyError("Имэйл болон нууц үгээ дамжуулна уу", 400);

  // Тухайн хэрэглэгчийг хайна
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new MyError("Имэйл болон нууц үгээ зөв оруулна уу", 401);
  }

  const ok = await user.checkPassword(password);

  if (!ok) {
    throw new MyError("Имэйл болон нууц үгээ зөв оруулна уу", 402);
  }

  if (user.role === "user") {
    throw new MyError("Уучлаарай нэвтрэх боломжгүй.");
  }

  if (user.status === false) {
    throw new MyError("Уучлаарай таны эрхийг хаасан байна.");
  }

  const token = user.getJsonWebToken();
  req.token = token;
  const cookieOption = {
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    httpOnly: false,
  };

  res.status(200).cookie("uatoken", token, cookieOption).json({
    success: true,
    token,
    user,
  });
});

exports.tokenCheckAlways = asyncHandler(async (req, res, next) => {
  const token = req.cookies.uatoken;

  if (!token) {
    throw new MyError("Уучлаарай хандах боломжгүй байна..", 400);
  }

  const tokenObject = jwt.verify(token, process.env.JWT_SECRET);

  req.userId = tokenObject.id;
  req.userRole = tokenObject.role;

  res.status(200).json({
    success: true,
    role: tokenObject.role,
    userId: tokenObject.id,
    avatar: tokenObject.avatar,
    name: tokenObject.name,
  });
});

exports.logout = asyncHandler(async (req, res, next) => {
  const cookieOption = {
    expires: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    httpOnly: false,
  };
  res.status(200).cookie("uatoken", null, cookieOption).json({
    success: true,
    data: "logout...",
  });
});

exports.phoneCheck = asyncHandler(async (req, res) => {
  const phoneNumber = parseInt(req.body.phoneNumber) || 0;
  const user = await User.findOne({ status: true })
    .where("phone")
    .equals(phoneNumber);

  if (!user) {
    throw new MyError("Уучлаарай утасны дугаараа шалгаад дахин оролдоно уу");
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const newPassword = req.body.password;
  const userId = req.body.id;
  if (!newPassword) {
    throw new MyError("Нууц үгээ дамжуулна уу.", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new MyError(req.body.email + "Хандах боломжгүй.", 400);
  }

  user.password = req.body.password;
  user.resetPassword = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  const userInput = req.query;

  //FIELDS
  let status = req.query.status || null;
  const stringDtl = ["name", "email", "phone"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];

  const query = User.find();

  stringDtl.map((el) => {
    if (valueRequired(userInput[el])) {
      query.find({ [el]: RegexOptions(userInput[el]) });
    }
  });

  if (valueRequired(createUser)) {
    const userData = await userSearch(createUser);
    if (userData) query.where("createUser").in(userData);
  }

  if (valueRequired(updateUser)) {
    const userData = await userSearch(updateUser);
    if (userData) query.where("updateUser").in(userData);
  }

  if (valueRequired(sort)) {
    if (typeof sort === "string") {
      const spliteSort = sort.split(":");
      let convertSort = {};
      if (spliteSort[1] === "ascend") {
        convertSort = { [spliteSort[0]]: 1 };
      } else {
        convertSort = { [spliteSort[0]]: -1 };
      }
      if (spliteSort[0] != "undefined") query.sort(convertSort);
    } else {
      query.sort(sort);
    }
  }

  if (valueRequired(status)) {
    if (status.split(",").length > 1) {
      query.where("status").in(status.split(","));
    } else query.where("status").equals(status);
  }

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, User, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const users = await query.exec();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
    pagination,
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new MyError("Тухайн хэрэглэгч олдсонгүй.", 404);
  }
  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.getCount = asyncHandler(async (req, res, next) => {
  const userCount = await User.count();
  res.status(200).json({
    success: true,
    data: userCount,
  });
});

exports.createUser = asyncHandler(async (req, res, next) => {
  req.body.status = req.body.status || false;
  req.body.role = req.body.role || "user";
  req.body.email = req.body.email.toLowerCase();
  req.body.createUser = req.userId;

  const user = await User.create(req.body);

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  req.body.status = req.body.status || false;
  req.body.role = req.body.role || "user";
  req.body.email = req.body.email.toLowerCase();
  req.body.updateUser = req.userId;

  delete req.body.password;
  delete req.body.confirmPassword;

  if (req.body.role === "admin" && req.userRole !== "admin") {
    throw new MyError("Уучлаарай админ эрх өгөх эрхгүй байна", 200);
  }

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new MyError(req.params.id + " ID-тэй Хэрэглэгч байхгүйээээ.", 400);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.updateCuser = asyncHandler(async (req, res, next) => {
  req.body.status = req.body.status || false;
  req.body.role = req.body.role || "user";
  req.body.email = req.body.email.toLowerCase();
  req.body.updateUser = req.userId;

  if (req.params.id !== req.userId) {
    throw new MyError("Уучлаарай хандах боломжгүй", 300);
  }

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new MyError(req.params.id + " ID-тэй Хэрэглэгч байхгүйээээ.", 400);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new MyError(req.params.id + " ID-тэй хэрэглэгч байхгүйээээ.", 400);
  }

  user.remove();

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.multDeleteUsers = asyncHandler(async (req, res, next) => {
  const ids = req.queryPolluted.id;
  const findUsers = await User.find({ _id: { $in: ids } });
  // throw new MyError("Зүгээр алдаа гаргамаар байна. ", 404);
  if (findUsers.length <= 0) {
    throw new MyError("Таны сонгосон хэрэглэгчид байхгүй байна", 404);
  }

  findUsers.map((el) => {
    imageDelete(el.avatar);
  });

  const user = await User.deleteMany({ _id: { $in: ids } });
  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  if (!req.body.email) {
    throw new MyError(" Имэйл хаягаа дамжуулна уу.", 400);
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new MyError(
      req.body.email + " Имэйлтэй хэрэглэгч байхгүй байна.",
      400
    );
  }

  const resetToken = user.generatePasswordChangeToken();
  // await user.save();
  await user.save({ validateBeforeSave: false });

  const message = `Сайн байна уу? Энэ таны баталгаажуулах код <br> <br> ${resetToken}<br> <br> өдрийг сайхан өнгөрүүлээрэй!`;

  // Имэйл илгээнэ
  const info = await sendEmail({
    email: user.email,
    subject: "Нууц үг сэргээх хүсэлт",
    message,
  });

  console.log("Message sent: %s", info.messageId);

  res.status(200).json({
    success: true,
    resetToken,
    message,
  });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  if (!req.body.resetToken || !req.body.password) {
    throw new MyError("Токен болон нууц үгээ дамжуулна уу.", 400);
  }

  req.body.resetToken = parseInt(req.body.resetToken);

  const user = await User.findOne({
    resetPasswordToken: req.body.resetToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new MyError(
      req.body.email + "Баталгаажуулах код хүчингүй байна.",
      400
    );
  }

  user.password = req.body.password;
  user.resetPassword = undefined;
  user.resetPasswordExpire = undefined;

  await user.save({ validateBeforeSave: false });

  const token = user.getJsonWebToken();
  res.status(200).json({
    success: true,
    token,
    user,
  });
});

exports.adminControlResetPassword = asyncHandler(async (req, res, next) => {
  if (!req.body.password) {
    throw new MyError("нууц үгээ дамжуулна уу.", 400);
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new MyError(req.body.email + "Токен хүчингүй байна.", 400);
  }

  user.password = req.body.password;
  user.resetPassword = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

// FILE UPLOAD
