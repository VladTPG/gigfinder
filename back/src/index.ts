import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { run } from "./config/mongo.ts";
const app = new Application();
const router = new Router();

// Basic health check endpoint
router.get("/", (ctx) => {
  ctx.response.body = "Server is running!";
});

// Add your routes here

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:5000");

async function startServer() {
  try {
    await run();

    app.listen({ port: 5000 });
    console.log(`Server running on 5000`);
  } catch (error) {
    console.error("Failed to start server:", error);
    Deno.exit(1);
  }
}

startServer();
