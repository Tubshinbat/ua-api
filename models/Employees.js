const mongoose = require("mongoose");

const EmployeesSchema = new mongoose.Schema({
  status: {
    type: Boolean,
    enum: [true, false],
    default: false,
  },

  positions: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Position",
    },
  ],

  position: {
    type: Number,
  },

  phoneNumber: {
    type: String,
  },

  email: {
    type: String,
    match: [
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
      "Имэйл хаягаа буруу оруулсан байна",
    ],
  },

  eng: {
    about: {
      type: String,
    },

    name: {
      type: String,
    },

    degree: {
      type: String,
    },
  },

  mn: {
    about: {
      type: String,
    },

    name: {
      type: String,
    },

    degree: {
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

module.exports = mongoose.model("Employees", EmployeesSchema);
