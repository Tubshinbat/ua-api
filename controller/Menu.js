const asyncHandler = require("express-async-handler");
const MyError = require("../utils/myError");
const { valueRequired } = require("../lib/check");
const Menu = require("../models/Menu");
const { slugify } = require("transliteration");
const Page = require("../models/Page");
const News = require("../models/News");
const Employee = require("../models/Employees");

exports.createMenu = asyncHandler(async (req, res) => {
  const language = req.cookies.language || "mn";
  const parentId = req.body.parentId || null;
  const { name, short } = req.body;

  let position = 0;

  if (!valueRequired(name)) {
    throw new MyError("Цэсний нэрийг оруулна уу", 500);
  }

  if (valueRequired(parentId)) {
    const category = await Menu.findOne({ parentId }).sort({
      position: -1,
    });
    if (category) {
      position = category.position + 1;
    }
  } else {
    const category = await Menu.findOne({ parentId: null }).sort({
      position: -1,
    });
    if (valueRequired(category)) {
      position = category.position + 1;
    }
  }

  req.body.position = position;
  req.body[language] = {
    name,
    short,
  };

  const nameUnique = await Menu.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  const category = await Menu.create(req.body);

  res.status(200).json({
    success: true,
    data: category,
  });
});

function createCategories(categories, parentId = null) {
  const categoryList = [];
  let category = null;

  if (!valueRequired(parentId)) {
    category = categories.filter((cat) => cat.parentId == undefined);
  } else {
    category = categories.filter((cat) => cat.parentId == parentId);
  }

  for (let cate of category) {
    categoryList.push({
      _id: cate._id,
      mn: {
        ...cate.mn,
      },
      eng: {
        ...cate.eng,
      },
      slug: cate.slug,
      isModel: cate.isModel,
      isDirect: cate.isDirect,
      direct: cate.direct,
      model: cate.model,
      picture: cate.picture || null,
      position: cate.position,
      children: createCategories(categories, cate._id),
    });
  }

  return categoryList;
}

exports.getMenus = asyncHandler(async (req, res, next) => {
  Menu.find({})
    .sort({ position: 1 })
    .exec((error, categories) => {
      if (error)
        return res.status(400).json({
          success: false,
          error,
        });
      if (categories) {
        const categoryList = createCategories(categories);

        res.status(200).json({
          success: true,
          data: categoryList,
        });
      }
    });
});

exports.getMenu = asyncHandler(async (req, res, next) => {
  const menu = await Menu.findById(req.params.id);

  if (!menu) {
    throw new MyError(req.params.id + " Тус мэдээний ангилал олдсонгүй.", 404);
  }

  res.status(200).json({
    success: true,
    data: menu,
  });
});

exports.getSlugMenu = asyncHandler(async (req, res) => {
  let menu = await Menu.findOne({ slug: req.params.slug });

  let parentMenu = null;
  let childeMenus = null;
  let sameParentMenus = null;
  let news = null;
  let position = null;

  childeMenus = await Menu.find({ status: true })
    .where("parentId")
    .in(menu._id);
  if (menu.parentId) {
    sameParentMenus = await Menu.find({ status: true })
      .where("parentId")
      .in(menu.parentId);
    parentMenu = await Menu.findById(menu.parentId);
  }

  let page = await Page.find({ status: true }).where("menu").in(menu._id);
  if (valueRequired(page)) {
    news = await News.find({}).where("categories").in(page[0].categories);
    position = await Employee.find({})
      .where("positions")
      .in(page[0].position)
      .sort({ position: 1 });
  }

  res.status(200).json({
    success: true,
    data: menu,
    parent: parentMenu,
    page,
    childeMenus,
    sameParentMenus,
    position,
  });
});

const parentCheck = (menus) => {
  menus.map(async (menu) => {
    const result = await Menu.find({ parentId: menu._id });
    if (result && result.length > 0) {
      parentCheck(result);
    }
    await Menu.findByIdAndDelete(menu._id);
  });
};

exports.deletetMenu = asyncHandler(async (req, res, next) => {
  const category = await Menu.findById(req.params.id);
  if (!category) {
    throw new MyError(req.params.id + " ангилал олдсонгүй", 404);
  }
  const parentMenus = await Menu.find({ parentId: req.params.id });

  if (parentMenus) {
    parentCheck(parentMenus);
  }

  category.remove();

  res.status(200).json({
    success: true,
    data: category,
  });
});

exports.changePosition = asyncHandler(async (req, res) => {
  const menus = req.body.data;

  if (!menus && menus.length > 0) {
    throw new MyError("Дата илгээгүй байна дахин шалгана уу", 404);
  }

  const positionChange = (categories, pKey = null) => {
    if (categories) {
      categories.map(async (el, index) => {
        const data = {
          position: index,
          parentId: pKey,
        };
        await Menu.findByIdAndUpdate(el.key, data);
        if (el.children && el.children.length > 0) {
          const parentKey = el.key;
          positionChange(el.children, parentKey);
        }
      });
    }
  };

  positionChange(menus);

  res.status(200).json({
    success: true,
  });
});

exports.updateMenu = asyncHandler(async (req, res) => {
  if (!valueRequired(req.body.name)) {
    throw new MyError("Талбарыг бөгөлнө үү", 400);
  }

  const result = await Menu.findById(req.params.id);

  if (!result) {
    throw new MyError("Өгөгдөл олдсонгүй дахин оролдоно үү", 404);
  }

  const { name, short } = req.body;
  const language = req.cookies.language || "mn";

  const nameUnique = await Menu.find({ slug: slugify(name) });

  if (nameUnique.length > 0) {
    const count = nameUnique.length + 1;
    req.body.slug = slugify(name) + "_" + count;
  } else {
    req.body.slug = slugify(name);
  }

  req.body[language] = {
    name,
    short,
  };

  const category = await Menu.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new MyError("Ангилалын нэр солигдсонгүй", 400);
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

exports.getCountMenu = asyncHandler(async (req, res, next) => {
  const count = await Menu.count();
  res.status(200).json({
    success: true,
    data: count,
  });
});
