const Menu = require("../models/Menu");
const MyError = require("../utils/myError");
const asyncHandler = require("express-async-handler");
const paginate = require("../utils/paginate");
const { imageDelete } = require("../lib/fileUpload");
const { valueRequired } = require("../lib/check");
const Page = require("../models/Page");
const {
  useMenuSearch,
  usePageSearch,
  useNewsCategories,
  useMediaSearch,
  useFooterMenuSearch,
  usePositionSearch,
  RegexOptions,
} = require("../lib/searchOfterModel");

exports.createPage = asyncHandler(async (req, res) => {
  const language = req.cookies.language || "mn";
  req.body.status = valueRequired(req.body.status) ? req.body.status : true;
  const userInputs = req.body;
  const {
    status,
    newsActive,
    listActive,
    position,
    menu,
    mainLink,
    name,
    pageInfo,
    footerMenu,
    categories,
  } = req.body;

  console.log(req.body);

  if (!valueRequired(menu) || menu.length <= 0) req.body.menu = [];
  if (!valueRequired(position) || position.length <= 0) req.body.position = [];

  if (!valueRequired(footerMenu) || footerMenu.length <= 0)
    req.body.footerMenu = [];

  if (!valueRequired(categories) || categories.length <= 0)
    req.body.categories = [];

  if (mainLink === true && valueRequired(menu)) {
    const pages = await Page.find({}).where("menu").in(menu);
    if (pages.length > 0)
      throw new MyError(
        "Өмнө цэсний тохиргоог тухайн цэс дээр идэвхжүүлсэн байна"
      );
  } else {
    req.body.mainLink = false;
  }

  req.body.createUser = req.userId;
  req.body[language] = {
    name,
    pageInfo,
  };

  const page = await Page.create(req.body);

  res.status(200).json({
    success: true,
    data: page,
  });
});

exports.getMenuData = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const page = await Page.findOne({}).where("menu").in(id).populate("position");
  if (!page) {
    throw new MyError("Хайсан мэдээлэл олдсонгүй", 404);
  }

  res.status(200).json({
    success: true,
    data: page,
  });
});

exports.getFooterData = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const page = await Page.findOne({})
    .where("footerMenu")
    .in(id)
    .populate("position");
  if (!page) {
    throw new MyError("Хайсан мэдээлэл олдсонгүй", 404);
  }

  res.status(200).json({
    success: true,
    data: page,
  });
});

exports.getPage = asyncHandler(async (req, res, next) => {
  const sitePage = await Page.findById(req.params.id)
    .populate("menu")
    .populate("footerMenu")
    .populate("position");
  if (!sitePage) {
    throw new MyError("Тухайн хуудас байхгүй байна.", 404);
  }
  res.status(200).json({
    success: true,
    data: sitePage,
  });
});

exports.getSlug = asyncHandler(async (req, res, next) => {
  const menu = await Menu.findOne({ slug: req.params.slug });

  if (!menu) {
    throw new MyError("Тухайн хуудас байхгүй байна.", 404);
  }

  const sitePage = await Page.findOne({ menu: menu._id });

  if (!sitePage) {
    throw new MyError("Тухайн хуудас байхгүй байна.", 404);
  }

  res.status(200).json({
    success: true,
    data: sitePage,
  });
});

exports.updatePage = asyncHandler(async (req, res) => {
  let page = await Page.findById(req.params.id);

  if (!page) {
    throw new MyError("Өгөгдөл олдсонгүй", 404);
  }

  const language = req.cookies.language || "mn";
  const userInputs = req.body;
  const {
    status,
    newsActive,
    listActive,
    mainLink,
    name,
    pageInfo,
    footerMenu,
    categories,
    position,
    pictures,
    menu,
  } = req.body;

  req.body[language] = {
    name,
    pageInfo,
  };
  if (!valueRequired(footerMenu) || footerMenu.length <= 0)
    req.body.footerMenu = [];
  if (!valueRequired(position) || position.length <= 0) req.body.position = [];
  if (!valueRequired(menu) || menu.length <= 0) req.body.menu = [];
  if (!valueRequired(pictures) || pictures.length <= 0) req.body.pictures = [];

  req.body.updateUser = req.userId;
  req.body.updateAt = new Date();

  page = await Page.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: page,
  });
});

