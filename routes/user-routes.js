import express from "express";
import {
  getmyProfile,
  login,
  newUser,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  notifications,
  getMyFriends,
} from "../controllers/user-controller.js";
import { singleAvatar } from "../middlewares/multer-config.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  loginValidator,
  registerValidator,
  validateHandler,
} from "../lib/validators.js";

const Router = express.Router();

Router.post(
  "/new",
  singleAvatar,
  registerValidator(),
  validateHandler,
  newUser
);
Router.post("/login", loginValidator(), validateHandler, login);
// Authenticated Routes
Router.use(isAuthenticated);
Router.get("/me", getmyProfile);
Router.get("/logout", logout);
Router.get("/search", searchUser);
Router.put("/send-request", sendFriendRequest);
Router.put("/accept-request", acceptFriendRequest);
Router.get("/notifications", notifications);
Router.get("/friends", getMyFriends);

export default Router;
