// A tiny API for the desktop app's tray menu (Electron lives outside the web
// page, so it can't call Server Actions): GET the tracker's status, or POST
// {"tracking": true | false} to start or pause it.
//
// Every request must carry the "x-questline: 1" header. A web page open in
// your browser can't add custom headers to requests to another site, so it
// can't secretly switch your tracker on or off.

import { setTracking, trackerStatus } from "@/lib/tracker/tracker";

function allowed(request: Request) {
  return request.headers.get("x-questline") === "1";
}

export async function GET(request: Request) {
  if (!allowed(request)) return new Response("Forbidden", { status: 403 });
  return Response.json(trackerStatus());
}

export async function POST(request: Request) {
  if (!allowed(request)) return new Response("Forbidden", { status: 403 });
  const body = (await request.json().catch(() => null)) as { tracking?: unknown } | null;
  if (typeof body?.tracking !== "boolean") return new Response("Expected {\"tracking\": true | false}", { status: 400 });
  return Response.json(setTracking(body.tracking));
}
