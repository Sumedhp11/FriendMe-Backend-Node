import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
} from "../controllers/chat-controller.js";
import { attachmentsMulter } from "../middlewares/multer-config.js";
import { newGroupChatValidator, validateHandler } from "../lib/validators.js";

const Router = express.Router();

// Authenticated Routes
Router.use(isAuthenticated);
Router.post("/new", newGroupChatValidator(), validateHandler, newGroupChat);
Router.get("/my", getMyChats);
Router.get("/my/groups", getMyGroups);
Router.put("/addmembers", addMembers);
Router.put("/remove", removeMembers);
Router.delete("/leave/:id", leaveGroup);
Router.post("/message", attachmentsMulter, sendAttachments);
Router.get("/message/:id", getMessages);
Router.route("/:id").get(getChatDetails).put(renameGroup).delete(deleteChat);

export default Router;
