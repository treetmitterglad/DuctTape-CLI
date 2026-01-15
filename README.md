# DuctTape CLI 🔧

An AI-powered terminal assistant using Mistral's API. Forked from Google's Gemini CLI.

```
       ╭──────────────╮
      ╱ ╭────────────╮ ╲     ██████╗ ██╗   ██╗ ██████╗████████╗████████╗ █████╗ ██████╗ ███████╗
     ╱ ╱              ╲ ╲    ██╔══██╗██║   ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝
    │ │    ╭──────╮    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ███████║██████╔╝█████╗  
    │ │    │ TAPE │    │ │   ██║  ██║██║   ██║██║        ██║      ██║   ██╔══██║██╔═══╝ ██╔══╝  
     ╲ ╲   ╰──────╯   ╱ ╱    ██████╔╝╚██████╔╝╚██████╗   ██║      ██║   ██║  ██║██║     ███████╗
      ╲ ╰────────────╯ ╱     ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚═╝     ╚══════╝
       ╰──────────────╯
```

## Features

- 🤖 Powered by Mistral AI models (mistral-medium, mistral-large, etc.)
- 🔧 Tool/function calling support for models that support it
- 💬 Interactive chat interface in your terminal
- 📁 File system operations
- 🔍 Code search and analysis
- 🖥️ Shell command execution

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ducttape-cli.git
cd ducttape-cli

# Install dependencies
npm install

# Build
npm run build
```

## Setup

Set your Mistral API key:

```bash
export MISTRAL_API_KEY="your-api-key-here"
```

Optionally set a custom base URL:

```bash
export MISTRAL_API_BASE_URL="https://api.mistral.ai/v1"
```

## Usage

```bash
# Start the CLI
npm start

# Or after building
./bundle/ducttape.js
```

## Supported Models

- `mistral-large-latest` - Most capable model with tool support
- `mistral-medium-latest` - Balanced performance and cost (default)
- `mistral-small-latest` - Fast and efficient
- `open-mixtral-8x22b` - Open source, tool support
- `open-mixtral-8x7b` - Open source, tool support

## Configuration

Create a `.ducttape/settings.json` in your home directory or project root:

```json
{
  "model": "mistral-medium-latest",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

## Tool Support

DuctTape CLI supports Mistral's function calling feature. Tools are automatically enabled for models that support them:

- File reading/writing
- Shell command execution
- Web search
- Code analysis

## Credits

This project is a fork of [Google's Gemini CLI](https://github.com/google-gemini/gemini-cli), modified to use Mistral's API instead of Google's Gemini API.

## License

Apache-2.0 (inherited from original Gemini CLI)
