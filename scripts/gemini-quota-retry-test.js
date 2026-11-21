#!/usr/bin/env node

import fs from "node:fs";

fs.appendFileSync(
  "/tmp/gemini-quota-retry-debug.log",
  new Date().toISOString() + " - HOOK EXECUTED\n"
);

console.error("[Quota Retry] HOOK EXECUTED!");

console.log(JSON.stringify({}));