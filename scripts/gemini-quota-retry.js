#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const WAIT_MS = 70_000;
const MAX_RETRIES = 10;
const TRANSCRIPT_TAIL_LINES = 10;

const LOG_FILE_NAME = "gemini-quota-retry-error.log";
const STATE_FILE_NAME = "gemini-quota-retry-state.json";

// --------------------------------------------------
// LOCATIONS
// --------------------------------------------------

function getLocations(fileName) {
  const locations = [];

  try {
    const dir = os.tmpdir();
    if (dir) locations.push(path.join(dir, fileName));
  } catch {}

  try {
    const dir = os.homedir();
    if (dir) locations.push(path.join(dir, fileName));
  } catch {}

  locations.push("/tmp/" + fileName);

  return [...new Set(locations)];
}

const LOG_LOCATIONS = getLocations(LOG_FILE_NAME);
const STATE_LOCATIONS = getLocations(STATE_FILE_NAME);

// --------------------------------------------------
// QUOTA ERROR PATTERNS
// --------------------------------------------------

const QUOTA_ERROR_PATTERNS = [
  /you exceeded your current quota/i,
  /quota exceeded/i,
  /resource[_\s-]+exhausted/i,
  /rate limit exceeded/i,
  /too many requests/i,
  /429\s*too many requests/i,
  /(?:429|quota|rate limit).{0,150}(?:exceeded|exhausted|limit)/i,
  /(?:exceeded|exhausted).{0,150}(?:429|quota|rate limit)/i,
];

// --------------------------------------------------
// LOGGING
// --------------------------------------------------

function writeErrorLog(...args) {
  try {
    const timestamp = new Date().toISOString();

    const message = args.map(arg => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }

      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }

      return String(arg);
    }).join(" ");

    const entry = `[${timestamp}] ${message}\n`;

    for (const file of LOG_LOCATIONS) {
      try {
        fs.appendFileSync(file, entry, "utf8");
        return;
      } catch {}
    }
  } catch {}
}

// --------------------------------------------------
// SESSION IDENTIFICATION
// --------------------------------------------------

function getSessionKey(data) {
  const identifier =
    data.session_id ||
    data.transcript_path ||
    "default-session";

  return crypto
    .createHash("sha256")
    .update(String(identifier))
    .digest("hex");
}

// --------------------------------------------------
// RETRY STATE
// --------------------------------------------------

function loadRetryCount(sessionKey) {
  for (const file of STATE_LOCATIONS) {
    try {
      if (!fs.existsSync(file)) continue;

      const state = JSON.parse(
        fs.readFileSync(file, "utf8")
      );

      return Number(state[sessionKey]) || 0;
    } catch {}
  }

  return 0;
}

function saveRetryCount(sessionKey, count) {
  const state = {};

  for (const file of STATE_LOCATIONS) {
    try {
      if (fs.existsSync(file)) {
        Object.assign(
          state,
          JSON.parse(fs.readFileSync(file, "utf8"))
        );
        break;
      }
    } catch {}
  }

  state[sessionKey] = count;

  for (const file of STATE_LOCATIONS) {
    try {
      fs.writeFileSync(
        file,
        JSON.stringify(state, null, 2),
        "utf8"
      );

      return true;
    } catch {}
  }

  writeErrorLog(
    "[Quota Retry] WARNING: Could not save retry state."
  );

  return false;
}

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function output(data = {}) {
  process.stdout.write(JSON.stringify(data) + "\n");
}

function stringifyContent(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isQuotaError(text) {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }

  const lines = text.trim().split(/\r?\n/);
  const lastNineLines = lines.slice(-9).join("\n");

  const quotaPatterns = [
    /you exceeded your current quota/i,
    /quota exceeded/i,
    /resource_exhausted/i,
    /rate limit exceeded/i,
    /too many requests/i,
    /429\s*too many requests/i,
    /please wait and try again later\./i
  ];

  const found1 = quotaPatterns.some(pattern =>
    pattern.test(lastNineLines)
  );
  const foudn2 = QUOTA_ERROR_PATTERNS.some(pattern =>
    pattern.test(text)
  );
  return found1 && foudn2;
}

// --------------------------------------------------
// READ RECENT TRANSCRIPT CONTENT
// --------------------------------------------------

