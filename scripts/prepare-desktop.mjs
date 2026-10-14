// Turns the Next.js standalone build into the server folder the desktop app
// ships with: desktop-build/server. Run by `npm run app:build` after `next build`.
//
// It copies .next/standalone with every symlink/junction replaced by a real
// copy (Windows junctions point at absolute paths on THIS computer, so they'd
// break on anyone else's), adds the static files the standalone server
// doesn't include by itself, and stops if a database or secret slipped in.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const out = path.join(root, "desktop-build", "server");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error('No standalone build found. Run `next build` first (next.config.ts needs output: "standalone").');
  process.exit(1);
}

// Files that must never end up inside an installer someone else downloads.
const forbidden = (file) => /(^|[\\/])data([\\/]|$)|\.db(-wal|-shm)?$|(^|[\\/])\.env/.test(file);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(standalone, out, {
  recursive: true,
  dereference: true, // copy what links point to, not the links themselves
  filter: (src) => !forbidden(path.relative(standalone, src)),
});
fs.cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) {
  fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
}

// The desktop app starts the server through this launcher. It keeps a pipe
// open to the app; if the app disappears for any reason (even a crash), the
// pipe closes and the launcher stops the server instead of leaving it running.
fs.writeFileSync(
  path.join(out, "questline-launcher.cjs"),
  `// Started by the Questline desktop app. Stops the server when the app goes away.
process.stdin.on("end", () => process.exit(0));
process.stdin.resume();
require("./server.js");
`,
);

// Double-check the result: no links, no databases, no env files.
const problems = [];
(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(out, full);
    if (fs.lstatSync(full).isSymbolicLink()) problems.push(`link: ${rel}`);
    else if (forbidden(rel)) problems.push(`private file: ${rel}`);
    else if (entry.isDirectory()) scan(full);
  }
})(out);

if (problems.length > 0) {
  console.error("Refusing to package the desktop app:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Desktop server ready in ${path.relative(root, out)}`);
