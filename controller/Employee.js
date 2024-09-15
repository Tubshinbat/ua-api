const Employees = require("../models/Employees");
const MyError = require("../utils/myError");
const asyncHandler = require("express-async-handler");
const paginate = require("../utils/paginate");
const { imageDelete } = require("../lib/fileUpload");
const { valueRequired } = require("../lib/check");
const {
  RegexOptions,
  userSearch,
  usePositions,
} = require("../lib/searchOfterModel");

exports.createEmployee = asyncHandler(async (req, res) => {
  const language = req.cookies.language || "mn";
  req.body.status = !valueRequired(req.body.status) ? true : req.body.status;
  const { name, about, degree } = req.body;
  const fileds = ["name", "about", "degree"];

  console.log(req.body);

  req.body[language] = {
    name,
    about,
    degree,
  };

  fileds.map((el) => {
    delete req.body[el];
  });

  if (!valueRequired(req.body.email)) delete req.body.email;
  if (!valueRequired(req.body.phoneNumber)) delete req.body.phoneNumber;

  req.body.createUser = req.userId;

  const employee = await Employees.create(req.body);

  res.status(200).json({
    success: true,
    data: employee,
  });
});

exports.getEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;
  const userInput = req.query;

  //FIELDS
  let status = req.query.status || null;
  const stringDtl = ["phoneNumber", "email", "phoneNumber"];
  const stringLanguageFld = ["about", "name", "degree"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const positions = userInput["positions"];

  const query = Employees.find();

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

  if (valueRequired(positions)) {
    const reuslt = await usePositions(positions);
    if (reuslt) query.where("positions").in(reuslt);
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
  query.populate("positions");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Employees, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const employees = await query.exec();

  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees,
    pagination,
  });
});

exports.changePosition = asyncHandler(async (req, res) => {
  const employees = req.body.data;

  if (!employees) throw new MyError("Дата илгээгүй байна.", 404);
  const positionChange = (datas) => {
    datas.map(async (el, index) => {
      const data = {
        position: index,
      };
      await Employees.findByIdAndUpdate(el.key, data);
    });
  };

  positionChange(employees);
  res.status(200).json({
    success: true,
  });
});

exports.excelData = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  let sort = req.query.sort || { createAt: -1 };
  const select = req.query.select;

  //FIELDS
  let status = req.query.status || null;
  const stringDtl = ["phoneNumber", "email", "phoneNumber"];
  const stringLanguageFld = ["about", "name", "degree"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const positions = userInput["positions"];

  const query = Employees.find();

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

  if (valueRequired(positions)) {
    const positions = await usePositions(positions);
    if (positions) query.where("positions").in(positions);
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
  query.populate("positions");

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();
  const pagination = await paginate(page, limit, Employees, result);
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

exports.getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employees.findById(req.params.id)
    .populate("positions")
    .populate("createUser")
    .populate("updateUser");

  if (!employee) {
    throw new MyError("Тухайн өгөгдөл олдсонгүй. ", 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

exports.getSlugEmployee = asyncHandler(async (req, res) => {
  const employee = await Employees.findOne({ slug: req.params.slug })
    .populate("positions")
    .populate("createUser")
    .populate("updateUser");

  if (!employee) {
    throw new MyError("Тухайн өгөгдөл олдсонгүй. ", 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  let employee = await Employees.findById(req.params.id);

  if (!employee) {
    throw new MyError("Тухайн өгөгдөл байхгүй байна. ", 404);
  }

  const language = req.cookies.language || "mn";
  const { name, about, degree } = req.body;
  ["name", "about", "degree", "language"].map((el) => delete req.body[el]);

  req.body[language] = {
    name,
    about,
    degree,
  };

  req.body.updateAt = new Date();
  req.body.updateUser = req.userId;

  employee = await Employees.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: employee,
  });
});

const getFullData = async (req, page) => {
  const limit = 25;
  const select = req.query.select;
  let sort = req.query.sort || { createAt: -1 };

  //FIELDS
  let status = req.query.status || null;
  const stringDtl = ["phoneNumber", "email", "phoneNumber"];
  const stringLanguageFld = ["about", "name", "degree"];
  const createUser = userInput["createUser"];
  const updateUser = userInput["updateUser"];
  const positions = userInput["positions"];

  const query = Employees.find();

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

  if (valueRequired(positions)) {
    const positions = await usePositions(positions);
    if (positions) query.where("positions").in(positions);
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
  query.populate({ path: "createUser", select: "firstName -_id" });
  query.populate({ path: "createUser", select: "firstName -_id" });
  query.populate({ path: "positions" });

  const qc = query.toConstructor();
  const clonedQuery = new qc();
  const result = await clonedQuery.count();

  const pagination = await paginate(page, limit, Employees, result);
  query.limit(limit);
  query.skip(pagination.start - 1);
  const employees = await query.exec();

  return employees;
};

exports.getCountEmployee = asyncHandler(async (req, res) => {
  const emloyees = await Employees.count();
  res.status(200).json({
    success: true,
    data: emloyees,
  });
});

exports.multDeleteEmployee = asyncHandler(async (req, res) => {
  const ids = req.queryPolluted.id;
  const finds = await Employees.find({ _id: { $in: ids } });

  if (finds.length <= 0) {
    throw new MyError("Таны сонгосон өгөгдөлүүд байхгүй байна", 400);
  }

  finds.map(async (el) => {
    await imageDelete(el.picture);
  });

  const employees = await Employees.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    employees,
  });
});
