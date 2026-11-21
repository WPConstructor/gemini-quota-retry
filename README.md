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

```bash
gemini extensions install https://github.com/WPConstructor/gemini-quota-retry
```

Restart Gemini CLI after installation.

## Uninstallation

```bash
gemini extensions uninstall quota-retry
```

## Behind the Scenes

Curious about how this extension works and what inspired its development?

**Read the blog post:** [Behind the Scenes of Gemini CLI Auto Retry](http://wpconstructor.com/blog/gemini-cli-auto-retry)

## License

This project is released under the [MIT License](LICENSE).