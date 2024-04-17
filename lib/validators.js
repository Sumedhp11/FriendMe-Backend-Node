import { body, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
  body("bio", "Please Enter Bio").notEmpty(),
];
const loginValidator = () => [
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter Password").notEmpty(),
];
const newGroupChatValidator = () => [
  body("name", "Please Enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter member")
    .isArray({ min: 2, max: 50 })
    .withMessage("Members Must be 2-50"),
];
const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  console.log(errors);
  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");
  if (errors.isEmpty()) return next();
  else {
    next(new ErrorHandler(errorMessages, 400));
  }
};
export {
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupChatValidator,
};
