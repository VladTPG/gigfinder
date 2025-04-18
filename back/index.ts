import { Application, Router } from "https://deno.land/x/oak/mod.ts";

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
await app.listen({ port: 5000 });
