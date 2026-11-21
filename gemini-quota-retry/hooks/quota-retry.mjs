#!/usr/bin/env node

const ERROR_MARKER =
  "[API Error: You exceeded your current quota, please check your plan and billing details.";

const WAIT_MS = 70_000;

async function main() {
  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const data = JSON.parse(input);
  const response = data.prompt_response || "";

  if (!response.includes(ERROR_MARKER)) {
    console.log(JSON.stringify({}));
    return;
  }

  console.error("[Quota Retry] API quota error detected.");
  console.error("[Quota Retry] Waiting 70 seconds...");

  await new Promise(resolve => setTimeout(resolve, WAIT_MS));

  console.error("[Quota Retry] Retrying with 'continue'.");

  console.log(JSON.stringify({
    decision: "deny",
    reason: "continue"
  }));
}

main().catch(error => {
  console.error("[Quota Retry] Error:", error);
  console.log(JSON.stringify({}));
});