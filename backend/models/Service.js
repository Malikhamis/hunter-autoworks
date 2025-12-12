const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  icon: { type: String },
  desc: { type: String },
  features: [String]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
