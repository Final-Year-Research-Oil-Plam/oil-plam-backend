// @ts-nocheck
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// 🔹 Configure Cloudinary (use env variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "oil-palm-bunches", 
    allowed_formats: ["jpg", "jpeg", "png"],
    resource_type: "image",
  },
});

// 🔹 Multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

module.exports = upload;
