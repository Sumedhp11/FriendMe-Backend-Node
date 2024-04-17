import { config } from "dotenv";

config();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL,
];

const corsConfig = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const userToken = "friendMe-token";

export { corsConfig, userToken };
