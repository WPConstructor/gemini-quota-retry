# Gemini Quota Retry

A Gemini CLI extension that automatically retries requests when API quota errors are detected. It waits 70 seconds before retrying, helping you continue working without manually restarting failed requests.

Released under the **MIT License**.

## Features

- Detects Gemini API quota errors.
- Automatically waits 70 seconds before retrying.
- Resumes execution using the `continue` command.
- Automatically repeats the retry process if another quota error occurs.
- No additional dependencies besides Node.js.

## Installation

### Method 1: Using Git (Recommended)

Open your terminal (Terminal on macOS/Linux, Command Prompt or PowerShell on Windows) and run:

```bash
git clone https://github.com/WPConstructor/gemini-quota-retry.git
cd gemini-quota-retry
```

### Method 2: Downloading as a ZIP Archive

1. Go to the repository page on GitHub.
2. Click the **Code** button and select **Download ZIP**.
3. Extract the downloaded ZIP file to your preferred directory.
4. Open your terminal and navigate into the extracted folder:

```bash
cd path/to/gemini-quota-retry
```

### Installation & Linking

Link the extension in Gemini CLI:

```bash
gemini extensions link .
```

Restart Gemini CLI to load the extension.

## Uninstallation

If you no longer need the extension, you can remove it using the Gemini CLI:

```bash
gemini extensions uninstall quota-retry
```

You can also safely delete the local repository folder from your computer after uninstallation.

## Behind the Scenes

Curious about how this extension works and what inspired its development?

Read the blog post:

**[Behind the Scenes of Gemini CLI Auto Retry](http://wpconstructor.com/blog/gemini-auto-retry)**

## License

This project is released under the [MIT License](LICENSE).

Copyright (c) 2026 WPConstructor.