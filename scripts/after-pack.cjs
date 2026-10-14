// electron-builder runs this after it has assembled the app folder and before
// it wraps it into the installer. It copies Questline's server in as-is:
// electron-builder's own resource copying leaves out every node_modules folder,
// and the server can't run without its (small, traced) node_modules.

const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const from = path.join(__dirname, "..", "desktop-build", "server");
  const to = path.join(context.appOutDir, "resources", "server");
  if (!fs.existsSync(path.join(from, "server.js"))) {
    throw new Error("desktop-build/server is missing. Run `npm run app:build:server` first.");
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`  • copied Questline server into ${path.relative(process.cwd(), to)}`);
};
