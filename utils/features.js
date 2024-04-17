import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/Helper.js";

const cookieOption = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};
const connectDB = (uri) => {
  mongoose
    .connect(uri)
    .then((data) => {
      console.log(`Connected to DB : ${data.connection.host}`);
    })
    .catch((err) => {
      throw err;
    });
};
const disconnectDb = async () => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from the database");
  } catch (error) {
    console.error("Error disconnecting from the database:", error);
    process.exit(1);
  }
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  return res.status(code).cookie("friendMe-token", token, cookieOption).json({
    success: true,
    user,
    message,
  });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        { resource_type: "auto", public_id: uuid() },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const formattedResult = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResult;
  } catch (error) {
    console.log(error);
    throw new Error("Error Uploading Files to cloudinary");
  }
};

const deleteFilesFromCloudinary = async (public_ids) => {};
export {
  connectDB,
  disconnectDb,
  sendToken,
  cookieOption,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
};
