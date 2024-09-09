const Media = require("../models/Media");
const MyError = require("../utils/myError");
const asyncHandler = require("express-async-handler");
const paginate = require("../utils/paginate");
const { imageDelete } = require("../lib/fileUpload");
const { valueRequired } = require("../lib/check");
const { slugify } = require("transliteration");

const {
  useMediaCategorySearch,
  RegexOptions,
  useSlugMediaCategorySearch,
} = require("../lib/searchOfterModel");

exports.createMedia = asyncHandler(async (req, res) => {
  const language = req.cookies.language || "mn";
  const { name, details, shortDetails, type } = req.body;
  ["language", "shrotDetails", "name", "details"].map(
    (data) => delete req.body[data]
  );

  req.body[language] = {
    name,
    details,
    shortDetails,
  };

  req.body.createUser = req.userId;

  switch (type) {
    case "audio":
      req.body.vidoes = null;
      break;
    case "video":
      req.body.audios = null;
      break;
  }

  if (!valueRequired(req.body.videos) || req.body.videos.length <= 0) {
    delete req.body.videos;
  }

  if (!valueRequired(req.body.audios) || req.body.audios.length <= 0) {
    delete req.body.audios;
  }

  const nameUnique = await Media.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  const media = await Media.create(req.body);
  res.status(200).json({
    success: true,
    data: media,
  });
});

exports.getMedias = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  //FIELDS
  const userInput = req.query;
  let status = req.query.status || null;
  const stringLanguageDtl = ["name", "details", "shortDetails"];
  const stringDtl = ["type"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesId"];

  const query = Media.find();

  stringDtl.map((el) => {
    if (valueRequired(userInput[el]))
      if (el == "type" && userInput[el] !== "all")
        query.find({ [el]: RegexOptions(userInput[el]) });
  });

  if (valueRequired(createUser)) {
    const userData = await userSearch(createUser);
    if (userData) query.where("createUser").in(userData);
  }

  if (valueRequired(updateUser)) {
    const userData = await userSearch(updateUser);
    if (userData) query.where("updateUser").in(userData);
  }

  stringLanguageDtl.map((el) => {
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

  if (valueRequired(categories)) {
    const cIds = await useMediaCategorySearch(categories);
    if (cIds && cIds.length > 0) query.where("categories").in(cIds);
    const ids = await useSlugMediaCategorySearch(categories);
    if (ids) query.where("categories").in(ids);
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }
  query.select(select);
  query.populate("createUser");
  query.populate("categories");
  query.populate("updateUser");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Media, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const medias = await query.exec();

  res.status(200).json({
    success: true,
    count: medias.length,
    data: medias,
    pagination,
  });
});

exports.getMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id)
    .populate("categories")
    .populate("createUser")
    .populate("updateUser");

  if (!media) {
    throw new MyError("Өгөгдөл олдсонгүй.", 404);
  }

  res.status(200).json({
    success: true,
    data: media,
  });
});

exports.getSlugMedia = asyncHandler(async (req, res, next) => {
  const media = await Media.findOne({ slug: req.params.slug })
    .populate("categories")
    .populate("createUser")
    .populate("updateUser");

  if (!media) {
    throw new MyError("Өгөгдөл олдсонгүй.", 404);
  }

  await Media.findByIdAndUpdate(
    media._id,
    { $inc: { views: 1 } },
    { new: true } // This option returns the updated document
  );

  res.status(200).json({
    success: true,
    data: media,
  });
});

const getFullData = async (req, page) => {
  const limit = 25;
  const select = req.query.select;
  let sort = req.query.sort || { createAt: -1 };

  //FIELDS
  const userInput = req.query;
  let status = req.query.status || null;
  const stringLanguageDtl = ["name", "details", "shortDetails"];
  const stringDtl = ["type"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesId"];

  const query = Media.find();

  stringDtl.map((el) => {
    query.find({ [el]: RegexOptions(userInput[el]) });
  });

  if (valueRequired(createUser)) {
    const userData = await userSearch(createUser);
    if (userData) query.where("createUser").in(userData);
  }

  if (valueRequired(updateUser)) {
    const userData = await userSearch(updateUser);
    if (userData) query.where("updateUser").in(userData);
  }

  stringLanguageDtl.map((el) => {
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

  if (valueRequired(categories)) {
    const cIds = await mediaCategoriesSearch(categories);
    if (cIds && cIds.length > 0) query.where("categories").in(cIds);
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }
  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("categories");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();

  const pagination = await paginate(page, limit, Media, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const medias = await query.exec();

  return medias;
};

exports.excelData = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  // FIELDS
  const userInput = req.query;
  let status = req.query.status || null;
  const stringLanguageDtl = ["name", "details", "shortDetails"];
  const stringDtl = ["type"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const categories = userInput["categories"];
  const categoriesId = userInput["categoriesId"];

  const query = Media.find();

  stringDtl.map((el) => {
    query.find({ [el]: RegexOptions(userInput[el]) });
  });

  if (valueRequired(createUser)) {
    const userData = await userSearch(createUser);
    if (userData) query.where("createUser").in(userData);
  }

  if (valueRequired(updateUser)) {
    const userData = await userSearch(updateUser);
    if (userData) query.where("updateUser").in(userData);
  }

  stringLanguageDtl.map((el) => {
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

  if (valueRequired(categories)) {
    const cIds = await mediaCategoriesSearch(categories);
    if (cIds && cIds.length > 0) query.where("categories").in(cIds);
  }

  if (valueRequired(categoriesId)) {
    query.where("categories").in(categoriesId);
  }
  query.select(select);
  query.populate("createUser");
  query.populate("categories");
  query.populate("updateUser");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Media, result);
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

exports.multDeleteMedia = asyncHandler(async (req, res) => {
  const ids = req.queryPolluted.id;
  const finds = await Media.find({ _id: { $in: ids } });

  if (finds.length <= 0) {
    throw new MyError("Таны сонгосон өгөгдөлүүд байхгүй байна", 400);
  }

  finds.map(async (el) => {
    if (valueRequired(el.pictures) && el.pictures.length > 0) {
      el.pictures.map(async (picture) => await imageDelete(picture));
    }
    if (valueRequired(el.videos) && el.videos.length > 0) {
      el.videos.map(async (video) => await imageDelete(video));
    }
    if (valueRequired(el.audios) && el.audios.length > 0) {
      el.audios.map(async (audio) => await imageDelete(audio));
    }
  });

  const medias = await Media.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    medias,
  });
});

exports.updateMedia = asyncHandler(async (req, res) => {
  let media = await Media.findById(req.params.id);
  const language = req.cookies.language || "mn";
  const { name, details, shortDetails, type } = req.body;
  ["language", "shrotDetails", "name", "details"].map(
    (data) => delete req.body[data]
  );

  req.body[language] = {
    name,
    details,
    shortDetails,
  };

  if (!media) {
    throw new MyError("Өгөгдөл олдсонгүй", 404);
  }

  if (!valueRequired(req.body.pictures)) {
    req.body.pictures = [];
  }

  if (!valueRequired(req.body.audios)) {
    req.body.audios = [];
  }

  if (!valueRequired(req.body.videos)) {
    req.body.videos = [];
  }

  req.body.updateAt = new Date();
  req.body.updateUser = req.userId;
  req.body[language] = {
    name,
    details,
    shortDetails,
  };

  const nameUnique = await Media.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  media = await Media.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: media,
  });
});
