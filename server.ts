import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb, getAllFaqs } from "./src/server/db";
import { startBot, bot } from "./src/server/bot";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Init DB and Bot
  initDb();
  startBot();

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/bot-info", async (req, res) => {
    try {
      const me = await bot.telegram.getMe();
      res.json({ status: "running", botInfo: me });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/faqs", (req, res) => {
    res.json(getAllFaqs());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
