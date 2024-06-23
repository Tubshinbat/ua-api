const mongoose = require("mongoose");
const { slugify } = require("transliteration");

const PositionSchema = new mongoose.Schema({
  status: {
    type: Boolean,
    enum: [true, false],
    default: false,
  },
  slug: String,

  mn: {
    name: {
      type: String,
    },

    about: {
      type: String,
    },
  },

  eng: {
    name: {
      type: String,
    },

    about: {
      type: String,
    },
  },

  picture: {
    type: String,
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

module.exports = mongoose.model("Position", PositionSchema);
