import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat-model.js";
import { User } from "../models/user-model.js";
import { Message } from "../models/message-model.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { cookieOption } from "../utils/features.js";

const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "FriendMe";
  const isMatch = secretKey === adminSecretKey;
  if (!isMatch) return next(new ErrorHandler("Invalid Admin Secret Key", 401));
  const token = jwt.sign(secretKey, adminSecretKey);

  return res
    .status(200)
    .cookie("friendMe-token-admin", token, {
      ...cookieOption,
      maxAge: 100 * 60 * 60,
    })
    .json({
      success: true,
      message: "Welcome Admin! ",
    });
});
const adminlogout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("friendMe-token-admin", "", { ...cookieOption, maxAge: 0 })
    .json({
      message: "Logout Successfully",
    });
});

const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await User.find();

  const transformUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        friends: friends,
        groups: groups,
      };
    })
  );

  return res.status(200).json({
    success: true,
    user: transformUsers,
  });
});

const getAllChat = TryCatch(async (req, res, next) => {
  const chats = Chat.find()
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformChat = await Promise.all(
    (
      await chats
    ).map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => {
          return {
            _id,
            name,
            avatar: avatar.url,
          };
        }),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  return res.status(200).json({
    success: true,
    chats: transformChat,
  });
});

const allMessages = TryCatch(async (req, res) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => {
      return {
        _id,
        attachments,
        content,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
          _id: sender?._id,
          name: sender?.name,
          avatar: sender?.avatar?.url,
        },
      };
    }
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});
const dashboardStats = TryCatch(async (req, res, next) => {
  const [groupsCount, UsersCount, MessagesCount, TotalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7days = new Date();
  last7days.setDate(last7days.getDate() - 7);

  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7days,
      $lte: today,
    },
  }).select("createdAt");

  const messages = new Array(7).fill(0);
  const daysinMilliSeconds = 1000 * 60 * 60 * 24;

  last7DaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / daysinMilliSeconds;

    const index = Math.floor(indexApprox);
    messages[6 - index]++;
  });
  const stats = {
    groupsCount,
    UsersCount,
    MessagesCount,
    TotalChatsCount,
    messagesChart: messages,
  };
  return res.status(200).json({
    success: true,
    stats,
  });
});

const getAdminData = TryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});
export {
  getAllUsers,
  getAllChat,
  allMessages,
  dashboardStats,
  adminlogout,
  adminLogin,
  getAdminData,
};
