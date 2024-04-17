import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { userToken } from "../constants/config.js";
import { User } from "../models/user-model.js";

const isAuthenticated = async (req, res, next) => {
  const token = req.cookies[userToken];
  if (!token)
    return next(new ErrorHandler("Please Login to Access this Route", 401));
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decodedData._id;
  next();
};
const adminOnly = async (req, res, next) => {
  const token = req.cookies["friendMe-token-admin"];
  if (!token)
    return next(new ErrorHandler("Only Admin Can Access this Route", 401));
  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "FriendMe";
  const isMatch = secretKey === adminSecretKey;
  if (!isMatch) return next(new ErrorHandler("Invalid Admin Key", 401));
  next();
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next();
    const authToken = socket.request.cookies[userToken];
    if (!authToken)
      return next(new ErrorHandler("Please Login to Access this Route", 401));

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = (socket.user = await User.findById(decodedData._id));
    if (!user)
      return next(new ErrorHandler("Please Login to access this Route", 401));
    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please Login to access this Route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticator };
