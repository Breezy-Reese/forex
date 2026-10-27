import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDb, ensureIndexes } from "./db.js";

async function main() {
  const c = config();
  await ensureIndexes();
  const server = createApp().listen(c.PORT, () => {
    console.log(`Tradefix API listening on :${c.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
