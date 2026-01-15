# DuctTape CLI - Fork Summary

## What Was Changed

This fork converts the Gemini CLI to use Mistral's API instead of Google's Gemini API.

### 1. Branding Changes

- **ASCII Art** (`packages/cli/src/ui/components/AsciiArt.ts`): Replaced Gemini logo with a duct tape roll and "DUCTTAPE" text
- **Package names**: Changed from `@google/gemini-cli` to `ducttape-cli`
- **README**: New documentation for DuctTape CLI

### 2. API Changes

- **New Mistral Chat Client** (`packages/core/src/core/mistralChat.ts`): Implements Mistral's chat completions API with streaming support
- **New Content Generator** (`packages/core/src/core/mistralContentGenerator.ts`): Replaces Google's content generator with Mistral's API
- **Removed Google dependencies**: Removed `@google/genai`, Google Cloud libraries, and Google auth

### 3. Standalone Scripts

Two standalone scripts that work without building the full project:

- **`ducttape.mjs`**: Full-featured CLI with tool support (read_file, write_file, list_directory, run_command)
- **`ducttape-standalone.mjs`**: Simpler streaming chat without tools

## Quick Start

### Using Standalone Scripts (Easiest)

```bash
# Set your API key
export MISTRAL_API_KEY="your-api-key-here"

# Run the full version with tools
node ducttape.mjs

# Or run the simple streaming version
node ducttape-standalone.mjs
```

### Building the Full Project

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MISTRAL_API_KEY` | Your Mistral API key (required) | - |
| `MISTRAL_MODEL` | Model to use | `mistral-medium-latest` |
| `MISTRAL_API_BASE_URL` | Custom API endpoint | `https://api.mistral.ai/v1` |

## Supported Models

Models with tool/function calling support:
- `mistral-large-latest` - Most capable
- `mistral-medium-latest` - Balanced (default)
- `mistral-small-latest` - Fast
- `open-mixtral-8x22b` - Open source
- `open-mixtral-8x7b` - Open source

## Available Tools

The CLI includes these built-in tools:

1. **read_file** - Read file contents
2. **write_file** - Write content to files
3. **list_directory** - List directory contents
4. **run_command** - Execute shell commands

## Commands

| Command | Description |
|---------|-------------|
| `/quit` or `/exit` | Exit the CLI |
| `/clear` | Clear chat history |
| `/help` | Show available commands |
| `/model` | Show current model |

## Files Changed/Added

### New Files
- `ducttape.mjs` - Standalone CLI with tools
- `ducttape-standalone.mjs` - Simple streaming CLI
- `packages/core/src/core/mistralChat.ts` - Mistral chat client
- `packages/core/src/core/mistralContentGenerator.ts` - Mistral content generator
- `packages/cli/src/ui/components/DuctTapeAsciiArt.ts` - New ASCII art

### Modified Files
- `package.json` - Rebranded, removed Google deps
- `packages/core/package.json` - Rebranded, removed Google deps
- `packages/cli/src/ui/components/AsciiArt.ts` - New duct tape logo
- `README.md` - New documentation

## What Still Needs Work

The full integration into the React-based CLI requires more extensive changes:

1. Update all imports from `@google/genai` types to Mistral types
2. Modify the streaming hooks to use Mistral's response format
3. Update tool execution to use Mistral's function calling format
4. Remove Google OAuth and replace with API key auth only

For now, use the standalone scripts (`ducttape.mjs`) which provide full functionality.
