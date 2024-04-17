import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat-model.js";
import { User } from "../models/user-model.js";
import { Message } from "../models/message-model.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/Helper.js";

const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user];
  if (allMembers.length < 2)
    return next(
      new ErrorHandler("Group Chat must have at least 3 members", 400)
    );
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome To ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created",
  });
});

const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chat: transformedChats,
  });
});

const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");
  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));
  return res.status(200).json({
    success: true,
    chat: groups,
  });
});

const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  if (!members || members.length < 1)
    return next(new ErrorHandler("Please Provide Members", 400));
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a GroupChat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You Are Not Allowed To Add Members", 403));

  const allnewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allnewMembers = await Promise.all(allnewMembersPromise);
  const allChatMembers = chat.members.map((i) => i.toString());
  const uniqueMembers = allnewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...allnewMembers.map((i) => i._id));
  if (chat.members.length > 50)
    return next(new ErrorHandler("Group Member limit Reached", 400));

  await chat.save();
  const allUsersName = allnewMembers.map((i) => i.name).join(",");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added in the group`
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);
  return res.status(200).json({
    success: true,
    message: "Members Added Successfully",
  });
});

const removeMembers = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, userThatwillbeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a GroupChat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You Are Not Allowed To Remove Members", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatwillbeRemoved.name} has been Removed From the Group`
  );
  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Member Removed Successfully",
  });
});
const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  const remainingmember = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );
  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingmember.length);
    const newCreator = remainingmember[randomElement];
    chat.creator = newCreator;
  }
  chat.members = remainingmember;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${user.name} has been left From the Group`
  );

  return res.status(200).json({
    success: true,
    message: "Member Left Successfully",
  });
});

const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("Please Provide Attachments", 400));
  if (files.length > 5)
    returnnext(new ErrorHandler("More than 5 Files Not Allowed", 400));

  const attachments = await uploadFilesToCloudinary(files);

  const messageForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chatId,
  };
  const messageForDb = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };
  const message = await Message.create(messageForDb);
  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message: message,
  });
});

const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});
const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is Not a Group Chat", 403));
  if (chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You Are Not Allowed To Rename the Group ", 403)
    );
  chat.name = name;
  await chat.save();
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group Renamed Successfully",
  });
});

const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are Not Allowed To Delete The Chat", 403)
    );
  }
  if (!chat.groupChat && !members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are Not Allowed To Delete The Chat", 403)
    );
  }
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });
  const public_ids = [];
  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });
  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Chat Deleted Sucessfully",
  });
});

const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat Not Found", 404));
  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not a Member to Access this GroupChat", 401)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name ")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage);
  return res.status(200).json({
    success: true,
    message: messages.reverse(),
    totalPages,
  });
});
export {
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
};
