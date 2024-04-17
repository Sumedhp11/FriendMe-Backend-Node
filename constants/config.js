const corsConfig = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const userToken = "friendMe-token";

export { corsConfig, userToken };
