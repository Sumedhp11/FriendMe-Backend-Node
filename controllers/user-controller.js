import { compare } from "bcrypt";
import { User } from "../models/user-model.js";
import { Chat } from "../models/chat-model.js";
import { Request } from "../models/request-model.js";
import { cookieOption, emitEvent, sendToken } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/Helper.js";
import { uploadFilesToCloudinary } from "../utils/features.js";
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;
  const file = req.file;
  console.log(file);
  if (!file) return next(new ErrorHandler("Please upload Avatar", 400));

  const result = await uploadFilesToCloudinary([file]);
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });
  sendToken(res, user, 201, "User Created");
});
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user) return next(new ErrorHandler("User Not Found!", 404));
  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid Credentials", 400));
  }
  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});

const getmyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(ErrorHandler("User Not Found", 404));
  return res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("friendMe-token", "", { ...cookieOption, maxAge: 0 })
    .json({
      message: "Logout Sucessfully",
    });
});
const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;

  const myChats = await Chat.find({
    groupChat: false,
    members: req.user,
  });

  const allUsersFromMychats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMychats },
    name: { $regex: name, $options: "i" },
  });
  console.log(allUsersExceptMeAndFriends);
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    data: users,
  });
});
const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      {
        sender: userId,
        receiver: req.user,
      },
    ],
  });
  if (request) return next(new ErrorHandler("Request Already Sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });
  emitEvent(req, NEW_REQUEST, [userId]);
  return res.status(200).json({
    message: "Friend Request Sent Sucessfully",
  });
});
const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request Not Found!", 404));
  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are Not Authorized to Accept Friend Request", 401)
    );
  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      message: "Friend Request Rejected  Sucessfully",
    });
  }
  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);
  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted Successfully ",
    senderId: request.sender._id,
  });
});

const notifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );
  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  return res.status(200).json({
    success: true,
    allRequests,
  });
});
const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
    if (!otherUser) return next(new ErrorHandler("No Friends Found", 400));
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });
  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export {
  login,
  newUser,
  getmyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  notifications,
  getMyFriends,
};
