const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: Number,
  data: [{ name: String, email: String, phone: Number, other_fields: {} }],
});

const userModel = mongoose.model("users", userSchema);

exports.userModel = userModel;