exports.getPages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  let sort = req.query.sort || { createAt: -1 };
  const userInput = req.query;

  //FIELDS
  const booleanFlds = [
    "status",
    "mainLink",
    "newsActive",
    "listActive",
    "pageActive",
    "pageParentActive",
    "listAdmissionActive",
    "admissionActive",
    "parentActive",
    "sideActive",
    "modalActive",
  ];

  const languageFlds = ["name", "pageInfo"];
  const {
    menu,
    position,
    footerMenu,
    categories,
    page: choisePage,
    status,
    mainLink,
    newsActive,
    listActive,
    pageActive,
    pageParentActive,
    listAdmissionActive,
    admissionActive,
    parentActive,
    sideActive,
    modalActive,
    choiseModal,
    modal,
    updateUser,
    createUser,
    admissionLink,
  } = userInput;

  const query = Page.find();

  languageFlds.map((el) => {
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

  if (valueRequired(status)) {
    if (status.split(",").length > 1) {
      query.where("status").in(status.split(","));
    } else query.where("status").equals(status);
  }

  if (valueRequired(mainLink)) {
    if (mainLink.split(",").length > 1) {
      query.where("mainLink").in(mainLink.split(","));
    } else query.where("mainLink").equals(mainLink);
  }

  if (valueRequired(newsActive)) {
    if (newsActive.split(",").length > 1) {
      query.where("newsActive").in(newsActive.split(","));
    } else query.where("newsActive").equals(newsActive);
  }

  if (valueRequired(listActive)) {
    if (listActive.split(",").length > 1) {
      query.where("listActive").in(listActive.split(","));
    } else query.where("listActive").equals(listActive);
  }

  if (valueRequired(pageActive)) {
    if (pageActive.split(",").length > 1) {
      query.where("pageActive").in(pageActive.split(","));
    } else query.where("pageActive").equals(pageActive);
  }

  if (valueRequired(pageParentActive)) {
    if (pageParentActive.split(",").length > 1) {
      query.where("pageParentActive").in(pageParentActive.split(","));
    } else query.where("pageParentActive").equals(pageParentActive);
  }

  if (valueRequired(listAdmissionActive)) {
    if (listAdmissionActive.split(",").length > 1) {
      query.where("listAdmissionActive").in(listAdmissionActive.split(","));
    } else query.where("listAdmissionActive").equals(listAdmissionActive);
  }

  if (valueRequired(parentActive)) {
    if (parentActive.split(",").length > 1) {
      query.where("parentActive").in(parentActive.split(","));
    } else query.where("parentActive").equals(parentActive);
  }

  if (valueRequired(sideActive)) {
    if (sideActive.split(",").length > 1) {
      query.where("sideActive").in(sideActive.split(","));
    } else query.where("sideActive").equals(sideActive);
  }

  if (valueRequired(modalActive)) {
    if (modalActive.split(",").length > 1) {
      query.where("modalActive").in(modalActive.split(","));
    } else query.where("modalActive").equals(modalActive);
  }

  if (valueRequired(choiseModal)) {
    if (choiseModal.split(",").length > 1) {
      query.where("choiseModal").in(choiseModal.split(","));
    } else query.where("choiseModal").equals(choiseModal);
  }

  if (valueRequired(createUser)) {
    const userData = await useSearch(createUser);
    if (userData) {
      query.where("createUser").in(userData);
    }
  }

  if (valueRequired(updateUser)) {
    const userData = await useSearch(updateUser);
    if (userData) {
      query.where("updateUser").in(userData);
    }
  }

  if (valueRequired(choiseModal) && valueRequired(modal)) {
    switch (choiseModal) {
      case "news": {
        const ids = await useNewsSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
      case "media": {
        const ids = await useMediaSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
    }
  }

  if (valueRequired(menu)) {
    const ids = await useMenuSearch(menu);
    if (ids && ids.length > 0) query.where("menu").in(ids);
  }

  if (valueRequired(categories)) {
    const ids = await useNewsCategories(categories);
    if (ids && ids.length > 0) query.where("categories").in(ids);
  }

  if (valueRequired(choisePage)) {
    const ids = await usePageSearch(choisePage);
    if (ids && ids.length > 0) query.where("page").in(ids);
  }

  if (valueRequired(footerMenu)) {
    const ids = await useFooterMenuSearch(footerMenu);
    if (ids && ids.length > 0) query.where("footerMenu").in(ids);
  }

  if (valueRequired(position)) {
    const ids = await usePositionSearch(position);
    if (ids && ids.length > 0) query.where("position").in(ids);
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

  query.populate("createUser");
  query.populate("updateUser");
  query.populate("menu");
  query.populate("position");
  query.populate("footerMenu");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Page, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const pages = await query.exec();

  res.status(200).json({
    success: true,
    count: pages.length,
    data: pages,
    pagination,
  });
});

exports.excelData = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  //FIELDS
  const booleanFlds = [
    "status",
    "mainLink",
    "newsActive",
    "listActive",
    "pageActive",
    "pageParentActive",
    "listAdmissionActive",
    "admissionActive",
    "parentActive",
    "sideActive",
    "modalActive",
  ];

  const languageFlds = ["name", "pageInfo"];
  const {
    menu,
    position,
    footerMenu,
    categories,
    page: choisePage,
    status,
    mainLink,
    newsActive,
    listActive,
    pageActive,
    pageParentActive,
    listAdmissionActive,
    admissionActive,
    parentActive,
    sideActive,
    modalActive,
    choiseModal,
    modal,
    updateUser,
    createUser,
    admissionLink,
  } = userInput;

  const query = Page.find();

  languageFlds.map((el) => {
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

  if (valueRequired(status)) {
    if (status.split(",").length > 1) {
      query.where("status").in(status.split(","));
    } else query.where("status").equals(status);
  }

  if (valueRequired(mainLink)) {
    if (mainLink.split(",").length > 1) {
      query.where("mainLink").in(mainLink.split(","));
    } else query.where("mainLink").equals(mainLink);
  }

  if (valueRequired(newsActive)) {
    if (newsActive.split(",").length > 1) {
      query.where("newsActive").in(newsActive.split(","));
    } else query.where("newsActive").equals(newsActive);
  }

  if (valueRequired(listActive)) {
    if (listActive.split(",").length > 1) {
      query.where("listActive").in(listActive.split(","));
    } else query.where("listActive").equals(listActive);
  }

  if (valueRequired(pageActive)) {
    if (pageActive.split(",").length > 1) {
      query.where("pageActive").in(pageActive.split(","));
    } else query.where("pageActive").equals(pageActive);
  }

  if (valueRequired(pageParentActive)) {
    if (pageParentActive.split(",").length > 1) {
      query.where("pageParentActive").in(pageParentActive.split(","));
    } else query.where("pageParentActive").equals(pageParentActive);
  }

  if (valueRequired(listAdmissionActive)) {
    if (listAdmissionActive.split(",").length > 1) {
      query.where("listAdmissionActive").in(listAdmissionActive.split(","));
    } else query.where("listAdmissionActive").equals(listAdmissionActive);
  }

  if (valueRequired(parentActive)) {
    if (parentActive.split(",").length > 1) {
      query.where("parentActive").in(parentActive.split(","));
    } else query.where("parentActive").equals(parentActive);
  }

  if (valueRequired(sideActive)) {
    if (sideActive.split(",").length > 1) {
      query.where("sideActive").in(sideActive.split(","));
    } else query.where("sideActive").equals(sideActive);
  }

  if (valueRequired(modalActive)) {
    if (modalActive.split(",").length > 1) {
      query.where("modalActive").in(modalActive.split(","));
    } else query.where("modalActive").equals(modalActive);
  }

  if (valueRequired(choiseModal)) {
    if (choiseModal.split(",").length > 1) {
      query.where("choiseModal").in(choiseModal.split(","));
    } else query.where("choiseModal").equals(choiseModal);
  }

  if (valueRequired(createUser)) {
    const userData = await useSearch(createUser);
    if (userData) {
      query.where("createUser").in(userData);
    }
  }

  if (valueRequired(updateUser)) {
    const userData = await useSearch(updateUser);
    if (userData) {
      query.where("updateUser").in(userData);
    }
  }

  if (valueRequired(choiseModal) && valueRequired(modal)) {
    switch (choiseModal) {
      case "news": {
        const ids = await useNewsSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
      case "media": {
        const ids = await useMediaSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
    }
  }

  if (valueRequired(menu)) {
    const ids = await useMenuSearch(menu);
    if (ids && ids.length > 0) query.where("menu").in(ids);
  }

  if (valueRequired(categories)) {
    const ids = await useNewsCategories(categories);
    if (ids && ids.length > 0) query.where("categories").in(ids);
  }

  if (valueRequired(choisePage)) {
    const ids = await usePageSearch(choisePage);
    if (ids && ids.length > 0) query.where("page").in(ids);
  }

  if (valueRequired(footerMenu)) {
    const ids = await useFooterMenuSearch(footerMenu);
    if (ids && ids.length > 0) query.where("footerMenu").in(ids);
  }

  if (valueRequired(position)) {
    const ids = await usePositionSearch(position);
    if (ids && ids.length > 0) query.where("position").in(ids);
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

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("menu");
  query.populate("position");
  query.populate("footerMenu");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Page, result);
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
  const booleanFlds = [
    "status",
    "mainLink",
    "newsActive",
    "listActive",
    "pageActive",
    "pageParentActive",
    "listAdmissionActive",
    "admissionActive",
    "parentActive",
    "sideActive",
    "modalActive",
  ];

  const languageFlds = ["name", "pageInfo"];
  const {
    menu,
    position,
    footerMenu,
    categories,
    page: choisePage,
    status,
    mainLink,
    newsActive,
    listActive,
    pageActive,
    pageParentActive,
    listAdmissionActive,
    admissionActive,
    parentActive,
    sideActive,
    modalActive,
    choiseModal,
    modal,
    updateUser,
    createUser,
    admissionLink,
  } = userInput;

  const query = Page.find();

  languageFlds.map((el) => {
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

  if (valueRequired(status)) {
    if (status.split(",").length > 1) {
      query.where("status").in(status.split(","));
    } else query.where("status").equals(status);
  }

  if (valueRequired(mainLink)) {
    if (mainLink.split(",").length > 1) {
      query.where("mainLink").in(mainLink.split(","));
    } else query.where("mainLink").equals(mainLink);
  }

  if (valueRequired(newsActive)) {
    if (newsActive.split(",").length > 1) {
      query.where("newsActive").in(newsActive.split(","));
    } else query.where("newsActive").equals(newsActive);
  }

  if (valueRequired(listActive)) {
    if (listActive.split(",").length > 1) {
      query.where("listActive").in(listActive.split(","));
    } else query.where("listActive").equals(listActive);
  }

  if (valueRequired(pageActive)) {
    if (pageActive.split(",").length > 1) {
      query.where("pageActive").in(pageActive.split(","));
    } else query.where("pageActive").equals(pageActive);
  }

  if (valueRequired(pageParentActive)) {
    if (pageParentActive.split(",").length > 1) {
      query.where("pageParentActive").in(pageParentActive.split(","));
    } else query.where("pageParentActive").equals(pageParentActive);
  }

  if (valueRequired(listAdmissionActive)) {
    if (listAdmissionActive.split(",").length > 1) {
      query.where("listAdmissionActive").in(listAdmissionActive.split(","));
    } else query.where("listAdmissionActive").equals(listAdmissionActive);
  }

  if (valueRequired(parentActive)) {
    if (parentActive.split(",").length > 1) {
      query.where("parentActive").in(parentActive.split(","));
    } else query.where("parentActive").equals(parentActive);
  }

  if (valueRequired(sideActive)) {
    if (sideActive.split(",").length > 1) {
      query.where("sideActive").in(sideActive.split(","));
    } else query.where("sideActive").equals(sideActive);
  }

  if (valueRequired(modalActive)) {
    if (modalActive.split(",").length > 1) {
      query.where("modalActive").in(modalActive.split(","));
    } else query.where("modalActive").equals(modalActive);
  }

  if (valueRequired(choiseModal)) {
    if (choiseModal.split(",").length > 1) {
      query.where("choiseModal").in(choiseModal.split(","));
    } else query.where("choiseModal").equals(choiseModal);
  }

  if (valueRequired(createUser)) {
    const userData = await useSearch(createUser);
    if (userData) {
      query.where("createUser").in(userData);
    }
  }

  if (valueRequired(updateUser)) {
    const userData = await useSearch(updateUser);
    if (userData) {
      query.where("updateUser").in(userData);
    }
  }

  if (valueRequired(choiseModal) && valueRequired(modal)) {
    switch (choiseModal) {
      case "news": {
        const ids = await useNewsSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
      case "media": {
        const ids = await useMediaSearch(modal);
        if (ids && ids.length > 0) query.where("modal").equals(ids);
        break;
      }
    }
  }

  if (valueRequired(menu)) {
    const ids = await useMenuSearch(menu);
    if (ids && ids.length > 0) query.where("menu").in(ids);
  }

  if (valueRequired(categories)) {
    const ids = await useNewsCategories(categories);
    if (ids && ids.length > 0) query.where("categories").in(ids);
  }

  if (valueRequired(choisePage)) {
    const ids = await usePageSearch(choisePage);
    if (ids && ids.length > 0) query.where("page").in(ids);
  }

  if (valueRequired(footerMenu)) {
    const ids = await useFooterMenuSearch(footerMenu);
    if (ids && ids.length > 0) query.where("footerMenu").in(ids);
  }

  if (valueRequired(position)) {
    const ids = await usePositionSearch(position);
    if (ids && ids.length > 0) query.where("position").in(ids);
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

  query.select(select);
  query.populate("createUser");
  query.populate("updateUser");
  query.populate("menu");
  query.populate("position");
  query.populate("footerMenu");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();

  const pagination = await paginate(page, limit, Page, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const pages = await query.exec();

  return pages;
};

exports.multDeletePages = asyncHandler(async (req, res) => {
  const ids = req.queryPolluted.id;
  const finds = await Page.find({ _id: { $in: ids } });

  if (finds.length <= 0) {
    throw new MyError("Таны сонгосон өгөгдөлүүд байхгүй байна", 400);
  }

  finds.map(async (el) => {
    if (el && el.pictures)
      el.pictures(async (picture) => {
        await imageDelete(picture);
      });
  });

  const pages = await Page.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    pages,
  });
});

exports.getCount = asyncHandler(async (req, res, next) => {
  const count = await Page.count();
  res.status(200).json({
    success: true,
    data: count,
  });
});