function readRecentTranscript(transcriptPath) {
  if (!transcriptPath) {
    writeErrorLog(
      "[Quota Retry] No transcript path provided."
    );

    return "";
  }

  try {
    if (!fs.existsSync(transcriptPath)) {
      writeErrorLog(
        "[Quota Retry] Transcript does not exist."
      );

      return "";
    }

    const content = fs.readFileSync(
      transcriptPath,
      "utf8"
    );

    const lines = content
      .split(/\r?\n/)
      .filter(line => line.trim());

    const recentLines = lines.slice(
      -TRANSCRIPT_TAIL_LINES
    );

    const recentContent = recentLines.map(line => {
      try {
        return JSON.stringify(JSON.parse(line));
      } catch {
        return line;
      }
    }).join("\n");

    writeErrorLog(
      "[Quota Retry] Recent transcript lines:",
      recentLines.length
    );

    return recentContent;

  } catch (error) {
    writeErrorLog(
      "[Quota Retry] Transcript read error:",
      error.message
    );

    return "";
  }
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  writeErrorLog("[Quota Retry] Hook started.");

  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk.toString();
  }

  if (!input.trim()) {
    writeErrorLog("[Quota Retry] Empty input.");
    output();
    return;
  }

  let data;

  try {
    data = JSON.parse(input);
  } catch (error) {
    writeErrorLog(
      "[Quota Retry] Invalid JSON:",
      error.message
    );

    output();
    return;
  }

  writeErrorLog(
    "[Quota Retry] Event:",
    data.hook_event_name
  );

  writeErrorLog(
    "[Quota Retry] Stop hook active:",
    data.stop_hook_active
  );

  // ------------------------------------------------
  // CHECK EVENT
  // ------------------------------------------------

  if (data.hook_event_name !== "AfterAgent") {
    writeErrorLog("[Quota Retry] Ignoring event.");
    output();
    return;
  }

  // ------------------------------------------------
  // SESSION
  // ------------------------------------------------

  const sessionKey = getSessionKey(data);

  let retryCount = loadRetryCount(sessionKey);

  // ------------------------------------------------
  // CHECK CURRENT RESPONSE
  // ------------------------------------------------

  const response = stringifyContent(
    data.prompt_response
  );

  writeErrorLog(
    "[Quota Retry] Response length:",
    response.length
  );

  let quotaDetected = isQuotaError(response);

  if (quotaDetected) {
    writeErrorLog(
      "[Quota Retry] Quota error found in prompt_response."
    );
  }

  // ------------------------------------------------
  // CHECK RECENT TRANSCRIPT IF NECESSARY
  // ------------------------------------------------

  if (!quotaDetected) {
    const recentTranscript = readRecentTranscript(
      data.transcript_path
    );

    quotaDetected = isQuotaError(recentTranscript);

    if (quotaDetected) {
      writeErrorLog(
        "[Quota Retry] Quota error found in recent transcript."
      );
    }
  }

  // ------------------------------------------------
  // NO QUOTA ERROR
  // ------------------------------------------------

  if (!quotaDetected) {
    writeErrorLog(
      "[Quota Retry] No quota error detected. Normal completion."
    );

    if (retryCount > 0) {
      saveRetryCount(sessionKey, 0);

      writeErrorLog(
        "[Quota Retry] Retry counter reset."
      );
    }

    output();
    return;
  }

  // ------------------------------------------------
  // QUOTA ERROR DETECTED
  // ------------------------------------------------

  writeErrorLog(
    "[Quota Retry] API QUOTA ERROR DETECTED!"
  );

  // ------------------------------------------------
  // MAXIMUM RETRIES
  // ------------------------------------------------

  if (retryCount >= MAX_RETRIES) {
    writeErrorLog(
      "[Quota Retry] Maximum retries reached:",
      MAX_RETRIES
    );

    output();
    return;
  }

  retryCount++;

  saveRetryCount(sessionKey, retryCount);

  writeErrorLog(
    "[Quota Retry] Retry attempt:",
    retryCount,
    "of",
    MAX_RETRIES
  );

  // ------------------------------------------------
  // WAIT
  // ------------------------------------------------

  writeErrorLog(
    "[Quota Retry] Waiting 70 seconds..."
  );

  await sleep(WAIT_MS);

  writeErrorLog(
    "[Quota Retry] Waiting complete."
  );

  // ------------------------------------------------
  // AUTOMATIC RETRY
  // ------------------------------------------------

  output({
    decision: "deny",
    reason:
      "CONTINUE: A temporary Gemini API quota error was detected. " +
      "The 70-second waiting period has elapsed. " +
      "Retry the ORIGINAL USER REQUEST from where you left off. " +
      "Do not ask the user for confirmation. " +
      "This is automatic retry attempt " +
      retryCount +
      " of " +
      MAX_RETRIES +
      "."
  });
}

// --------------------------------------------------
// EXECUTION
// --------------------------------------------------

main().catch(error => {
  writeErrorLog(
    "[Quota Retry] Fatal error:",
    error.stack || error.message
  );

  output();
});