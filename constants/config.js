const corsConfig = {
  origin: ["http://localhost:8080", process.env.CLIENT_URL],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const userToken = "friendMe-token";

export { corsConfig, userToken };
