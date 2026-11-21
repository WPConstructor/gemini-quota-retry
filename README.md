# Gemini CLI Quota Retry

A Gemini CLI extension that automatically retries requests when API quota errors are detected. It waits 70 seconds before retrying, helping you continue working without manually restarting failed requests.

Released under the **MIT License**.

## Features

- Detects Gemini API quota errors.
- Automatically waits 70 seconds before retrying.
- Resumes execution using the `continue` command.
- Automatically repeats the retry process if another quota error occurs.
- No additional dependencies besides Node.js.

## Installation

### Method 1: Install directly from GitHub

```bash
gemini extensions install https://github.com/WPConstructor/gemini-quota-retry
```

Restart Gemini CLI after installation.

### Method 2: Manual installation

If automatic installation fails, you can install the extension manually.

**Step 1: Download the repository**

Using Git:

```bash
git clone https://github.com/WPConstructor/gemini-quota-retry.git
```

Alternatively, download the ZIP archive directly from GitHub:

https://github.com/WPConstructor/gemini-quota-retry/archive/refs/heads/main.zip

Extract the ZIP archive.

**Step 2: Copy the extension**

Create the Gemini CLI extensions directory if it doesn't already exist:

```bash
mkdir -p ~/.gemini/extensions
```

Copy the extension into the directory:

```bash
cp -r gemini-quota-retry ~/.gemini/extensions/quota-retry
```

Make sure the following file exists:

```text
~/.gemini/extensions/quota-retry/gemini-extension.json
```

**Step 3: Restart Gemini CLI**

Close and restart Gemini CLI to load the extension.

## Uninstallation

To uninstall the extension, run:

```bash
gemini extensions uninstall quota-retry
```

If you installed it manually, remove its directory:

```bash
rm -rf ~/.gemini/extensions/quota-retry
```

Restart Gemini CLI afterwards.

## Behind the Scenes

Curious about how this extension works and what inspired its development?

Read the blog post:

**[Behind the Scenes of Gemini CLI Auto Retry](http://wpconstructor.com/blog/gemini-cli-auto-retry)**

## License

This project is released under the [MIT License](LICENSE).

Copyright (c) 2026 WPConstructor.