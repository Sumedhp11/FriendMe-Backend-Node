const corsConfig = {
  origin: ["http://localhost:5173", process.env.CLIENT_URL],
  credentials: true,
};

const userToken = "friendMe-token";

export { corsConfig, userToken };
