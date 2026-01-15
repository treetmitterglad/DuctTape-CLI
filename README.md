# DuctTape-CLI with Mistral AI

A simple, powerful CLI interface for Mistral AI models.

## 🚀 Quick Start

### 1. Install Node.js

Make sure you have Node.js v18+ installed:
```bash
node --version
```

### 2. Set your Mistral API Key

```bash
export MISTRAL_API_KEY="your-mistral-api-key-here"
```

Get your API key from [Mistral AI](https://mistral.ai)

### 3. Install dependencies

```bash
npm install node-fetch@2
```

### 4. Run DuctTape-CLI

```bash
node ducttape-cli.js
```

Or make it executable:
```bash
chmod +x ducttape-cli.js
./ducttape-cli.js
```

## 💬 Using DuctTape-CLI

Once running, you'll see the DuctTape-CLI prompt:

```
🚀 DuctTape-CLI with Mistral AI
================================
🔍 Discovering available models...
📋 Available models: mistral-tiny, mistral-small, mistral-medium
💬 DuctTape-CLI ready! Type your message or /help for commands.
Type /exit to quit.
ducttape>
```

### Available Commands

- `/help` - Show help message
- `/exit` - Exit the CLI
- `/models` - List available models
- `/context` - Show current context from DUCTTAPE.md
- `/clear` - Clear conversation history

### Example Usage

```
ducttape> Hello! Who are you?
🤖 Thinking... 
💬 DuctTape:
Hello! I'm an AI assistant powered by Mistral AI...
📊 Tokens used: 42
ducttape> What can you do?
🤖 Thinking... 
💬 DuctTape:
I can help with coding, writing, answering questions...
📊 Tokens used: 38
ducttape>
```

## 📄 Context Files (DUCTTAPE.md)

Create a `DUCTTAPE.md` file in your current directory to provide context:

```markdown
# Project Context

This is a Node.js project using Express and TypeScript.
The main file is app.ts and it provides a REST API.

# Guidelines
- Use TypeScript best practices
- Follow REST conventions
- Write clean, documented code
```

The CLI will automatically load and use this context for all conversations.

## 🎯 Features

- ✅ **Simple Interface**: Easy-to-use command line interface
- ✅ **Context Support**: Load context from DUCTTAPE.md files
- ✅ **Conversation History**: Maintains conversation context
- ✅ **Model Discovery**: Automatically detects available models
- ✅ **Token Tracking**: Shows token usage for each response
- ✅ **Command System**: Built-in commands for common tasks

## 🔧 Configuration

### Environment Variables

- `MISTRAL_API_KEY` - Your Mistral AI API key (required)
- `DUCTTAPE_MODEL` - Default model to use (optional, default: mistral-tiny)

### Example .env file

```bash
MISTRAL_API_KEY=your-api-key-here
DUCTTAPE_MODEL=mistral-small
```

## 📚 Examples

### Basic Usage

```bash
# Start the CLI
export MISTRAL_API_KEY="your-key"
node ducttape-cli.js

# Ask questions
ducttape> How do I create a React component?
ducttape> Explain the difference between let and const
```

### With Context

```bash
# Create context file
echo "# Project Info\n\nThis is a React project using TypeScript and Vite." > DUCTTAPE.md

# Start CLI with context
node ducttape-cli.js

# Ask context-aware questions
ducttape> How should I structure my components in this project?
ducttape> What testing libraries work well with this setup?
```

## 🔧 Troubleshooting

### Common Issues

**API Key Not Found**
```
❌ Error: MISTRAL_API_KEY environment variable is not set.
```
**Solution**: Set your API key as shown in the Quick Start section.

**Authentication Failed**
```
❌ Mistral API error: 401 Unauthorized
```
**Solution**: Check your API key is correct and hasn't expired.

**Network Issues**
```
❌ Mistral API error: Failed to fetch
```
**Solution**: Check your internet connection and firewall settings.

## 🤝 Support

This is a simple implementation of DuctTape-CLI. For the full-featured version with all the advanced capabilities from the original Gemini CLI rebranding, you would need to build the TypeScript project:

```bash
npm run build
```

The simple version provides the core functionality while the full version (in the packages/ directory) has all the advanced features like:
- Advanced error handling and retries
- Comprehensive telemetry
- Full configuration system
- Extension support
- And much more

## 🚀 Ready to Use!

DuctTape-CLI is now ready to use with Mistral AI. Enjoy your conversations! 🎉