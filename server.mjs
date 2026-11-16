import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";

const useLan = process.argv.includes("--lan");
const port = Number(process.env.PORT ?? 4173);
const host = useLan ? "0.0.0.0" : "127.0.0.1";
const files = new Set(["index.html", "styles.css", "ui.js", "game.js", "player-sprite.js", "world.js",
  "preview.html", "preview.css", "preview-data.js", "preview-stage.js", "preview.js",
  "assets/tha-phraya.png", "assets/tha-phraya-east-gate.png", "assets/dong-chedi.png", "assets/player-anchor.png", "assets/sprites.png",
  "assets/ruins-ranger.png", "assets/village-npcs.png", "assets/village-bridge.png", "assets/red-vortex.png",
  "assets/concepts/player-concepts.png", "assets/concepts/npc-concepts.png",
  "assets/concepts/monster-concepts.png"]);
const mime = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", png: "image/png" };
const clients = new Set();
const players = new Map();
const zoneWidths = new Map([["village", 2080], ["ruins", 1680]]);
const directions = new Set(["n", "ne", "e", "se", "s", "sw", "w", "nw"]);
const actions = new Set(["idle", "walk", "attack", "cast", "hit", "death"]);
const weapons = new Set(["rusty_sword", "bronze_sword"]);

function reply(response, status, message = "") {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff" });
  response.end(message);
}

function openStream(response) {
  if (clients.size >= 50) return reply(response, 503, "Room is full");
  response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff" });
  response.write("retry: 2000\n\n");
  clients.add(response);
  response.on("close", () => clients.delete(response));
}

async function postPresence(request, response) {
  const origin = request.headers.origin;
  if (origin && origin !== "http://" + request.headers.host) return reply(response, 403);
  if (!request.headers["content-type"]?.startsWith("application/json")) return reply(response, 415);

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1024) return reply(response, 413);
  }

  let position;
  try {
    position = JSON.parse(body);
  } catch {
    return reply(response, 400);
  }
  const { id, x, y, zone, dir, action, moving, level, weapon = "rusty_sword" } = position ?? {};
  if (typeof id !== "string" || !/^[a-f\d-]{32,36}$/i.test(id) ||
      !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > zoneWidths.get(zone) || y < 0 || y > 1120 ||
      !zoneWidths.has(zone) || !directions.has(dir) || !actions.has(action) || !weapons.has(weapon) ||
      typeof moving !== "boolean" || !Number.isSafeInteger(level) || level < 1 || level > 999) {
    return reply(response, 400);
  }

  if (!players.has(id) && players.size >= 50) return reply(response, 503);
  players.set(id, { state: { id, x, y, zone, dir, action, moving, level, weapon,
    name: "นักเดินทาง " + id.slice(0, 4).toUpperCase() }, seen: Date.now() });
  reply(response, 204);
}

async function handle(request, response) {
  const pathname = (request.url ?? "/").split("?")[0];
  if (pathname === "/api/players" && request.method === "GET") return openStream(response);
  if (pathname === "/api/presence" && request.method === "POST") return postPresence(request, response);
  if (request.method !== "GET" && request.method !== "HEAD") return reply(response, 405);
  const filename = pathname === "/" ? "index.html" : pathname === "/preview" ? "preview.html" : pathname.slice(1);
  if (!files.has(filename)) return reply(response, 404, "Not found");
  const location = new URL(filename, import.meta.url);
  const info = await stat(location).catch(() => null);
  if (!info?.isFile()) return reply(response, 404, "Not found");
  response.writeHead(200, {
    "Content-Type": mime[filename.split(".").at(-1)],
    "Content-Length": info.size,
    "Cache-Control": filename.endsWith(".png") ? "public, max-age=3600" : "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") return response.end();
  const stream = createReadStream(location);
  stream.on("error", () => response.destroy());
  response.on("close", () => stream.destroy());
  stream.pipe(response);
}

const server = createServer((request, response) => {
  handle(request, response).catch(() => {
    if (response.headersSent) response.destroy();
    else reply(response, 500);
  });
});

const ticker = setInterval(() => {
  const now = Date.now();
  for (const [id, player] of players) {
    if (now - player.seen > 3000) players.delete(id);
  }
  const message = "data: " + JSON.stringify([...players.values()].map((player) => player.state)) + "\n\n";
  for (const response of clients) {
    if (response.writableNeedDrain) continue;
    response.write(message);
  }
}, 180);
ticker.unref();

server.listen(port, host, () => {
  const address = server.address();
  console.log("Ayothaya Survival — http://127.0.0.1:" + address.port);
  if (useLan) {
    const addresses = Object.values(networkInterfaces()).flat().filter((entry) =>
      entry?.family === "IPv4" && !entry.internal);
    for (const entry of addresses) console.log("LAN — http://" + entry.address + ":" + address.port);
  }
});

