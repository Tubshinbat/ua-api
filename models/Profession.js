const mongoose = require("mongoose");

const ProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, "Сургалтын гарчиг оруулна уу"],
  },
  slug: {
    type: String,
  },
  details: {
    type: String,
    trim: true,
    required: [true, "Сургалтын дэлгэрэнгүйг заавал оруулах ёстой"],
  },
  pictures: {
    type: [String],
  },

  language: {
    type: String,
    enum: ["mn", "eng"],
    default: "mn",
  },

  createAt: {
    type: Date,
    default: Date.now,
  },
  updateAt: {
    type: Date,
    default: Date.now,
  },
  createUser: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  updateUser: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("Profession", ProfessionSchema);
