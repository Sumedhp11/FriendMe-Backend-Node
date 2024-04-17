import express from "express";
import {
  getAllChat,
  getAllUsers,
  allMessages,
  dashboardStats,
  adminLogin,
  adminlogout,
  getAdminData,
} from "../controllers/admin-controller.js";
import { adminOnly } from "../middlewares/auth.js";
const Router = express.Router();

Router.post("/verify", adminLogin);
Router.get("/logout", adminlogout);

Router.use(adminOnly);
Router.get("/", getAdminData);
Router.get("/users", getAllUsers);
Router.get("/chats", getAllChat);
Router.get("/messages", allMessages);
Router.get("/stats", dashboardStats);

export default Router;
