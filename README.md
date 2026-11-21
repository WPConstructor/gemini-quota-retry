# Gemini CLI Quota Retry

Automatically retries Gemini CLI requests when an API quota
error is detected.

## Features

- Detects API quota errors.
- Waits 70 seconds.
- Automatically retries with "continue".
- Repeats if another quota error occurs.
- No dependencies besides Node.js.

## Installation

gemini extensions install https://github.com/WPConstructor/gemini-quota-retry

Restart Gemini CLI after installation.

## Uninstallation

gemini extensions uninstall quota-retry