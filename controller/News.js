const News = require("../models/News");
const MyError = require("../utils/myError");
const asyncHandler = require("express-async-handler");
const paginate = require("../utils/paginate");
const { imageDelete } = require("../lib/fileUpload");
const { valueRequired } = require("../lib/check");
const {
  useNewsCategories,
  RegexOptions,
  useNewsSlugCategories,
} = require("../lib/searchOfterModel");
const { slugify } = require("transliteration");

exports.createNews = asyncHandler(async (req, res) => {
  const language = req.cookies.language || "mn";
  req.body.status = valueRequired(req.body.status) ? req.body.status : true;
  req.body.star = valueRequired(req.body.star) ? req.body.star : true;

  if (!valueRequired(req.body.categories)) {
    throw new MyError("Ангилал сонгоно уу", 404);
  }

  const { name, details, shortDetails } = req.body;
  ["language", "shrotDetails", "name", "details"].map(
    (data) => delete req.body[data]
  );

  req.body[language] = {
    name,
    details,
    shortDetails,
  };

  const nameUnique = await News.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  req.body.createUser = req.userId;
  const news = await News.create(req.body);

  res.status(200).json({
    success: true,
    data: news,
  });
});

exports.getNews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;
  const userInput = req.query;

  //FIELDS
  let status = req.query.status || null;
  let star = req.query.star || null;
  const stringLanguageFld = ["name", "details", "shortDetails"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesid"];
  const type = userInput["type"];

  const query = News.find();

  stringLanguageFld.map((el) => {
    if (valueRequired(userInput[el])) {
      const engName = "eng." + el;
      const mnName = "mn." + el;
      query.find({
        $or: [
          { [engName]: RegexOptions(userInput[el]) },
          { [mnName]: RegexOptions(userInput[el]) },
        ],
      });
    }
  });

  if (valueRequired(categories)) {
    const newsCategoriesIds = await useNewsCategories(categories);
    const ids = await useNewsSlugCategories(categories);
    if (newsCategoriesIds && newsCategoriesIds.length > 0) {
      query.where("categories").in(newsCategoriesIds);
    }
    if (ids) {
      query.where("categories").in(ids);
    }
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }

  if (valueRequired(type)) {
    query.where("type").equals(type);
  }

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

  if (valueRequired(star)) {
    if (star.split(",").length > 1) {
      query.where("star").in(star.split(","));
    } else query.where("star").equals(star);
  }

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("categories");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, News, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const news = await query.exec();

  res.status(200).json({
    success: true,
    count: news.length,
    data: news,
    pagination,
  });
});

exports.excelData = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  //FIELDS
  let status = req.query.status || null;
  let star = req.query.star || null;
  const stringLanguageFld = ["name", "details", "shortDetails"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesid"];
  const type = userInput["type"];

  const query = News.find();

  stringLanguageFld.map((el) => {
    if (valueRequired(userInput[el])) {
      const engName = "eng." + el;
      const mnName = "mn." + el;
      query.find({
        $or: [
          { [engName]: RegexOptions(userInput[el]) },
          { [mnName]: RegexOptions(userInput[el]) },
        ],
      });
    }
  });

  if (valueRequired(categories)) {
    const newsCategoriesIds = await useNewsCategories(categories);
    if (newsCategoriesIds && newsCategoriesIds.length > 0) {
      query.where("categories").in(newsCategoriesIds);
    }
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }

  if (valueRequired(type)) {
    query.where("type").equals(type);
  }

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

  if (valueRequired(star)) {
    if (star.split(",").length > 1) {
      query.where("star").in(star.split(","));
    } else query.where("star").equals(star);
  }

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("categories");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, News, result);
  const pageCount = pagination.pageCount;
  let datas = [];

  for (let i = 1; i <= pageCount; i++) {
    const res = await getFullData(req, i);
    datas.push(...res);
  }

  res.status(200).json({
    success: true,
    data: datas,
  });
});

const getFullData = async (req, page) => {
  const limit = 25;
  const select = req.query.select;
  let sort = req.query.sort || { createAt: -1 };

  //FIELDS
  let status = req.query.status || null;
  let star = req.query.star || null;
  const stringLanguageFld = ["name", "details", "shortDetails"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesid"];
  const type = userInput["type"];

  const query = News.find();

  stringLanguageFld.map((el) => {
    if (valueRequired(userInput[el])) {
      const engName = "eng." + el;
      const mnName = "mn." + el;
      query.find({
        $or: [
          { [engName]: RegexOptions(userInput[el]) },
          { [mnName]: RegexOptions(userInput[el]) },
        ],
      });
    }
  });

  if (valueRequired(categories)) {
    const newsCategoriesIds = await useNewsCategories(categories);
    if (newsCategoriesIds && newsCategoriesIds.length > 0) {
      query.where("categories").in(newsCategoriesIds);
    }
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }

  if (valueRequired(type)) {
    query.where("type").equals(type);
  }

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

  if (valueRequired(star)) {
    if (star.split(",").length > 1) {
      query.where("star").in(star.split(","));
    } else query.where("star").equals(star);
  }

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("categories");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();

  const pagination = await paginate(page, limit, News, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const news = await query.exec();

  return news;
};

exports.getSlugNews = asyncHandler(async (req, res) => {
  const news = await News.findOne({ slug: req.params.slug })
    .populate("categories")
    .populate("createUser")
    .populate("updateUser");

  if (!news) {
    throw new MyError("Мэдээлэл олдсонгүй.", 404);
  }

  await News.findByIdAndUpdate(
    news._id,
    { $inc: { views: 1 } },
    { new: true } // This option returns the updated document
  );

  res.status(200).json({
    success: true,
    data: news,
  });
});

exports.getSingleNews = asyncHandler(async (req, res) => {
  const news = await News.findById(req.params.id)
    .populate("categories")
    .populate("createUser")
    .populate("updateUser");

  if (!news) {
    throw new MyError("Мэдээлэл олдсонгүй.", 404);
  }

  news.views + 1;
  news.save();

  res.status(200).json({
    success: true,
    data: news,
  });
});

exports.updateNews = asyncHandler(async (req, res) => {
  let news = await News.findById(req.params.id);

  if (!news) {
    throw new MyError("Өгөгдөл олдсонгүй. ", 404);
  }

  const language = req.cookies.language || "mn";
  const { name, details, shortDetails, pictures } = req.body;

  if (!pictures && pictures.length <= 0) {
    throw new MyError("Зураг оруулна уу", 404);
  }

  ["shortDetails", "name", "details"].map((el) => delete req.body[el]);
  language === "eng" ? delete req.body.mn : delete req.body.eng;

  req.body.updateAt = new Date();
  req.body.updateUser = req.userId;
  req.body[language] = {
    name,
    details,
    shortDetails,
  };

  const nameUnique = await News.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  news = await News.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: news,
  });
});

exports.getCountNews = asyncHandler(async (req, res, next) => {
  const news = await News.count();
  res.status(200).json({
    success: true,
    data: news,
  });
});

exports.multDeleteNews = asyncHandler(async (req, res, next) => {
  const ids = req.queryPolluted.id;
  const findNews = await News.find({ _id: { $in: ids } });

  if (findNews.length <= 0) {
    throw new MyError("Таны сонгосон өгөгдөлүүд олдсонгүй", 404);
  }

  findNews.map(async (el) => {
    el.pictures &&
      el.pictures.map(async (picture) => await imageDelete(picture));
  });

  const news = await News.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    news,
  });
});
