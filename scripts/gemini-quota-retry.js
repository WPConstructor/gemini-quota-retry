#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const WAIT_MS = 70_000;

const LOG_FILE_NAME = "gemini-quota-retry-error.log";

const LOG_LOCATIONS = [
  path.join(os.tmpdir(), LOG_FILE_NAME),
  path.join(os.homedir(), LOG_FILE_NAME),
];

const QUOTA_ERROR_PATTERNS = [
  /you exceeded your current quota/i,
  /quota exceeded/i,
  /resource_exhausted/i,
  /rate limit exceeded/i,
  /too many requests/i,
  /429\s*too many requests/i,
];

function writeErrorLog(...args) {
  const timestamp = new Date().toISOString();

  const message = args
    .map(arg => {
      if (arg instanceof Error) return arg.message;

      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }

      return String(arg);
    })
    .join(" ");

  const logEntry = `[${timestamp}] ${message}\n`;

  for (const logFile of LOG_LOCATIONS) {
    try {
      fs.appendFileSync(logFile, logEntry, "utf8");
      return;
    } catch {
      // Try the next available location.
    }
  }

  // Logging is optional. Never interrupt hook execution.
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function output(data = {}) {
  console.log(JSON.stringify(data));
}

function isQuotaError(text) {
  return QUOTA_ERROR_PATTERNS.some(pattern =>
    pattern.test(text)
  );
}

function readTranscript(transcriptPath) {
  if (!transcriptPath) {
    writeErrorLog("[Quota Retry] No transcript path provided.");
    return "";
  }

  try {
    if (!fs.existsSync(transcriptPath)) {
      writeErrorLog(
        "[Quota Retry] Transcript does not exist:",
        transcriptPath
      );

      return "";
    }

    const transcript = fs.readFileSync(
      transcriptPath,
      "utf8"
    );

    writeErrorLog(
      "[Quota Retry] Transcript loaded. Length:",
      transcript.length
    );

    return transcript;

  } catch (error) {
    writeErrorLog(
      "[Quota Retry] Transcript read error:",
      error.message
    );

    return "";
  }
}

async function main() {
  writeErrorLog("[Quota Retry] Hook started.");

  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk;
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
    "[Quota Retry] Prompt:",
    JSON.stringify(data.prompt)
  );

  writeErrorLog(
    "[Quota Retry] Prompt response:",
    JSON.stringify(data.prompt_response)
  );

  writeErrorLog(
    "[Quota Retry] Stop hook active:",
    data.stop_hook_active
  );

  if (data.hook_event_name !== "AfterAgent") {
    writeErrorLog("[Quota Retry] Ignoring event.");
    output();
    return;
  }

  if (data.stop_hook_active) {
    writeErrorLog(
      "[Quota Retry] Retry already attempted. Stopping."
    );

    output();
    return;
  }

  const response = data.prompt_response || "";

  let transcript = "";

  if (!response.trim()) {
    writeErrorLog(
      "[Quota Retry] Empty prompt_response. Checking transcript."
    );

    transcript = readTranscript(data.transcript_path);
  }

  const contentToCheck = response + "\n" + transcript;

  writeErrorLog(
    "[Quota Retry] Content to check length:",
    contentToCheck.length
  );

  if (!isQuotaError(contentToCheck)) {
    writeErrorLog(
      "[Quota Retry] No quota error detected."
    );

    output();
    return;
  }

  writeErrorLog(
    "[Quota Retry] API quota error detected!"
  );

  writeErrorLog(
    "[Quota Retry] Waiting 70 seconds..."
  );

  await sleep(WAIT_MS);

  writeErrorLog(
    "[Quota Retry] Waiting complete. Requesting automatic retry."
  );

  output({
    decision: "deny",
    reason:
      "CONTINUE: The previous attempt failed because of a temporary Gemini API quota limit. " +
      "The 70-second waiting period has now elapsed. " +
      "Please continue the ORIGINAL USER REQUEST from where you left off. " +
      "Do not ask the user for confirmation. Retry the task now."
  });
}

main().catch(error => {
  writeErrorLog(
    "[Quota Retry] Fatal error:",
    error.stack || error.message
  );

  output();
});