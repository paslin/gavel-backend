import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = 5000;
// Add this to server.ts (before app.listen)
app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany({ take: 1 }); // just fetch 1 record
    res.json({ status: "DB connected", sampleUser: users[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "DB connection failed", error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
