import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const distDir = path.join(backendRoot, "dist");
const entryPath = path.join(distDir, "server.js");

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(entryPath, 'import "../src/server.js";\n');

console.log("Created dist/server.js compatibility entry");
