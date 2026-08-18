#!/usr/bin/env node
// Runs Vite and the local api/ stand-in (scripts/dev-api.mjs) as one command.
//
// Before this existed, `npm run dev` only started Vite — dev-api.mjs needed
// its own terminal (`npm run dev:api`), which is easy to forget. Anything
// that launches "npm run dev" as a single process (this session's own
// preview tool included) got a dead /api proxy every time, surfacing as
// vite.config.ts's "Local API is not running" 503 on every AI call. One
// command, two child processes, is the fix — not a reminder to open a
// second terminal.
//
//   npm run dev          # Vite (5173) + dev-api (8745), both in this shell
//   npm run dev:web      # Vite only, old behavior, for when 8745 is
//                         # already running elsewhere (e.g. a second copy)
//   npm run dev:api      # dev-api only, unchanged

import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

function run(name, command, args) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const tag = `[${name}]`;
  const pipe = (stream, out) => {
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim()) out.write(`${tag} ${line}\n`);
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    // One process dying (a syntax error in an api/*.js file, Vite's port
    // taken, ...) leaves the other half-working and confusing. Take both
    // down together so the failure is loud, not a silent half-broken dev
    // server.
    console.error(`${tag} exited (code ${code}) — stopping the other process too.`);
    shutdown(code || 1);
  });
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", "node", ["scripts/dev-api.mjs"]);
run("vite", "npx", ["vite"]);
