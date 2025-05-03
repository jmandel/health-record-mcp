modelcontextprotocol/docs/clients.mdx
---
---
title: "Example Clients"
description: "A list of applications that support MCP integrations"
---

This page provides an overview of applications that support the Model Context Protocol (MCP). Each client may support different MCP features, allowing for varying levels of integration with MCP servers.

## Feature support matrix

| Client                                      | [Resources] | [Prompts] | [Tools] | [Sampling] | Roots | Notes                                                                        |
|---------------------------------------------|-------------|-----------|---------|------------|--------|-----------------------------------------------------------------------------|
| [5ire][5ire]                                | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [AgentAI][AgentAI]                          | ❌          | ❌        | ✅      | ❌         | ❌    | Agent Library written in Rust with tools support                            |
| [AgenticFlow][AgenticFlow]                  | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, prompts, and resources for no-code AI agents and multi-agent workflows.             |
| [Amazon Q CLI][Amazon Q CLI]                | ❌          | ✅        | ✅      | ❌         | ❌    | Supports prompts and tools.                                                 |
| [Apify MCP Tester][Apify MCP Tester]        | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools                                                              |
| [BeeAI Framework][BeeAI Framework]          | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools in agentic workflows.                                        |
| [BoltAI][BoltAI]                            | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [Claude.ai][Claude.ai]                      | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, prompts, and resources for remote MCP servers.                                     |
| [Claude Code][Claude Code]                  | ❌          | ✅        | ✅      | ❌         | ❌    | Supports prompts and tools                                                  |
| [Claude Desktop App][Claude Desktop]        | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, prompts, and resources for local and remote MCP servers.    |
| [Cline][Cline]                              | ✅          | ❌        | ✅      | ❌         | ❌    | Supports tools and resources.                                               |
| [Continue][Continue]                        | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, prompts, and resources.                                     |
| [Copilot-MCP][CopilotMCP]                   | ✅          | ❌        | ✅      | ❌         | ❌    | Supports tools and resources.                                               |
| [Cursor][Cursor]                            | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [Daydreams Agents][Daydreams]               | ✅          | ✅        | ✅      | ❌         | ❌    | Support for drop in Servers to Daydreams agents                             |
| [Emacs Mcp][Mcp.el]                         | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools in Emacs.                                                    |
| [fast-agent][fast-agent]                    | ✅          | ✅        | ✅      | ✅         | ✅    | Full multimodal MCP support, with end-to-end tests                          |
| [FLUJO][FLUJO]                              | ❌          | ❌        | ✅      | ❌         | ❌    | Support for resources, Prompts and Roots are coming soon                    |
| [Genkit][Genkit]                            | ⚠️          | ✅        | ✅      | ❌         | ❌    | Supports resource list and lookup through tools.                            |
| [Glama][Glama]                              | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [GenAIScript][GenAIScript]                  | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [Goose][Goose]                              | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [gptme][gptme]                              | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [HyperAgent][HyperAgent]                    | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools.                                                             |
| [Klavis AI Slack/Discord/Web][Klavis AI]    | ✅          | ❌        | ✅      | ❌         | ❌    | Supports tools and resources.                                               |
| [LibreChat][LibreChat]                      | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools for Agents                                                   |
| [Lutra][Lutra]                              | ✅          | ✅        | ✅      | ❌         | ❌    | Supports any MCP server for reusable playbook creation.                     |
| [mcp-agent][mcp-agent]                      | ❌          | ❌        | ✅      | ⚠️         | ❌    | Supports tools, server connection management, and agent workflows.          |
| [mcp-use][mcp-use]                          | ✅          | ❌        | ✅      | ❌         | ❌    | Support tools, resources, stdio & http connection, local llms-agents.       | 
| [MCPHub][MCPHub]                            | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, resources, and prompts in Neovim                            |
| [MCPOmni-Connect][MCPOmni-Connect]          | ✅          | ✅        | ✅      | ✅         | ❌    | Supports tools with agentic mode, ReAct, and orchestrator capabilities.     |
| [Microsoft Copilot Studio]                  | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools                                                              |
| [MindPal][MindPal]                          | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools for no-code AI agents and multi-agent workflows.             |
| [OpenSumi][OpenSumi]                        | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools in OpenSumi                                                  |
| [oterm][oterm]                              | ❌          | ✅        | ✅      | ✅         | ❌    | Supports tools, prompts and sampling for Ollama.                                                 |
| [Postman][postman]                          | ✅          | ✅        | ✅      | ❌         | ❌    | Supports tools, resources, prompts, and sampling                                                 |
| [Roo Code][Roo Code]                        | ✅          | ❌        | ✅      | ❌         | ❌    | Supports tools and resources.                                               |
| [Slack MCP Client][Slack MCP Client]        | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools and multiple servers.                                        |
| [Sourcegraph Cody][Cody]                    | ✅          | ❌        | ❌      | ❌         | ❌    | Supports resources through OpenCTX                                          |
| [SpinAI][SpinAI]                            | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools for Typescript AI Agents                                     |
| [Superinterface][Superinterface]            | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools                                                              |
| [TheiaAI/TheiaIDE][TheiaAI/TheiaIDE]        | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools for Agents in Theia AI and the AI-powered Theia IDE          |
| [Tome][Tome]                                | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools, manages MCP servers.                                        |
| [TypingMind App][TypingMind App]            | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools at app-level (appear as plugins) or when assigned to Agents  |
| [VS Code GitHub Copilot][VS Code]           | ❌          | ❌        | ✅      | ❌         | ✅    | Supports dynamic tool/roots discovery, secure secret configuration, and explicit tool prompting |
| [Windsurf Editor][Windsurf]                 | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools with AI Flow for collaborative development.                  |
| [Witsy][Witsy]                              | ❌          | ❌        | ✅      | ❌         | ❌    | Supports tools in Witsy.                                                    |
| [Zed][Zed]                                  | ❌          | ✅        | ❌      | ❌         | ❌    | Prompts appear as slash commands                                            |

[5ire]: https://github.com/nanbingxyz/5ire
[AgentAI]: https://github.com/AdamStrojek/rust-agentai
[AgenticFlow]: https://agenticflow.ai/mcp
[Amazon Q CLI]: https://github.com/aws/amazon-q-developer-cli
[Apify MCP Tester]: https://apify.com/jiri.spilka/tester-mcp-client
[BeeAI Framework]: https://i-am-bee.github.io/beeai-framework
[BoltAI]: https://boltai.com
[Claude.ai]: https://claude.ai
[Claude Code]: https://claude.ai/code
[Claude Desktop]: https://claude.ai/download
[Cline]: https://github.com/cline/cline
[Continue]: https://github.com/continuedev/continue
[CopilotMCP]: https://github.com/VikashLoomba/copilot-mcp
[Cursor]: https://cursor.com
[Daydreams]: https://github.com/daydreamsai/daydreams
[Klavis AI]: https://www.klavis.ai/
[Mcp.el]: https://github.com/lizqwerscott/mcp.el
[fast-agent]: https://github.com/evalstate/fast-agent
[FLUJO]: https://github.com/mario-andreschak/flujo
[Glama]: https://glama.ai/chat
[Genkit]: https://github.com/firebase/genkit
[GenAIScript]: https://microsoft.github.io/genaiscript/reference/scripts/mcp-tools/
[Goose]: https://block.github.io/goose/docs/goose-architecture/#interoperability-with-extensions
[LibreChat]: https://github.com/danny-avila/LibreChat
[Lutra]: https://lutra.ai
[mcp-agent]: https://github.com/lastmile-ai/mcp-agent
[mcp-use]: https://github.com/pietrozullo/mcp-use
[MCPHub]: https://github.com/ravitemer/mcphub.nvim
[MCPOmni-Connect]: https://github.com/Abiorh001/mcp_omni_connect
[Microsoft Copilot Studio]: https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp
[MindPal]: https://mindpal.io
[OpenSumi]: https://github.com/opensumi/core
[oterm]: https://github.com/ggozad/oterm
[Postman]: https://postman.com/downloads
[Roo Code]: https://roocode.com
[Slack MCP Client]: https://github.com/tuannvm/slack-mcp-client
[Cody]: https://sourcegraph.com/cody
[SpinAI]: https://spinai.dev
[Superinterface]: https://superinterface.ai
[TheiaAI/TheiaIDE]: https://eclipsesource.com/blogs/2024/12/19/theia-ide-and-theia-ai-support-mcp/
[Tome]: https://github.com/runebookai/tome
[TypingMind App]: https://www.typingmind.com
[VS Code]: https://code.visualstudio.com/
[Windsurf]: https://codeium.com/windsurf
[gptme]: https://github.com/gptme/gptme
[Witsy]: https://github.com/nbonamy/witsy
[Zed]: https://zed.dev
[Resources]: https://modelcontextprotocol.io/docs/concepts/resources
[Prompts]: https://modelcontextprotocol.io/docs/concepts/prompts
[Tools]: https://modelcontextprotocol.io/docs/concepts/tools
[Sampling]: https://modelcontextprotocol.io/docs/concepts/sampling
[HyperAgent]: https://github.com/hyperbrowserai/HyperAgent

## Client details

### 5ire
[5ire](https://github.com/nanbingxyz/5ire) is an open source cross-platform desktop AI assistant that supports tools through MCP servers.

**Key features:**
- Built-in MCP servers can be quickly enabled and disabled.
- Users can add more servers by modifying the configuration file.
- It is open-source and user-friendly, suitable for beginners.
- Future support for MCP will be continuously improved.

### AgentAI

[AgentAI](https://github.com/AdamStrojek/rust-agentai) is a Rust library designed to simplify the creation of AI agents. The library includes seamless integration with MCP Servers.

[Example of MCP Server integration](https://github.com/AdamStrojek/rust-agentai/blob/master/examples/tools_mcp.rs)

**Key features:**
- Multi-LLM – We support most LLM APIs (OpenAI, Anthropic, Gemini, Ollama, and all OpenAI API Compatible).
- Built-in support for MCP Servers.
- Create agentic flows in a type- and memory-safe language like Rust.

### AgenticFlow
[AgenticFlow](https://agenticflow.ai/) is a no-code AI platform that helps you build agents that handle sales, marketing, and creative tasks around the clock. Connect 2,500+ APIs and 10,000+ tools securely via MCP.

**Key features:**
- No-code AI agent creation and workflow building.
- Access a vast library of 10,000+ tools and 2,500+ APIs through MCP.
- Simple 3-step process to connect MCP servers.
- Securely manage connections and revoke access anytime.

**Learn more:**
- [AgenticFlow MCP Integration](https://agenticflow.ai/mcp)

### Amazon Q CLI
[Amazon Q CLI](https://github.com/aws/amazon-q-developer-cli) is an open-source, agentic coding assistant for terminals.

**Key features:**
- Full support for MCP servers.
- Edit prompts using your preferred text editor.
- Access saved prompts instantly with `@`.
- Control and organize AWS resources directly from your terminal.
- Tools, profiles, context management, auto-compact, and so much more!

**Get Started**

```bash
brew install amazon-q
```

### Apify MCP Tester
[Apify MCP Tester](https://github.com/apify/tester-mcp-client) is an open-source client that connects to any MCP server using Server-Sent Events (SSE).
It is a standalone Apify Actor designed for testing MCP servers over SSE, with support for Authorization headers.
It uses plain JavaScript (old-school style) and is hosted on Apify, allowing you to run it without any setup.

**Key features:**
- Connects to any MCP server via SSE.
- Works with the [Apify MCP Server](https://apify.com/apify/actors-mcp-server) to interact with one or more Apify [Actors](https://apify.com/store).
- Dynamically utilizes tools based on context and user queries (if supported by the server).

### BeeAI Framework
[BeeAI Framework](https://i-am-bee.github.io/beeai-framework) is an open-source framework for building, deploying, and serving powerful agentic workflows at scale. The framework includes the **MCP Tool**, a native feature that simplifies the integration of MCP servers into agentic workflows.

**Key features:**
- Seamlessly incorporate MCP tools into agentic workflows.
- Quickly instantiate framework-native tools from connected MCP client(s).
- Planned future support for agentic MCP capabilities.

**Learn more:**
- [Example of using MCP tools in agentic workflow](https://i-am-bee.github.io/beeai-framework/#/typescript/tools?id=using-the-mcptool-class)

### BoltAI
[BoltAI](https://boltai.com) is a native, all-in-one AI chat client with MCP support. BoltAI supports multiple AI providers (OpenAI, Anthropic, Google AI...), including local AI models (via Ollama, LM Studio or LMX)

**Key features:**
- MCP Tool integrations: once configured, user can enable individual MCP server in each chat
- MCP quick setup: import configuration from Claude Desktop app or Cursor editor
- Invoke MCP tools inside any app with AI Command feature
- Integrate with remote MCP servers in the mobile app

**Learn more:**
- [BoltAI docs](https://boltai.com/docs/plugins/mcp-servers)
- [BoltAI website](https://boltai.com)

### Claude Code
Claude Code is an interactive agentic coding tool from Anthropic that helps you code faster through natural language commands. It supports MCP integration for prompts and tools, and also functions as an MCP server to integrate with other clients.

**Key features:**
- Tool and prompt support for MCP servers
- Offers its own tools through an MCP server for integrating with other MCP clients

### Claude Desktop App
The Claude desktop application provides comprehensive support for MCP, enabling deep integration with local tools and data sources.

**Key features:**
- Full support for resources, allowing attachment of local files and data
- Support for prompt templates
- Tool integration for executing commands and scripts
- Local server connections for enhanced privacy and security

> ⓘ Note: The Claude.ai web application does not currently support MCP. MCP features are only available in the desktop application.

### Cline
[Cline](https://github.com/cline/cline) is an autonomous coding agent in VS Code that edits files, runs commands, uses a browser, and more–with your permission at each step.

**Key features:**
- Create and add tools through natural language (e.g. "add a tool that searches the web")
- Share custom MCP servers Cline creates with others via the `~/Documents/Cline/MCP` directory
- Displays configured MCP servers along with their tools, resources, and any error logs

### Continue
[Continue](https://github.com/continuedev/continue) is an open-source AI code assistant, with built-in support for all MCP features.

**Key features**
- Type "@" to mention MCP resources
- Prompt templates surface as slash commands
- Use both built-in and MCP tools directly in chat
- Supports VS Code and JetBrains IDEs, with any LLM

### Copilot-MCP
[Copilot-MCP](https://github.com/VikashLoomba/copilot-mcp) enables AI coding assistance via MCP.

**Key features:**
- Support for MCP tools and resources
- Integration with development workflows
- Extensible AI capabilities

### Cursor
[Cursor](https://docs.cursor.com/advanced/model-context-protocol) is an AI code editor.

**Key Features**:
- Support for MCP tools in Cursor Composer
- Support for both STDIO and SSE

### Daydreams
[Daydreams](https://github.com/daydreamsai/daydreams) is a generative agent framework for executing anything onchain

**Key features:**
- Supports MCP Servers in config
- Exposes MCP Client

### Emacs Mcp
[Emacs Mcp](https://github.com/lizqwerscott/mcp.el) is an Emacs client designed to interface with MCP servers, enabling seamless connections and interactions. It provides MCP tool invocation support for AI plugins like [gptel](https://github.com/karthink/gptel) and [llm](https://github.com/ahyatt/llm), adhering to Emacs' standard tool invocation format. This integration enhances the functionality of AI tools within the Emacs ecosystem.

**Key features:**
- Provides MCP tool support for Emacs.

### fast-agent
[fast-agent](https://github.com/evalstate/fast-agent) is a Python Agent framework, with simple declarative support for creating Agents and Workflows, with full multi-modal support for Anthropic and OpenAI models.

**Key features:**
- PDF and Image support, based on MCP Native types
- Interactive front-end to develop and diagnose Agent applications, including passthrough and playback simulators 
- Built in support for "Building Effective Agents" workflows.
- Deploy Agents as MCP Servers

### FLUJO
Think n8n + ChatGPT. FLUJO is an desktop application that integrates with MCP to provide a workflow-builder interface for AI interactions. Built with Next.js and React, it supports both online and offline (ollama) models, it manages API Keys and environment variables centrally and can install MCP Servers from GitHub. FLUJO has an ChatCompletions endpoint and flows can be executed from other AI applications like Cline, Roo or Claude.

**Key features:**
- Environment & API Key Management
- Model Management
- MCP Server Integration
- Workflow Orchestration
- Chat Interface

### Genkit
[Genkit](https://github.com/firebase/genkit) is a cross-language SDK for building and integrating GenAI features into applications. The [genkitx-mcp](https://github.com/firebase/genkit/tree/main/js/plugins/mcp) plugin enables consuming MCP servers as a client or creating MCP servers from Genkit tools and prompts.

**Key features:**
- Client support for tools and prompts (resources partially supported)
- Rich discovery with support in Genkit's Dev UI playground
- Seamless interoperability with Genkit's existing tools and prompts
- Works across a wide variety of GenAI models from top providers

### Glama

[Glama](https://glama.ai/chat) is a comprehensive AI workspace and integration platform that offers a unified interface to leading LLM providers, including OpenAI, Anthropic, and others. It supports the Model Context Protocol (MCP) ecosystem, enabling developers and enterprises to easily discover, build, and manage MCP servers.

**Key features:**

- Integrated [MCP Server Directory](https://glama.ai/mcp/servers)
- Integrated [MCP Tool Directory](https://glama.ai/mcp/tools)
- Host MCP servers and access them via the Chat or SSE endpoints
– Ability to chat with multiple LLMs and MCP servers at once
- Upload and analyze local files and data
- Full-text search across all your chats and data

### GenAIScript
Programmatically assemble prompts for LLMs using [GenAIScript](https://microsoft.github.io/genaiscript/) (in JavaScript). Orchestrate LLMs, tools, and data in JavaScript.

**Key features:**
- JavaScript toolbox to work with prompts
- Abstraction to make it easy and productive
- Seamless Visual Studio Code integration

### Goose
[Goose](https://github.com/block/goose) is an open source AI agent that supercharges your software development by automating coding tasks.

**Key features:**
- Expose MCP functionality to Goose through tools.
- MCPs can be installed directly via the [extensions directory](https://block.github.io/goose/v1/extensions/), CLI, or UI.
- Goose allows you to extend its functionality by [building your own MCP servers](https://block.github.io/goose/docs/tutorials/custom-extensions).
- Includes built-in tools for development, web scraping, automation, memory, and integrations with JetBrains and Google Drive.

### gptme
[gptme](https://github.com/gptme/gptme) is a open-source terminal-based personal AI assistant/agent, designed to assist with programming tasks and general knowledge work.

**Key features:**
- CLI-first design with a focus on simplicity and ease of use
- Rich set of built-in tools for shell commands, Python execution, file operations, and web browsing
- Local-first approach with support for multiple LLM providers
- Open-source, built to be extensible and easy to modify

### HyperAgent
[HyperAgent](https://github.com/hyperbrowserai/HyperAgent) is Playwright supercharged with AI. With HyperAgent, you no longer need brittle scripts, just powerful natural language commands. Using MCP servers, you can extend the capability of HyperAgent, without having to write any code.

**Key features**
- AI Commands: Simple APIs like page.ai(), page.extract() and executeTask() for any AI automation
- Fallback to Regular Playwright: Use regular Playwright when AI isn't needed
- Stealth Mode – Avoid detection with built-in anti-bot patches
- Cloud Ready – Instantly scale to hundreds of sessions via [Hyperbrowser](https://www.hyperbrowser.ai/)
- MCP Client – Connect to tools like Composio for full workflows (e.g. writing web data to Google Sheets)

### Klavis AI Slack/Discord/Web
[Klavis AI](https://www.klavis.ai/) is an Open-Source Infra to Use, Build & Scale MCPs with ease.

**Key features:**
- Slack/Discord/Web MCP clients for using MCPs directly
- Simple web UI dashboard for easy MCP configuration
- Direct OAuth integration with Slack & Discord Clients and MCP Servers for secure user authentication
- SSE transport support
- Open-source infrastructure ([GitHub repository](https://github.com/Klavis-AI/klavis))

**Learn more:**
- [Demo video showing MCP usage in Slack/Discord](https://youtu.be/9-QQAhrQWw8)

### LibreChat
[LibreChat](https://github.com/danny-avila/LibreChat) is an open-source, customizable AI chat UI that supports multiple AI providers, now including MCP integration.

**Key features:**
- Extend current tool ecosystem, including [Code Interpreter](https://www.librechat.ai/docs/features/code_interpreter) and Image generation tools, through MCP servers
- Add tools to customizable [Agents](https://www.librechat.ai/docs/features/agents), using a variety of LLMs from top providers
- Open-source and self-hostable, with secure multi-user support
- Future roadmap includes expanded MCP feature support

### Lutra
[Lutra](https://lutra.ai) is an AI agent that transforms conversations into actionable, automated workflows.

**Key features:**
- Easy MCP Integration: Connecting Lutra to MCP servers is as simple as providing the server URL; Lutra handles the rest behind the scenes.
- Chat to Take Action: Lutra understands your conversational context and goals, automatically integrating with your existing apps to perform tasks.
- Reusable Playbooks: After completing a task, save the steps as reusable, automated workflows—simplifying repeatable processes and reducing manual effort.
- Shareable Automations: Easily share your saved playbooks with teammates to standardize best practices and accelerate collaborative workflows.

**Learn more:**
- [Lutra AI agent explained](https://www.youtube.com/watch?v=W5ZpN0cMY70)

### mcp-agent
[mcp-agent] is a simple, composable framework to build agents using Model Context Protocol.

**Key features:**
- Automatic connection management of MCP servers.
- Expose tools from multiple servers to an LLM.
- Implements every pattern defined in [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents).
- Supports workflow pause/resume signals, such as waiting for human feedback.

### mcp-use
[mcp-use] is an open source python library to very easily connect any LLM to any MCP server both locally and remotely.

**Key features:**
- Very simple interface to connect any LLM to any MCP.
- Support the creation of custom agents, workflows.
- Supports connection to multiple MCP servers simultaneously.
- Supports all langchain supported models, also locally.
- Offers efficient tool orchestration and search functionalities.

### MCPHub
[MCPHub] is a powerful Neovim plugin that integrates MCP (Model Context Protocol) servers into your workflow. 

**Key features**
- Install, configure and manage MCP servers with an intuitive UI.
- Built-in Neovim MCP server with support for file operations (read, write, search, replace), command execution, terminal integration, LSP integration, buffers, and diagnostics.
- Create Lua-based MCP servers directly in Neovim.
- Inegrates with popular Neovim chat plugins Avante.nvim and CodeCompanion.nvim 

### MCPOmni-Connect
[MCPOmni-Connect](https://github.com/Abiorh001/mcp_omni_connect) is a versatile command-line interface (CLI) client designed to connect to various Model Context Protocol (MCP) servers using both stdio and SSE transport.

**Key features:**
- Support for resources, prompts, tools, and sampling
- Agentic mode with ReAct and orchestrator capabilities
- Seamless integration with OpenAI models and other LLMs
- Dynamic tool and resource management across multiple servers
- Support for both stdio and SSE transport protocols
- Comprehensive tool orchestration and resource analysis capabilities

### Microsoft Copilot Studio
[Microsoft Copilot Studio]  is a robust SaaS platform designed for building custom AI-driven applications and intelligent agents, empowering developers to create, deploy, and manage sophisticated AI solutions.

**Key features:**
- Support for MCP tools
- Extend Copilot Studio agents with MCP servers
- Leveraging Microsoft unified, governed, and secure API management solutions 

### MindPal
[MindPal](https://mindpal.io) is a no-code platform for building and running AI agents and multi-agent workflows for business processes.

**Key features:**
- Build custom AI agents with no-code
- Connect any SSE MCP server to extend agent tools
- Create multi-agent workflows for complex business processes
- User-friendly for both technical and non-technical professionals
- Ongoing development with continuous improvement of MCP support

**Learn more:**
- [MindPal MCP Documentation](https://docs.mindpal.io/agent/mcp)

### OpenSumi
[OpenSumi](https://github.com/opensumi/core) is a framework helps you quickly build AI Native IDE products.

**Key features:**
- Supports MCP tools in OpenSumi
- Supports built-in IDE MCP servers and custom MCP servers

### oterm
[oterm] is a terminal client for Ollama allowing users to create chats/agents.

**Key features:**
 - Support for multiple fully customizable chat sessions with Ollama connected with tools.
 - Support for MCP tools.

### Roo Code
[Roo Code](https://roocode.com) enables AI coding assistance via MCP.

**Key features:**
- Support for MCP tools and resources
- Integration with development workflows
- Extensible AI capabilities

### Postman

[Postman](https://postman.com/downloads) is the most popular API client and now supports MCP server testing and debugging.

**Key features**:
- Full support of all major MCP features (tools, prompts, resources, and subscriptions)
- Fast, seamless UI for debugging MCP capabilities
- MCP config integration (Claude, VSCode, etc.) for fast first-time experience in testing MCPs
- Integration with history, varibles, and collections for re-use and collaboration

### Slack MCP Client
[Slack MCP Client](https://github.com/tuannvm/slack-mcp-client) acts as a bridge between Slack and Model Context Protocol (MCP) servers. Using Slack as the interface, it enables large language models (LLMs) to connect and interact with various MCP servers through standardized MCP tools.

**Key features:**
- **Supports Popular LLM Providers:** Integrates seamlessly with leading large language model providers such as OpenAI, Anthropic, and Ollama, allowing users to leverage advanced conversational AI and orchestration capabilities within Slack.
- **Dynamic and Secure Integration:** Supports dynamic registration of MCP tools, works in both channels and direct messages and manages credentials securely via environment variables or Kubernetes secrets.
- **Easy Deployment and Extensibility:** Offers official Docker images, a Helm chart for Kubernetes, and Docker Compose for local development, making it simple to deploy, configure, and extend with additional MCP servers or tools.

### Sourcegraph Cody
[Cody](https://openctx.org/docs/providers/modelcontextprotocol) is Sourcegraph's AI coding assistant, which implements MCP through OpenCTX.

**Key features:**
- Support for MCP resources
- Integration with Sourcegraph's code intelligence
- Uses OpenCTX as an abstraction layer
- Future support planned for additional MCP features

### SpinAI
[SpinAI](https://spinai.dev) is an open-source TypeScript framework for building observable AI agents. The framework provides native MCP compatibility, allowing agents to seamlessly integrate with MCP servers and tools.

**Key features:**
- Built-in MCP compatibility for AI agents
- Open-source TypeScript framework
- Observable agent architecture
- Native support for MCP tools integration

### Superinterface
[Superinterface](https://superinterface.ai) is AI infrastructure and a developer platform to build in-app AI assistants with support for MCP, interactive components, client-side function calling and more.

**Key features:**
- Use tools from MCP servers in assistants embedded via React components or script tags
- SSE transport support
- Use any AI model from any AI provider (OpenAI, Anthropic, Ollama, others)

### TheiaAI/TheiaIDE
[Theia AI](https://eclipsesource.com/blogs/2024/10/07/introducing-theia-ai/) is a framework for building AI-enhanced tools and IDEs. The [AI-powered Theia IDE](https://eclipsesource.com/blogs/2024/10/08/introducting-ai-theia-ide/) is an open and flexible development environment built on Theia AI.

**Key features:**
- **Tool Integration**: Theia AI enables AI agents, including those in the Theia IDE, to utilize MCP servers for seamless tool interaction.
- **Customizable Prompts**: The Theia IDE allows users to define and adapt prompts, dynamically integrating MCP servers for tailored workflows.
- **Custom agents**: The Theia IDE supports creating custom agents that leverage MCP capabilities, enabling users to design dedicated workflows on the fly.

Theia AI and Theia IDE's MCP integration provide users with flexibility, making them powerful platforms for exploring and adapting MCP.

**Learn more:**
- [Theia IDE and Theia AI MCP Announcement](https://eclipsesource.com/blogs/2024/12/19/theia-ide-and-theia-ai-support-mcp/)
- [Download the AI-powered Theia IDE](https://theia-ide.org/)

### Tome
[Tome](https://github.com/runebookai/tome) is an open source cross-platform desktop app designed for working with local LLMs and MCP servers. It is designed to be beginner friendly and abstract away the nitty gritty of configuration for people getting started with MCP.

**Key features:**
- MCP servers are managed by Tome so there is no need to install uv or npm or configure JSON
- Users can quickly add or remove MCP servers via UI
- Any tool-supported local model on Ollama is compatible

### TypingMind App
[TypingMind](https://www.typingmind.com) is an advanced frontend for LLMs with MCP support. TypingMind supports all popular LLM providers like OpenAI, Gemini, Claude, and users can use with their own API keys.

**Key features:**
- **MCP Tool Integration**: Once MCP is configured, MCP tools will show up as plugins that can be enabled/disabled easily via the main app interface.
- **Assign MCP Tools to Agents**: TypingMind allows users to create AI agents that have a set of MCP servers assigned.
- **Remote MCP servers**: Allows users to customize where to run the MCP servers via its MCP Connector configuration, allowing the use of MCP tools across multiple devices (laptop, mobile devices, etc.) or control MCP servers from a remote private server.

**Learn more:**
- [TypingMind MCP Document](https://www.typingmind.com/mcp)
- [Download TypingMind (PWA)](https://www.typingmind.com/)

### VS Code GitHub Copilot
[VS Code](https://code.visualstudio.com/) integrates MCP with GitHub Copilot through [agent mode](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode), allowing direct interaction with MCP-provided tools within your agentic coding workflow. Configure servers in Claude Desktop, workspace or user settings, with guided MCP installation and secure handling of keys in input variables to avoid leaking hard-coded keys.

**Key features:**
- Support for stdio and server-sent events (SSE) transport
- Per-session selection of tools per agent session for optimal performance
- Easy server debugging with restart commands and output logging
- Tool calls with editable inputs and always-allow toggle
- Integration with existing VS Code extension system to register MCP servers from extensions

### Windsurf Editor
[Windsurf Editor](https://codeium.com/windsurf) is an agentic IDE that combines AI assistance with developer workflows. It features an innovative AI Flow system that enables both collaborative and independent AI interactions while maintaining developer control.

**Key features:**
- Revolutionary AI Flow paradigm for human-AI collaboration
- Intelligent code generation and understanding
- Rich development tools with multi-model support

### Witsy
[Witsy](https://github.com/nbonamy/witsy) is an AI desktop assistant, supoorting Anthropic models and MCP servers as LLM tools.

**Key features:**
- Multiple MCP servers support
- Tool integration for executing commands and scripts
- Local server connections for enhanced privacy and security
- Easy-install from Smithery.ai
- Open-source, available for macOS, Windows and Linux

### Zed
[Zed](https://zed.dev/docs/assistant/model-context-protocol) is a high-performance code editor with built-in MCP support, focusing on prompt templates and tool integration.

**Key features:**
- Prompt templates surface as slash commands in the editor
- Tool integration for enhanced coding workflows
- Tight integration with editor features and workspace context
- Does not support MCP resources

## Adding MCP support to your application

If you've added MCP support to your application, we encourage you to submit a pull request to add it to this list. MCP integration can provide your users with powerful contextual AI capabilities and make your application part of the growing MCP ecosystem.

Benefits of adding MCP support:
- Enable users to bring their own context and tools
- Join a growing ecosystem of interoperable AI applications
- Provide users with flexible integration options
- Support local-first AI workflows

To get started with implementing MCP in your application, check out our [Python](https://github.com/modelcontextprotocol/python-sdk) or [TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

## Updates and corrections

This list is maintained by the community. If you notice any inaccuracies or would like to update information about MCP support in your application, please submit a pull request or [open an issue in our documentation repository](https://github.com/modelcontextprotocol/modelcontextprotocol/issues).


---
modelcontextprotocol/docs/docs.json
---
{
  "$schema": "https://mintlify.com/docs.json",
  "theme": "willow",
  "name": "Model Context Protocol",
  "colors": {
    "primary": "#09090b",
    "light": "#FAFAFA",
    "dark": "#09090b"
  },
  "favicon": "/favicon.svg",
  "navigation": {
    "tabs": [
      {
        "tab": "User Guide",
        "groups": [
          {
            "group": "Get Started",
            "pages": [
              "introduction",
              {
                "group": "Quickstart",
                "pages": [
                  "quickstart/server",
                  "quickstart/client",
                  "quickstart/user"
                ]
              },
              "examples",
              "clients",
              "faqs"
            ]
          },
          {
            "group": "Tutorials",
            "pages": [
              "tutorials/building-mcp-with-llms",
              "docs/tools/debugging",
              "docs/tools/inspector"
            ]
          },
          {
            "group": "Concepts",
            "pages": [
              "docs/concepts/architecture",
              "docs/concepts/resources",
              "docs/concepts/prompts",
              "docs/concepts/tools",
              "docs/concepts/sampling",
              "docs/concepts/roots",
              "docs/concepts/transports"
            ]
          },
          {
            "group": "Development",
            "pages": [
              "development/updates",
              "development/roadmap",
              "development/contributing"
            ]
          }
        ]
      },
      {
        "tab": "SDKs",
        "icon": "book-open",
        "groups": [
          {
            "group": "Java",
            "pages": [
              "sdk/java/mcp-overview",
              "sdk/java/mcp-client",
              "sdk/java/mcp-server"
            ]
          }
        ]
      },
      {
        "tab": "Specification",
        "icon": "book",
        "groups": [
          {
            "group": "2025-03-26 (Latest)",
            "pages": [
              "specification/2025-03-26/index",
              "specification/2025-03-26/changelog",
              "specification/2025-03-26/architecture/index",
              {
                "group": "Base Protocol",
                "pages": [
                  "specification/2025-03-26/basic/index",
                  "specification/2025-03-26/basic/lifecycle",
                  "specification/2025-03-26/basic/transports",
                  "specification/2025-03-26/basic/authorization",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/2025-03-26/basic/utilities/cancellation",
                      "specification/2025-03-26/basic/utilities/ping",
                      "specification/2025-03-26/basic/utilities/progress"
                    ]
                  }
                ]
              },
              {
                "group": "Client Features",
                "pages": [
                  "specification/2025-03-26/client/roots",
                  "specification/2025-03-26/client/sampling"
                ]
              },
              {
                "group": "Server Features",
                "pages": [
                  "specification/2025-03-26/server/index",
                  "specification/2025-03-26/server/prompts",
                  "specification/2025-03-26/server/resources",
                  "specification/2025-03-26/server/tools",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/2025-03-26/server/utilities/completion",
                      "specification/2025-03-26/server/utilities/logging",
                      "specification/2025-03-26/server/utilities/pagination"
                    ]
                  }
                ]
              }
            ]
          },
          {
            "group": "2024-11-05",
            "pages": [
              "specification/2024-11-05/index",
              "specification/2024-11-05/architecture/index",
              {
                "group": "Base Protocol",
                "pages": [
                  "specification/2024-11-05/basic/index",
                  "specification/2024-11-05/basic/lifecycle",
                  "specification/2024-11-05/basic/messages",
                  "specification/2024-11-05/basic/transports",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/2024-11-05/basic/utilities/cancellation",
                      "specification/2024-11-05/basic/utilities/ping",
                      "specification/2024-11-05/basic/utilities/progress"
                    ]
                  }
                ]
              },
              {
                "group": "Client Features",
                "pages": [
                  "specification/2024-11-05/client/roots",
                  "specification/2024-11-05/client/sampling"
                ]
              },
              {
                "group": "Server Features",
                "pages": [
                  "specification/2024-11-05/server/index",
                  "specification/2024-11-05/server/prompts",
                  "specification/2024-11-05/server/resources",
                  "specification/2024-11-05/server/tools",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/2024-11-05/server/utilities/completion",
                      "specification/2024-11-05/server/utilities/logging",
                      "specification/2024-11-05/server/utilities/pagination"
                    ]
                  }
                ]
              }
            ]
          },
          {
            "group": "draft",
            "pages": [
              "specification/draft/index",
              "specification/draft/changelog",
              "specification/draft/architecture/index",
              {
                "group": "Base Protocol",
                "pages": [
                  "specification/draft/basic/index",
                  "specification/draft/basic/lifecycle",
                  "specification/draft/basic/transports",
                  "specification/draft/basic/authorization",
                  "specification/draft/basic/security_best_practices",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/draft/basic/utilities/cancellation",
                      "specification/draft/basic/utilities/ping",
                      "specification/draft/basic/utilities/progress"
                    ]
                  }
                ]
              },
              {
                "group": "Client Features",
                "pages": [
                  "specification/draft/client/roots",
                  "specification/draft/client/sampling"
                ]
              },
              {
                "group": "Server Features",
                "pages": [
                  "specification/draft/server/index",
                  "specification/draft/server/prompts",
                  "specification/draft/server/resources",
                  "specification/draft/server/tools",
                  {
                    "group": "Utilities",
                    "pages": [
                      "specification/draft/server/utilities/completion",
                      "specification/draft/server/utilities/logging",
                      "specification/draft/server/utilities/pagination"
                    ]
                  }
                ]
              }
            ]
          },
          {
            "group": "Resources",
            "pages": [
              "specification/versioning",
              "specification/contributing"
            ]
          }
        ]
      }
    ],
    "global": {
      "anchors": [
        {
          "anchor": "Python SDK",
          "href": "https://github.com/modelcontextprotocol/python-sdk",
          "icon": "python"
        },
        {
          "anchor": "TypeScript SDK",
          "href": "https://github.com/modelcontextprotocol/typescript-sdk",
          "icon": "square-js"
        },
        {
          "anchor": "Java SDK",
          "href": "https://github.com/modelcontextprotocol/java-sdk",
          "icon": "java"
        },
        {
          "anchor": "Kotlin SDK",
          "href": "https://github.com/modelcontextprotocol/kotlin-sdk",
          "icon": "square-k"
        },
        {
          "anchor": "C# SDK",
          "href": "https://github.com/modelcontextprotocol/csharp-sdk",
          "icon": "square-c"
        }
      ]
    }
  },
  "logo": {
    "light": "/logo/light.svg",
    "dark": "/logo/dark.svg"
  },
  "navbar": {
    "links": [],
    "primary": {
      "type": "button",
      "label": "GitHub",
      "href": "https://github.com/modelcontextprotocol"
    }
  },
  "seo": {
    "metatags": {
      "og:image": "https://raw.githubusercontent.com/modelcontextprotocol/docs/2eb6171ddbfeefde349dc3b8d5e2b87414c26250/images/og-image.png"
    },
    "indexing": "navigable"
  },
  "footer": {
    "socials": {
      "github": "https://github.com/modelcontextprotocol"
    }
  },
  "redirects": [
    {
      "source": "/tutorials/building-a-client",
      "destination": "/quickstart/client"
    },
    {
      "source": "/quickstart",
      "destination": "/quickstart/server"
    },
    {
      "source": "/specification/latest",
      "destination": "/specification/2025-03-26",
      "permanent": false
    }
  ],
  "contextual": {
    "options": [
      "copy",
      "view"
    ]
  }
}


---
modelcontextprotocol/docs/examples.mdx
---
---
title: Example Servers 
description: 'A list of example servers and implementations'
---

This page showcases various Model Context Protocol (MCP) servers that demonstrate the protocol's capabilities and versatility. These servers enable Large Language Models (LLMs) to securely access tools and data sources.

## Reference implementations

These official reference servers demonstrate core MCP features and SDK usage:

### Data and file systems
- **[Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)** - Secure file operations with configurable access controls
- **[PostgreSQL](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)** - Read-only database access with schema inspection capabilities
- **[SQLite](https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite)** - Database interaction and business intelligence features
- **[Google Drive](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive)** - File access and search capabilities for Google Drive

### Development tools
- **[Git](https://github.com/modelcontextprotocol/servers/tree/main/src/git)** - Tools to read, search, and manipulate Git repositories
- **[GitHub](https://github.com/modelcontextprotocol/servers/tree/main/src/github)** - Repository management, file operations, and GitHub API integration
- **[GitLab](https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab)** - GitLab API integration enabling project management
- **[Sentry](https://github.com/modelcontextprotocol/servers/tree/main/src/sentry)** - Retrieving and analyzing issues from Sentry.io

### Web and browser automation
- **[Brave Search](https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search)** - Web and local search using Brave's Search API
- **[Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch)** - Web content fetching and conversion optimized for LLM usage
- **[Puppeteer](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer)** - Browser automation and web scraping capabilities

### Productivity and communication
- **[Slack](https://github.com/modelcontextprotocol/servers/tree/main/src/slack)** - Channel management and messaging capabilities
- **[Google Maps](https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps)** - Location services, directions, and place details
- **[Memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)** - Knowledge graph-based persistent memory system

### AI and specialized tools
- **[EverArt](https://github.com/modelcontextprotocol/servers/tree/main/src/everart)** - AI image generation using various models
- **[Sequential Thinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)** - Dynamic problem-solving through thought sequences
- **[AWS KB Retrieval](https://github.com/modelcontextprotocol/servers/tree/main/src/aws-kb-retrieval-server)** - Retrieval from AWS Knowledge Base using Bedrock Agent Runtime

## Official integrations

These MCP servers are maintained by companies for their platforms:

- **[Axiom](https://github.com/axiomhq/mcp-server-axiom)** - Query and analyze logs, traces, and event data using natural language
- **[Browserbase](https://github.com/browserbase/mcp-server-browserbase)** - Automate browser interactions in the cloud
- **[BrowserStack](https://github.com/browserstack/mcp-server)** - Access BrowserStack's [Test Platform](https://www.browserstack.com/test-platform) to debug, write and fix tests, do accessibility testing and more.
- **[Cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)** - Deploy and manage resources on the Cloudflare developer platform
- **[E2B](https://github.com/e2b-dev/mcp-server)** - Execute code in secure cloud sandboxes
- **[Neon](https://github.com/neondatabase/mcp-server-neon)** - Interact with the Neon serverless Postgres platform
- **[Obsidian Markdown Notes](https://github.com/calclavia/mcp-obsidian)** - Read and search through Markdown notes in Obsidian vaults
- **[Prisma](https://pris.ly/docs/mcp-server)** - Manage and interact with Prisma Postgres databases
- **[Qdrant](https://github.com/qdrant/mcp-server-qdrant/)** - Implement semantic memory using the Qdrant vector search engine
- **[Raygun](https://github.com/MindscapeHQ/mcp-server-raygun)** - Access crash reporting and monitoring data
- **[Search1API](https://github.com/fatwang2/search1api-mcp)** - Unified API for search, crawling, and sitemaps
- **[Stripe](https://github.com/stripe/agent-toolkit)** - Interact with the Stripe API
- **[Tinybird](https://github.com/tinybirdco/mcp-tinybird)** - Interface with the Tinybird serverless ClickHouse platform
- **[Weaviate](https://github.com/weaviate/mcp-server-weaviate)** - Enable Agentic RAG through your Weaviate collection(s)

## Community highlights

A growing ecosystem of community-developed servers extends MCP's capabilities:

- **[Docker](https://github.com/ckreiling/mcp-server-docker)** - Manage containers, images, volumes, and networks
- **[Kubernetes](https://github.com/Flux159/mcp-server-kubernetes)** - Manage pods, deployments, and services
- **[Linear](https://github.com/jerhadf/linear-mcp-server)** - Project management and issue tracking
- **[Snowflake](https://github.com/datawiz168/mcp-snowflake-service)** - Interact with Snowflake databases
- **[Spotify](https://github.com/varunneal/spotify-mcp)** - Control Spotify playback and manage playlists
- **[Todoist](https://github.com/abhiz123/todoist-mcp-server)** - Task management integration

> **Note:** Community servers are untested and should be used at your own risk. They are not affiliated with or endorsed by Anthropic.

For a complete list of community servers, visit the [MCP Servers Repository](https://github.com/modelcontextprotocol/servers).

## Getting started

### Using reference servers

TypeScript-based servers can be used directly with `npx`:

```bash
npx -y @modelcontextprotocol/server-memory
```

Python-based servers can be used with `uvx` (recommended) or `pip`:

```bash
# Using uvx
uvx mcp-server-git

# Using pip
pip install mcp-server-git
python -m mcp_server_git
```

### Configuring with Claude

To use an MCP server with Claude, add it to your configuration:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

## Additional resources

- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Complete collection of reference implementations and community servers
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers) - Curated list of MCP servers
- [MCP CLI](https://github.com/wong2/mcp-cli) - Command-line inspector for testing MCP servers
- [MCP Get](https://mcp-get.com) - Tool for installing and managing MCP servers
- [Pipedream MCP](https://mcp.pipedream.com) - MCP servers with built-in auth for 3,000+ APIs and 10,000+ tools
- [Supergateway](https://github.com/supercorp-ai/supergateway) - Run MCP stdio servers over SSE
- [Zapier MCP](https://zapier.com/mcp) - MCP Server with over 7,000+ apps and 30,000+ actions

Visit our [GitHub Discussions](https://github.com/orgs/modelcontextprotocol/discussions) to engage with the MCP community.


---
modelcontextprotocol/docs/faqs.mdx
---
---
title: "FAQs"
description: "Explaining MCP and why it matters in simple terms"
---

## What is MCP?

MCP (Model Context Protocol) is a standard way for AI applications and agents to connect to and work with your data sources (e.g. local files, databases, or content repositories) and tools (e.g. GitHub, Google Maps, or Puppeteer).

Think of MCP as a universal adapter for AI applications, similar to what USB-C is for physical devices. USB-C acts as a universal adapter to connect devices to various peripherals and accessories. Similarly, MCP provides a standardized way to connect AI applications to different data and tools.

Before USB-C, you needed different cables for different connections. Similarly, before MCP, developers had to build custom connections to each data source or tool they wanted their AI application to work with—a time-consuming process that often resulted in limited functionality. Now, with MCP, developers can easily add connections to their AI applications, making their applications much more powerful from day one.

## Why does MCP matter?

### For AI application users

MCP means your AI applications can access the information and tools you work with every day, making them much more helpful. Rather than AI being limited to what it already knows about, it can now understand your specific documents, data, and work context.

For example, by using MCP servers, applications can access your personal documents from Google Drive or data about your codebase from GitHub, providing more personalized and contextually relevant assistance.

Imagine asking an AI assistant: "Summarize last week's team meeting notes and schedule follow-ups with everyone."

By using connections to data sources powered by MCP, the AI assistant can:

- Connect to your Google Drive through an MCP server to read meeting notes
- Understand who needs follow-ups based on the notes
- Connect to your calendar through another MCP server to schedule the meetings automatically

### For developers

MCP reduces development time and complexity when building AI applications that need to access various data sources. With MCP, developers can focus on building great AI experiences rather than repeatedly creating custom connectors.

Traditionally, connecting applications with data sources required building custom, one-off connections for each data source and each application. This created significant duplicative work—every developer wanting to connect their AI application to Google Drive or Slack needed to build their own connection.

MCP simplifies this by enabling developers to build MCP servers for data sources that are then reusable by various applications. For example, using the open source Google Drive MCP server, many different applications can access data from Google Drive without each developer needing to build a custom connection.

This open source ecosystem of MCP servers means developers can leverage existing work rather than starting from scratch, making it easier to build powerful AI applications that seamlessly integrate with the tools and data sources their users already rely on.

## How does MCP work?

<Frame>
  <img src="/images/mcp-simple-diagram.png" />
</Frame>

MCP creates a bridge between your AI applications and your data through a straightforward system: 

- **MCP servers** connect to your data sources and tools (like Google Drive or Slack)
- **MCP clients** are run by AI applications (like Claude Desktop) to connect them to these servers
- When you give permission, your AI application discovers available MCP servers
- The AI model can then use these connections to read information and take actions

This modular system means new capabilities can be added without changing AI applications themselves—just like adding new accessories to your computer without upgrading your entire system.

## Who creates and maintains MCP servers?

MCP servers are developed and maintained by: 

- Developers at Anthropic who build servers for common tools and data sources 
- Open source contributors who create servers for tools they use 
- Enterprise development teams building servers for their internal systems 
- Software providers making their applications AI-ready 

Once an open source MCP server is created for a data source, it can be used by any MCP-compatible AI application, creating a growing ecosystem of connections. See our [list of example servers](https://modelcontextprotocol.io/examples), or [get started building your own server](https://modelcontextprotocol.io/quickstart/server).

---
modelcontextprotocol/docs/favicon.svg
---
<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_19_13)">
<path d="M18 84.8528L85.8822 16.9706C95.2548 7.59798 110.451 7.59798 119.823 16.9706V16.9706C129.196 26.3431 129.196 41.5391 119.823 50.9117L68.5581 102.177" stroke="black" stroke-width="12" stroke-linecap="round"/>
<path d="M69.2652 101.47L119.823 50.9117C129.196 41.5391 144.392 41.5391 153.765 50.9117L154.118 51.2652C163.491 60.6378 163.491 75.8338 154.118 85.2063L92.7248 146.6C89.6006 149.724 89.6006 154.789 92.7248 157.913L105.331 170.52" stroke="black" stroke-width="12" stroke-linecap="round"/>
<path d="M102.853 33.9411L52.6482 84.1457C43.2756 93.5183 43.2756 108.714 52.6482 118.087V118.087C62.0208 127.459 77.2167 127.459 86.5893 118.087L136.794 67.8822" stroke="black" stroke-width="12" stroke-linecap="round"/>
</g>
<defs>
<clipPath id="clip0_19_13">
<rect width="180" height="180" fill="white"/>
</clipPath>
</defs>
</svg>


---
modelcontextprotocol/docs/introduction.mdx
---
---
title: Introduction
description: 'Get started with the Model Context Protocol (MCP)'
---

<Note>C# SDK released! Check out [what else is new.](/development/updates)</Note>

MCP is an open protocol that standardizes how applications provide context to LLMs. Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect your devices to various peripherals and accessories, MCP provides a standardized way to connect AI models to different data sources and tools.

## Why MCP?

MCP helps you build agents and complex workflows on top of LLMs. LLMs frequently need to integrate with data and tools, and MCP provides:
- A growing list of pre-built integrations that your LLM can directly plug into
- The flexibility to switch between LLM providers and vendors
- Best practices for securing your data within your infrastructure

### General architecture

At its core, MCP follows a client-server architecture where a host application can connect to multiple servers:

```mermaid
flowchart LR
    subgraph "Your Computer"
        Host["Host with MCP Client\n(Claude, IDEs, Tools)"]
        S1["MCP Server A"]
        S2["MCP Server B"]
        S3["MCP Server C"]
        Host <-->|"MCP Protocol"| S1
        Host <-->|"MCP Protocol"| S2
        Host <-->|"MCP Protocol"| S3
        S1 <--> D1[("Local\nData Source A")]
        S2 <--> D2[("Local\nData Source B")]
    end
    subgraph "Internet"
        S3 <-->|"Web APIs"| D3[("Remote\nService C")]
    end
```

- **MCP Hosts**: Programs like Claude Desktop, IDEs, or AI tools that want to access data through MCP
- **MCP Clients**: Protocol clients that maintain 1:1 connections with servers
- **MCP Servers**: Lightweight programs that each expose specific capabilities through the standardized Model Context Protocol
- **Local Data Sources**: Your computer's files, databases, and services that MCP servers can securely access
- **Remote Services**: External systems available over the internet (e.g., through APIs) that MCP servers can connect to

## Get started

Choose the path that best fits your needs:

#### Quick Starts
<CardGroup cols={2}>
  <Card
    title="For Server Developers"
    icon="bolt"
    href="/quickstart/server"
  >
    Get started building your own server to use in Claude for Desktop and other clients
  </Card>
  <Card
    title="For Client Developers"
    icon="bolt"
    href="/quickstart/client"
  >
    Get started building your own client that can integrate with all MCP servers
  </Card>
  <Card
    title="For Claude Desktop Users"
    icon="bolt"
    href="/quickstart/user"
  >
    Get started using pre-built servers in Claude for Desktop
  </Card>
</CardGroup>

#### Examples
<CardGroup cols={2}>
  <Card
    title="Example Servers"
    icon="grid"
    href="/examples"
  >
    Check out our gallery of official MCP servers and implementations
  </Card>
  <Card
    title="Example Clients"
    icon="cubes"
    href="/clients"
  >
    View the list of clients that support MCP integrations
  </Card>
</CardGroup>

## Tutorials

<CardGroup cols={2}>
  <Card
    title="Building MCP with LLMs"
    icon="comments"
    href="/tutorials/building-mcp-with-llms"
  >
    Learn how to use LLMs like Claude to speed up your MCP development
  </Card>
  <Card
  title="Debugging Guide"
  icon="bug"
  href="/docs/tools/debugging">
    Learn how to effectively debug MCP servers and integrations
  </Card>
  <Card
    title="MCP Inspector"
    icon="magnifying-glass"
    href="/docs/tools/inspector"
  >
    Test and inspect your MCP servers with our interactive debugging tool
  </Card>
  <Card
    title="MCP Workshop (Video, 2hr)"
    icon="person-chalkboard"
    href="https://www.youtube.com/watch?v=kQmXtrmQ5Zg"
  >
    <iframe src="https://www.youtube.com/embed/kQmXtrmQ5Zg"> </iframe>
  </Card>
</CardGroup>

## Explore MCP

Dive deeper into MCP's core concepts and capabilities:

<CardGroup cols={2}>
  <Card
    title="Core architecture"
    icon="sitemap"
    href="/docs/concepts/architecture"
  >
    Understand how MCP connects clients, servers, and LLMs
  </Card>
  <Card
    title="Resources"
    icon="database"
    href="/docs/concepts/resources"
  >
    Expose data and content from your servers to LLMs
  </Card>
  <Card
    title="Prompts"
    icon="message"
    href="/docs/concepts/prompts"
  >
    Create reusable prompt templates and workflows
  </Card>
  <Card
    title="Tools"
    icon="wrench"
    href="/docs/concepts/tools"
  >
    Enable LLMs to perform actions through your server
  </Card>
  <Card
    title="Sampling"
    icon="robot"
    href="/docs/concepts/sampling"
  >
    Let your servers request completions from LLMs
  </Card>
  <Card
    title="Transports"
    icon="network-wired"
    href="/docs/concepts/transports"
  >
    Learn about MCP's communication mechanism
  </Card>
</CardGroup>

## Contributing

Want to contribute? Check out our [Contributing Guide](/development/contributing) to learn how you can help improve MCP.

## Support and Feedback

Here's how to get help or provide feedback:

- For bug reports and feature requests related to the MCP specification, SDKs, or documentation (open source), please [create a GitHub issue](https://github.com/modelcontextprotocol)
- For discussions or Q&A about the MCP specification, use the [specification discussions](https://github.com/modelcontextprotocol/specification/discussions)
- For discussions or Q&A about other MCP open source components, use the [organization discussions](https://github.com/orgs/modelcontextprotocol/discussions)
- For bug reports, feature requests, and questions related to Claude.app and claude.ai's MCP integration, please see Anthropic's guide on [How to Get Support](https://support.anthropic.com/en/articles/9015913-how-to-get-support)


---
modelcontextprotocol/docs/development/contributing.mdx
---
---
title: Contributing
description: How to participate in Model Context Protocol development
---

We welcome contributions from the community! Please review our [contributing guidelines](https://github.com/modelcontextprotocol/.github/blob/main/CONTRIBUTING.md) for details on how to submit changes.

All contributors must adhere to our [Code of Conduct](https://github.com/modelcontextprotocol/.github/blob/main/CODE_OF_CONDUCT.md).

For questions and discussions, please use [GitHub Discussions](https://github.com/orgs/modelcontextprotocol/discussions).


---
modelcontextprotocol/docs/development/roadmap.mdx
---
---
title: Roadmap
description: Our plans for evolving Model Context Protocol
---

<Info>Last updated: **2025-03-27**</Info>

The Model Context Protocol is rapidly evolving. This page outlines our current thinking on key priorities and direction for approximately **the next six months**, though these may change significantly as the project develops. To see what's changed recently, check out the **[specification changelog](/specification/2025-03-26/changelog/)**.

<Note>The ideas presented here are not commitments—we may solve these challenges differently than described, or some may not materialize at all. This is also not an _exhaustive_ list; we may incorporate work that isn't mentioned here.</Note>

We value community participation! Each section links to relevant discussions where you can learn more and contribute your thoughts.

For a technical view of our standardization process, visit the [Standards Track](https://github.com/orgs/modelcontextprotocol/projects/2/views/2) on GitHub, which tracks how proposals progress toward inclusion in the official [MCP specification](https://spec.modelcontextprotocol.io).

## Validation

To foster a robust developer ecosystem, we plan to invest in:

- **Reference Client Implementations**: demonstrating protocol features with high-quality AI applications
- **Compliance Test Suites**: automated verification that clients, servers, and SDKs properly implement the specification

These tools will help developers confidently implement MCP while ensuring consistent behavior across the ecosystem.

## Registry

For MCP to reach its full potential, we need streamlined ways to distribute and discover MCP servers.

We plan to develop an [**MCP Registry**](https://github.com/orgs/modelcontextprotocol/discussions/159) that will enable centralized server discovery and metadata. This registry will primarily function as an API layer that third-party marketplaces and discovery services can build upon.

## Agents

As MCP increasingly becomes part of agentic workflows, we're exploring [improvements](https://github.com/modelcontextprotocol/specification/discussions/111) such as:

- **[Agent Graphs](https://github.com/modelcontextprotocol/specification/discussions/94)**: enabling complex agent topologies through namespacing and graph-aware communication patterns
- **Interactive Workflows**: improving human-in-the-loop experiences with granular permissioning, standardized interaction patterns, and [ways to directly communicate](https://github.com/modelcontextprotocol/specification/issues/97) with the end user

## Multimodality

Supporting the full spectrum of AI capabilities in MCP, including:

- **Additional Modalities**: video and other media types
- **[Streaming](https://github.com/modelcontextprotocol/specification/issues/117)**: multipart, chunked messages, and bidirectional communication for interactive experiences

## Governance

We're implementing governance structures that prioritize:

- **Community-Led Development**: fostering a collaborative ecosystem where community members and AI developers can all participate in MCP's evolution, ensuring it serves diverse applications and use cases
- **Transparent Standardization**: establishing clear processes for contributing to the specification, while exploring formal standardization via industry bodies

## Get Involved

We welcome your contributions to MCP's future! Join our [GitHub Discussions](https://github.com/orgs/modelcontextprotocol/discussions) to share ideas, provide feedback, or participate in the development process.


---
modelcontextprotocol/docs/development/updates.mdx
---
---
title: "What's New"
description: 'The latest updates and improvements to MCP'
---

<Update label="2025-04-10" description="Java SDK 0.9.0 released">
- Version [0.9.0](https://github.com/modelcontextprotocol/java-sdk/releases/tag/v0.9.0) of the MCP Java SDK has been released.
- Refactored logging system to use exchange mechanism
- Custom Context Paths
- Server Instructions
- CallToolResult Enhancement   
</Update>
<Update label="2025-03-26" description="Kotlin SDK 0.4.0 released">
- Fix issues and cleanup API
- Added binary compatibility tracking to avoid breaking changes
- Drop jdk requirements to JDK8 
- Added Claude Desktop integration with sample
- The full changelog can be found here: https://github.com/modelcontextprotocol/kotlin-sdk/releases/tag/0.4.0
</Update>

<Update label="2025-03-26" description="Java SDK 0.8.1 released">
- Version [0.8.1](https://github.com/modelcontextprotocol/java-sdk/releases/tag/v0.8.1) of the MCP Java SDK has been released,
    providing important bug fixes.
</Update>
<Update label="2025-03-24" description="C# SDK released">
 - We are exited to announce the availability of the MCP
   [C# SDK](https://github.com/modelcontextprotocol/csharp-sdk/) developed by
   [Peder Holdgaard Pedersen](http://github.com/PederHP) and Microsoft. This joins our growing
   list of supported languages. The C# SDK is also available as
   [NuGet package](https://www.nuget.org/packages/ModelContextProtocol)
 - Python SDK 1.5.0 was released with multiple fixes and improvements.
</Update>
<Update label="2025-03-21" description="Java SDK 0.8.0 released">
- Version [0.8.0](https://github.com/modelcontextprotocol/java-sdk/releases/tag/v0.8.0) of the MCP Java SDK has been released,
    delivering important session management improvements and bug fixes.
</Update>
<Update label="2025-03-10" description="Typescript SDK release">
 - Typescript SDK 1.7.0 was released with multiple fixes and improvements.
</Update>
<Update label="2025-02-14" description="Java SDK released">
  - We're excited to announce that the Java SDK developed by Spring AI at VMware Tanzu is now
    the official [Java SDK](https://github.com/modelcontextprotocol/java-sdk) for MCP.
    This joins our existing Kotlin SDK in our growing list of supported languages.
    The Spring AI team will maintain the SDK as an integral part of the Model Context Protocol
    organization. We're thrilled to welcome them to the MCP community!
</Update>

<Update label="2025-01-27" description="Python SDK 1.2.1">
  - Version [1.2.1](https://github.com/modelcontextprotocol/python-sdk/releases/tag/v1.2.1) of the MCP Python SDK has been released,
    delivering important stability improvements and bug fixes.
</Update>
<Update label="2025-01-18" description="SDK and Server Improvements">
  - Simplified, express-like API in the [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
  - Added 8 new clients to the [clients page](https://modelcontextprotocol.io/clients)
</Update>

<Update label="2025-01-03" description="SDK and Server Improvements">
  - FastMCP API in the [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
  - Dockerized MCP servers in the [servers repo](https://github.com/modelcontextprotocol/servers)
</Update>

<Update label="2024-12-21" description="Kotlin SDK released">
  - Jetbrains released a Kotlin SDK for MCP!
  - For a sample MCP Kotlin server, check out [this repository](https://github.com/modelcontextprotocol/kotlin-sdk/tree/main/samples/kotlin-mcp-server)
</Update>


---
modelcontextprotocol/docs/docs/concepts/architecture.mdx
---
---
title: "Core architecture"
description: "Understand how MCP connects clients, servers, and LLMs"
---

The Model Context Protocol (MCP) is built on a flexible, extensible architecture that enables seamless communication between LLM applications and integrations. This document covers the core architectural components and concepts.

## Overview

MCP follows a client-server architecture where:

- **Hosts** are LLM applications (like Claude Desktop or IDEs) that initiate connections
- **Clients** maintain 1:1 connections with servers, inside the host application
- **Servers** provide context, tools, and prompts to clients

```mermaid
flowchart LR
    subgraph "Host"
        client1[MCP Client]
        client2[MCP Client]
    end
    subgraph "Server Process"
        server1[MCP Server]
    end
    subgraph "Server Process"
        server2[MCP Server]
    end

    client1 <-->|Transport Layer| server1
    client2 <-->|Transport Layer| server2
```

## Core components

### Protocol layer

The protocol layer handles message framing, request/response linking, and high-level communication patterns.

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    class Protocol<Request, Notification, Result> {
        // Handle incoming requests
        setRequestHandler<T>(schema: T, handler: (request: T, extra: RequestHandlerExtra) => Promise<Result>): void

        // Handle incoming notifications
        setNotificationHandler<T>(schema: T, handler: (notification: T) => Promise<void>): void

        // Send requests and await responses
        request<T>(request: Request, schema: T, options?: RequestOptions): Promise<T>

        // Send one-way notifications
        notification(notification: Notification): Promise<void>
    }
    ```
  </Tab>
  <Tab title="Python">
    ```python
    class Session(BaseSession[RequestT, NotificationT, ResultT]):
        async def send_request(
            self,
            request: RequestT,
            result_type: type[Result]
        ) -> Result:
            """Send request and wait for response. Raises McpError if response contains error."""
            # Request handling implementation

        async def send_notification(
            self,
            notification: NotificationT
        ) -> None:
            """Send one-way notification that doesn't expect response."""
            # Notification handling implementation

        async def _received_request(
            self,
            responder: RequestResponder[ReceiveRequestT, ResultT]
        ) -> None:
            """Handle incoming request from other side."""
            # Request handling implementation

        async def _received_notification(
            self,
            notification: ReceiveNotificationT
        ) -> None:
            """Handle incoming notification from other side."""
            # Notification handling implementation
    ```
  </Tab>
</Tabs>

Key classes include:

* `Protocol`
* `Client`
* `Server`

### Transport layer

The transport layer handles the actual communication between clients and servers. MCP supports multiple transport mechanisms:

1. **Stdio transport**
   - Uses standard input/output for communication
   - Ideal for local processes

2. **HTTP with SSE transport**
   - Uses Server-Sent Events for server-to-client messages
   - HTTP POST for client-to-server messages

All transports use [JSON-RPC](https://www.jsonrpc.org/) 2.0 to exchange messages. See the [specification](/specification/) for detailed information about the Model Context Protocol message format.

### Message types

MCP has these main types of messages:

1. **Requests** expect a response from the other side:
    ```typescript
    interface Request {
      method: string;
      params?: { ... };
    }
    ```

2. **Results** are successful responses to requests:
    ```typescript
    interface Result {
      [key: string]: unknown;
    }
    ```

3. **Errors** indicate that a request failed:
    ```typescript
    interface Error {
      code: number;
      message: string;
      data?: unknown;
    }
    ```

4. **Notifications** are one-way messages that don't expect a response:
    ```typescript
    interface Notification {
      method: string;
      params?: { ... };
    }
    ```

## Connection lifecycle

### 1. Initialization

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: initialize request
    Server->>Client: initialize response
    Client->>Server: initialized notification

    Note over Client,Server: Connection ready for use
```

1. Client sends `initialize` request with protocol version and capabilities
2. Server responds with its protocol version and capabilities
3. Client sends `initialized` notification as acknowledgment
4. Normal message exchange begins

### 2. Message exchange

After initialization, the following patterns are supported:

- **Request-Response**: Client or server sends requests, the other responds
- **Notifications**: Either party sends one-way messages

### 3. Termination

Either party can terminate the connection:
- Clean shutdown via `close()`
- Transport disconnection
- Error conditions

## Error handling

MCP defines these standard error codes:

```typescript
enum ErrorCode {
  // Standard JSON-RPC error codes
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}
```

SDKs and applications can define their own error codes above -32000.

Errors are propagated through:
- Error responses to requests
- Error events on transports
- Protocol-level error handlers

## Implementation example

Here's a basic example of implementing an MCP server:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    import { Server } from "@modelcontextprotocol/sdk/server/index.js";
    import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

    const server = new Server({
      name: "example-server",
      version: "1.0.0"
    }, {
      capabilities: {
        resources: {}
      }
    });

    // Handle requests
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "example://resource",
            name: "Example Resource"
          }
        ]
      };
    });

    // Connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    ```
  </Tab>
  <Tab title="Python">
    ```python
    import asyncio
    import mcp.types as types
    from mcp.server import Server
    from mcp.server.stdio import stdio_server

    app = Server("example-server")

    @app.list_resources()
    async def list_resources() -> list[types.Resource]:
        return [
            types.Resource(
                uri="example://resource",
                name="Example Resource"
            )
        ]

    async def main():
        async with stdio_server() as streams:
            await app.run(
                streams[0],
                streams[1],
                app.create_initialization_options()
            )

    if __name__ == "__main__":
        asyncio.run(main())
    ```
  </Tab>
</Tabs>

## Best practices

### Transport selection

1. **Local communication**
   - Use stdio transport for local processes
   - Efficient for same-machine communication
   - Simple process management

2. **Remote communication**
   - Use SSE for scenarios requiring HTTP compatibility
   - Consider security implications including authentication and authorization

### Message handling

1. **Request processing**
   - Validate inputs thoroughly
   - Use type-safe schemas
   - Handle errors gracefully
   - Implement timeouts

2. **Progress reporting**
   - Use progress tokens for long operations
   - Report progress incrementally
   - Include total progress when known

3. **Error management**
   - Use appropriate error codes
   - Include helpful error messages
   - Clean up resources on errors

## Security considerations

1. **Transport security**
   - Use TLS for remote connections
   - Validate connection origins
   - Implement authentication when needed

2. **Message validation**
   - Validate all incoming messages
   - Sanitize inputs
   - Check message size limits
   - Verify JSON-RPC format

3. **Resource protection**
   - Implement access controls
   - Validate resource paths
   - Monitor resource usage
   - Rate limit requests

4. **Error handling**
   - Don't leak sensitive information
   - Log security-relevant errors
   - Implement proper cleanup
   - Handle DoS scenarios

## Debugging and monitoring

1. **Logging**
   - Log protocol events
   - Track message flow
   - Monitor performance
   - Record errors

2. **Diagnostics**
   - Implement health checks
   - Monitor connection state
   - Track resource usage
   - Profile performance

3. **Testing**
   - Test different transports
   - Verify error handling
   - Check edge cases
   - Load test servers


---
modelcontextprotocol/docs/docs/concepts/prompts.mdx
---
---
title: "Prompts"
description: "Create reusable prompt templates and workflows"
---

Prompts enable servers to define reusable prompt templates and workflows that clients can easily surface to users and LLMs. They provide a powerful way to standardize and share common LLM interactions.

<Note>
  Prompts are designed to be **user-controlled**, meaning they are exposed from servers to clients with the intention of the user being able to explicitly select them for use.
</Note>

## Overview

Prompts in MCP are predefined templates that can:
- Accept dynamic arguments
- Include context from resources
- Chain multiple interactions
- Guide specific workflows
- Surface as UI elements (like slash commands)

## Prompt structure

Each prompt is defined with:

```typescript
{
  name: string;              // Unique identifier for the prompt
  description?: string;      // Human-readable description
  arguments?: [              // Optional list of arguments
    {
      name: string;          // Argument identifier
      description?: string;  // Argument description
      required?: boolean;    // Whether argument is required
    }
  ]
}
```

## Discovering prompts

Clients can discover available prompts through the `prompts/list` endpoint:

```typescript
// Request
{
  method: "prompts/list"
}

// Response
{
  prompts: [
    {
      name: "analyze-code",
      description: "Analyze code for potential improvements",
      arguments: [
        {
          name: "language",
          description: "Programming language",
          required: true
        }
      ]
    }
  ]
}
```

## Using prompts

To use a prompt, clients make a `prompts/get` request:

```typescript
// Request
{
  method: "prompts/get",
  params: {
    name: "analyze-code",
    arguments: {
      language: "python"
    }
  }
}

// Response
{
  description: "Analyze Python code for potential improvements",
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Please analyze the following Python code for potential improvements:\n\n```python\ndef calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total = total + num\n    return total\n\nresult = calculate_sum([1, 2, 3, 4, 5])\nprint(result)\n```"
      }
    }
  ]
}
```

## Dynamic prompts

Prompts can be dynamic and include:

### Embedded resource context

```json
{
  "name": "analyze-project",
  "description": "Analyze project logs and code",
  "arguments": [
    {
      "name": "timeframe",
      "description": "Time period to analyze logs",
      "required": true
    },
    {
      "name": "fileUri",
      "description": "URI of code file to review",
      "required": true
    }
  ]
}
```

When handling the `prompts/get` request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Analyze these system logs and the code file for any issues:"
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "logs://recent?timeframe=1h",
          "text": "[2024-03-14 15:32:11] ERROR: Connection timeout in network.py:127\n[2024-03-14 15:32:15] WARN: Retrying connection (attempt 2/3)\n[2024-03-14 15:32:20] ERROR: Max retries exceeded",
          "mimeType": "text/plain"
        }
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "file:///path/to/code.py",
          "text": "def connect_to_service(timeout=30):\n    retries = 3\n    for attempt in range(retries):\n        try:\n            return establish_connection(timeout)\n        except TimeoutError:\n            if attempt == retries - 1:\n                raise\n            time.sleep(5)\n\ndef establish_connection(timeout):\n    # Connection implementation\n    pass",
          "mimeType": "text/x-python"
        }
      }
    }
  ]
}
```

### Multi-step workflows

```typescript
const debugWorkflow = {
  name: "debug-error",
  async getMessages(error: string) {
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Here's an error I'm seeing: ${error}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "I'll help analyze this error. What have you tried so far?"
        }
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "I've tried restarting the service, but the error persists."
        }
      }
    ];
  }
};
```

## Example implementation

Here's a complete example of implementing prompts in an MCP server:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    import { Server } from "@modelcontextprotocol/sdk/server";
    import {
      ListPromptsRequestSchema,
      GetPromptRequestSchema
    } from "@modelcontextprotocol/sdk/types";

    const PROMPTS = {
      "git-commit": {
        name: "git-commit",
        description: "Generate a Git commit message",
        arguments: [
          {
            name: "changes",
            description: "Git diff or description of changes",
            required: true
          }
        ]
      },
      "explain-code": {
        name: "explain-code",
        description: "Explain how code works",
        arguments: [
          {
            name: "code",
            description: "Code to explain",
            required: true
          },
          {
            name: "language",
            description: "Programming language",
            required: false
          }
        ]
      }
    };

    const server = new Server({
      name: "example-prompts-server",
      version: "1.0.0"
    }, {
      capabilities: {
        prompts: {}
      }
    });

    // List available prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: Object.values(PROMPTS)
      };
    });

    // Get specific prompt
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = PROMPTS[request.params.name];
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }

      if (request.params.name === "git-commit") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Generate a concise but descriptive commit message for these changes:\n\n${request.params.arguments?.changes}`
              }
            }
          ]
        };
      }

      if (request.params.name === "explain-code") {
        const language = request.params.arguments?.language || "Unknown";
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Explain how this ${language} code works:\n\n${request.params.arguments?.code}`
              }
            }
          ]
        };
      }

      throw new Error("Prompt implementation not found");
    });
    ```
  </Tab>
  <Tab title="Python">
    ```python
    from mcp.server import Server
    import mcp.types as types

    # Define available prompts
    PROMPTS = {
        "git-commit": types.Prompt(
            name="git-commit",
            description="Generate a Git commit message",
            arguments=[
                types.PromptArgument(
                    name="changes",
                    description="Git diff or description of changes",
                    required=True
                )
            ],
        ),
        "explain-code": types.Prompt(
            name="explain-code",
            description="Explain how code works",
            arguments=[
                types.PromptArgument(
                    name="code",
                    description="Code to explain",
                    required=True
                ),
                types.PromptArgument(
                    name="language",
                    description="Programming language",
                    required=False
                )
            ],
        )
    }

    # Initialize server
    app = Server("example-prompts-server")

    @app.list_prompts()
    async def list_prompts() -> list[types.Prompt]:
        return list(PROMPTS.values())

    @app.get_prompt()
    async def get_prompt(
        name: str, arguments: dict[str, str] | None = None
    ) -> types.GetPromptResult:
        if name not in PROMPTS:
            raise ValueError(f"Prompt not found: {name}")

        if name == "git-commit":
            changes = arguments.get("changes") if arguments else ""
            return types.GetPromptResult(
                messages=[
                    types.PromptMessage(
                        role="user",
                        content=types.TextContent(
                            type="text",
                            text=f"Generate a concise but descriptive commit message "
                            f"for these changes:\n\n{changes}"
                        )
                    )
                ]
            )

        if name == "explain-code":
            code = arguments.get("code") if arguments else ""
            language = arguments.get("language", "Unknown") if arguments else "Unknown"
            return types.GetPromptResult(
                messages=[
                    types.PromptMessage(
                        role="user",
                        content=types.TextContent(
                            type="text",
                            text=f"Explain how this {language} code works:\n\n{code}"
                        )
                    )
                ]
            )

        raise ValueError("Prompt implementation not found")
    ```
  </Tab>
</Tabs>

## Best practices

When implementing prompts:

1. Use clear, descriptive prompt names
2. Provide detailed descriptions for prompts and arguments
3. Validate all required arguments
4. Handle missing arguments gracefully
5. Consider versioning for prompt templates
6. Cache dynamic content when appropriate
7. Implement error handling
8. Document expected argument formats
9. Consider prompt composability
10. Test prompts with various inputs

## UI integration

Prompts can be surfaced in client UIs as:

- Slash commands
- Quick actions
- Context menu items
- Command palette entries
- Guided workflows
- Interactive forms

## Updates and changes

Servers can notify clients about prompt changes:

1. Server capability: `prompts.listChanged`
2. Notification: `notifications/prompts/list_changed`
3. Client re-fetches prompt list

## Security considerations

When implementing prompts:

- Validate all arguments
- Sanitize user input
- Consider rate limiting
- Implement access controls
- Audit prompt usage
- Handle sensitive data appropriately
- Validate generated content
- Implement timeouts
- Consider prompt injection risks
- Document security requirements


---
modelcontextprotocol/docs/docs/concepts/resources.mdx
---
---
title: "Resources"
description: "Expose data and content from your servers to LLMs"
---

Resources are a core primitive in the Model Context Protocol (MCP) that allow servers to expose data and content that can be read by clients and used as context for LLM interactions.

<Note>
  Resources are designed to be **application-controlled**, meaning that the client application can decide how and when they should be used.
  Different MCP clients may handle resources differently. For example:
  - Claude Desktop currently requires users to explicitly select resources before they can be used
  - Other clients might automatically select resources based on heuristics
  - Some implementations may even allow the AI model itself to determine which resources to use

  Server authors should be prepared to handle any of these interaction patterns when implementing resource support. In order to expose data to models automatically, server authors should use a **model-controlled** primitive such as [Tools](./tools).
</Note>

## Overview

Resources represent any kind of data that an MCP server wants to make available to clients. This can include:

- File contents
- Database records
- API responses
- Live system data
- Screenshots and images
- Log files
- And more

Each resource is identified by a unique URI and can contain either text or binary data.

## Resource URIs

Resources are identified using URIs that follow this format:

```
[protocol]://[host]/[path]
```

For example:
- `file:///home/user/documents/report.pdf`
- `postgres://database/customers/schema`
- `screen://localhost/display1`

The protocol and path structure is defined by the MCP server implementation. Servers can define their own custom URI schemes.

## Resource types

Resources can contain two types of content:

### Text resources

Text resources contain UTF-8 encoded text data. These are suitable for:
- Source code
- Configuration files
- Log files
- JSON/XML data
- Plain text

### Binary resources

Binary resources contain raw binary data encoded in base64. These are suitable for:
- Images
- PDFs
- Audio files
- Video files
- Other non-text formats

## Resource discovery

Clients can discover available resources through two main methods:

### Direct resources

Servers expose a list of concrete resources via the `resources/list` endpoint. Each resource includes:

```typescript
{
  uri: string;           // Unique identifier for the resource
  name: string;          // Human-readable name
  description?: string;  // Optional description
  mimeType?: string;     // Optional MIME type
}
```

### Resource templates

For dynamic resources, servers can expose [URI templates](https://datatracker.ietf.org/doc/html/rfc6570) that clients can use to construct valid resource URIs:

```typescript
{
  uriTemplate: string;   // URI template following RFC 6570
  name: string;          // Human-readable name for this type
  description?: string;  // Optional description
  mimeType?: string;     // Optional MIME type for all matching resources
}
```

## Reading resources

To read a resource, clients make a `resources/read` request with the resource URI.

The server responds with a list of resource contents:

```typescript
{
  contents: [
    {
      uri: string;        // The URI of the resource
      mimeType?: string;  // Optional MIME type

      // One of:
      text?: string;      // For text resources
      blob?: string;      // For binary resources (base64 encoded)
    }
  ]
}
```

<Tip>
  Servers may return multiple resources in response to one `resources/read` request. This could be used, for example, to return a list of files inside a directory when the directory is read.
</Tip>

## Resource updates

MCP supports real-time updates for resources through two mechanisms:

### List changes

Servers can notify clients when their list of available resources changes via the `notifications/resources/list_changed` notification.

### Content changes

Clients can subscribe to updates for specific resources:

1. Client sends `resources/subscribe` with resource URI
2. Server sends `notifications/resources/updated` when the resource changes
3. Client can fetch latest content with `resources/read`
4. Client can unsubscribe with `resources/unsubscribe`

## Example implementation

Here's a simple example of implementing resource support in an MCP server:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    const server = new Server({
      name: "example-server",
      version: "1.0.0"
    }, {
      capabilities: {
        resources: {}
      }
    });

    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "file:///logs/app.log",
            name: "Application Logs",
            mimeType: "text/plain"
          }
        ]
      };
    });

    // Read resource contents
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (uri === "file:///logs/app.log") {
        const logContents = await readLogFile();
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: logContents
            }
          ]
        };
      }

      throw new Error("Resource not found");
    });
    ```
  </Tab>
  <Tab title="Python">
    ```python
    app = Server("example-server")

    @app.list_resources()
    async def list_resources() -> list[types.Resource]:
        return [
            types.Resource(
                uri="file:///logs/app.log",
                name="Application Logs",
                mimeType="text/plain"
            )
        ]

    @app.read_resource()
    async def read_resource(uri: AnyUrl) -> str:
        if str(uri) == "file:///logs/app.log":
            log_contents = await read_log_file()
            return log_contents

        raise ValueError("Resource not found")

    # Start server
    async with stdio_server() as streams:
        await app.run(
            streams[0],
            streams[1],
            app.create_initialization_options()
        )
    ```
  </Tab>
</Tabs>

## Best practices

When implementing resource support:

1. Use clear, descriptive resource names and URIs
2. Include helpful descriptions to guide LLM understanding
3. Set appropriate MIME types when known
4. Implement resource templates for dynamic content
5. Use subscriptions for frequently changing resources
6. Handle errors gracefully with clear error messages
7. Consider pagination for large resource lists
8. Cache resource contents when appropriate
9. Validate URIs before processing
10. Document your custom URI schemes

## Security considerations

When exposing resources:

- Validate all resource URIs
- Implement appropriate access controls
- Sanitize file paths to prevent directory traversal
- Be cautious with binary data handling
- Consider rate limiting for resource reads
- Audit resource access
- Encrypt sensitive data in transit
- Validate MIME types
- Implement timeouts for long-running reads
- Handle resource cleanup appropriately


---
modelcontextprotocol/docs/docs/concepts/roots.mdx
---
---
title: "Roots"
description: "Understanding roots in MCP"
---

Roots are a concept in MCP that define the boundaries where servers can operate. They provide a way for clients to inform servers about relevant resources and their locations.

## What are Roots?

A root is a URI that a client suggests a server should focus on. When a client connects to a server, it declares which roots the server should work with. While primarily used for filesystem paths, roots can be any valid URI including HTTP URLs.

For example, roots could be:

```
file:///home/user/projects/myapp
https://api.example.com/v1
```

## Why Use Roots?

Roots serve several important purposes:

1. **Guidance**: They inform servers about relevant resources and locations
2. **Clarity**: Roots make it clear which resources are part of your workspace
3. **Organization**: Multiple roots let you work with different resources simultaneously

## How Roots Work

When a client supports roots, it:

1. Declares the `roots` capability during connection
2. Provides a list of suggested roots to the server
3. Notifies the server when roots change (if supported)

While roots are informational and not strictly enforcing, servers should:

1. Respect the provided roots
2. Use root URIs to locate and access resources
3. Prioritize operations within root boundaries

## Common Use Cases

Roots are commonly used to define:

- Project directories
- Repository locations
- API endpoints
- Configuration locations
- Resource boundaries

## Best Practices

When working with roots:

1. Only suggest necessary resources
2. Use clear, descriptive names for roots
3. Monitor root accessibility
4. Handle root changes gracefully

## Example

Here's how a typical MCP client might expose roots:

```json
{
  "roots": [
    {
      "uri": "file:///home/user/projects/frontend",
      "name": "Frontend Repository"
    },
    {
      "uri": "https://api.example.com/v1",
      "name": "API Endpoint"
    }
  ]
}
```

This configuration suggests the server focus on both a local repository and an API endpoint while keeping them logically separated.

---
modelcontextprotocol/docs/docs/concepts/sampling.mdx
---
---
title: "Sampling"
description: "Let your servers request completions from LLMs"
---

Sampling is a powerful MCP feature that allows servers to request LLM completions through the client, enabling sophisticated agentic behaviors while maintaining security and privacy.

<Info>
  This feature of MCP is not yet supported in the Claude Desktop client.
</Info>

## How sampling works

The sampling flow follows these steps:

1. Server sends a `sampling/createMessage` request to the client
2. Client reviews the request and can modify it
3. Client samples from an LLM
4. Client reviews the completion
5. Client returns the result to the server

This human-in-the-loop design ensures users maintain control over what the LLM sees and generates.

## Message format

Sampling requests use a standardized message format:

```typescript
{
  messages: [
    {
      role: "user" | "assistant",
      content: {
        type: "text" | "image",

        // For text:
        text?: string,

        // For images:
        data?: string,             // base64 encoded
        mimeType?: string
      }
    }
  ],
  modelPreferences?: {
    hints?: [{
      name?: string                // Suggested model name/family
    }],
    costPriority?: number,         // 0-1, importance of minimizing cost
    speedPriority?: number,        // 0-1, importance of low latency
    intelligencePriority?: number  // 0-1, importance of capabilities
  },
  systemPrompt?: string,
  includeContext?: "none" | "thisServer" | "allServers",
  temperature?: number,
  maxTokens: number,
  stopSequences?: string[],
  metadata?: Record<string, unknown>
}
```

## Request parameters

### Messages

The `messages` array contains the conversation history to send to the LLM. Each message has:

- `role`: Either "user" or "assistant"
- `content`: The message content, which can be:
  - Text content with a `text` field
  - Image content with `data` (base64) and `mimeType` fields

### Model preferences

The `modelPreferences` object allows servers to specify their model selection preferences:

- `hints`: Array of model name suggestions that clients can use to select an appropriate model:
  - `name`: String that can match full or partial model names (e.g. "claude-3", "sonnet")
  - Clients may map hints to equivalent models from different providers
  - Multiple hints are evaluated in preference order

- Priority values (0-1 normalized):
  - `costPriority`: Importance of minimizing costs
  - `speedPriority`: Importance of low latency response
  - `intelligencePriority`: Importance of advanced model capabilities

Clients make the final model selection based on these preferences and their available models.

### System prompt

An optional `systemPrompt` field allows servers to request a specific system prompt. The client may modify or ignore this.

### Context inclusion

The `includeContext` parameter specifies what MCP context to include:

- `"none"`: No additional context
- `"thisServer"`: Include context from the requesting server
- `"allServers"`: Include context from all connected MCP servers

The client controls what context is actually included.

### Sampling parameters

Fine-tune the LLM sampling with:

- `temperature`: Controls randomness (0.0 to 1.0)
- `maxTokens`: Maximum tokens to generate
- `stopSequences`: Array of sequences that stop generation
- `metadata`: Additional provider-specific parameters

## Response format

The client returns a completion result:

```typescript
{
  model: string,  // Name of the model used
  stopReason?: "endTurn" | "stopSequence" | "maxTokens" | string,
  role: "user" | "assistant",
  content: {
    type: "text" | "image",
    text?: string,
    data?: string,
    mimeType?: string
  }
}
```

## Example request

Here's an example of requesting sampling from a client:
```json
{
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "What files are in the current directory?"
        }
      }
    ],
    "systemPrompt": "You are a helpful file system assistant.",
    "includeContext": "thisServer",
    "maxTokens": 100
  }
}
```

## Best practices

When implementing sampling:

1. Always provide clear, well-structured prompts
2. Handle both text and image content appropriately
3. Set reasonable token limits
4. Include relevant context through `includeContext`
5. Validate responses before using them
6. Handle errors gracefully
7. Consider rate limiting sampling requests
8. Document expected sampling behavior
9. Test with various model parameters
10. Monitor sampling costs

## Human in the loop controls

Sampling is designed with human oversight in mind:

### For prompts

- Clients should show users the proposed prompt
- Users should be able to modify or reject prompts
- System prompts can be filtered or modified
- Context inclusion is controlled by the client

### For completions

- Clients should show users the completion
- Users should be able to modify or reject completions
- Clients can filter or modify completions
- Users control which model is used

## Security considerations

When implementing sampling:

- Validate all message content
- Sanitize sensitive information
- Implement appropriate rate limits
- Monitor sampling usage
- Encrypt data in transit
- Handle user data privacy
- Audit sampling requests
- Control cost exposure
- Implement timeouts
- Handle model errors gracefully

## Common patterns

### Agentic workflows

Sampling enables agentic patterns like:

- Reading and analyzing resources
- Making decisions based on context
- Generating structured data
- Handling multi-step tasks
- Providing interactive assistance

### Context management

Best practices for context:

- Request minimal necessary context
- Structure context clearly
- Handle context size limits
- Update context as needed
- Clean up stale context

### Error handling

Robust error handling should:

- Catch sampling failures
- Handle timeout errors
- Manage rate limits
- Validate responses
- Provide fallback behaviors
- Log errors appropriately

## Limitations

Be aware of these limitations:

- Sampling depends on client capabilities
- Users control sampling behavior
- Context size has limits
- Rate limits may apply
- Costs should be considered
- Model availability varies
- Response times vary
- Not all content types supported


---
modelcontextprotocol/docs/docs/concepts/tools.mdx
---
---
title: "Tools"
description: "Enable LLMs to perform actions through your server"
---

Tools are a powerful primitive in the Model Context Protocol (MCP) that enable servers to expose executable functionality to clients. Through tools, LLMs can interact with external systems, perform computations, and take actions in the real world.

<Note>
  Tools are designed to be **model-controlled**, meaning that tools are exposed from servers to clients with the intention of the AI model being able to automatically invoke them (with a human in the loop to grant approval).
</Note>

## Overview

Tools in MCP allow servers to expose executable functions that can be invoked by clients and used by LLMs to perform actions. Key aspects of tools include:

- **Discovery**: Clients can list available tools through the `tools/list` endpoint
- **Invocation**: Tools are called using the `tools/call` endpoint, where servers perform the requested operation and return results
- **Flexibility**: Tools can range from simple calculations to complex API interactions

Like [resources](/docs/concepts/resources), tools are identified by unique names and can include descriptions to guide their usage. However, unlike resources, tools represent dynamic operations that can modify state or interact with external systems.

## Tool definition structure

Each tool is defined with the following structure:

```typescript
{
  name: string;          // Unique identifier for the tool
  description?: string;  // Human-readable description
  inputSchema: {         // JSON Schema for the tool's parameters
    type: "object",
    properties: { ... }  // Tool-specific parameters
  },
  annotations?: {        // Optional hints about tool behavior
    title?: string;      // Human-readable title for the tool
    readOnlyHint?: boolean;    // If true, the tool does not modify its environment
    destructiveHint?: boolean; // If true, the tool may perform destructive updates
    idempotentHint?: boolean;  // If true, repeated calls with same args have no additional effect
    openWorldHint?: boolean;   // If true, tool interacts with external entities
  }
}
```

## Implementing tools

Here's an example of implementing a basic tool in an MCP server:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    const server = new Server({
      name: "example-server",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Define available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [{
          name: "calculate_sum",
          description: "Add two numbers together",
          inputSchema: {
            type: "object",
            properties: {
              a: { type: "number" },
              b: { type: "number" }
            },
            required: ["a", "b"]
          }
        }]
      };
    });

    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "calculate_sum") {
        const { a, b } = request.params.arguments;
        return {
          content: [
            {
              type: "text",
              text: String(a + b)
            }
          ]
        };
      }
      throw new Error("Tool not found");
    });
    ```
  </Tab>
  <Tab title="Python">
    ```python
    app = Server("example-server")

    @app.list_tools()
    async def list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name="calculate_sum",
                description="Add two numbers together",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "a": {"type": "number"},
                        "b": {"type": "number"}
                    },
                    "required": ["a", "b"]
                }
            )
        ]

    @app.call_tool()
    async def call_tool(
        name: str,
        arguments: dict
    ) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
        if name == "calculate_sum":
            a = arguments["a"]
            b = arguments["b"]
            result = a + b
            return [types.TextContent(type="text", text=str(result))]
        raise ValueError(f"Tool not found: {name}")
    ```
  </Tab>
</Tabs>

## Example tool patterns

Here are some examples of types of tools that a server could provide:

### System operations

Tools that interact with the local system:

```typescript
{
  name: "execute_command",
  description: "Run a shell command",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      args: { type: "array", items: { type: "string" } }
    }
  }
}
```

### API integrations

Tools that wrap external APIs:

```typescript
{
  name: "github_create_issue",
  description: "Create a GitHub issue",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      labels: { type: "array", items: { type: "string" } }
    }
  }
}
```

### Data processing

Tools that transform or analyze data:

```typescript
{
  name: "analyze_csv",
  description: "Analyze a CSV file",
  inputSchema: {
    type: "object",
    properties: {
      filepath: { type: "string" },
      operations: {
        type: "array",
        items: {
          enum: ["sum", "average", "count"]
        }
      }
    }
  }
}
```

## Best practices

When implementing tools:

1. Provide clear, descriptive names and descriptions
2. Use detailed JSON Schema definitions for parameters
3. Include examples in tool descriptions to demonstrate how the model should use them
4. Implement proper error handling and validation
5. Use progress reporting for long operations
6. Keep tool operations focused and atomic
7. Document expected return value structures
8. Implement proper timeouts
9. Consider rate limiting for resource-intensive operations
10. Log tool usage for debugging and monitoring

## Security considerations

When exposing tools:

### Input validation

- Validate all parameters against the schema
- Sanitize file paths and system commands
- Validate URLs and external identifiers
- Check parameter sizes and ranges
- Prevent command injection

### Access control

- Implement authentication where needed
- Use appropriate authorization checks
- Audit tool usage
- Rate limit requests
- Monitor for abuse

### Error handling

- Don't expose internal errors to clients
- Log security-relevant errors
- Handle timeouts appropriately
- Clean up resources after errors
- Validate return values

## Tool discovery and updates

MCP supports dynamic tool discovery:

1. Clients can list available tools at any time
2. Servers can notify clients when tools change using `notifications/tools/list_changed`
3. Tools can be added or removed during runtime
4. Tool definitions can be updated (though this should be done carefully)

## Error handling

Tool errors should be reported within the result object, not as MCP protocol-level errors. This allows the LLM to see and potentially handle the error. When a tool encounters an error:

1. Set `isError` to `true` in the result
2. Include error details in the `content` array

Here's an example of proper error handling for tools:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    try {
      // Tool operation
      const result = performOperation();
      return {
        content: [
          {
            type: "text",
            text: `Operation successful: ${result}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ]
      };
    }
    ```
  </Tab>
  <Tab title="Python">
    ```python
    try:
        # Tool operation
        result = perform_operation()
        return types.CallToolResult(
            content=[
                types.TextContent(
                    type="text",
                    text=f"Operation successful: {result}"
                )
            ]
        )
    except Exception as error:
        return types.CallToolResult(
            isError=True,
            content=[
                types.TextContent(
                    type="text",
                    text=f"Error: {str(error)}"
                )
            ]
        )
    ```
  </Tab>
</Tabs>

This approach allows the LLM to see that an error occurred and potentially take corrective action or request human intervention.

## Tool annotations

Tool annotations provide additional metadata about a tool's behavior, helping clients understand how to present and manage tools. These annotations are hints that describe the nature and impact of a tool, but should not be relied upon for security decisions.

### Purpose of tool annotations

Tool annotations serve several key purposes:

1. Provide UX-specific information without affecting model context
2. Help clients categorize and present tools appropriately
3. Convey information about a tool's potential side effects
4. Assist in developing intuitive interfaces for tool approval

### Available tool annotations

The MCP specification defines the following annotations for tools:

| Annotation | Type | Default | Description |
|------------|------|---------|-------------|
| `title` | string | - | A human-readable title for the tool, useful for UI display |
| `readOnlyHint` | boolean | false | If true, indicates the tool does not modify its environment |
| `destructiveHint` | boolean | true | If true, the tool may perform destructive updates (only meaningful when `readOnlyHint` is false) |
| `idempotentHint` | boolean | false | If true, calling the tool repeatedly with the same arguments has no additional effect (only meaningful when `readOnlyHint` is false) |
| `openWorldHint` | boolean | true | If true, the tool may interact with an "open world" of external entities |

### Example usage

Here's how to define tools with annotations for different scenarios:

```typescript
// A read-only search tool
{
  name: "web_search",
  description: "Search the web for information",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    },
    required: ["query"]
  },
  annotations: {
    title: "Web Search",
    readOnlyHint: true,
    openWorldHint: true
  }
}

// A destructive file deletion tool
{
  name: "delete_file",
  description: "Delete a file from the filesystem",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  },
  annotations: {
    title: "Delete File",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false
  }
}

// A non-destructive database record creation tool
{
  name: "create_record",
  description: "Create a new record in the database",
  inputSchema: {
    type: "object",
    properties: {
      table: { type: "string" },
      data: { type: "object" }
    },
    required: ["table", "data"]
  },
  annotations: {
    title: "Create Database Record",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  }
}
```

### Integrating annotations in server implementation

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [{
          name: "calculate_sum",
          description: "Add two numbers together",
          inputSchema: {
            type: "object",
            properties: {
              a: { type: "number" },
              b: { type: "number" }
            },
            required: ["a", "b"]
          },
          annotations: {
            title: "Calculate Sum",
            readOnlyHint: true,
            openWorldHint: false
          }
        }]
      };
    });
    ```
  </Tab>
  <Tab title="Python">
    ```python
    from mcp.server.fastmcp import FastMCP
    
    mcp = FastMCP("example-server")
    
    @mcp.tool(
        annotations={
            "title": "Calculate Sum",
            "readOnlyHint": True,
            "openWorldHint": False
        }
    )
    async def calculate_sum(a: float, b: float) -> str:
        """Add two numbers together.
        
        Args:
            a: First number to add
            b: Second number to add
        """
        result = a + b
        return str(result)
    ```
  </Tab>
</Tabs>

### Best practices for tool annotations

1. **Be accurate about side effects**: Clearly indicate whether a tool modifies its environment and whether those modifications are destructive.

2. **Use descriptive titles**: Provide human-friendly titles that clearly describe the tool's purpose.

3. **Indicate idempotency properly**: Mark tools as idempotent only if repeated calls with the same arguments truly have no additional effect.

4. **Set appropriate open/closed world hints**: Indicate whether a tool interacts with a closed system (like a database) or an open system (like the web).

5. **Remember annotations are hints**: All properties in ToolAnnotations are hints and not guaranteed to provide a faithful description of tool behavior. Clients should never make security-critical decisions based solely on annotations.

## Testing tools

A comprehensive testing strategy for MCP tools should cover:

- **Functional testing**: Verify tools execute correctly with valid inputs and handle invalid inputs appropriately
- **Integration testing**: Test tool interaction with external systems using both real and mocked dependencies
- **Security testing**: Validate authentication, authorization, input sanitization, and rate limiting
- **Performance testing**: Check behavior under load, timeout handling, and resource cleanup
- **Error handling**: Ensure tools properly report errors through the MCP protocol and clean up resources


---
modelcontextprotocol/docs/docs/concepts/transports.mdx
---
---
title: "Transports"
description: "Learn about MCP's communication mechanisms"
---

Transports in the Model Context Protocol (MCP) provide the foundation for communication between clients and servers. A transport handles the underlying mechanics of how messages are sent and received.

## Message Format

MCP uses [JSON-RPC](https://www.jsonrpc.org/) 2.0 as its wire format. The transport layer is responsible for converting MCP protocol messages into JSON-RPC format for transmission and converting received JSON-RPC messages back into MCP protocol messages.

There are three types of JSON-RPC messages used:

### Requests
```typescript
{
  jsonrpc: "2.0",
  id: number | string,
  method: string,
  params?: object
}
```

### Responses
```typescript
{
  jsonrpc: "2.0",
  id: number | string,
  result?: object,
  error?: {
    code: number,
    message: string,
    data?: unknown
  }
}
```

### Notifications
```typescript
{
  jsonrpc: "2.0",
  method: string,
  params?: object
}
```

## Built-in Transport Types

MCP includes two standard transport implementations:

### Standard Input/Output (stdio)

The stdio transport enables communication through standard input and output streams. This is particularly useful for local integrations and command-line tools.

Use stdio when:
- Building command-line tools
- Implementing local integrations
- Needing simple process communication
- Working with shell scripts

<Tabs>
  <Tab title="TypeScript (Server)">
    ```typescript
    const server = new Server({
      name: "example-server",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    ```
  </Tab>
  <Tab title="TypeScript (Client)">
    ```typescript
    const client = new Client({
      name: "example-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    const transport = new StdioClientTransport({
      command: "./server",
      args: ["--option", "value"]
    });
    await client.connect(transport);
    ```
  </Tab>
  <Tab title="Python (Server)">
    ```python
    app = Server("example-server")

    async with stdio_server() as streams:
        await app.run(
            streams[0],
            streams[1],
            app.create_initialization_options()
        )
    ```
  </Tab>
  <Tab title="Python (Client)">
    ```python
    params = StdioServerParameters(
        command="./server",
        args=["--option", "value"]
    )

    async with stdio_client(params) as streams:
        async with ClientSession(streams[0], streams[1]) as session:
            await session.initialize()
    ```
  </Tab>
</Tabs>

### Server-Sent Events (SSE)

SSE transport enables server-to-client streaming with HTTP POST requests for client-to-server communication.

Use SSE when:
- Only server-to-client streaming is needed
- Working with restricted networks
- Implementing simple updates

#### Security Warning: DNS Rebinding Attacks

SSE transports can be vulnerable to DNS rebinding attacks if not properly secured. To prevent this:

1. **Always validate Origin headers** on incoming SSE connections to ensure they come from expected sources
2. **Avoid binding servers to all network interfaces** (0.0.0.0) when running locally - bind only to localhost (127.0.0.1) instead
3. **Implement proper authentication** for all SSE connections

Without these protections, attackers could use DNS rebinding to interact with local MCP servers from remote websites.

<Tabs>
  <Tab title="TypeScript (Server)">
    ```typescript
    import express from "express";
    
    const app = express();
    
    const server = new Server({
      name: "example-server",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
    
    let transport: SSEServerTransport | null = null;

    app.get("/sse", (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      server.connect(transport);
    });

    app.post("/messages", (req, res) => {
      if (transport) {
        transport.handlePostMessage(req, res);
      }
    });

    app.listen(3000);
    ```
  </Tab>
  <Tab title="TypeScript (Client)">
    ```typescript
    const client = new Client({
      name: "example-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    const transport = new SSEClientTransport(
      new URL("http://localhost:3000/sse")
    );
    await client.connect(transport);
    ```
  </Tab>
  <Tab title="Python (Server)">
    ```python
    from mcp.server.sse import SseServerTransport
    from starlette.applications import Starlette
    from starlette.routing import Route

    app = Server("example-server")
    sse = SseServerTransport("/messages")

    async def handle_sse(scope, receive, send):
        async with sse.connect_sse(scope, receive, send) as streams:
            await app.run(streams[0], streams[1], app.create_initialization_options())

    async def handle_messages(scope, receive, send):
        await sse.handle_post_message(scope, receive, send)

    starlette_app = Starlette(
        routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages", endpoint=handle_messages, methods=["POST"]),
        ]
    )
    ```
  </Tab>
  <Tab title="Python (Client)">
    ```python
    async with sse_client("http://localhost:8000/sse") as streams:
        async with ClientSession(streams[0], streams[1]) as session:
            await session.initialize()
    ```
  </Tab>
</Tabs>

## Custom Transports

MCP makes it easy to implement custom transports for specific needs. Any transport implementation just needs to conform to the Transport interface:

You can implement custom transports for:
- Custom network protocols
- Specialized communication channels
- Integration with existing systems
- Performance optimization

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    interface Transport {
      // Start processing messages
      start(): Promise<void>;

      // Send a JSON-RPC message
      send(message: JSONRPCMessage): Promise<void>;

      // Close the connection
      close(): Promise<void>;

      // Callbacks
      onclose?: () => void;
      onerror?: (error: Error) => void;
      onmessage?: (message: JSONRPCMessage) => void;
    }
    ```
  </Tab>
  <Tab title="Python">
    Note that while MCP Servers are often implemented with asyncio, we recommend
    implementing low-level interfaces like transports with `anyio` for wider compatibility.
    ```python
    @contextmanager
    async def create_transport(
        read_stream: MemoryObjectReceiveStream[JSONRPCMessage | Exception],
        write_stream: MemoryObjectSendStream[JSONRPCMessage]
    ):
        """
        Transport interface for MCP.

        Args:
            read_stream: Stream to read incoming messages from
            write_stream: Stream to write outgoing messages to
        """
        async with anyio.create_task_group() as tg:
            try:
                # Start processing messages
                tg.start_soon(lambda: process_messages(read_stream))

                # Send messages
                async with write_stream:
                    yield write_stream

            except Exception as exc:
                # Handle errors
                raise exc
            finally:
                # Clean up
                tg.cancel_scope.cancel()
                await write_stream.aclose()
                await read_stream.aclose()
    ```
  </Tab>
</Tabs>

## Error Handling

Transport implementations should handle various error scenarios:

1. Connection errors
2. Message parsing errors
3. Protocol errors
4. Network timeouts
5. Resource cleanup

Example error handling:

<Tabs>
  <Tab title="TypeScript">
    ```typescript
    class ExampleTransport implements Transport {
      async start() {
        try {
          // Connection logic
        } catch (error) {
          this.onerror?.(new Error(`Failed to connect: ${error}`));
          throw error;
        }
      }

      async send(message: JSONRPCMessage) {
        try {
          // Sending logic
        } catch (error) {
          this.onerror?.(new Error(`Failed to send message: ${error}`));
          throw error;
        }
      }
    }
    ```
  </Tab>
  <Tab title="Python">
  Note that while MCP Servers are often implemented with asyncio, we recommend
  implementing low-level interfaces like transports with `anyio` for wider compatibility.
    ```python
    @contextmanager
    async def example_transport(scope: Scope, receive: Receive, send: Send):
        try:
            # Create streams for bidirectional communication
            read_stream_writer, read_stream = anyio.create_memory_object_stream(0)
            write_stream, write_stream_reader = anyio.create_memory_object_stream(0)

            async def message_handler():
                try:
                    async with read_stream_writer:
                        # Message handling logic
                        pass
                except Exception as exc:
                    logger.error(f"Failed to handle message: {exc}")
                    raise exc

            async with anyio.create_task_group() as tg:
                tg.start_soon(message_handler)
                try:
                    # Yield streams for communication
                    yield read_stream, write_stream
                except Exception as exc:
                    logger.error(f"Transport error: {exc}")
                    raise exc
                finally:
                    tg.cancel_scope.cancel()
                    await write_stream.aclose()
                    await read_stream.aclose()
        except Exception as exc:
            logger.error(f"Failed to initialize transport: {exc}")
            raise exc
    ```
  </Tab>
</Tabs>

## Best Practices

When implementing or using MCP transport:

1. Handle connection lifecycle properly
2. Implement proper error handling
3. Clean up resources on connection close
4. Use appropriate timeouts
5. Validate messages before sending
6. Log transport events for debugging
7. Implement reconnection logic when appropriate
8. Handle backpressure in message queues
9. Monitor connection health
10. Implement proper security measures

## Security Considerations

When implementing transport:

### Authentication and Authorization
- Implement proper authentication mechanisms
- Validate client credentials
- Use secure token handling
- Implement authorization checks

### Data Security
- Use TLS for network transport
- Encrypt sensitive data
- Validate message integrity
- Implement message size limits
- Sanitize input data

### Network Security
- Implement rate limiting
- Use appropriate timeouts
- Handle denial of service scenarios
- Monitor for unusual patterns
- Implement proper firewall rules
- For SSE transports, validate Origin headers to prevent DNS rebinding attacks
- For local SSE servers, bind only to localhost (127.0.0.1) instead of all interfaces (0.0.0.0)

## Debugging Transport

Tips for debugging transport issues:

1. Enable debug logging
2. Monitor message flow
3. Check connection states
4. Validate message formats
5. Test error scenarios
6. Use network analysis tools
7. Implement health checks
8. Monitor resource usage
9. Test edge cases
10. Use proper error tracking


---
modelcontextprotocol/docs/docs/tools/debugging.mdx
---
---
title: Debugging
description: A comprehensive guide to debugging Model Context Protocol (MCP) integrations
---

Effective debugging is essential when developing MCP servers or integrating them with applications. This guide covers the debugging tools and approaches available in the MCP ecosystem.

<Info>
  This guide is for macOS. Guides for other platforms are coming soon.
</Info>

## Debugging tools overview

MCP provides several tools for debugging at different levels:

1. **MCP Inspector**
   - Interactive debugging interface
   - Direct server testing
   - See the [Inspector guide](/docs/tools/inspector) for details

2. **Claude Desktop Developer Tools**
   - Integration testing
   - Log collection
   - Chrome DevTools integration

3. **Server Logging**
   - Custom logging implementations
   - Error tracking
   - Performance monitoring

## Debugging in Claude Desktop

### Checking server status

The Claude.app interface provides basic server status information:

1. Click the <img src="/images/claude-desktop-mcp-plug-icon.svg" style={{display: 'inline', margin: 0, height: '1.3em'}} /> icon to view:
   - Connected servers
   - Available prompts and resources

2. Click the <img src="/images/claude-desktop-mcp-hammer-icon.svg" style={{display: 'inline', margin: 0, height: '1.3em'}} /> icon to view:
   - Tools made available to the model

### Viewing logs

Review detailed MCP logs from Claude Desktop:

```bash
# Follow logs in real-time
tail -n 20 -F ~/Library/Logs/Claude/mcp*.log
```

The logs capture:
- Server connection events
- Configuration issues
- Runtime errors
- Message exchanges

### Using Chrome DevTools

Access Chrome's developer tools inside Claude Desktop to investigate client-side errors:

1. Create a `developer_settings.json` file with `allowDevTools` set to true:

```bash
echo '{"allowDevTools": true}' > ~/Library/Application\ Support/Claude/developer_settings.json
```

2. Open DevTools: `Command-Option-Shift-i`

Note: You'll see two DevTools windows:
- Main content window
- App title bar window

Use the Console panel to inspect client-side errors.

Use the Network panel to inspect:
- Message payloads
- Connection timing

## Common issues

### Working directory

When using MCP servers with Claude Desktop:

- The working directory for servers launched via `claude_desktop_config.json` may be undefined (like `/` on macOS) since Claude Desktop could be started from anywhere
- Always use absolute paths in your configuration and `.env` files to ensure reliable operation
- For testing servers directly via command line, the working directory will be where you run the command

For example in `claude_desktop_config.json`, use:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/data"]
}
```
Instead of relative paths like `./data`

### Environment variables

MCP servers inherit only a subset of environment variables automatically, like `USER`, `HOME`, and `PATH`.

To override the default variables or provide your own, you can specify an `env` key in `claude_desktop_config.json`:

```json
{
  "myserver": {
    "command": "mcp-server-myapp",
    "env": {
      "MYAPP_API_KEY": "some_key",
    }
  }
}
```

### Server initialization

Common initialization problems:

1. **Path Issues**
   - Incorrect server executable path
   - Missing required files
   - Permission problems
   - Try using an absolute path for `command`

2. **Configuration Errors**
   - Invalid JSON syntax
   - Missing required fields
   - Type mismatches

3. **Environment Problems**
   - Missing environment variables
   - Incorrect variable values
   - Permission restrictions

### Connection problems

When servers fail to connect:

1. Check Claude Desktop logs
2. Verify server process is running
3. Test standalone with [Inspector](/docs/tools/inspector)
4. Verify protocol compatibility

## Implementing logging

### Server-side logging

When building a server that uses the local stdio [transport](/docs/concepts/transports), all messages logged to stderr (standard error) will be captured by the host application (e.g., Claude Desktop) automatically.

<Warning>
  Local MCP servers should not log messages to stdout (standard out), as this will interfere with protocol operation.
</Warning>

For all [transports](/docs/concepts/transports), you can also provide logging to the client by sending a log message notification:

<Tabs>
  <Tab title="Python">
    ```python
    server.request_context.session.send_log_message(
      level="info",
      data="Server started successfully",
    )
    ```
  </Tab>
  <Tab title="TypeScript">
    ```typescript
    server.sendLoggingMessage({
      level: "info",
      data: "Server started successfully",
    });
    ```
  </Tab>
</Tabs>

Important events to log:
- Initialization steps
- Resource access
- Tool execution
- Error conditions
- Performance metrics

### Client-side logging

In client applications:

1. Enable debug logging
2. Monitor network traffic
3. Track message exchanges
4. Record error states

## Debugging workflow

### Development cycle

1. Initial Development
   - Use [Inspector](/docs/tools/inspector) for basic testing
   - Implement core functionality
   - Add logging points

2. Integration Testing
   - Test in Claude Desktop
   - Monitor logs
   - Check error handling

### Testing changes

To test changes efficiently:

- **Configuration changes**: Restart Claude Desktop
- **Server code changes**: Use Command-R to reload
- **Quick iteration**: Use [Inspector](/docs/tools/inspector) during development

## Best practices

### Logging strategy

1. **Structured Logging**
   - Use consistent formats
   - Include context
   - Add timestamps
   - Track request IDs

2. **Error Handling**
   - Log stack traces
   - Include error context
   - Track error patterns
   - Monitor recovery

3. **Performance Tracking**
   - Log operation timing
   - Monitor resource usage
   - Track message sizes
   - Measure latency

### Security considerations

When debugging:

1. **Sensitive Data**
   - Sanitize logs
   - Protect credentials
   - Mask personal information

2. **Access Control**
   - Verify permissions
   - Check authentication
   - Monitor access patterns

## Getting help

When encountering issues:

1. **First Steps**
   - Check server logs
   - Test with [Inspector](/docs/tools/inspector)
   - Review configuration
   - Verify environment

2. **Support Channels**
   - GitHub issues
   - GitHub discussions

3. **Providing Information**
   - Log excerpts
   - Configuration files
   - Steps to reproduce
   - Environment details

## Next steps

<CardGroup cols={2}>
  <Card
    title="MCP Inspector"
    icon="magnifying-glass"
    href="/docs/tools/inspector"
  >
    Learn to use the MCP Inspector
  </Card>
</CardGroup>


---
modelcontextprotocol/docs/docs/tools/inspector.mdx
---
---
title: Inspector
description: In-depth guide to using the MCP Inspector for testing and debugging Model Context Protocol servers
---

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is an interactive developer tool for testing and debugging MCP servers. While the [Debugging Guide](/docs/tools/debugging) covers the Inspector as part of the overall debugging toolkit, this document provides a detailed exploration of the Inspector's features and capabilities.

## Getting started

### Installation and basic usage

The Inspector runs directly through `npx` without requiring installation:


```bash
npx @modelcontextprotocol/inspector <command>
```

```bash
npx @modelcontextprotocol/inspector <command> <arg1> <arg2>
```

#### Inspecting servers from NPM or PyPi

A common way to start server packages from [NPM](https://npmjs.com) or [PyPi](https://pypi.com).

<Tabs>

  <Tab title="NPM package">
  ```bash
  npx -y @modelcontextprotocol/inspector npx <package-name> <args>
  # For example
  npx -y @modelcontextprotocol/inspector npx server-postgres postgres://127.0.0.1/testdb
  ```
  </Tab>

  <Tab title="PyPi package">
  ```bash
  npx @modelcontextprotocol/inspector uvx <package-name> <args>
  # For example
  npx @modelcontextprotocol/inspector uvx mcp-server-git --repository ~/code/mcp/servers.git
  ```
  </Tab>
</Tabs>

#### Inspecting locally developed servers

To inspect servers locally developed or downloaded as a repository, the most common
way is:

<Tabs>
  <Tab title="TypeScript">
  ```bash
  npx @modelcontextprotocol/inspector node path/to/server/index.js args...
  ```
  </Tab>
  <Tab title="Python">
  ```bash
  npx @modelcontextprotocol/inspector \
    uv \
    --directory path/to/server \
    run \
    package-name \
    args...
  ```
  </Tab>
</Tabs>

Please carefully read any attached README for the most accurate instructions.

## Feature overview

<Frame caption="The MCP Inspector interface">
  <img src="/images/mcp-inspector.png" />
</Frame>

The Inspector provides several features for interacting with your MCP server:

### Server connection pane
- Allows selecting the [transport](/docs/concepts/transports) for connecting to the server
- For local servers, supports customizing the command-line arguments and environment

### Resources tab
- Lists all available resources
- Shows resource metadata (MIME types, descriptions)
- Allows resource content inspection
- Supports subscription testing

### Prompts tab
- Displays available prompt templates
- Shows prompt arguments and descriptions
- Enables prompt testing with custom arguments
- Previews generated messages

### Tools tab
- Lists available tools
- Shows tool schemas and descriptions
- Enables tool testing with custom inputs
- Displays tool execution results

### Notifications pane
- Presents all logs recorded from the server
- Shows notifications received from the server

## Best practices

### Development workflow

1. Start Development
   - Launch Inspector with your server
   - Verify basic connectivity
   - Check capability negotiation

2. Iterative testing
   - Make server changes
   - Rebuild the server
   - Reconnect the Inspector
   - Test affected features
   - Monitor messages

3. Test edge cases
   - Invalid inputs
   - Missing prompt arguments
   - Concurrent operations
   - Verify error handling and error responses

## Next steps

<CardGroup cols={2}>
    <Card
        title="Inspector Repository"
        icon="github"
        href="https://github.com/modelcontextprotocol/inspector"
    >
        Check out the MCP Inspector source code
    </Card>

    <Card
        title="Debugging Guide"
        icon="bug"
        href="/docs/tools/debugging"
    >
        Learn about broader debugging strategies
    </Card>
</CardGroup>


---
modelcontextprotocol/docs/images/claude-desktop-mcp-hammer-icon.svg
---
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M31.4175 14L22.985 5.51002C20.7329 3.26243 17.6811 2.00012 14.4993 2.00012C11.3176 2.00012 8.26581 3.26243 6.01372 5.51002L6.00247 5.52127L4.28122 7.30002C4.10292 7.49163 4.00685 7.74552 4.01364 8.00717C4.02043 8.26883 4.12954 8.51739 4.31754 8.6995C4.50554 8.88161 4.75745 8.98276 5.01919 8.98122C5.28092 8.97968 5.53163 8.87558 5.71747 8.69127L7.43372 6.91877C8.12421 6.22842 8.91217 5.64303 9.77247 5.18127L15.585 11L3.58497 23C3.39921 23.1857 3.25185 23.4062 3.15131 23.6489C3.05077 23.8916 2.99902 24.1517 2.99902 24.4144C2.99902 24.6771 3.05077 24.9372 3.15131 25.1799C3.25185 25.4225 3.39921 25.643 3.58497 25.8288L6.17122 28.415C6.35694 28.6008 6.57744 28.7481 6.82012 28.8487C7.06281 28.9492 7.32291 29.001 7.5856 29.001C7.84828 29.001 8.10839 28.9492 8.35107 28.8487C8.59375 28.7481 8.81425 28.6008 8.99997 28.415L21 16.415L22.7925 18.2075L25 20.4125C25.1857 20.5983 25.4062 20.7456 25.6489 20.8462C25.8916 20.9467 26.1517 20.9985 26.4143 20.9985C26.677 20.9985 26.9371 20.9467 27.1798 20.8462C27.4225 20.7456 27.643 20.5983 27.8287 20.4125L31.415 16.8263C31.7897 16.4516 32.0005 15.9436 32.0009 15.4137C32.0014 14.8838 31.7915 14.3753 31.4175 14ZM7.58497 27L4.99997 24.4138L13.5 15.9138L16.085 18.5L7.58497 27ZM20.2925 14.29L17.5 17.0838L14.9137 14.5L17.7075 11.7063C17.8004 11.6134 17.8742 11.5031 17.9245 11.3817C17.9749 11.2603 18.0008 11.1302 18.0008 10.9988C18.0008 10.8673 17.9749 10.7372 17.9245 10.6158C17.8742 10.4944 17.8004 10.3841 17.7075 10.2913L11.79 4.37502C13.4996 3.89351 15.3067 3.87606 17.0253 4.32445C18.744 4.77284 20.3122 5.67089 21.5687 6.92627L27.0962 12.49L23.5 16.0825L21.7075 14.29C21.6146 14.197 21.5043 14.1233 21.3829 14.073C21.2615 14.0226 21.1314 13.9967 21 13.9967C20.8686 13.9967 20.7384 14.0226 20.617 14.073C20.4956 14.1233 20.3853 14.197 20.2925 14.29ZM26.4175 18.9975L24.9175 17.4975L28.5 13.9063L30 15.4063L26.4175 18.9975Z" fill="#343330"/>
</svg>


---
modelcontextprotocol/docs/images/claude-desktop-mcp-plug-icon.svg
---
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.7076 17.2926C18.6147 17.1996 18.5044 17.1258 18.383 17.0755C18.2616 17.0252 18.1315 16.9993 18.0001 16.9993C17.8687 16.9993 17.7385 17.0252 17.6171 17.0755C17.4957 17.1258 17.3854 17.1996 17.2926 17.2926L15.0001 19.5863L12.4138 17.0001L14.7076 14.7076C14.8952 14.5199 15.0006 14.2654 15.0006 14.0001C15.0006 13.7347 14.8952 13.4802 14.7076 13.2926C14.5199 13.1049 14.2654 12.9995 14.0001 12.9995C13.7347 12.9995 13.4802 13.1049 13.2926 13.2926L11.0001 15.5863L8.70757 13.2926C8.51993 13.1049 8.26543 12.9995 8.00007 12.9995C7.7347 12.9995 7.48021 13.1049 7.29257 13.2926C7.10493 13.4802 6.99951 13.7347 6.99951 14.0001C6.99951 14.2654 7.10493 14.5199 7.29257 14.7076L8.08632 15.5001L5.17132 18.4138C4.79979 18.7852 4.50507 19.2262 4.30399 19.7116C4.10292 20.197 3.99942 20.7172 3.99942 21.2426C3.99942 21.7679 4.10292 22.2881 4.30399 22.7735C4.50507 23.2589 4.79979 23.6999 5.17132 24.0713L5.84382 24.7426L2.29257 28.2926C2.19966 28.3855 2.12596 28.4958 2.07567 28.6172C2.02539 28.7386 1.99951 28.8687 1.99951 29.0001C1.99951 29.1314 2.02539 29.2616 2.07567 29.3829C2.12596 29.5043 2.19966 29.6146 2.29257 29.7076C2.48021 29.8952 2.7347 30.0006 3.00007 30.0006C3.13146 30.0006 3.26157 29.9747 3.38296 29.9244C3.50436 29.8742 3.61466 29.8005 3.70757 29.7076L7.25757 26.1563L7.92882 26.8288C8.30026 27.2003 8.74126 27.4951 9.22662 27.6961C9.71198 27.8972 10.2322 28.0007 10.7576 28.0007C11.2829 28.0007 11.8032 27.8972 12.2885 27.6961C12.7739 27.4951 13.2149 27.2003 13.5863 26.8288L16.5001 23.9138L17.2926 24.7076C17.3855 24.8005 17.4958 24.8742 17.6172 24.9244C17.7386 24.9747 17.8687 25.0006 18.0001 25.0006C18.1315 25.0006 18.2616 24.9747 18.383 24.9244C18.5044 24.8742 18.6147 24.8005 18.7076 24.7076C18.8005 24.6146 18.8742 24.5043 18.9245 24.3829C18.9747 24.2616 19.0006 24.1314 19.0006 24.0001C19.0006 23.8687 18.9747 23.7386 18.9245 23.6172C18.8742 23.4958 18.8005 23.3855 18.7076 23.2926L16.4138 21.0001L18.7076 18.7076C18.8005 18.6147 18.8743 18.5044 18.9246 18.383C18.975 18.2616 19.0009 18.1315 19.0009 18.0001C19.0009 17.8686 18.975 17.7385 18.9246 17.6171C18.8743 17.4957 18.8005 17.3854 18.7076 17.2926ZM12.1713 25.4176C11.7963 25.7923 11.2878 26.0029 10.7576 26.0029C10.2274 26.0029 9.71885 25.7923 9.34382 25.4176L6.58632 22.6563C6.21153 22.2813 6.00099 21.7728 6.00099 21.2426C6.00099 20.7123 6.21153 20.2038 6.58632 19.8288L9.50007 16.9138L15.0863 22.5001L12.1713 25.4176ZM29.7076 2.29255C29.6147 2.19958 29.5044 2.12582 29.383 2.07549C29.2616 2.02517 29.1315 1.99927 29.0001 1.99927C28.8687 1.99927 28.7385 2.02517 28.6171 2.07549C28.4957 2.12582 28.3854 2.19958 28.2926 2.29255L24.7426 5.8438L24.0713 5.1713C23.3203 4.42249 22.3031 4.00199 21.2426 4.00199C20.1821 4.00199 19.1648 4.42249 18.4138 5.1713L15.5001 8.0863L14.7076 7.29255C14.5199 7.10491 14.2654 6.9995 14.0001 6.9995C13.7347 6.9995 13.4802 7.10491 13.2926 7.29255C13.1049 7.4802 12.9995 7.73469 12.9995 8.00005C12.9995 8.26542 13.1049 8.51991 13.2926 8.70755L23.2926 18.7076C23.3855 18.8005 23.4958 18.8742 23.6172 18.9244C23.7386 18.9747 23.8687 19.0006 24.0001 19.0006C24.1315 19.0006 24.2616 18.9747 24.383 18.9244C24.5044 18.8742 24.6147 18.8005 24.7076 18.7076C24.8005 18.6146 24.8742 18.5043 24.9245 18.3829C24.9747 18.2616 25.0006 18.1314 25.0006 18.0001C25.0006 17.8687 24.9747 17.7386 24.9245 17.6172C24.8742 17.4958 24.8005 17.3855 24.7076 17.2926L23.9138 16.5001L26.8288 13.5863C27.2003 13.2149 27.4951 12.7739 27.6961 12.2885C27.8972 11.8031 28.0007 11.2829 28.0007 10.7576C28.0007 10.2322 27.8972 9.71197 27.6961 9.22661C27.4951 8.74125 27.2003 8.30025 26.8288 7.9288L26.1563 7.25755L29.7076 3.70755C29.8005 3.61468 29.8743 3.50439 29.9246 3.38299C29.975 3.2616 30.0009 3.13147 30.0009 3.00005C30.0009 2.86864 29.975 2.73851 29.9246 2.61711C29.8743 2.49572 29.8005 2.38543 29.7076 2.29255ZM25.4138 12.1676L22.5001 15.0863L16.9138 9.50005L19.8288 6.5863C20.2039 6.21151 20.7124 6.00098 21.2426 6.00098C21.7728 6.00098 22.2813 6.21151 22.6563 6.5863L25.4138 9.3363C25.6005 9.52214 25.7487 9.74303 25.8498 9.98629C25.9509 10.2295 26.0029 10.4904 26.0029 10.7538C26.0029 11.0172 25.9509 11.2781 25.8498 11.5213C25.7487 11.7646 25.6005 11.9855 25.4138 12.1713V12.1676Z" fill="#343330"/>
</svg>


---
modelcontextprotocol/docs/images/hero-dark.svg
---
<svg width="700" height="320" viewBox="0 0 700 320" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2862_30)">
<rect width="700" height="320" rx="16" fill="url(#paint0_linear_2862_30)"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="white"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="url(#paint1_radial_2862_30)"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="black" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="url(#paint2_linear_2862_30)" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M311.72 247.034C283.108 246.887 258.409 231.208 246.538 201.531C234.656 171.825 238.271 134.702 253.583 101.377C282.195 101.524 306.894 117.203 318.765 146.88C330.647 176.586 327.031 213.709 311.72 247.034Z" stroke="url(#paint3_linear_2862_30)" stroke-opacity="0.05" stroke-width="0.530516"/>
<path d="M305.839 247.174C343.92 237.419 377.154 210.619 393.585 171.64C410.017 132.661 405.98 90.1988 386.347 56.1934C348.266 65.9477 315.032 92.7486 298.601 131.728C282.169 170.706 286.206 213.168 305.839 247.174Z" fill="white"/>
<path d="M305.839 247.174C343.92 237.419 377.154 210.619 393.585 171.64C410.017 132.661 405.98 90.1988 386.347 56.1934C348.266 65.9477 315.032 92.7486 298.601 131.728C282.169 170.706 286.206 213.168 305.839 247.174Z" fill="url(#paint4_radial_2862_30)"/>
<path d="M393.341 171.537C376.971 210.369 343.89 237.091 305.969 246.867C286.462 212.959 282.476 170.663 298.845 131.831C315.215 92.9978 348.295 66.2765 386.217 56.5004C405.724 90.4077 409.71 132.704 393.341 171.537Z" stroke="url(#paint5_linear_2862_30)" stroke-opacity="0.05" stroke-width="0.530516"/>
<path d="M305.686 246.995C329.749 266.114 361.965 272.832 393.67 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.045 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="white"/>
<path d="M305.686 246.995C329.749 266.114 361.965 272.832 393.67 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.045 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="url(#paint6_radial_2862_30)"/>
<path d="M305.686 246.995C329.749 266.114 361.965 272.832 393.67 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.045 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="black" fill-opacity="0.2" style="mix-blend-mode:hard-light"/>
<path d="M305.686 246.995C329.749 266.114 361.965 272.832 393.67 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.045 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="url(#paint7_linear_2862_30)" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M393.586 261.878C362.034 272.529 329.98 265.88 306.002 246.907C317.534 215.919 341.57 190.327 373.13 179.673C404.681 169.023 436.735 175.671 460.714 194.644C449.181 225.632 425.145 251.224 393.586 261.878Z" stroke="url(#paint8_linear_2862_30)" stroke-opacity="0.05" stroke-width="0.530516"/>
<g opacity="0.8" filter="url(#filter0_f_2862_30)">
<circle cx="660" cy="-60" r="160" fill="#18E244" fill-opacity="0.4"/>
</g>
<g opacity="0.8" filter="url(#filter1_f_2862_30)">
<circle cx="20" cy="213" r="160" fill="#18CAE2" fill-opacity="0.33"/>
</g>
<g opacity="0.8" filter="url(#filter2_f_2862_30)">
<circle cx="660" cy="480" r="160" fill="#18E2B2" fill-opacity="0.52"/>
</g>
<g opacity="0.8" filter="url(#filter3_f_2862_30)">
<circle cx="20" cy="413" r="160" fill="#4018E2" fill-opacity="0.22"/>
</g>
<path opacity="0.2" d="M0 50H700" stroke="url(#paint9_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.1" d="M0 82H700" stroke="url(#paint10_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.2" d="M239 0L239 320" stroke="url(#paint11_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.1" d="M271 0L271 320" stroke="url(#paint12_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.2" d="M461 0L461 320" stroke="url(#paint13_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.1" d="M429 0L429 320" stroke="url(#paint14_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.2" d="M0 271H700" stroke="url(#paint15_radial_2862_30)" stroke-dasharray="4 4"/>
<path opacity="0.1" d="M0 239H700" stroke="url(#paint16_radial_2862_30)" stroke-dasharray="4 4"/>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 160H700" stroke="url(#paint17_linear_2862_30)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.2">
<path d="M511 -1L189 321" stroke="url(#paint18_linear_2862_30)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.2">
<path d="M511 321L189 -1" stroke="url(#paint19_linear_2862_30)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<circle cx="350" cy="160" r="111" stroke="white"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<circle cx="350" cy="160" r="79" stroke="white"/>
</g>
</g>
<defs>
<filter id="filter0_f_2862_30" x="260" y="-460" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_30"/>
</filter>
<filter id="filter1_f_2862_30" x="-380" y="-187" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_30"/>
</filter>
<filter id="filter2_f_2862_30" x="260" y="80" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_30"/>
</filter>
<filter id="filter3_f_2862_30" x="-380" y="13" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_30"/>
</filter>
<linearGradient id="paint0_linear_2862_30" x1="1.04308e-05" y1="320" x2="710.784" y2="26.0793" gradientUnits="userSpaceOnUse">
<stop stop-color="#18E299" stop-opacity="0.09"/>
<stop offset="0.729167" stop-color="#0D9373" stop-opacity="0.08"/>
</linearGradient>
<radialGradient id="paint1_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(208.697 189.703) rotate(-10.029) scale(169.097 167.466)">
<stop stop-color="#00B0BB"/>
<stop offset="1" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint2_linear_2862_30" x1="306.587" y1="93.5598" x2="252.341" y2="224.228" gradientUnits="userSpaceOnUse">
<stop stop-color="#18E299"/>
<stop offset="1"/>
</linearGradient>
<linearGradient id="paint3_linear_2862_30" x1="311.84" y1="123.717" x2="253.579" y2="224.761" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<radialGradient id="paint4_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(313.407 243.64) rotate(-75.7542) scale(203.632 223.902)">
<stop stop-color="#00BBBB"/>
<stop offset="0.712616" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint5_linear_2862_30" x1="308.586" y1="102.284" x2="383.487" y2="201.169" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<radialGradient id="paint6_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(311.446 249.925) rotate(-20.3524) scale(174.776 163.096)">
<stop stop-color="#00B0BB"/>
<stop offset="1" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint7_linear_2862_30" x1="395.842" y1="169.781" x2="332.121" y2="263.82" gradientUnits="userSpaceOnUse">
<stop stop-color="#00B1BC"/>
<stop offset="1"/>
</linearGradient>
<linearGradient id="paint8_linear_2862_30" x1="395.842" y1="169.781" x2="370.99" y2="271.799" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<radialGradient id="paint9_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(350 50) scale(398.125 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint10_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(350 82) scale(398.125 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint11_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(239 160) rotate(90) scale(182 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint12_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(271 160) rotate(90) scale(182 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint13_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(461 160) rotate(90) scale(182 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint14_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(429 160) rotate(90) scale(182 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint15_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(350 271) scale(398.125 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint16_radial_2862_30" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(350 239) scale(398.125 182)">
<stop offset="0.348958" stop-color="#84FFD3"/>
<stop offset="0.880208" stop-color="#18E299" stop-opacity="0"/>
</radialGradient>
<linearGradient id="paint17_linear_2862_30" x1="0" y1="160" x2="700" y2="160" gradientUnits="userSpaceOnUse">
<stop stop-color="white" stop-opacity="0.1"/>
<stop offset="0.5" stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0.1"/>
</linearGradient>
<linearGradient id="paint18_linear_2862_30" x1="511" y1="-1" x2="189" y2="321" gradientUnits="userSpaceOnUse">
<stop stop-color="white" stop-opacity="0.1"/>
<stop offset="0.5" stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0.1"/>
</linearGradient>
<linearGradient id="paint19_linear_2862_30" x1="511" y1="321" x2="189" y2="-0.999997" gradientUnits="userSpaceOnUse">
<stop stop-color="white" stop-opacity="0.1"/>
<stop offset="0.5" stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0.1"/>
</linearGradient>
<clipPath id="clip0_2862_30">
<rect width="700" height="320" rx="16" fill="white"/>
</clipPath>
</defs>
</svg>


---
modelcontextprotocol/docs/images/hero-light.svg
---
<svg width="700" height="320" viewBox="0 0 700 320" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2862_278)">
<rect width="700" height="320" rx="16" fill="url(#paint0_linear_2862_278)"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="white"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="url(#paint1_radial_2862_278)"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="black" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M311.889 247.3C283.097 247.215 258.226 231.466 246.292 201.629C234.357 171.793 238.02 134.523 253.414 101.112C282.206 101.197 307.077 116.945 319.011 146.782C330.946 176.619 327.283 213.888 311.889 247.3Z" fill="url(#paint2_linear_2862_278)" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M311.72 247.034C283.108 246.887 258.409 231.208 246.538 201.531C234.656 171.825 238.271 134.702 253.583 101.377C282.195 101.524 306.894 117.203 318.765 146.88C330.647 176.586 327.031 213.709 311.72 247.034Z" stroke="url(#paint3_linear_2862_278)" stroke-opacity="0.05" stroke-width="0.530516"/>
<path d="M305.839 247.174C343.92 237.419 377.154 210.619 393.585 171.64C410.017 132.661 405.98 90.1988 386.347 56.1934C348.266 65.9477 315.032 92.7486 298.601 131.728C282.169 170.706 286.206 213.168 305.839 247.174Z" fill="white"/>
<path d="M305.839 247.174C343.92 237.419 377.154 210.619 393.585 171.64C410.017 132.661 405.98 90.1988 386.347 56.1934C348.266 65.9477 315.032 92.7486 298.601 131.728C282.169 170.706 286.206 213.168 305.839 247.174Z" fill="url(#paint4_radial_2862_278)"/>
<path d="M393.341 171.537C376.971 210.369 343.89 237.091 305.969 246.867C286.462 212.959 282.476 170.663 298.845 131.831C315.215 92.9978 348.295 66.2765 386.217 56.5004C405.724 90.4077 409.71 132.704 393.341 171.537Z" stroke="url(#paint5_linear_2862_278)" stroke-opacity="0.05" stroke-width="0.530516"/>
<path d="M305.686 246.995C329.75 266.114 361.965 272.832 393.671 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.046 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="white"/>
<path d="M305.686 246.995C329.75 266.114 361.965 272.832 393.671 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.046 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="url(#paint6_radial_2862_278)"/>
<path d="M305.686 246.995C329.75 266.114 361.965 272.832 393.671 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.046 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="black" fill-opacity="0.2" style="mix-blend-mode:hard-light"/>
<path d="M305.686 246.995C329.75 266.114 361.965 272.832 393.671 262.129C425.376 251.426 449.499 225.691 461.03 194.556C436.967 175.437 404.751 168.719 373.046 179.422C341.34 190.125 317.217 215.86 305.686 246.995Z" fill="url(#paint7_linear_2862_278)" fill-opacity="0.5" style="mix-blend-mode:hard-light"/>
<path d="M393.586 261.878C362.035 272.529 329.981 265.88 306.002 246.907C317.535 215.919 341.571 190.327 373.13 179.673C404.682 169.023 436.736 175.671 460.715 194.644C449.182 225.632 425.146 251.224 393.586 261.878Z" stroke="url(#paint8_linear_2862_278)" stroke-opacity="0.05" stroke-width="0.530516"/>
<g opacity="0.8" filter="url(#filter0_f_2862_278)">
<circle cx="660" cy="-60" r="160" fill="#18E299" fill-opacity="0.4"/>
</g>
<g opacity="0.8" filter="url(#filter1_f_2862_278)">
<circle cx="20" cy="213" r="160" fill="#18E299" fill-opacity="0.33"/>
</g>
<g opacity="0.8" filter="url(#filter2_f_2862_278)">
<circle cx="660" cy="480" r="160" fill="#18E299" fill-opacity="0.52"/>
</g>
<g opacity="0.8" filter="url(#filter3_f_2862_278)">
<circle cx="20" cy="413" r="160" fill="#18E299" fill-opacity="0.22"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 50H700" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 82H700" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M239 0L239 320" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M271 0L271 320" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M461 0L461 320" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M350 0L350 320" stroke="url(#paint9_linear_2862_278)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M429 0L429 320" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 271H700" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 239H700" stroke="black" stroke-dasharray="4 4"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M0 160H700" stroke="url(#paint10_linear_2862_278)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M511 -1L189 321" stroke="url(#paint11_linear_2862_278)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.1">
<path d="M511 321L189 -1" stroke="url(#paint12_linear_2862_278)"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.05">
<circle cx="350" cy="160" r="111" stroke="black"/>
</g>
<g style="mix-blend-mode:overlay" opacity="0.05">
<circle cx="350" cy="160" r="79" stroke="black"/>
</g>
</g>
<defs>
<filter id="filter0_f_2862_278" x="260" y="-460" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_278"/>
</filter>
<filter id="filter1_f_2862_278" x="-380" y="-187" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_278"/>
</filter>
<filter id="filter2_f_2862_278" x="260" y="80" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_278"/>
</filter>
<filter id="filter3_f_2862_278" x="-380" y="13" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="120" result="effect1_foregroundBlur_2862_278"/>
</filter>
<linearGradient id="paint0_linear_2862_278" x1="1.04308e-05" y1="320" x2="710.784" y2="26.0793" gradientUnits="userSpaceOnUse">
<stop stop-color="#18E299" stop-opacity="0.09"/>
<stop offset="0.729167" stop-color="#0D9373" stop-opacity="0.08"/>
</linearGradient>
<radialGradient id="paint1_radial_2862_278" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(208.697 189.703) rotate(-10.029) scale(169.097 167.466)">
<stop stop-color="#00B0BB"/>
<stop offset="1" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint2_linear_2862_278" x1="306.587" y1="93.5598" x2="252.341" y2="224.228" gradientUnits="userSpaceOnUse">
<stop stop-color="#18E299"/>
<stop offset="1"/>
</linearGradient>
<linearGradient id="paint3_linear_2862_278" x1="311.84" y1="123.717" x2="253.579" y2="224.761" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<radialGradient id="paint4_radial_2862_278" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(313.407 243.64) rotate(-75.7542) scale(203.632 223.902)">
<stop stop-color="#00BBBB"/>
<stop offset="0.712616" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint5_linear_2862_278" x1="308.586" y1="102.284" x2="383.487" y2="201.169" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<radialGradient id="paint6_radial_2862_278" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(311.447 249.925) rotate(-20.3524) scale(174.776 163.096)">
<stop stop-color="#00B0BB"/>
<stop offset="1" stop-color="#00DB65"/>
</radialGradient>
<linearGradient id="paint7_linear_2862_278" x1="395.843" y1="169.781" x2="332.121" y2="263.82" gradientUnits="userSpaceOnUse">
<stop stop-color="#00B1BC"/>
<stop offset="1"/>
</linearGradient>
<linearGradient id="paint8_linear_2862_278" x1="395.843" y1="169.781" x2="370.991" y2="271.799" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint9_linear_2862_278" x1="350" y1="0" x2="350" y2="320" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0"/>
<stop offset="0.0001" stop-opacity="0.3"/>
<stop offset="0.333333"/>
<stop offset="0.666667"/>
<stop offset="1" stop-opacity="0.3"/>
</linearGradient>
<linearGradient id="paint10_linear_2862_278" x1="0" y1="160" x2="700" y2="160" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.1"/>
<stop offset="0.5"/>
<stop offset="1" stop-opacity="0.1"/>
</linearGradient>
<linearGradient id="paint11_linear_2862_278" x1="511" y1="-1" x2="189" y2="321" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.1"/>
<stop offset="0.5"/>
<stop offset="1" stop-opacity="0.1"/>
</linearGradient>
<linearGradient id="paint12_linear_2862_278" x1="511" y1="321" x2="189" y2="-0.999997" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.1"/>
<stop offset="0.5"/>
<stop offset="1" stop-opacity="0.1"/>
</linearGradient>
<clipPath id="clip0_2862_278">
<rect width="700" height="320" rx="16" fill="white"/>
</clipPath>
</defs>
</svg>


---
modelcontextprotocol/docs/images/java/class-diagrams.puml
---
@startuml Core Components

' Core Interfaces
interface McpTransport {
  +Mono<Void> connect(Function<Mono<JSONRPCMessage>, Mono<JSONRPCMessage>> handler)
  +Mono<Void> sendMessage(JSONRPCMessage message)
  +void close()
  +Mono<Void> closeGracefully()
  +<T> T unmarshalFrom(Object data, TypeReference<T> typeRef)
}

interface McpSession {
  +<T> Mono<T> sendRequest(String method, Object requestParams, TypeReference<T> typeRef)
  +Mono<Void> sendNotification(String method, Map<String, Object> params)
  +Mono<Void> closeGracefully()
  +void close()
}

' Core Implementation Classes
class DefaultMcpSession {
  +interface RequestHandler
  +interface NotificationHandler
}

' Client Classes
class McpClient {
  +{static} Builder using(ClientMcpTransport transport)
}

class McpAsyncClient {
  +Mono<InitializeResult> initialize()
  +ServerCapabilities getServerCapabilities()
  +Implementation getServerInfo()
  +ClientCapabilities getClientCapabilities()
  +Implementation getClientInfo()
  +void close()
  +Mono<Void> closeGracefully()
  +Mono<Object> ping()
  +Mono<Void> addRoot(Root root)
  +Mono<Void> removeRoot(String rootUri)
  +Mono<Void> rootsListChangedNotification()
  +Mono<CallToolResult> callTool(CallToolRequest request)
  +Mono<ListToolsResult> listTools()
  +Mono<ListResourcesResult> listResources()
  +Mono<ReadResourceResult> readResource(ReadResourceRequest request)
  +Mono<ListResourceTemplatesResult> listResourceTemplates()
  +Mono<Void> subscribeResource(SubscribeRequest request)
  +Mono<Void> unsubscribeResource(UnsubscribeRequest request)
  +Mono<ListPromptsResult> listPrompts()
  +Mono<GetPromptResult> getPrompt(GetPromptRequest request)
  +Mono<Void> setLoggingLevel(LoggingLevel level)
}

class McpSyncClient {
  +InitializeResult initialize()
  +ServerCapabilities getServerCapabilities()
  +Implementation getServerInfo()
  +ClientCapabilities getClientCapabilities()
  +Implementation getClientInfo()
  +void close()
  +boolean closeGracefully()
  +Object ping()
  +void addRoot(Root root)
  +void removeRoot(String rootUri)
  +void rootsListChangedNotification()
  +CallToolResult callTool(CallToolRequest request)
  +ListToolsResult listTools()
  +ListResourcesResult listResources()
  +ReadResourceResult readResource(ReadResourceRequest request)
  +ListResourceTemplatesResult listResourceTemplates()
  +void subscribeResource(SubscribeRequest request)
  +void unsubscribeResource(UnsubscribeRequest request)
  +ListPromptsResult listPrompts()
  +GetPromptResult getPrompt(GetPromptRequest request)
  +void setLoggingLevel(LoggingLevel level)
}

' Server Classes
class McpServer {
  +{static} Builder using(ServerMcpTransport transport)
}

class McpAsyncServer {
  
  +ServerCapabilities getServerCapabilities()
  +Implementation getServerInfo()
  +ClientCapabilities getClientCapabilities()
  +Implementation getClientInfo()
  +void close()
  +Mono<Void> closeGracefully()
  
  ' Tool Management
  +Mono<Void> addTool(ToolRegistration toolRegistration)
  +Mono<Void> removeTool(String toolName)
  +Mono<Void> notifyToolsListChanged()
  
  ' Resource Management
  +Mono<Void> addResource(ResourceRegistration resourceHandler)
  +Mono<Void> removeResource(String resourceUri)
  +Mono<Void> notifyResourcesListChanged()
  
  ' Prompt Management
  +Mono<Void> addPrompt(PromptRegistration promptRegistration)
  +Mono<Void> removePrompt(String promptName)
  +Mono<Void> notifyPromptsListChanged()
  
  ' Logging
  +Mono<Void> loggingNotification(LoggingMessageNotification notification)
  
  ' Sampling
  +Mono<CreateMessageResult> createMessage(CreateMessageRequest request)
}

class McpSyncServer {
  +McpAsyncServer getAsyncServer()
  
  +ServerCapabilities getServerCapabilities()
  +Implementation getServerInfo()
  +ClientCapabilities getClientCapabilities()
  +Implementation getClientInfo()
  +void close()
  +void closeGracefully()
  
  ' Tool Management
  +void addTool(ToolRegistration toolHandler)
  +void removeTool(String toolName)
  +void notifyToolsListChanged()
  
  ' Resource Management
  +void addResource(ResourceRegistration resourceHandler)
  +void removeResource(String resourceUri)
  +void notifyResourcesListChanged()
  
  ' Prompt Management
  +void addPrompt(PromptRegistration promptRegistration)
  +void removePrompt(String promptName)
  +void notifyPromptsListChanged()
  
  ' Logging
  +void loggingNotification(LoggingMessageNotification notification)
  
  ' Sampling
  +CreateMessageResult createMessage(CreateMessageRequest request)
}

' Transport Implementations
class StdioClientTransport implements ClientMcpTransport {  
  +void setErrorHandler(Consumer<String> errorHandler)
  +Sinks.Many<String> getErrorSink()
}

class StdioServerTransport implements ServerMcpTransport {
}


class HttpServletSseServerTransport implements ServerMcpTransport {
}


class HttpClientSseClientTransport implements ClientMcpTransport {  
}


class WebFluxSseClientTransport implements ClientMcpTransport {
}


class WebFluxSseServerTransport implements ServerMcpTransport {
  +RouterFunction<?> getRouterFunction()
}

class WebMvcSseServerTransport implements ServerMcpTransport {
  +RouterFunction<?> getRouterFunction()
}


' Schema and Error Classes
class McpSchema {
  +class ErrorCodes
  +interface Request
  +interface JSONRPCMessage
  +interface ResourceContents
  +interface Content
  +interface ServerCapabilities
  +{static} JSONRPCMessage deserializeJsonRpcMessage()
}

class McpError {
}

' Relationships
McpTransport <|.. ClientMcpTransport
McpTransport <|.. ServerMcpTransport

McpSession <|.. DefaultMcpSession
DefaultMcpSession --o McpAsyncClient
DefaultMcpSession --o McpAsyncServer

McpClient ..> McpAsyncClient : creates
McpClient ..> McpSyncClient : creates
McpSyncClient --> McpAsyncClient : delegates to

McpServer ..> McpAsyncServer : creates
McpServer ..> McpSyncServer : creates
McpSyncServer o-- McpAsyncServer

DefaultMcpSession o-- McpTransport
McpSchema <.. McpSession : uses
McpError ..> McpSession : throws

@enduml

@startuml Message Flow

package "MCP Schema" {
  interface JSONRPCMessage {
    +String jsonrpc()
  }
  
  interface Request {
  }
  
  class InitializeRequest
  class CallToolRequest
  class ListToolsRequest
  class ListResourcesRequest
  class ReadResourceRequest
  class ListResourceTemplatesRequest
  class ListPromptsRequest
  class GetPromptRequest
}

package "Resource Types" {
  interface ResourceContents {
    +String uri()
    +String mimeType()
  }
  
  class TextResourceContents
  class BlobResourceContents
  
  interface Content {
    +String type()
  }
  
  class TextContent
  class ImageContent
  class EmbeddedResource
  
  interface Annotated {
    +Annotations annotations()
  }
  
  interface PromptOrResourceReference {
    +String type()
  }
  
  class PromptReference
  class ResourceReference
}

JSONRPCMessage <|.. Request
Request <|.. InitializeRequest
Request <|.. CallToolRequest
Request <|.. ListToolsRequest
Request <|.. ListResourcesRequest
Request <|.. ReadResourceRequest
Request <|.. ListResourceTemplatesRequest
Request <|.. ListPromptsRequest
Request <|.. GetPromptRequest

ResourceContents <|.. TextResourceContents
ResourceContents <|.. BlobResourceContents

Content <|.. TextContent
Content <|.. ImageContent
Content <|.. EmbeddedResource

PromptOrResourceReference <|.. PromptReference
PromptOrResourceReference <|.. ResourceReference

@enduml


---
modelcontextprotocol/docs/images/java/java-mcp-uml-classdiagram.svg
---
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" contentStyleType="text/css" height="1616px" preserveAspectRatio="none" style="width:2294px;height:1616px;background:#FFFFFF;" version="1.1" viewBox="0 0 2294 1616" width="2294px" zoomAndPan="magnify"><defs/><g><!--class McpTransport--><g id="elem_McpTransport"><rect codeLine="2" fill="#F1F1F1" height="129.4844" id="McpTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="710.9541" x="731.5" y="1091"/><ellipse cx="1034.52" cy="1107" fill="#B4A7E5" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1030.4419,1102.7656 L1030.4419,1100.6094 L1037.8325,1100.6094 L1037.8325,1102.7656 L1035.3638,1102.7656 L1035.3638,1110.8438 L1037.8325,1110.8438 L1037.8325,1113 L1030.4419,1113 L1030.4419,1110.8438 L1032.9106,1110.8438 L1032.9106,1102.7656 L1030.4419,1102.7656 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" font-style="italic" lengthAdjust="spacing" textLength="96.4141" x="1055.02" y="1111.8467">McpTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="732.5" x2="1441.4541" y1="1123" y2="1123"/><line style="stroke:#181818;stroke-width:0.5;" x1="732.5" x2="1441.4541" y1="1131" y2="1131"/><ellipse cx="742.5" cy="1144.6484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="684.9541" x="751.5" y="1147.9951">Mono&lt;Void&gt; connect(Function&lt;Mono&lt;JSONRPCMessage&gt;, Mono&lt;JSONRPCMessage&gt;&gt; handler)</text><ellipse cx="742.5" cy="1160.9453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="394.0439" x="751.5" y="1164.292">Mono&lt;Void&gt; sendMessage(JSONRPCMessage message)</text><ellipse cx="742.5" cy="1177.2422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="751.5" y="1180.5889">void close()</text><ellipse cx="742.5" cy="1193.5391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="215.2568" x="751.5" y="1196.8857">Mono&lt;Void&gt; closeGracefully()</text><ellipse cx="742.5" cy="1209.8359" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="458.0146" x="751.5" y="1213.1826">&lt;T&gt; T unmarshalFrom(Object data, TypeReference&lt;T&gt; typeRef)</text></g><!--class McpSession--><g id="elem_McpSession"><rect codeLine="10" fill="#F1F1F1" height="113.1875" id="McpSession" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="709.833" x="732" y="246"/><ellipse cx="1041.627" cy="262" fill="#B4A7E5" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1037.5488,257.7656 L1037.5488,255.6094 L1044.9395,255.6094 L1044.9395,257.7656 L1042.4707,257.7656 L1042.4707,265.8438 L1044.9395,265.8438 L1044.9395,268 L1037.5488,268 L1037.5488,265.8438 L1040.0176,265.8438 L1040.0176,257.7656 L1037.5488,257.7656 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" font-style="italic" lengthAdjust="spacing" textLength="82.0791" x="1062.127" y="266.8467">McpSession</text><line style="stroke:#181818;stroke-width:0.5;" x1="733" x2="1440.833" y1="278" y2="278"/><line style="stroke:#181818;stroke-width:0.5;" x1="733" x2="1440.833" y1="286" y2="286"/><ellipse cx="743" cy="299.6484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="683.833" x="752" y="302.9951">&lt;T&gt; Mono&lt;T&gt; sendRequest(String method, Object requestParams, TypeReference&lt;T&gt; typeRef)</text><ellipse cx="743" cy="315.9453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="537.4961" x="752" y="319.292">Mono&lt;Void&gt; sendNotification(String method, Map&lt;String, Object&gt; params)</text><ellipse cx="743" cy="332.2422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="215.2568" x="752" y="335.5889">Mono&lt;Void&gt; closeGracefully()</text><ellipse cx="743" cy="348.5391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="752" y="351.8857">void close()</text></g><!--class DefaultMcpSession--><g id="elem_DefaultMcpSession"><rect codeLine="18" fill="#F1F1F1" height="80.5938" id="DefaultMcpSession" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="228.3438" x="973" y="615"/><ellipse cx="1016.4001" cy="631" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1019.3688,636.6406 Q1018.7907,636.9375 1018.1501,637.0781 Q1017.5095,637.2344 1016.8063,637.2344 Q1014.3063,637.2344 1012.9782,635.5938 Q1011.6657,633.9375 1011.6657,630.8125 Q1011.6657,627.6875 1012.9782,626.0313 Q1014.3063,624.375 1016.8063,624.375 Q1017.5095,624.375 1018.1501,624.5313 Q1018.8063,624.6875 1019.3688,624.9844 L1019.3688,627.7031 Q1018.7438,627.125 1018.1501,626.8594 Q1017.5563,626.5781 1016.9313,626.5781 Q1015.5876,626.5781 1014.9001,627.6563 Q1014.2126,628.7188 1014.2126,630.8125 Q1014.2126,632.9063 1014.9001,633.9844 Q1015.5876,635.0469 1016.9313,635.0469 Q1017.5563,635.0469 1018.1501,634.7813 Q1018.7438,634.5 1019.3688,633.9219 L1019.3688,636.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="133.2324" x="1036.7112" y="635.8467">DefaultMcpSession</text><line style="stroke:#181818;stroke-width:0.5;" x1="974" x2="1200.3438" y1="647" y2="647"/><ellipse cx="984" cy="660.6484" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="179.5117" x="993" y="663.9951">interface RequestHandler</text><ellipse cx="984" cy="676.9453" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="202.3438" x="993" y="680.292">interface NotificationHandler</text><line style="stroke:#181818;stroke-width:0.5;" x1="974" x2="1200.3438" y1="687.5938" y2="687.5938"/></g><!--class McpClient--><g id="elem_McpClient"><rect codeLine="24" fill="#F1F1F1" height="64.2969" id="McpClient" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="334.7861" x="316.5" y="270.5"/><ellipse cx="445.0464" cy="286.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M448.0151,292.1406 Q447.437,292.4375 446.7964,292.5781 Q446.1558,292.7344 445.4526,292.7344 Q442.9526,292.7344 441.6245,291.0938 Q440.312,289.4375 440.312,286.3125 Q440.312,283.1875 441.6245,281.5313 Q442.9526,279.875 445.4526,279.875 Q446.1558,279.875 446.7964,280.0313 Q447.4526,280.1875 448.0151,280.4844 L448.0151,283.2031 Q447.3901,282.625 446.7964,282.3594 Q446.2026,282.0781 445.5776,282.0781 Q444.2339,282.0781 443.5464,283.1563 Q442.8589,284.2188 442.8589,286.3125 Q442.8589,288.4063 443.5464,289.4844 Q444.2339,290.5469 445.5776,290.5469 Q446.2026,290.5469 446.7964,290.2813 Q447.3901,290 448.0151,289.4219 L448.0151,292.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="69.1934" x="465.5464" y="291.3467">McpClient</text><line style="stroke:#181818;stroke-width:0.5;" x1="317.5" x2="650.2861" y1="302.5" y2="302.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="317.5" x2="650.2861" y1="310.5" y2="310.5"/><ellipse cx="327.5" cy="324.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" text-decoration="underline" textLength="308.7861" x="336.5" y="327.4951">Builder using(ClientMcpTransport transport)</text></g><!--class McpAsyncClient--><g id="elem_McpAsyncClient"><rect codeLine="28" fill="#F1F1F1" height="390.2344" id="McpAsyncClient" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="561.1445" x="135.5" y="960.5"/><ellipse cx="356.3623" cy="976.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M359.3311,982.1406 Q358.7529,982.4375 358.1123,982.5781 Q357.4717,982.7344 356.7686,982.7344 Q354.2686,982.7344 352.9404,981.0938 Q351.6279,979.4375 351.6279,976.3125 Q351.6279,973.1875 352.9404,971.5313 Q354.2686,969.875 356.7686,969.875 Q357.4717,969.875 358.1123,970.0313 Q358.7686,970.1875 359.3311,970.4844 L359.3311,973.2031 Q358.7061,972.625 358.1123,972.3594 Q357.5186,972.0781 356.8936,972.0781 Q355.5498,972.0781 354.8623,973.1563 Q354.1748,974.2188 354.1748,976.3125 Q354.1748,978.4063 354.8623,979.4844 Q355.5498,980.5469 356.8936,980.5469 Q357.5186,980.5469 358.1123,980.2813 Q358.7061,980 359.3311,979.4219 L359.3311,982.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="110.9199" x="376.8623" y="981.3467">McpAsyncClient</text><line style="stroke:#181818;stroke-width:0.5;" x1="136.5" x2="695.6445" y1="992.5" y2="992.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="136.5" x2="695.6445" y1="1000.5" y2="1000.5"/><ellipse cx="146.5" cy="1014.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="237.7471" x="155.5" y="1017.4951">Mono&lt;InitializeResult&gt; initialize()</text><ellipse cx="146.5" cy="1030.4453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="293.5078" x="155.5" y="1033.792">ServerCapabilities getServerCapabilities()</text><ellipse cx="146.5" cy="1046.7422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="221.9355" x="155.5" y="1050.0889">Implementation getServerInfo()</text><ellipse cx="146.5" cy="1063.0391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="282.748" x="155.5" y="1066.3857">ClientCapabilities getClientCapabilities()</text><ellipse cx="146.5" cy="1079.3359" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="216.5557" x="155.5" y="1082.6826">Implementation getClientInfo()</text><ellipse cx="146.5" cy="1095.6328" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="155.5" y="1098.9795">void close()</text><ellipse cx="146.5" cy="1111.9297" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="215.2568" x="155.5" y="1115.2764">Mono&lt;Void&gt; closeGracefully()</text><ellipse cx="146.5" cy="1128.2266" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="153.0498" x="155.5" y="1131.5732">Mono&lt;Object&gt; ping()</text><ellipse cx="146.5" cy="1144.5234" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="231.7109" x="155.5" y="1147.8701">Mono&lt;Void&gt; addRoot(Root root)</text><ellipse cx="146.5" cy="1160.8203" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="288.1553" x="155.5" y="1164.167">Mono&lt;Void&gt; removeRoot(String rootUri)</text><ellipse cx="146.5" cy="1177.1172" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="310.7959" x="155.5" y="1180.4639">Mono&lt;Void&gt; rootsListChangedNotification()</text><ellipse cx="146.5" cy="1193.4141" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="401.3174" x="155.5" y="1196.7607">Mono&lt;CallToolResult&gt; callTool(CallToolRequest request)</text><ellipse cx="146.5" cy="1209.7109" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="239.5723" x="155.5" y="1213.0576">Mono&lt;ListToolsResult&gt; listTools()</text><ellipse cx="146.5" cy="1226.0078" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="310.707" x="155.5" y="1229.3545">Mono&lt;ListResourcesResult&gt; listResources()</text><ellipse cx="146.5" cy="1242.3047" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="535.1445" x="155.5" y="1245.6514">Mono&lt;ReadResourceResult&gt; readResource(ReadResourceRequest request)</text><ellipse cx="146.5" cy="1258.6016" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="443.2285" x="155.5" y="1261.9482">Mono&lt;ListResourceTemplatesResult&gt; listResourceTemplates()</text><ellipse cx="146.5" cy="1274.8984" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="424.4229" x="155.5" y="1278.2451">Mono&lt;Void&gt; subscribeResource(SubscribeRequest request)</text><ellipse cx="146.5" cy="1291.1953" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="459.6963" x="155.5" y="1294.542">Mono&lt;Void&gt; unsubscribeResource(UnsubscribeRequest request)</text><ellipse cx="146.5" cy="1307.4922" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="281.9824" x="155.5" y="1310.8389">Mono&lt;ListPromptsResult&gt; listPrompts()</text><ellipse cx="146.5" cy="1323.7891" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="461.501" x="155.5" y="1327.1357">Mono&lt;GetPromptResult&gt; getPrompt(GetPromptRequest request)</text><ellipse cx="146.5" cy="1340.0859" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="352.9531" x="155.5" y="1343.4326">Mono&lt;Void&gt; setLoggingLevel(LoggingLevel level)</text></g><!--class McpSyncClient--><g id="elem_McpSyncClient"><rect codeLine="52" fill="#F1F1F1" height="390.2344" id="McpSyncClient" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="499.6006" x="7" y="460.5"/><ellipse cx="201.0825" cy="476.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M204.0513,482.1406 Q203.4731,482.4375 202.8325,482.5781 Q202.1919,482.7344 201.4888,482.7344 Q198.9888,482.7344 197.6606,481.0938 Q196.3481,479.4375 196.3481,476.3125 Q196.3481,473.1875 197.6606,471.5313 Q198.9888,469.875 201.4888,469.875 Q202.1919,469.875 202.8325,470.0313 Q203.4888,470.1875 204.0513,470.4844 L204.0513,473.2031 Q203.4263,472.625 202.8325,472.3594 Q202.2388,472.0781 201.6138,472.0781 Q200.27,472.0781 199.5825,473.1563 Q198.895,474.2188 198.895,476.3125 Q198.895,478.4063 199.5825,479.4844 Q200.27,480.5469 201.6138,480.5469 Q202.2388,480.5469 202.8325,480.2813 Q203.4263,480 204.0513,479.4219 L204.0513,482.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="102.9355" x="221.5825" y="481.3467">McpSyncClient</text><line style="stroke:#181818;stroke-width:0.5;" x1="8" x2="505.6006" y1="492.5" y2="492.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="8" x2="505.6006" y1="500.5" y2="500.5"/><ellipse cx="18" cy="514.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="176.2031" x="27" y="517.4951">InitializeResult initialize()</text><ellipse cx="18" cy="530.4453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="293.5078" x="27" y="533.792">ServerCapabilities getServerCapabilities()</text><ellipse cx="18" cy="546.7422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="221.9355" x="27" y="550.0889">Implementation getServerInfo()</text><ellipse cx="18" cy="563.0391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="282.748" x="27" y="566.3857">ClientCapabilities getClientCapabilities()</text><ellipse cx="18" cy="579.3359" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="216.5557" x="27" y="582.6826">Implementation getClientInfo()</text><ellipse cx="18" cy="595.6328" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="27" y="598.9795">void close()</text><ellipse cx="18" cy="611.9297" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="178.7666" x="27" y="615.2764">boolean closeGracefully()</text><ellipse cx="18" cy="628.2266" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="91.5059" x="27" y="631.5732">Object ping()</text><ellipse cx="18" cy="644.5234" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="168.875" x="27" y="647.8701">void addRoot(Root root)</text><ellipse cx="18" cy="660.8203" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="225.3193" x="27" y="664.167">void removeRoot(String rootUri)</text><ellipse cx="18" cy="677.1172" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="247.96" x="27" y="680.4639">void rootsListChangedNotification()</text><ellipse cx="18" cy="693.4141" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="339.7734" x="27" y="696.7607">CallToolResult callTool(CallToolRequest request)</text><ellipse cx="18" cy="709.7109" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="178.0283" x="27" y="713.0576">ListToolsResult listTools()</text><ellipse cx="18" cy="726.0078" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="249.1631" x="27" y="729.3545">ListResourcesResult listResources()</text><ellipse cx="18" cy="742.3047" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="473.6006" x="27" y="745.6514">ReadResourceResult readResource(ReadResourceRequest request)</text><ellipse cx="18" cy="758.6016" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="381.6846" x="27" y="761.9482">ListResourceTemplatesResult listResourceTemplates()</text><ellipse cx="18" cy="774.8984" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="361.5869" x="27" y="778.2451">void subscribeResource(SubscribeRequest request)</text><ellipse cx="18" cy="791.1953" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="396.8604" x="27" y="794.542">void unsubscribeResource(UnsubscribeRequest request)</text><ellipse cx="18" cy="807.4922" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="220.4385" x="27" y="810.8389">ListPromptsResult listPrompts()</text><ellipse cx="18" cy="823.7891" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="399.957" x="27" y="827.1357">GetPromptResult getPrompt(GetPromptRequest request)</text><ellipse cx="18" cy="840.0859" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="290.1172" x="27" y="843.4326">void setLoggingLevel(LoggingLevel level)</text></g><!--class McpServer--><g id="elem_McpServer"><rect codeLine="77" fill="#F1F1F1" height="64.2969" id="McpServer" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="340.166" x="1639" y="270.5"/><ellipse cx="1767.5464" cy="286.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1770.5151,292.1406 Q1769.937,292.4375 1769.2964,292.5781 Q1768.6558,292.7344 1767.9526,292.7344 Q1765.4526,292.7344 1764.1245,291.0938 Q1762.812,289.4375 1762.812,286.3125 Q1762.812,283.1875 1764.1245,281.5313 Q1765.4526,279.875 1767.9526,279.875 Q1768.6558,279.875 1769.2964,280.0313 Q1769.9526,280.1875 1770.5151,280.4844 L1770.5151,283.2031 Q1769.8901,282.625 1769.2964,282.3594 Q1768.7026,282.0781 1768.0776,282.0781 Q1766.7339,282.0781 1766.0464,283.1563 Q1765.3589,284.2188 1765.3589,286.3125 Q1765.3589,288.4063 1766.0464,289.4844 Q1766.7339,290.5469 1768.0776,290.5469 Q1768.7026,290.5469 1769.2964,290.2813 Q1769.8901,290 1770.5151,289.4219 L1770.5151,292.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="74.5732" x="1788.0464" y="291.3467">McpServer</text><line style="stroke:#181818;stroke-width:0.5;" x1="1640" x2="1978.166" y1="302.5" y2="302.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="1640" x2="1978.166" y1="310.5" y2="310.5"/><ellipse cx="1650" cy="324.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" text-decoration="underline" textLength="314.166" x="1659" y="327.4951">Builder using(ServerMcpTransport transport)</text></g><!--class McpAsyncServer--><g id="elem_McpAsyncServer"><rect codeLine="81" fill="#F1F1F1" height="406.5313" id="McpAsyncServer" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="584.7559" x="1477.5" y="952"/><ellipse cx="1707.478" cy="968" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1710.4468,973.6406 Q1709.8687,973.9375 1709.228,974.0781 Q1708.5874,974.2344 1707.8843,974.2344 Q1705.3843,974.2344 1704.0562,972.5938 Q1702.7437,970.9375 1702.7437,967.8125 Q1702.7437,964.6875 1704.0562,963.0313 Q1705.3843,961.375 1707.8843,961.375 Q1708.5874,961.375 1709.228,961.5313 Q1709.8843,961.6875 1710.4468,961.9844 L1710.4468,964.7031 Q1709.8218,964.125 1709.228,963.8594 Q1708.6343,963.5781 1708.0093,963.5781 Q1706.6655,963.5781 1705.978,964.6563 Q1705.2905,965.7188 1705.2905,967.8125 Q1705.2905,969.9063 1705.978,970.9844 Q1706.6655,972.0469 1708.0093,972.0469 Q1708.6343,972.0469 1709.228,971.7813 Q1709.8218,971.5 1710.4468,970.9219 L1710.4468,973.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="116.2998" x="1727.978" y="972.8467">McpAsyncServer</text><line style="stroke:#181818;stroke-width:0.5;" x1="1478.5" x2="2061.2559" y1="984" y2="984"/><line style="stroke:#181818;stroke-width:0.5;" x1="1478.5" x2="2061.2559" y1="992" y2="992"/><ellipse cx="1488.5" cy="1005.6484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="293.5078" x="1497.5" y="1008.9951">ServerCapabilities getServerCapabilities()</text><ellipse cx="1488.5" cy="1021.9453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="221.9355" x="1497.5" y="1025.292">Implementation getServerInfo()</text><ellipse cx="1488.5" cy="1038.2422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="282.748" x="1497.5" y="1041.5889">ClientCapabilities getClientCapabilities()</text><ellipse cx="1488.5" cy="1054.5391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="216.5557" x="1497.5" y="1057.8857">Implementation getClientInfo()</text><ellipse cx="1488.5" cy="1070.8359" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="1497.5" y="1074.1826">void close()</text><ellipse cx="1488.5" cy="1087.1328" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="215.2568" x="1497.5" y="1090.4795">Mono&lt;Void&gt; closeGracefully()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1497.5" y="1106.7764">&#160;</text><ellipse cx="1488.5" cy="1119.7266" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="394.3994" x="1497.5" y="1123.0732">Mono&lt;Void&gt; addTool(ToolRegistration toolRegistration)</text><ellipse cx="1488.5" cy="1136.0234" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="304.9238" x="1497.5" y="1139.3701">Mono&lt;Void&gt; removeTool(String toolName)</text><ellipse cx="1488.5" cy="1152.3203" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="271.6943" x="1497.5" y="1155.667">Mono&lt;Void&gt; notifyToolsListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1497.5" y="1171.9639">&#160;</text><ellipse cx="1488.5" cy="1184.9141" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="470.2646" x="1497.5" y="1188.2607">Mono&lt;Void&gt; addResource(ResourceRegistration resourceHandler)</text><ellipse cx="1488.5" cy="1201.2109" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="353.7393" x="1497.5" y="1204.5576">Mono&lt;Void&gt; removeResource(String resourceUri)</text><ellipse cx="1488.5" cy="1217.5078" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="307.2617" x="1497.5" y="1220.8545">Mono&lt;Void&gt; notifyResourcesListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1497.5" y="1237.1514">&#160;</text><ellipse cx="1488.5" cy="1250.1016" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="461.5215" x="1497.5" y="1253.4482">Mono&lt;Void&gt; addPrompt(PromptRegistration promptRegistration)</text><ellipse cx="1488.5" cy="1266.3984" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="350.8408" x="1497.5" y="1269.7451">Mono&lt;Void&gt; removePrompt(String promptName)</text><ellipse cx="1488.5" cy="1282.6953" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="292.8994" x="1497.5" y="1286.042">Mono&lt;Void&gt; notifyPromptsListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1497.5" y="1302.3389">&#160;</text><ellipse cx="1488.5" cy="1315.2891" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="520.7002" x="1497.5" y="1318.6357">Mono&lt;Void&gt; loggingNotification(LoggingMessageNotification notification)</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1497.5" y="1334.9326">&#160;</text><ellipse cx="1488.5" cy="1347.8828" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="558.7559" x="1497.5" y="1351.2295">Mono&lt;CreateMessageResult&gt; createMessage(CreateMessageRequest request)</text></g><!--class McpSyncServer--><g id="elem_McpSyncServer"><rect codeLine="112" fill="#F1F1F1" height="439.125" id="McpSyncServer" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="523.2119" x="1764.5" y="436"/><ellipse cx="1967.6982" cy="452" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1970.667,457.6406 Q1970.0889,457.9375 1969.4482,458.0781 Q1968.8076,458.2344 1968.1045,458.2344 Q1965.6045,458.2344 1964.2764,456.5938 Q1962.9639,454.9375 1962.9639,451.8125 Q1962.9639,448.6875 1964.2764,447.0313 Q1965.6045,445.375 1968.1045,445.375 Q1968.8076,445.375 1969.4482,445.5313 Q1970.1045,445.6875 1970.667,445.9844 L1970.667,448.7031 Q1970.042,448.125 1969.4482,447.8594 Q1968.8545,447.5781 1968.2295,447.5781 Q1966.8857,447.5781 1966.1982,448.6563 Q1965.5107,449.7188 1965.5107,451.8125 Q1965.5107,453.9063 1966.1982,454.9844 Q1966.8857,456.0469 1968.2295,456.0469 Q1968.8545,456.0469 1969.4482,455.7813 Q1970.042,455.5 1970.667,454.9219 L1970.667,457.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="108.3154" x="1988.1982" y="456.8467">McpSyncServer</text><line style="stroke:#181818;stroke-width:0.5;" x1="1765.5" x2="2286.7119" y1="468" y2="468"/><line style="stroke:#181818;stroke-width:0.5;" x1="1765.5" x2="2286.7119" y1="476" y2="476"/><ellipse cx="1775.5" cy="489.6484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="242.2998" x="1784.5" y="492.9951">McpAsyncServer getAsyncServer()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="509.292">&#160;</text><ellipse cx="1775.5" cy="522.2422" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="293.5078" x="1784.5" y="525.5889">ServerCapabilities getServerCapabilities()</text><ellipse cx="1775.5" cy="538.5391" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="221.9355" x="1784.5" y="541.8857">Implementation getServerInfo()</text><ellipse cx="1775.5" cy="554.8359" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="282.748" x="1784.5" y="558.1826">ClientCapabilities getClientCapabilities()</text><ellipse cx="1775.5" cy="571.1328" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="216.5557" x="1784.5" y="574.4795">Implementation getClientInfo()</text><ellipse cx="1775.5" cy="587.4297" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="81.0605" x="1784.5" y="590.7764">void close()</text><ellipse cx="1775.5" cy="603.7266" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="152.4209" x="1784.5" y="607.0732">void closeGracefully()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="623.3701">&#160;</text><ellipse cx="1775.5" cy="636.3203" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="301.6357" x="1784.5" y="639.667">void addTool(ToolRegistration toolHandler)</text><ellipse cx="1775.5" cy="652.6172" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="242.0879" x="1784.5" y="655.9639">void removeTool(String toolName)</text><ellipse cx="1775.5" cy="668.9141" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="208.8584" x="1784.5" y="672.2607">void notifyToolsListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="688.5576">&#160;</text><ellipse cx="1775.5" cy="701.5078" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="407.4287" x="1784.5" y="704.8545">void addResource(ResourceRegistration resourceHandler)</text><ellipse cx="1775.5" cy="717.8047" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="290.9033" x="1784.5" y="721.1514">void removeResource(String resourceUri)</text><ellipse cx="1775.5" cy="734.1016" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="244.4258" x="1784.5" y="737.4482">void notifyResourcesListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="753.7451">&#160;</text><ellipse cx="1775.5" cy="766.6953" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="398.6855" x="1784.5" y="770.042">void addPrompt(PromptRegistration promptRegistration)</text><ellipse cx="1775.5" cy="782.9922" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="288.0049" x="1784.5" y="786.3389">void removePrompt(String promptName)</text><ellipse cx="1775.5" cy="799.2891" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="230.0635" x="1784.5" y="802.6357">void notifyPromptsListChanged()</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="818.9326">&#160;</text><ellipse cx="1775.5" cy="831.8828" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="457.8643" x="1784.5" y="835.2295">void loggingNotification(LoggingMessageNotification notification)</text><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="4.4502" x="1784.5" y="851.5264">&#160;</text><ellipse cx="1775.5" cy="864.4766" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="497.2119" x="1784.5" y="867.8232">CreateMessageResult createMessage(CreateMessageRequest request)</text></g><!--class StdioClientTransport--><g id="elem_StdioClientTransport"><rect codeLine="145" fill="#F1F1F1" height="80.5938" id="StdioClientTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="412.8525" x="639.5" y="1529"/><ellipse cx="769.6768" cy="1545" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M772.6455,1550.6406 Q772.0674,1550.9375 771.4268,1551.0781 Q770.7861,1551.2344 770.083,1551.2344 Q767.583,1551.2344 766.2549,1549.5938 Q764.9424,1547.9375 764.9424,1544.8125 Q764.9424,1541.6875 766.2549,1540.0313 Q767.583,1538.375 770.083,1538.375 Q770.7861,1538.375 771.4268,1538.5313 Q772.083,1538.6875 772.6455,1538.9844 L772.6455,1541.7031 Q772.0205,1541.125 771.4268,1540.8594 Q770.833,1540.5781 770.208,1540.5781 Q768.8643,1540.5781 768.1768,1541.6563 Q767.4893,1542.7188 767.4893,1544.8125 Q767.4893,1546.9063 768.1768,1547.9844 Q768.8643,1549.0469 770.208,1549.0469 Q770.833,1549.0469 771.4268,1548.7813 Q772.0205,1548.5 772.6455,1547.9219 L772.6455,1550.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="143.999" x="790.1768" y="1549.8467">StdioClientTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="640.5" x2="1051.3525" y1="1561" y2="1561"/><line style="stroke:#181818;stroke-width:0.5;" x1="640.5" x2="1051.3525" y1="1569" y2="1569"/><ellipse cx="650.5" cy="1582.6484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="386.8525" x="659.5" y="1585.9951">void setErrorHandler(Consumer&lt;String&gt; errorHandler)</text><ellipse cx="650.5" cy="1598.9453" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="247.3584" x="659.5" y="1602.292">Sinks.Many&lt;String&gt; getErrorSink()</text></g><!--class ClientMcpTransport--><g id="elem_ClientMcpTransport"><rect fill="#F1F1F1" height="48" id="ClientMcpTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="168.9443" x="584.5" y="1420"/><ellipse cx="599.5" cy="1436" fill="#B4A7E5" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M595.4219,1431.7656 L595.4219,1429.6094 L602.8125,1429.6094 L602.8125,1431.7656 L600.3438,1431.7656 L600.3438,1439.8438 L602.8125,1439.8438 L602.8125,1442 L595.4219,1442 L595.4219,1439.8438 L597.8906,1439.8438 L597.8906,1431.7656 L595.4219,1431.7656 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" font-style="italic" lengthAdjust="spacing" textLength="136.9443" x="613.5" y="1440.8467">ClientMcpTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="585.5" x2="752.4443" y1="1452" y2="1452"/><line style="stroke:#181818;stroke-width:0.5;" x1="585.5" x2="752.4443" y1="1460" y2="1460"/></g><!--class StdioServerTransport--><g id="elem_StdioServerTransport"><rect codeLine="150" fill="#F1F1F1" height="48" id="StdioServerTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="181.3789" x="1433.5" y="1545.5"/><ellipse cx="1448.5" cy="1561.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1451.4688,1567.1406 Q1450.8906,1567.4375 1450.25,1567.5781 Q1449.6094,1567.7344 1448.9063,1567.7344 Q1446.4063,1567.7344 1445.0781,1566.0938 Q1443.7656,1564.4375 1443.7656,1561.3125 Q1443.7656,1558.1875 1445.0781,1556.5313 Q1446.4063,1554.875 1448.9063,1554.875 Q1449.6094,1554.875 1450.25,1555.0313 Q1450.9063,1555.1875 1451.4688,1555.4844 L1451.4688,1558.2031 Q1450.8438,1557.625 1450.25,1557.3594 Q1449.6563,1557.0781 1449.0313,1557.0781 Q1447.6875,1557.0781 1447,1558.1563 Q1446.3125,1559.2188 1446.3125,1561.3125 Q1446.3125,1563.4063 1447,1564.4844 Q1447.6875,1565.5469 1449.0313,1565.5469 Q1449.6563,1565.5469 1450.25,1565.2813 Q1450.8438,1565 1451.4688,1564.4219 L1451.4688,1567.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="149.3789" x="1462.5" y="1566.3467">StdioServerTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="1434.5" x2="1613.8789" y1="1577.5" y2="1577.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="1434.5" x2="1613.8789" y1="1585.5" y2="1585.5"/></g><!--class ServerMcpTransport--><g id="elem_ServerMcpTransport"><rect fill="#F1F1F1" height="48" id="ServerMcpTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="174.3242" x="1437" y="1420"/><ellipse cx="1452" cy="1436" fill="#B4A7E5" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1447.9219,1431.7656 L1447.9219,1429.6094 L1455.3125,1429.6094 L1455.3125,1431.7656 L1452.8438,1431.7656 L1452.8438,1439.8438 L1455.3125,1439.8438 L1455.3125,1442 L1447.9219,1442 L1447.9219,1439.8438 L1450.3906,1439.8438 L1450.3906,1431.7656 L1447.9219,1431.7656 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" font-style="italic" lengthAdjust="spacing" textLength="142.3242" x="1466" y="1440.8467">ServerMcpTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="1438" x2="1610.3242" y1="1452" y2="1452"/><line style="stroke:#181818;stroke-width:0.5;" x1="1438" x2="1610.3242" y1="1460" y2="1460"/></g><!--class HttpServletSseServerTransport--><g id="elem_HttpServletSseServerTransport"><rect codeLine="154" fill="#F1F1F1" height="48" id="HttpServletSseServerTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="250.3809" x="1650" y="1545.5"/><ellipse cx="1665" cy="1561.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1667.9688,1567.1406 Q1667.3906,1567.4375 1666.75,1567.5781 Q1666.1094,1567.7344 1665.4063,1567.7344 Q1662.9063,1567.7344 1661.5781,1566.0938 Q1660.2656,1564.4375 1660.2656,1561.3125 Q1660.2656,1558.1875 1661.5781,1556.5313 Q1662.9063,1554.875 1665.4063,1554.875 Q1666.1094,1554.875 1666.75,1555.0313 Q1667.4063,1555.1875 1667.9688,1555.4844 L1667.9688,1558.2031 Q1667.3438,1557.625 1666.75,1557.3594 Q1666.1563,1557.0781 1665.5313,1557.0781 Q1664.1875,1557.0781 1663.5,1558.1563 Q1662.8125,1559.2188 1662.8125,1561.3125 Q1662.8125,1563.4063 1663.5,1564.4844 Q1664.1875,1565.5469 1665.5313,1565.5469 Q1666.1563,1565.5469 1666.75,1565.2813 Q1667.3438,1565 1667.9688,1564.4219 L1667.9688,1567.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="218.3809" x="1679" y="1566.3467">HttpServletSseServerTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="1651" x2="1899.3809" y1="1577.5" y2="1577.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="1651" x2="1899.3809" y1="1585.5" y2="1585.5"/></g><!--class HttpClientSseClientTransport--><g id="elem_HttpClientSseClientTransport"><rect codeLine="158" fill="#F1F1F1" height="48" id="HttpClientSseClientTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="235.998" x="107" y="1545.5"/><ellipse cx="122" cy="1561.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M124.9688,1567.1406 Q124.3906,1567.4375 123.75,1567.5781 Q123.1094,1567.7344 122.4063,1567.7344 Q119.9063,1567.7344 118.5781,1566.0938 Q117.2656,1564.4375 117.2656,1561.3125 Q117.2656,1558.1875 118.5781,1556.5313 Q119.9063,1554.875 122.4063,1554.875 Q123.1094,1554.875 123.75,1555.0313 Q124.4063,1555.1875 124.9688,1555.4844 L124.9688,1558.2031 Q124.3438,1557.625 123.75,1557.3594 Q123.1563,1557.0781 122.5313,1557.0781 Q121.1875,1557.0781 120.5,1558.1563 Q119.8125,1559.2188 119.8125,1561.3125 Q119.8125,1563.4063 120.5,1564.4844 Q121.1875,1565.5469 122.5313,1565.5469 Q123.1563,1565.5469 123.75,1565.2813 Q124.3438,1565 124.9688,1564.4219 L124.9688,1567.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="203.998" x="136" y="1566.3467">HttpClientSseClientTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="108" x2="341.998" y1="1577.5" y2="1577.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="108" x2="341.998" y1="1585.5" y2="1585.5"/></g><!--class WebFluxSseClientTransport--><g id="elem_WebFluxSseClientTransport"><rect codeLine="162" fill="#F1F1F1" height="48" id="WebFluxSseClientTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="225.5186" x="378" y="1545.5"/><ellipse cx="393" cy="1561.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M395.9688,1567.1406 Q395.3906,1567.4375 394.75,1567.5781 Q394.1094,1567.7344 393.4063,1567.7344 Q390.9063,1567.7344 389.5781,1566.0938 Q388.2656,1564.4375 388.2656,1561.3125 Q388.2656,1558.1875 389.5781,1556.5313 Q390.9063,1554.875 393.4063,1554.875 Q394.1094,1554.875 394.75,1555.0313 Q395.4063,1555.1875 395.9688,1555.4844 L395.9688,1558.2031 Q395.3438,1557.625 394.75,1557.3594 Q394.1563,1557.0781 393.5313,1557.0781 Q392.1875,1557.0781 391.5,1558.1563 Q390.8125,1559.2188 390.8125,1561.3125 Q390.8125,1563.4063 391.5,1564.4844 Q392.1875,1565.5469 393.5313,1565.5469 Q394.1563,1565.5469 394.75,1565.2813 Q395.3438,1565 395.9688,1564.4219 L395.9688,1567.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="193.5186" x="407" y="1566.3467">WebFluxSseClientTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="379" x2="602.5186" y1="1577.5" y2="1577.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="379" x2="602.5186" y1="1585.5" y2="1585.5"/></g><!--class WebFluxSseServerTransport--><g id="elem_WebFluxSseServerTransport"><rect codeLine="166" fill="#F1F1F1" height="64.2969" id="WebFluxSseServerTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="309.9307" x="1935" y="1537.5"/><ellipse cx="1986.2661" cy="1553.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1989.2349,1559.1406 Q1988.6567,1559.4375 1988.0161,1559.5781 Q1987.3755,1559.7344 1986.6724,1559.7344 Q1984.1724,1559.7344 1982.8442,1558.0938 Q1981.5317,1556.4375 1981.5317,1553.3125 Q1981.5317,1550.1875 1982.8442,1548.5313 Q1984.1724,1546.875 1986.6724,1546.875 Q1987.3755,1546.875 1988.0161,1547.0313 Q1988.6724,1547.1875 1989.2349,1547.4844 L1989.2349,1550.2031 Q1988.6099,1549.625 1988.0161,1549.3594 Q1987.4224,1549.0781 1986.7974,1549.0781 Q1985.4536,1549.0781 1984.7661,1550.1563 Q1984.0786,1551.2188 1984.0786,1553.3125 Q1984.0786,1555.4063 1984.7661,1556.4844 Q1985.4536,1557.5469 1986.7974,1557.5469 Q1987.4224,1557.5469 1988.0161,1557.2813 Q1988.6099,1557 1989.2349,1556.4219 L1989.2349,1559.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="198.8984" x="2006.7661" y="1558.3467">WebFluxSseServerTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="1936" x2="2243.9307" y1="1569.5" y2="1569.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="1936" x2="2243.9307" y1="1577.5" y2="1577.5"/><ellipse cx="1946" cy="1591.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="283.9307" x="1955" y="1594.4951">RouterFunction&lt;?&gt; getRouterFunction()</text></g><!--class WebMvcSseServerTransport--><g id="elem_WebMvcSseServerTransport"><rect codeLine="170" fill="#F1F1F1" height="64.2969" id="WebMvcSseServerTransport" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="309.9307" x="1088" y="1537.5"/><ellipse cx="1139.7856" cy="1553.5" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1142.7544,1559.1406 Q1142.1763,1559.4375 1141.5356,1559.5781 Q1140.895,1559.7344 1140.1919,1559.7344 Q1137.6919,1559.7344 1136.3638,1558.0938 Q1135.0513,1556.4375 1135.0513,1553.3125 Q1135.0513,1550.1875 1136.3638,1548.5313 Q1137.6919,1546.875 1140.1919,1546.875 Q1140.895,1546.875 1141.5356,1547.0313 Q1142.1919,1547.1875 1142.7544,1547.4844 L1142.7544,1550.2031 Q1142.1294,1549.625 1141.5356,1549.3594 Q1140.9419,1549.0781 1140.3169,1549.0781 Q1138.9731,1549.0781 1138.2856,1550.1563 Q1137.5981,1551.2188 1137.5981,1553.3125 Q1137.5981,1555.4063 1138.2856,1556.4844 Q1138.9731,1557.5469 1140.3169,1557.5469 Q1140.9419,1557.5469 1141.5356,1557.2813 Q1142.1294,1557 1142.7544,1556.4219 L1142.7544,1559.1406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="197.8594" x="1160.2856" y="1558.3467">WebMvcSseServerTransport</text><line style="stroke:#181818;stroke-width:0.5;" x1="1089" x2="1396.9307" y1="1569.5" y2="1569.5"/><line style="stroke:#181818;stroke-width:0.5;" x1="1089" x2="1396.9307" y1="1577.5" y2="1577.5"/><ellipse cx="1099" cy="1591.1484" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="283.9307" x="1108" y="1594.4951">RouterFunction&lt;?&gt; getRouterFunction()</text></g><!--class McpSchema--><g id="elem_McpSchema"><rect codeLine="176" fill="#F1F1F1" height="162.0781" id="McpSchema" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="357.0918" x="778.5" y="7"/><ellipse cx="910.3208" cy="23" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M913.2896,28.6406 Q912.7114,28.9375 912.0708,29.0781 Q911.4302,29.2344 910.7271,29.2344 Q908.2271,29.2344 906.8989,27.5938 Q905.5864,25.9375 905.5864,22.8125 Q905.5864,19.6875 906.8989,18.0313 Q908.2271,16.375 910.7271,16.375 Q911.4302,16.375 912.0708,16.5313 Q912.7271,16.6875 913.2896,16.9844 L913.2896,19.7031 Q912.6646,19.125 912.0708,18.8594 Q911.4771,18.5781 910.8521,18.5781 Q909.5083,18.5781 908.8208,19.6563 Q908.1333,20.7188 908.1333,22.8125 Q908.1333,24.9063 908.8208,25.9844 Q909.5083,27.0469 910.8521,27.0469 Q911.4771,27.0469 912.0708,26.7813 Q912.6646,26.5 913.2896,25.9219 L913.2896,28.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="84.9502" x="930.8208" y="27.8467">McpSchema</text><line style="stroke:#181818;stroke-width:0.5;" x1="779.5" x2="1134.5918" y1="39" y2="39"/><ellipse cx="789.5" cy="52.6484" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="117.0176" x="798.5" y="55.9951">class ErrorCodes</text><ellipse cx="789.5" cy="68.9453" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="124.3867" x="798.5" y="72.292">interface Request</text><ellipse cx="789.5" cy="85.2422" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="190.7021" x="798.5" y="88.5889">interface JSONRPCMessage</text><ellipse cx="789.5" cy="101.5391" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="195.002" x="798.5" y="104.8857">interface ResourceContents</text><ellipse cx="789.5" cy="117.8359" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="122.5684" x="798.5" y="121.1826">interface Content</text><ellipse cx="789.5" cy="134.1328" fill="none" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="194.4619" x="798.5" y="137.4795">interface ServerCapabilities</text><line style="stroke:#181818;stroke-width:0.5;" x1="779.5" x2="1134.5918" y1="144.7813" y2="144.7813"/><ellipse cx="789.5" cy="158.4297" fill="#84BE84" rx="3" ry="3" style="stroke:#038048;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" text-decoration="underline" textLength="331.0918" x="798.5" y="161.7764">JSONRPCMessage deserializeJsonRpcMessage()</text></g><!--class McpError--><g id="elem_McpError"><rect codeLine="186" fill="#F1F1F1" height="48" id="McpError" rx="2.5" ry="2.5" style="stroke:#181818;stroke-width:0.5;" width="95.3418" x="1170.5" y="64"/><ellipse cx="1185.5" cy="80" fill="#ADD1B2" rx="11" ry="11" style="stroke:#181818;stroke-width:1;"/><path d="M1188.4688,85.6406 Q1187.8906,85.9375 1187.25,86.0781 Q1186.6094,86.2344 1185.9063,86.2344 Q1183.4063,86.2344 1182.0781,84.5938 Q1180.7656,82.9375 1180.7656,79.8125 Q1180.7656,76.6875 1182.0781,75.0313 Q1183.4063,73.375 1185.9063,73.375 Q1186.6094,73.375 1187.25,73.5313 Q1187.9063,73.6875 1188.4688,73.9844 L1188.4688,76.7031 Q1187.8438,76.125 1187.25,75.8594 Q1186.6563,75.5781 1186.0313,75.5781 Q1184.6875,75.5781 1184,76.6563 Q1183.3125,77.7188 1183.3125,79.8125 Q1183.3125,81.9063 1184,82.9844 Q1184.6875,84.0469 1186.0313,84.0469 Q1186.6563,84.0469 1187.25,83.7813 Q1187.8438,83.5 1188.4688,82.9219 L1188.4688,85.6406 Z " fill="#000000"/><text fill="#000000" font-family="sans-serif" font-size="14" lengthAdjust="spacing" textLength="63.3418" x="1199.5" y="84.8467">McpError</text><line style="stroke:#181818;stroke-width:0.5;" x1="1171.5" x2="1264.8418" y1="96" y2="96"/><line style="stroke:#181818;stroke-width:0.5;" x1="1171.5" x2="1264.8418" y1="104" y2="104"/></g><!--reverse link ClientMcpTransport to StdioClientTransport--><g id="link_ClientMcpTransport_StdioClientTransport"><path d="M717.0526,1478.5288 C741.4926,1495.5788 760.51,1508.85 789.18,1528.86 " fill="none" id="ClientMcpTransport-backto-StdioClientTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="702.29,1468.23,713.6197,1483.4497,720.4855,1473.6079,702.29,1468.23" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ServerMcpTransport to StdioServerTransport--><g id="link_ServerMcpTransport_StdioServerTransport"><path d="M1524,1486.23 C1524,1508.31 1524,1523.33 1524,1545.37 " fill="none" id="ServerMcpTransport-backto-StdioServerTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1524,1468.23,1518,1486.23,1530,1486.23,1524,1468.23" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ServerMcpTransport to HttpServletSseServerTransport--><g id="link_ServerMcpTransport_HttpServletSseServerTransport"><path d="M1587.0691,1476.0303 C1631.8991,1498.1003 1682.99,1523.23 1727.89,1545.32 " fill="none" id="ServerMcpTransport-backto-HttpServletSseServerTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1570.92,1468.08,1584.419,1481.4133,1589.7192,1470.6472,1570.92,1468.08" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ClientMcpTransport to HttpClientSseClientTransport--><g id="link_ClientMcpTransport_HttpClientSseClientTransport"><path d="M566.9043,1472.2225 C504.7443,1488.8925 435.71,1507.64 360,1529 C341.43,1534.24 321.47,1540.01 302.74,1545.48 " fill="none" id="ClientMcpTransport-backto-HttpClientSseClientTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="584.29,1467.56,565.3502,1466.4272,568.4585,1478.0177,584.29,1467.56" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ClientMcpTransport to WebFluxSseClientTransport--><g id="link_ClientMcpTransport_WebFluxSseClientTransport"><path d="M620.7316,1478.4917 C588.9116,1500.5717 556.1,1523.33 524.33,1545.37 " fill="none" id="ClientMcpTransport-backto-WebFluxSseClientTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="635.52,1468.23,617.311,1473.5623,624.1522,1483.4212,635.52,1468.23" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ServerMcpTransport to WebFluxSseServerTransport--><g id="link_ServerMcpTransport_WebFluxSseServerTransport"><path d="M1628.947,1466.9032 C1708.847,1483.6532 1812.67,1505.68 1918,1529 C1930.26,1531.72 1943.01,1534.57 1955.77,1537.46 " fill="none" id="ServerMcpTransport-backto-WebFluxSseServerTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1611.33,1463.21,1627.716,1472.7755,1630.1781,1461.0308,1611.33,1463.21" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link ServerMcpTransport to WebMvcSseServerTransport--><g id="link_ServerMcpTransport_WebMvcSseServerTransport"><path d="M1455.0021,1475.3242 C1410.4421,1494.9142 1362.61,1515.93 1313.56,1537.49 " fill="none" id="ServerMcpTransport-backto-WebMvcSseServerTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1471.48,1468.08,1452.5874,1469.8316,1457.4168,1480.8168,1471.48,1468.08" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link McpTransport to ClientMcpTransport--><g id="link_McpTransport_ClientMcpTransport"><path codeLine="190" d="M979.3828,1230.2564 C887.2628,1293.3964 765.82,1376.64 702.99,1419.7 " fill="none" id="McpTransport-backto-ClientMcpTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="994.23,1220.08,975.9906,1225.3074,982.7749,1235.2055,994.23,1220.08" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link McpTransport to ServerMcpTransport--><g id="link_McpTransport_ServerMcpTransport"><path codeLine="191" d="M1199.0331,1229.9494 C1295.4731,1293.1794 1423.15,1376.88 1488.72,1419.87 " fill="none" id="McpTransport-backto-ServerMcpTransport" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1183.98,1220.08,1195.7433,1234.9671,1202.3229,1224.9317,1183.98,1220.08" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link McpSession to DefaultMcpSession--><g id="link_McpSession_DefaultMcpSession"><path codeLine="193" d="M1087,377.12 C1087,448.45 1087,552.39 1087,614.94 " fill="none" id="McpSession-backto-DefaultMcpSession" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="none" points="1087,359.12,1081,377.12,1093,377.12,1087,359.12" style="stroke:#181818;stroke-width:1;"/></g><!--link DefaultMcpSession to McpAsyncClient--><g id="link_DefaultMcpSession_McpAsyncClient"><path codeLine="194" d="M1033.51,696.2 C956.43,753.41 818.5558,855.728 687.0458,953.338 " fill="none" id="DefaultMcpSession-to-McpAsyncClient" style="stroke:#181818;stroke-width:1;"/><polygon fill="none" points="677.41,960.49,684.6119,960.126,687.0458,953.338,679.8439,953.7021,677.41,960.49" style="stroke:#181818;stroke-width:1;"/></g><!--link DefaultMcpSession to McpAsyncServer--><g id="link_DefaultMcpSession_McpAsyncServer"><path codeLine="195" d="M1141.45,696.2 C1217.62,751.74 1351.6438,849.46 1482.4538,944.84 " fill="none" id="DefaultMcpSession-to-McpAsyncServer" style="stroke:#181818;stroke-width:1;"/><polygon fill="none" points="1492.15,951.91,1489.6586,945.143,1482.4538,944.84,1484.9453,951.6071,1492.15,951.91" style="stroke:#181818;stroke-width:1;"/></g><!--link McpClient to McpAsyncClient--><g id="link_McpClient_McpAsyncClient"><path codeLine="197" d="M496.28,334.76 C505.99,361.24 518.75,400.46 524,436 C552.5,629.02 559.77,683.2 524,875 C518.75,903.13 512.6628,926.3731 503.3728,954.4831 " fill="none" id="McpClient-to-McpAsyncClient" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="501.49,960.18,508.1121,952.8898,503.059,955.4325,500.5162,950.3794,501.49,960.18" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="48.3247" x="550" y="660.0669">creates</text></g><!--link McpClient to McpSyncClient--><g id="link_McpClient_McpSyncClient"><path codeLine="198" d="M463.86,334.65 C444.76,364.18 417.6084,406.1618 385.9184,455.1618 " fill="none" id="McpClient-to-McpSyncClient" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="382.66,460.2,390.9063,454.815,385.3753,456.0015,384.1888,450.4705,382.66,460.2" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="48.3247" x="425" y="402.0669">creates</text></g><!--link McpSyncClient to McpAsyncClient--><g id="link_McpSyncClient_McpAsyncClient"><path codeLine="199" d="M319.04,850.82 C330.5,886.72 340.6454,918.4842 352.1054,954.3842 " fill="none" id="McpSyncClient-to-McpAsyncClient" style="stroke:#181818;stroke-width:1;"/><polygon fill="#181818" points="353.93,960.1,355.0036,950.3098,352.4095,955.3368,347.3825,952.7427,353.93,960.1" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="81.1294" x="343" y="918.0669">delegates to</text></g><!--link McpServer to McpAsyncServer--><g id="link_McpServer_McpAsyncServer"><path codeLine="201" d="M1771.45,334.52 C1745.02,358.95 1711.8,395.55 1697,436 C1636.02,602.61 1663.2546,798.7393 1701.1646,946.0493 " fill="none" id="McpServer-to-McpAsyncServer" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="1702.66,951.86,1704.2907,942.1471,1701.4139,947.0178,1696.5432,944.1409,1702.66,951.86" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="48.3247" x="1698" y="660.0669">creates</text></g><!--link McpServer to McpSyncServer--><g id="link_McpServer_McpSyncServer"><path codeLine="202" d="M1828.26,334.65 C1843.45,359.23 1862.9848,390.8266 1887.6348,430.6966 " fill="none" id="McpServer-to-McpSyncServer" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="1890.79,435.8,1889.4594,426.0414,1888.1607,431.5472,1882.6549,430.2484,1890.79,435.8" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="48.3247" x="1868" y="402.0669">creates</text></g><!--reverse link McpSyncServer to McpAsyncServer--><g id="link_McpSyncServer_McpAsyncServer"><path codeLine="203" d="M1908.0431,885.9621 C1894.9531,911.4221 1887.13,926.64 1874.16,951.87 " fill="none" id="McpSyncServer-backto-McpAsyncServer" style="stroke:#181818;stroke-width:1;"/><polygon fill="none" points="1913.53,875.29,1907.2292,878.7971,1908.0431,885.9621,1914.3439,882.455,1913.53,875.29" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link DefaultMcpSession to McpTransport--><g id="link_DefaultMcpSession_McpTransport"><path codeLine="205" d="M1087,708.41 C1087,794.62 1087,986.83 1087,1091 " fill="none" id="DefaultMcpSession-backto-McpTransport" style="stroke:#181818;stroke-width:1;"/><polygon fill="none" points="1087,696.41,1083,702.41,1087,708.41,1091,702.41,1087,696.41" style="stroke:#181818;stroke-width:1;"/></g><!--reverse link McpSchema to McpSession--><g id="link_McpSchema_McpSession"><path codeLine="206" d="M1009.0909,174.1484 C1024.7809,199.7984 1038.67,222.5 1053.05,246 " fill="none" id="McpSchema-backto-McpSession" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="1005.96,169.03,1007.2441,178.7948,1008.5691,173.2953,1014.0686,174.6203,1005.96,169.03" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="29.7832" x="1035" y="212.0669">uses</text></g><!--link McpError to McpSession--><g id="link_McpError_McpSession"><path codeLine="207" d="M1203.73,112.15 C1184.1,143.99 1151.2982,197.1923 1124.4682,240.7223 " fill="none" id="McpError-to-McpSession" style="stroke:#181818;stroke-width:1;stroke-dasharray:7.0,7.0;"/><polygon fill="#181818" points="1121.32,245.83,1129.4474,240.2672,1123.9435,241.5736,1122.6371,236.0696,1121.32,245.83" style="stroke:#181818;stroke-width:1;"/><text fill="#000000" font-family="sans-serif" font-size="13" lengthAdjust="spacing" textLength="44.04" x="1149" y="212.0669">throws</text></g><!--SRC=[tLZTSk8s5BxdANGNxpJa0NOOEYrjDjb9iXbWssjX7y2ja5n9Jfkc- -xLhot9me6qlTZEC82FllEZe_FfoBf02yO1tL89V8jB49FQ_qNtPRFcc8g6SObU9WXzSyyec_t4wcgEIaOfbBAuRcafQqPdPkpZwjF3yd5n3qBW7SmlKKuwHtjCAmByNM9J0AqSg8XrqC7-6eqd1KObOGAAr8AHVk0g-crBoBCTdwtdQ8rQUi1Sx36vvknGVDhyeg975PRu4gsV6rZ25ZZG4ZHQMi6xoPT9d8-L2aDDrcP38utljGrz2R-r86InahocEnMotBFg4ZbNt8u-OeuFOipdC2SFJDRRkiGwpwdrUzpChCXxcgF6-3WfDr4krMmlN3qS6W87eDBuH0k2XL2rKUfVz0DiSKjaceu-KIuHDtQLux5mBXvW_P9Q-KjSAHzERboy21rG-GLztzQa0evQeIPUM4XKhjB_CxFgZ7qddcaPMZJvkQMrh36f_rGB8DJCvgZk93PDA-1Fm1UumPkQg24GQ0ToABNe97iTyfPkcKNO459xG-anUnRPspkN4cQyAnUTmrGDLzMICLdeByJLLmhWS61FO32k93NgCwy7G2KMTxMG2qNx7SJLt8CNc90rOyGlGUcUYtx0L9KdKg-fRMk0yAh42ueOfCPPozKc5m8xOG1U0gwyt6Dv82jYm4XS7hG6jOPOvbrtWuDL4Er6bBpUGETvrKkEkBMQBHtgVWvb8q4_gXsoaL6eJXG4-06SqCDsNb04GwCn2f1tRBTJjNC7Jq2Ay04H_HspTvMGD-NjLq_RZIfQm3JFMTT7UhOQxJnFpT0uGotaLMx6j3oDbGaXKpvcg9XZuf24vt5mX7vZx3DvEPDtHkSDZ1kGRSYrX6QdiipEuZH-NI1RvyFUw-HZlTT2JkwzWSN_OLzLdmkaArqTowWwhchRmxvg-6EvirFBpQrtcGZo_TReEZPhZGTyW1H9DOcV3U42QlS1-keS3JAWcQTO42ntmflyGTxjF1rttExZdZDd11jojm5amxR5FXgqOuQdHH1mCn3bOtOMNCHMwtYE7LEpuJgo9Nh4IgDzrY7TgquuPDsuXyxo2gkw3KqlrBuemUbtvwTGM2IGPCD8csp8-uIvYYJ1ev_kLqVa_lb42ljcUvoy8HU2_dkKiGRpHgvshVzibeOdWrVu6GJu1cRw4C_cP13XA1k3y4xaeT7ujncO8T-vt5C5rpNFk9HzBrx9gcQsfdjexQ42PTw0Nomn_K7WHyuPTuLGB9JbzW3StHpC4GIZzkHSqr_5bLhHvmwpSqRqK17i6IOsozziR9aJmelMTketKffp1b6RW81_PiUcGPavFrMzePzXSqtQFywtahLnxeJqmPUr4dXtiVQjINqi3FElVDq_bV-nAtr8BFTmm4WL2J9ra3akMeInR8K6k62LGkLkY69XVEMNAjWDI5Mkr3EAHvqq5WwRJtICJIuOLOZ0xRlZHy7eiYazVUFsQAV-Occx169fkgyRCOdIE_lhwYfJ9HdGS6qca-1kpM06LswJuINSTCgIAwvNGDQnSURUgg-kvkajsNktcOaXR7K45SYdqup12WZiD5ZrGpTLSxG8lJjHR3U2hOwXUZcRJWUJ7QR4eQ8bSfKyKwaFaE_LEuzrOgl0Hz8Doprdluk_0G00]--></g></svg>

---
modelcontextprotocol/docs/images/java/mcp-stack.svg
---
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   version="1.1"
   viewBox="0 0 343.69525 195.14102"
   fill="none"
   stroke="none"
   stroke-linecap="square"
   stroke-miterlimit="10"
   id="svg27"
   sodipodi:docname="MCP draft.svg"
   width="343.69525"
   height="195.14102"
   inkscape:version="1.3.2 (091e20e, 2023-11-25)"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <defs
     id="defs27" />
  <sodipodi:namedview
     id="namedview27"
     pagecolor="#ffffff"
     bordercolor="#000000"
     borderopacity="0.25"
     inkscape:showpageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     inkscape:deskcolor="#d1d1d1"
     inkscape:zoom="1.0974637"
     inkscape:cx="188.61671"
     inkscape:cy="182.23837"
     inkscape:window-width="1312"
     inkscape:window-height="983"
     inkscape:window-x="0"
     inkscape:window-y="38"
     inkscape:window-maximized="0"
     inkscape:current-layer="svg27">
    <inkscape:page
       x="0"
       y="0"
       width="343.69525"
       height="195.14102"
       id="page29"
       margin="0 0 0 0"
       bleed="0" />
  </sodipodi:namedview>
  <clipPath
     id="p.0">
    <path
       d="M 0,0 H 1024 V 768 H 0 Z"
       clip-rule="nonzero"
       id="path1" />
  </clipPath>
  <g
     clip-path="url(#p.0)"
     id="g27"
     transform="translate(-334.47681,-179.33106)">
    <path
       fill="#ffffff"
       d="M 530.6168,196.96588 H 668.0026 V 315.04462 H 530.6168 Z"
       fill-rule="evenodd"
       id="path4" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="M 530.6168,196.96588 H 668.0026 V 315.04462 H 530.6168 Z"
       fill-rule="evenodd"
       id="path5" />
    <path
       fill="#999999"
       d="m 552.9071,221.32588 q -0.35937,0 -0.60937,-0.23438 -0.23438,-0.25 -0.23438,-0.59375 v -10.82812 q 0,-0.375 0.23438,-0.60938 0.25,-0.23437 0.60937,-0.23437 0.46875,0 0.73438,0.45312 l 5,10.03125 h -0.51563 l 4.89063,-10.03125 q 0.25,-0.45312 0.73437,-0.45312 0.34375,0 0.57813,0.23437 0.25,0.23438 0.25,0.60938 v 10.82812 q 0,0.34375 -0.25,0.59375 -0.25,0.23438 -0.57813,0.23438 -0.35937,0 -0.59375,-0.23438 -0.23437,-0.25 -0.23437,-0.59375 v -8.53125 l 0.3125,-0.0781 -4.1875,8.54687 q -0.28125,0.40625 -0.71875,0.40625 -0.53125,0 -0.76563,-0.48437 l -4.15625,-8.3125 0.32813,-0.0781 v 8.53125 q 0,0.34375 -0.25,0.59375 -0.23438,0.23438 -0.57813,0.23438 z m 20.47766,0.15625 q -1.29687,0 -2.4375,-0.48438 -1.125,-0.48437 -1.96875,-1.35937 -0.82812,-0.875 -1.29687,-2.03125 -0.46875,-1.17188 -0.46875,-2.53125 0,-1.34375 0.46875,-2.5 0.46875,-1.17188 1.29687,-2.03125 0.84375,-0.875 1.96875,-1.375 1.125,-0.5 2.4375,-0.5 1.23438,0 2.10938,0.32812 0.89062,0.3125 1.79687,1.04688 0.125,0.0937 0.1875,0.20312 0.0781,0.10938 0.0937,0.21875 0.0312,0.0937 0.0312,0.23438 0,0.3125 -0.21875,0.51562 -0.21875,0.1875 -0.51562,0.21875 -0.29688,0.0156 -0.59375,-0.20312 -0.59375,-0.51563 -1.23438,-0.78125 -0.625,-0.28125 -1.65625,-0.28125 -0.95312,0 -1.78125,0.39062 -0.82812,0.375 -1.46875,1.04688 -0.625,0.67187 -0.98437,1.5625 -0.34375,0.89062 -0.34375,1.90625 0,1.01562 0.34375,1.90625 0.35937,0.89062 0.98437,1.5625 0.64063,0.67187 1.46875,1.04687 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.28125 0.73438,-0.28125 1.40625,-0.78125 0.29688,-0.20312 0.5625,-0.17187 0.28125,0.0156 0.46875,0.21875 0.20313,0.20312 0.20313,0.54687 0,0.17188 -0.0625,0.32813 -0.0625,0.14062 -0.1875,0.26562 -0.875,0.6875 -1.85938,1.04688 -0.98437,0.34375 -2.0625,0.34375 z m 7.66638,-0.15625 q -0.35937,0 -0.60937,-0.23438 -0.23438,-0.25 -0.23438,-0.59375 v -10.82812 q 0,-0.375 0.23438,-0.60938 0.25,-0.23437 0.60937,-0.23437 h 3.1875 q 1.20313,0 2.125,0.53125 0.9375,0.53125 1.45313,1.46875 0.53125,0.9375 0.53125,2.14062 0,1.17188 -0.53125,2.09375 -0.51563,0.90625 -1.45313,1.42188 -0.92187,0.5 -2.125,0.5 h -2.35937 v 3.51562 q 0,0.34375 -0.23438,0.59375 -0.23437,0.23438 -0.59375,0.23438 z m 0.82813,-5.875 h 2.35937 q 0.75,0 1.29688,-0.3125 0.5625,-0.32813 0.875,-0.875 0.32812,-0.5625 0.32812,-1.29688 0,-0.76562 -0.32812,-1.34375 -0.3125,-0.57812 -0.875,-0.90625 -0.54688,-0.34375 -1.29688,-0.34375 h -2.35937 z m 16.95294,6.03125 q -1.01562,0 -1.95312,-0.3125 -0.92188,-0.32813 -1.60938,-0.89063 -0.6875,-0.57812 -1.01562,-1.34375 -0.15625,-0.32812 0.0156,-0.60937 0.17188,-0.29688 0.5625,-0.375 0.29688,-0.0625 0.57813,0.0937 0.28125,0.14062 0.42187,0.45312 0.1875,0.39063 0.625,0.73438 0.4375,0.32812 1.0625,0.54687 0.625,0.20313 1.3125,0.20313 0.78125,0 1.42188,-0.23438 0.64062,-0.25 1.04687,-0.70312 0.40625,-0.45313 0.40625,-1.125 0,-0.84375 -0.67187,-1.51563 -0.65625,-0.67187 -2.1875,-0.84375 -1.98438,-0.1875 -3.125,-1.15625 -1.125,-0.98437 -1.125,-2.42187 0,-1.0625 0.59375,-1.79688 0.59375,-0.73437 1.60937,-1.10937 1.01563,-0.39063 2.26563,-0.39063 0.96875,0 1.6875,0.28125 0.73437,0.26563 1.28125,0.75 0.54687,0.46875 0.95312,1.125 0.21875,0.35938 0.17188,0.67188 -0.0312,0.3125 -0.3125,0.48437 -0.29688,0.1875 -0.65625,0.0781 -0.34375,-0.10938 -0.51563,-0.40625 -0.26562,-0.46875 -0.64062,-0.78125 -0.35938,-0.32813 -0.85938,-0.51563 -0.48437,-0.1875 -1.15625,-0.1875 -1.1875,-0.0156 -2,0.45313 -0.79687,0.45312 -0.79687,1.39062 0,0.48438 0.25,0.92188 0.25,0.4375 0.90625,0.76562 0.67187,0.3125 1.92187,0.4375 1.90625,0.20313 2.96875,1.17188 1.0625,0.95312 1.0625,2.54687 0,0.90625 -0.375,1.57813 -0.375,0.67187 -1.01562,1.14062 -0.625,0.45313 -1.4375,0.67188 -0.79688,0.21875 -1.67188,0.21875 z m 10.99237,-0.0937 q -1.32812,0 -2.35937,-0.5625 -1.03125,-0.57813 -1.625,-1.57813 -0.57813,-1 -0.57813,-2.29687 0,-1.3125 0.54688,-2.3125 0.5625,-1 1.53125,-1.5625 0.98437,-0.5625 2.25,-0.5625 1.25,0 2.14062,0.54687 0.90625,0.54688 1.375,1.51563 0.46875,0.96875 0.46875,2.23437 0,0.3125 -0.21875,0.51563 -0.20312,0.1875 -0.51562,0.1875 h -6.45313 v -1.28125 h 6.40625 l -0.65625,0.45312 q -0.0156,-0.79687 -0.32812,-1.42187 -0.29688,-0.64063 -0.85938,-1 -0.5625,-0.375 -1.35937,-0.375 -0.90625,0 -1.5625,0.40625 -0.64063,0.39062 -0.98438,1.09375 -0.32812,0.6875 -0.32812,1.5625 0,0.89062 0.39062,1.57812 0.40625,0.6875 1.10938,1.09375 0.70312,0.39063 1.60937,0.39063 0.5,0 1.01563,-0.1875 0.53125,-0.1875 0.84375,-0.42188 0.23437,-0.17187 0.51562,-0.17187 0.28125,-0.0156 0.5,0.15625 0.26563,0.23437 0.28125,0.53125 0.0156,0.28125 -0.25,0.5 -0.54687,0.42187 -1.35937,0.70312 -0.8125,0.26563 -1.54688,0.26563 z m 6.60791,-5.53125 q 0,-0.96875 0.46875,-1.71875 0.48438,-0.76563 1.28125,-1.20313 0.79688,-0.45312 1.76563,-0.45312 0.95312,0 1.42187,0.3125 0.46875,0.3125 0.35938,0.73437 -0.0469,0.23438 -0.1875,0.35938 -0.125,0.10937 -0.3125,0.14062 -0.17188,0.0312 -0.375,-0.0156 -1.03125,-0.20313 -1.84375,-0.0312 -0.8125,0.17187 -1.28125,0.65625 -0.46875,0.48437 -0.46875,1.21875 z m 0.0156,5.46875 q -0.375,0 -0.59375,-0.20313 -0.20313,-0.20312 -0.20313,-0.59375 v -7.15625 q 0,-0.39062 0.20313,-0.59375 0.21875,-0.20312 0.59375,-0.20312 0.40625,0 0.60937,0.20312 0.20313,0.1875 0.20313,0.59375 v 7.15625 q 0,0.375 -0.20313,0.59375 -0.20312,0.20313 -0.60937,0.20313 z m 9.94787,-0.0156 q -0.5,0 -0.78125,-0.53125 l -3.39062,-7.15625 q -0.125,-0.26562 -0.0312,-0.53125 0.10937,-0.26562 0.42187,-0.40625 0.26563,-0.14062 0.54688,-0.0469 0.28125,0.0937 0.42187,0.375 l 3.17188,6.82812 h -0.76563 l 3.14063,-6.82812 q 0.14062,-0.28125 0.4375,-0.375 0.29687,-0.0937 0.59375,0.0469 0.29687,0.125 0.39062,0.40625 0.0937,0.26563 -0.0312,0.53125 l -3.39062,7.15625 q -0.25,0.53125 -0.73438,0.53125 z m 9.58862,0.0781 q -1.32812,0 -2.35937,-0.5625 -1.03125,-0.57813 -1.625,-1.57813 -0.57813,-1 -0.57813,-2.29687 0,-1.3125 0.54688,-2.3125 0.5625,-1 1.53125,-1.5625 0.98437,-0.5625 2.25,-0.5625 1.25,0 2.14062,0.54687 0.90625,0.54688 1.375,1.51563 0.46875,0.96875 0.46875,2.23437 0,0.3125 -0.21875,0.51563 -0.20312,0.1875 -0.51562,0.1875 h -6.45313 v -1.28125 h 6.40625 l -0.65625,0.45312 q -0.0156,-0.79687 -0.32812,-1.42187 -0.29688,-0.64063 -0.85938,-1 -0.5625,-0.375 -1.35937,-0.375 -0.90625,0 -1.5625,0.40625 -0.64063,0.39062 -0.98438,1.09375 -0.32812,0.6875 -0.32812,1.5625 0,0.89062 0.39062,1.57812 0.40625,0.6875 1.10938,1.09375 0.70312,0.39063 1.60937,0.39063 0.5,0 1.01563,-0.1875 0.53125,-0.1875 0.84375,-0.42188 0.23437,-0.17187 0.51562,-0.17187 0.28125,-0.0156 0.5,0.15625 0.26563,0.23437 0.28125,0.53125 0.0156,0.28125 -0.25,0.5 -0.54687,0.42187 -1.35937,0.70312 -0.8125,0.26563 -1.54688,0.26563 z m 6.60791,-5.53125 q 0,-0.96875 0.46875,-1.71875 0.48438,-0.76563 1.28125,-1.20313 0.79688,-0.45312 1.76563,-0.45312 0.95312,0 1.42187,0.3125 0.46875,0.3125 0.35938,0.73437 -0.0469,0.23438 -0.1875,0.35938 -0.125,0.10937 -0.3125,0.14062 -0.17188,0.0312 -0.375,-0.0156 -1.03125,-0.20313 -1.84375,-0.0312 -0.8125,0.17187 -1.28125,0.65625 -0.46875,0.48437 -0.46875,1.21875 z m 0.0156,5.46875 q -0.375,0 -0.59375,-0.20313 -0.20313,-0.20312 -0.20313,-0.59375 v -7.15625 q 0,-0.39062 0.20313,-0.59375 0.21875,-0.20312 0.59375,-0.20312 0.40625,0 0.60937,0.20312 0.20313,0.1875 0.20313,0.59375 v 7.15625 q 0,0.375 -0.20313,0.59375 -0.20312,0.20313 -0.60937,0.20313 z"
       fill-rule="nonzero"
       id="path6" />
    <path
       fill="#ffffff"
       d="m 530.66406,233.5643 h 137.3858 v 74.77167 h -137.3858 z"
       fill-rule="evenodd"
       id="path7" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="m 530.66406,233.5643 h 137.3858 v 74.77167 h -137.3858 z"
       fill-rule="evenodd"
       id="path8" />
    <path
       fill="#999999"
       d="m 552.6487,256.64432 q -0.23438,0 -0.40625,-0.17188 -0.15625,-0.17187 -0.15625,-0.40625 V 245.7693 q 0,-0.25 0.15625,-0.40625 0.17187,-0.17187 0.40625,-0.17187 0.35937,0 0.51562,0.29687 l 4.9375,9.82813 h -0.5 l 4.85938,-9.82813 q 0.17187,-0.29687 0.51562,-0.29687 0.23438,0 0.39063,0.17187 0.15625,0.15625 0.15625,0.40625 v 10.29689 q 0,0.23438 -0.15625,0.40625 -0.15625,0.17188 -0.39063,0.17188 -0.25,0 -0.42187,-0.17188 -0.17188,-0.17187 -0.17188,-0.40625 v -8.81251 l 0.25,0.0156 -4.32812,8.82814 q -0.15625,0.28125 -0.48438,0.28125 -0.375,0 -0.53125,-0.34375 l -4.35937,-8.71876 0.29687,-0.0625 v 8.81251 q 0,0.23438 -0.17187,0.40625 -0.17188,0.17188 -0.40625,0.17188 z m 18.95593,0.14062 q -1.1875,0 -2.21875,-0.45312 -1.03125,-0.45314 -1.82812,-1.26564 -0.78125,-0.8125 -1.21875,-1.875 -0.4375,-1.0625 -0.4375,-2.28125 0,-1.20313 0.42187,-2.26563 0.4375,-1.0625 1.21875,-1.85937 0.79688,-0.8125 1.82813,-1.26563 1.03125,-0.46875 2.23437,-0.46875 1.0625,0 1.92188,0.3125 0.85937,0.29688 1.67187,0.98438 0.125,0.0937 0.14063,0.23437 0.0312,0.14063 -0.0312,0.26563 -0.0469,0.125 -0.17188,0.1875 -0.0312,0.10937 -0.15625,0.17187 -0.10937,0.0625 -0.26562,0.0469 -0.14063,-0.0156 -0.29688,-0.14063 -0.5625,-0.5 -1.25,-0.73437 -0.67187,-0.25 -1.5625,-0.25 -0.95312,0 -1.78125,0.39062 -0.82812,0.375 -1.46875,1.04688 -0.625,0.65625 -0.98437,1.51562 -0.35938,0.85938 -0.35938,1.82813 0,1 0.35938,1.875 0.35937,0.85937 0.98437,1.51562 0.64063,0.65625 1.46875,1.03125 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.26562 0.71875,-0.26563 1.35938,-0.76563 0.17187,-0.14062 0.35937,-0.10937 0.20313,0.0312 0.34375,0.17187 0.15625,0.14063 0.15625,0.375 0,0.125 -0.0469,0.21875 -0.0312,0.0937 -0.10938,0.20313 -0.75,0.68751 -1.67187,0.96876 -0.92188,0.28125 -1.92188,0.28125 z m 6.67792,-0.14062 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.42188 V 245.7693 q 0,-0.25 0.15625,-0.40625 0.15625,-0.17187 0.40625,-0.17187 h 2.9375 q 1.07813,0 1.90625,0.48437 0.84375,0.46875 1.3125,1.3125 0.46875,0.82813 0.46875,1.9375 0,1.0625 -0.46875,1.89063 -0.46875,0.82812 -1.3125,1.3125 -0.82812,0.46875 -1.90625,0.46875 h -2.35937 v 3.46877 q 0,0.25 -0.17188,0.42187 -0.15625,0.15625 -0.40625,0.15625 z m 0.57813,-5.14064 h 2.35937 q 0.75,0 1.32813,-0.32813 0.59375,-0.32812 0.92187,-0.90625 0.32813,-0.59375 0.32813,-1.34375 0,-0.78125 -0.32813,-1.35937 -0.32812,-0.59375 -0.92187,-0.92188 -0.57813,-0.34375 -1.32813,-0.34375 h -2.35937 z m 15.63897,5.28126 q -0.9375,0 -1.73437,-0.26562 -0.79688,-0.26563 -1.39063,-0.76564 -0.57812,-0.5 -0.89062,-1.15625 -0.125,-0.23438 -0.0156,-0.4375 0.10938,-0.20313 0.375,-0.26563 0.20313,-0.0625 0.40625,0.0469 0.20313,0.0937 0.29688,0.29687 0.21875,0.42188 0.64062,0.76563 0.4375,0.34375 1.01563,0.53125 0.59375,0.17187 1.29687,0.17187 0.78125,0 1.375,-0.25 0.60938,-0.26562 0.95313,-0.75 0.34375,-0.5 0.34375,-1.20312 0,-0.89063 -0.67188,-1.53125 -0.65625,-0.64063 -2.0625,-0.82813 -1.71875,-0.20312 -2.6875,-1.0625 -0.95312,-0.85937 -0.95312,-2.09375 0,-0.90625 0.46875,-1.5625 0.48437,-0.65625 1.3125,-1.01562 0.84375,-0.35938 1.92187,-0.35938 0.8125,0 1.46875,0.26563 0.65625,0.25 1.14063,0.67187 0.5,0.40625 0.79687,0.90625 0.15625,0.23438 0.0937,0.45313 -0.0469,0.21875 -0.25,0.34375 -0.21875,0.0937 -0.45312,0.0312 -0.21875,-0.0781 -0.32813,-0.28125 -0.23437,-0.34375 -0.5625,-0.64063 -0.32812,-0.29687 -0.79687,-0.46875 -0.46875,-0.1875 -1.125,-0.20312 -1.15625,0 -1.85938,0.5 -0.70312,0.48437 -0.70312,1.42187 0,0.5 0.26562,0.92188 0.26563,0.42187 0.85938,0.71875 0.60937,0.29687 1.64062,0.45312 1.82813,0.25 2.71875,1.10938 0.89063,0.85937 0.89063,2.23437 0,0.79688 -0.29688,1.42188 -0.28125,0.60937 -0.79687,1.03125 -0.51563,0.40626 -1.21875,0.62501 -0.6875,0.21875 -1.48438,0.21875 z m 9.67121,-0.0625 q -1.1875,0 -2.10938,-0.51562 -0.90625,-0.53127 -1.4375,-1.45314 -0.51562,-0.92188 -0.51562,-2.10938 0,-1.20312 0.48437,-2.10937 0.5,-0.92188 1.35938,-1.45313 0.875,-0.53125 2,-0.53125 1.10937,0 1.9375,0.51563 0.82812,0.5 1.28125,1.39062 0.45312,0.89063 0.45312,2.04688 0,0.23437 -0.14062,0.375 -0.14063,0.125 -0.375,0.125 h -6.23438 v -0.9375 h 6.34375 l -0.625,0.45312 q 0.0156,-0.84375 -0.3125,-1.51562 -0.32812,-0.67188 -0.92187,-1.04688 -0.57813,-0.39062 -1.40625,-0.39062 -0.82813,0 -1.46875,0.40625 -0.625,0.39062 -0.96875,1.09375 -0.34375,0.6875 -0.34375,1.57812 0,0.89063 0.375,1.57813 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.5625,0.39062 0.53125,0 1.0625,-0.17187 0.53125,-0.1875 0.85937,-0.46875 0.15625,-0.14063 0.35938,-0.14063 0.21875,-0.0156 0.35937,0.10938 0.1875,0.17187 0.1875,0.375 0.0156,0.20312 -0.15625,0.35937 -0.48437,0.40627 -1.23437,0.68752 -0.75,0.26562 -1.4375,0.26562 z m 8.17083,0 q -0.875,0 -1.73437,-0.29687 -0.84375,-0.29688 -1.35938,-0.87502 -0.17187,-0.1875 -0.14062,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20312,-0.14062 0.42187,-0.10937 0.23438,0.0156 0.375,0.1875 0.34375,0.40625 0.92188,0.625 0.59375,0.21875 1.29687,0.21875 1.07813,0 1.5625,-0.375 0.48438,-0.375 0.5,-0.90625 0,-0.51563 -0.5,-0.85938 -0.5,-0.34375 -1.64062,-0.54687 -1.48438,-0.23438 -2.17188,-0.8125 -0.6875,-0.59375 -0.6875,-1.39063 0,-0.75 0.39063,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45312,-0.25 0.98438,0 1.6875,0.34375 0.71875,0.32813 1.15625,0.90625 0.14063,0.1875 0.10938,0.39063 -0.0312,0.20312 -0.23438,0.34375 -0.17187,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42188 -0.85937,-0.60938 -0.48438,-0.20312 -1.10938,-0.20312 -0.8125,0 -1.29687,0.32812 -0.48438,0.32813 -0.48438,0.82813 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45313,0.1875 1.26563,0.3125 1.09375,0.1875 1.73437,0.53125 0.64063,0.34375 0.90625,0.8125 0.26563,0.45312 0.26563,0.98437 0,0.70313 -0.40625,1.21875 -0.39063,0.51564 -1.10938,0.81252 -0.70312,0.29687 -1.625,0.29687 z m 7.89978,0 q -0.875,0 -1.73437,-0.29687 -0.84375,-0.29688 -1.35938,-0.87502 -0.17187,-0.1875 -0.14062,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20312,-0.14062 0.42187,-0.10937 0.23438,0.0156 0.375,0.1875 0.34375,0.40625 0.92188,0.625 0.59375,0.21875 1.29687,0.21875 1.07813,0 1.5625,-0.375 0.48438,-0.375 0.5,-0.90625 0,-0.51563 -0.5,-0.85938 -0.5,-0.34375 -1.64062,-0.54687 -1.48438,-0.23438 -2.17188,-0.8125 -0.6875,-0.59375 -0.6875,-1.39063 0,-0.75 0.39063,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45312,-0.25 0.98438,0 1.6875,0.34375 0.71875,0.32813 1.15625,0.90625 0.14063,0.1875 0.10938,0.39063 -0.0312,0.20312 -0.23438,0.34375 -0.17187,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42188 -0.85937,-0.60938 -0.48438,-0.20312 -1.10938,-0.20312 -0.8125,0 -1.29687,0.32812 -0.48438,0.32813 -0.48438,0.82813 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45313,0.1875 1.26563,0.3125 1.09375,0.1875 1.73437,0.53125 0.64063,0.34375 0.90625,0.8125 0.26563,0.45312 0.26563,0.98437 0,0.70313 -0.40625,1.21875 -0.39063,0.51564 -1.10938,0.81252 -0.70312,0.29687 -1.625,0.29687 z m 5.89972,-0.0781 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.15625 -0.15625,-0.42188 v -6.87501 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.87501 q 0,0.26563 -0.15625,0.42188 -0.15625,0.15625 -0.40625,0.15625 z m -0.0156,-9.54689 q -0.32813,0 -0.5625,-0.23438 -0.23438,-0.23437 -0.23438,-0.5625 0,-0.375 0.23438,-0.57812 0.25,-0.21875 0.57812,-0.21875 0.29688,0 0.53125,0.21875 0.25,0.20312 0.25,0.57812 0,0.32813 -0.23437,0.5625 -0.23438,0.23438 -0.5625,0.23438 z m 7.09509,9.62501 q -1.17187,0 -2.09375,-0.53125 -0.92187,-0.53126 -1.45312,-1.45314 -0.53125,-0.92187 -0.53125,-2.09375 0,-1.1875 0.53125,-2.10937 0.53125,-0.92188 1.45312,-1.45313 0.92188,-0.53125 2.09375,-0.53125 1.17188,0 2.07813,0.53125 0.92187,0.53125 1.45312,1.45313 0.53125,0.92187 0.54688,2.10937 0,1.17188 -0.54688,2.09375 -0.53125,0.92188 -1.45312,1.45314 -0.90625,0.53125 -2.07813,0.53125 z m 0,-1.03126 q 0.84375,0 1.51563,-0.39063 0.6875,-0.40625 1.0625,-1.09375 0.375,-0.6875 0.375,-1.5625 0,-0.875 -0.375,-1.5625 -0.375,-0.70312 -1.0625,-1.09375 -0.67188,-0.40625 -1.51563,-0.40625 -0.84375,0 -1.53125,0.40625 -0.67187,0.39063 -1.0625,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.875 0.375,1.5625 0.39063,0.6875 1.0625,1.09375 0.6875,0.39063 1.53125,0.39063 z m 13.14105,0.95314 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.40625 v -3.81252 q 0,-0.90625 -0.34375,-1.48437 -0.34375,-0.59375 -0.9375,-0.875 -0.59375,-0.29688 -1.34375,-0.29688 -0.71875,0 -1.29687,0.28125 -0.57813,0.26563 -0.92188,0.75 -0.32812,0.48438 -0.32812,1.10938 h -0.8125 q 0.0312,-0.92188 0.5,-1.64063 0.46875,-0.73437 1.23437,-1.15625 0.78125,-0.42187 1.73438,-0.42187 1.04687,0 1.85937,0.4375 0.82813,0.4375 1.29688,1.28125 0.48437,0.82812 0.48437,2.01562 v 3.81252 q 0,0.23437 -0.17187,0.40625 -0.15625,0.15625 -0.39063,0.15625 z m -6.29687,0 q -0.26563,0 -0.42188,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -6.89064 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.89064 q 0,0.25 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z"
       fill-rule="nonzero"
       id="path9" />
    <path
       fill="#999999"
       d="m 530.66406,269.38315 h 137.3858 v 45.66928 h -137.3858 z"
       fill-rule="evenodd"
       id="path10" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="m 530.66406,269.38315 h 137.3858 v 45.66928 h -137.3858 z"
       fill-rule="evenodd"
       id="path11" />
    <path
       fill="#ffffff"
       d="m 544.7865,288.2978 q -0.23437,0 -0.40625,-0.17188 -0.15625,-0.17187 -0.15625,-0.40625 V 277.4228 q 0,-0.25 0.15625,-0.40625 0.17188,-0.17188 0.40625,-0.17188 0.35938,0 0.51563,0.29688 l 4.9375,9.82812 h -0.5 l 4.85937,-9.82812 q 0.17188,-0.29688 0.51563,-0.29688 0.23437,0 0.39062,0.17188 0.15625,0.15625 0.15625,0.40625 v 10.29687 q 0,0.23438 -0.15625,0.40625 -0.15625,0.17188 -0.39062,0.17188 -0.25,0 -0.42188,-0.17188 -0.17187,-0.17187 -0.17187,-0.40625 v -8.8125 l 0.25,0.0156 -4.32813,8.82812 q -0.15625,0.28125 -0.48437,0.28125 -0.375,0 -0.53125,-0.34375 l -4.35938,-8.71875 0.29688,-0.0625 v 8.8125 q 0,0.23438 -0.17188,0.40625 -0.17187,0.17188 -0.40625,0.17188 z m 18.95593,0.14062 q -1.1875,0 -2.21875,-0.45312 -1.03125,-0.45313 -1.82812,-1.26563 -0.78125,-0.8125 -1.21875,-1.875 -0.4375,-1.0625 -0.4375,-2.28125 0,-1.20312 0.42187,-2.26562 0.4375,-1.0625 1.21875,-1.85938 0.79688,-0.8125 1.82813,-1.26562 1.03125,-0.46875 2.23437,-0.46875 1.0625,0 1.92188,0.3125 0.85937,0.29687 1.67187,0.98437 0.125,0.0937 0.14063,0.23438 0.0312,0.14062 -0.0312,0.26562 -0.0469,0.125 -0.17188,0.1875 -0.0312,0.10938 -0.15625,0.17188 -0.10937,0.0625 -0.26562,0.0469 -0.14063,-0.0156 -0.29688,-0.14062 -0.5625,-0.5 -1.25,-0.73438 -0.67187,-0.25 -1.5625,-0.25 -0.95312,0 -1.78125,0.39063 -0.82812,0.375 -1.46875,1.04687 -0.625,0.65625 -0.98437,1.51563 -0.35938,0.85937 -0.35938,1.82812 0,1 0.35938,1.875 0.35937,0.85938 0.98437,1.51563 0.64063,0.65625 1.46875,1.03125 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.26563 0.71875,-0.26562 1.35938,-0.76562 0.17187,-0.14063 0.35937,-0.10938 0.20313,0.0312 0.34375,0.17188 0.15625,0.14062 0.15625,0.375 0,0.125 -0.0469,0.21875 -0.0312,0.0937 -0.10938,0.20312 -0.75,0.6875 -1.67187,0.96875 -0.92188,0.28125 -1.92188,0.28125 z m 6.67792,-0.14062 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.42188 V 277.4228 q 0,-0.25 0.15625,-0.40625 0.15625,-0.17188 0.40625,-0.17188 h 2.9375 q 1.07813,0 1.90625,0.48438 0.84375,0.46875 1.3125,1.3125 0.46875,0.82812 0.46875,1.9375 0,1.0625 -0.46875,1.89062 -0.46875,0.82813 -1.3125,1.3125 -0.82812,0.46875 -1.90625,0.46875 h -2.35937 v 3.46875 q 0,0.25 -0.17188,0.42188 -0.15625,0.15625 -0.40625,0.15625 z m 0.57813,-5.14063 h 2.35937 q 0.75,0 1.32813,-0.32812 0.59375,-0.32813 0.92187,-0.90625 0.32813,-0.59375 0.32813,-1.34375 0,-0.78125 -0.32813,-1.35938 -0.32812,-0.59375 -0.92187,-0.92187 -0.57813,-0.34375 -1.32813,-0.34375 h -2.35937 z m 15.45147,5.14063 q -0.23437,0 -0.40625,-0.17188 -0.17187,-0.17187 -0.17187,-0.40625 v -10.875 h 1.14062 v 10.875 q 0,0.23438 -0.15625,0.40625 -0.15625,0.17188 -0.40625,0.17188 z m -4.04687,-10.40625 q -0.23438,0 -0.39063,-0.14063 -0.14062,-0.15625 -0.14062,-0.375 0,-0.23437 0.14062,-0.375 0.15625,-0.15625 0.39063,-0.15625 h 8.10937 q 0.23438,0 0.375,0.15625 0.14063,0.14063 0.14063,0.375 0,0.21875 -0.14063,0.375 -0.14062,0.14063 -0.375,0.14063 z m 8.57782,5.46875 q 0.0469,-0.90625 0.48437,-1.625 0.4375,-0.71875 1.125,-1.125 0.70313,-0.42188 1.54688,-0.42188 0.67187,0 1.03125,0.20313 0.375,0.1875 0.29687,0.54687 -0.0625,0.21875 -0.20312,0.29688 -0.14063,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82813,-0.0781 -1.46875,0.17187 -0.625,0.23438 -1,0.73438 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26563,0 -0.42188,-0.14063 -0.14062,-0.15625 -0.14062,-0.42187 v -6.89063 q 0,-0.26562 0.14062,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.26562,0 0.40625,0.15625 0.15625,0.14063 0.15625,0.40625 v 6.89063 q 0,0.26562 -0.15625,0.42187 -0.14063,0.14063 -0.40625,0.14063 z m 9.09466,0.0781 q -1.125,0 -2.01562,-0.53125 -0.89063,-0.54687 -1.42188,-1.46875 -0.51562,-0.92187 -0.51562,-2.07812 0,-1.17188 0.53125,-2.09375 0.54687,-0.92188 1.46875,-1.45313 0.92187,-0.54687 2.07812,-0.54687 1.15625,0 2.0625,0.54687 0.92188,0.53125 1.45313,1.45313 0.54687,0.92187 0.5625,2.09375 l -0.45313,0.34375 q 0,1.0625 -0.5,1.90625 -0.48437,0.84375 -1.32812,1.34375 -0.84375,0.48437 -1.92188,0.48437 z m 0.125,-1.03125 q 0.84375,0 1.51563,-0.39062 0.67187,-0.40625 1.04687,-1.09375 0.39063,-0.70313 0.39063,-1.5625 0,-0.875 -0.39063,-1.5625 -0.375,-0.70313 -1.04687,-1.09375 -0.67188,-0.40625 -1.51563,-0.40625 -0.82812,0 -1.51562,0.40625 -0.67188,0.39062 -1.0625,1.09375 -0.39063,0.6875 -0.39063,1.5625 0,0.85937 0.39063,1.5625 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.51562,0.39062 z m 3.5,0.95313 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -2.5 l 0.26563,-1.15625 0.875,0.21875 v 3.4375 q 0,0.25 -0.17188,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 9.64106,0 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.40625 v -3.8125 q 0,-0.90625 -0.34375,-1.48438 -0.34375,-0.59375 -0.9375,-0.875 -0.59375,-0.29687 -1.34375,-0.29687 -0.71875,0 -1.29688,0.28125 -0.57812,0.26562 -0.92187,0.75 -0.32813,0.48437 -0.32813,1.10937 h -0.8125 q 0.0312,-0.92187 0.5,-1.64062 0.46875,-0.73438 1.23438,-1.15625 0.78125,-0.42188 1.73437,-0.42188 1.04688,0 1.85938,0.4375 0.82812,0.4375 1.29687,1.28125 0.48438,0.82813 0.48438,2.01563 v 3.8125 q 0,0.23437 -0.17188,0.40625 -0.15625,0.15625 -0.39062,0.15625 z m -6.29688,0 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -6.89063 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.89063 q 0,0.25 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 12.15668,0.0781 q -0.875,0 -1.73438,-0.29687 -0.84375,-0.29688 -1.35937,-0.875 -0.17188,-0.1875 -0.14063,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20313,-0.14063 0.42188,-0.10938 0.23437,0.0156 0.375,0.1875 0.34375,0.40625 0.92187,0.625 0.59375,0.21875 1.29688,0.21875 1.07812,0 1.5625,-0.375 0.48437,-0.375 0.5,-0.90625 0,-0.51562 -0.5,-0.85937 -0.5,-0.34375 -1.64063,-0.54688 -1.48437,-0.23437 -2.17187,-0.8125 -0.6875,-0.59375 -0.6875,-1.39062 0,-0.75 0.39062,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45313,-0.25 0.98437,0 1.6875,0.34375 0.71875,0.32812 1.15625,0.90625 0.14062,0.1875 0.10937,0.39062 -0.0312,0.20313 -0.23437,0.34375 -0.17188,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42187 -0.85938,-0.60937 -0.48437,-0.20313 -1.10937,-0.20313 -0.8125,0 -1.29688,0.32813 -0.48437,0.32812 -0.48437,0.82812 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45312,0.1875 1.26562,0.3125 1.09375,0.1875 1.73438,0.53125 0.64062,0.34375 0.90625,0.8125 0.26562,0.45313 0.26562,0.98438 0,0.70312 -0.40625,1.21875 -0.39062,0.51562 -1.10937,0.8125 -0.70313,0.29687 -1.625,0.29687 z m 5.6654,3.34375 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.14062 -0.15625,-0.40625 v -6.92187 q 0.0156,-1.14063 0.54687,-2.04688 0.54688,-0.92187 1.45313,-1.45312 0.92187,-0.53125 2.0625,-0.53125 1.17187,0 2.09375,0.54687 0.92187,0.53125 1.45312,1.45313 0.54688,0.92187 0.54688,2.09375 0,1.15625 -0.53125,2.07812 -0.51563,0.92188 -1.40625,1.46875 -0.89063,0.53125 -2.01563,0.53125 -0.98437,0 -1.78125,-0.42187 -0.79687,-0.42188 -1.28125,-1.10938 v 4.3125 q 0,0.26563 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 3.48438,-4.375 q 0.85937,0 1.53125,-0.39062 0.67187,-0.40625 1.0625,-1.09375 0.39062,-0.70313 0.39062,-1.5625 0,-0.875 -0.39062,-1.5625 -0.39063,-0.70313 -1.0625,-1.09375 -0.67188,-0.40625 -1.53125,-0.40625 -0.82813,0 -1.51563,0.40625 -0.67187,0.39062 -1.04687,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.85937 0.375,1.5625 0.375,0.6875 1.04687,1.09375 0.6875,0.39062 1.51563,0.39062 z m 9.95575,1.03125 q -1.17188,0 -2.09375,-0.53125 -0.92188,-0.53125 -1.45313,-1.45312 -0.53125,-0.92188 -0.53125,-2.09375 0,-1.1875 0.53125,-2.10938 0.53125,-0.92187 1.45313,-1.45312 0.92187,-0.53125 2.09375,-0.53125 1.17187,0 2.07812,0.53125 0.92188,0.53125 1.45313,1.45312 0.53125,0.92188 0.54687,2.10938 0,1.17187 -0.54687,2.09375 -0.53125,0.92187 -1.45313,1.45312 -0.90625,0.53125 -2.07812,0.53125 z m 0,-1.03125 q 0.84375,0 1.51562,-0.39062 0.6875,-0.40625 1.0625,-1.09375 0.375,-0.6875 0.375,-1.5625 0,-0.875 -0.375,-1.5625 -0.375,-0.70313 -1.0625,-1.09375 -0.67187,-0.40625 -1.51562,-0.40625 -0.84375,0 -1.53125,0.40625 -0.67188,0.39062 -1.0625,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.875 0.375,1.5625 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.53125,0.39062 z m 6.7348,-3.98437 q 0.0469,-0.90625 0.48437,-1.625 0.4375,-0.71875 1.125,-1.125 0.70313,-0.42188 1.54688,-0.42188 0.67187,0 1.03125,0.20313 0.375,0.1875 0.29687,0.54687 -0.0625,0.21875 -0.20312,0.29688 -0.14063,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82813,-0.0781 -1.46875,0.17187 -0.625,0.23438 -1,0.73438 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26563,0 -0.42188,-0.14063 -0.14062,-0.15625 -0.14062,-0.42187 v -6.89063 q 0,-0.26562 0.14062,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.26562,0 0.40625,0.15625 0.15625,0.14063 0.15625,0.40625 v 6.89063 q 0,0.26562 -0.15625,0.42187 -0.14063,0.14063 -0.40625,0.14063 z m 9.29071,0 q -0.78125,0 -1.39063,-0.35938 -0.59375,-0.375 -0.95312,-1.01562 -0.34375,-0.64063 -0.34375,-1.45313 v -7.17187 q 0,-0.25 0.14062,-0.40625 0.15625,-0.15625 0.40625,-0.15625 0.25,0 0.40625,0.15625 0.17188,0.15625 0.17188,0.40625 v 7.17187 q 0,0.75 0.4375,1.23438 0.4375,0.46875 1.125,0.46875 h 0.39062 q 0.23438,0 0.375,0.15625 0.15625,0.15625 0.15625,0.40625 0,0.25 -0.17187,0.40625 -0.17188,0.15625 -0.4375,0.15625 z m -3.64063,-6.73438 q -0.21875,0 -0.375,-0.14062 -0.14062,-0.14063 -0.14062,-0.34375 0,-0.23438 0.14062,-0.35938 0.15625,-0.14062 0.375,-0.14062 h 3.73438 q 0.21875,0 0.35937,0.14062 0.15625,0.125 0.15625,0.35938 0,0.20312 -0.15625,0.34375 -0.14062,0.14062 -0.35937,0.14062 z"
       fill-rule="nonzero"
       id="path12" />
    <path
       fill="#ffffff"
       d="m 574.1676,309.71967 q -0.17188,0 -0.3125,-0.0937 -0.125,-0.0781 -0.23438,-0.28125 -0.85937,-1.76563 -1.28125,-3.53125 -0.42187,-1.76563 -0.42187,-3.54688 0,-1.76562 0.42187,-3.53125 0.42188,-1.76562 1.28125,-3.51562 0.1875,-0.39063 0.54688,-0.39063 0.23437,0 0.39062,0.17188 0.17188,0.15625 0.17188,0.39062 0,0.17188 -0.0937,0.32813 -1.60938,3.26562 -1.60938,6.5625 0,1.64062 0.40625,3.29687 0.42188,1.65625 1.21875,3.28125 0.0937,0.17188 0.0937,0.3125 0,0.23438 -0.17187,0.39063 -0.15625,0.15625 -0.40625,0.15625 z m 5.70514,-3.28125 q -0.9375,0 -1.73438,-0.26563 -0.79687,-0.26562 -1.39062,-0.76562 -0.57813,-0.5 -0.89063,-1.15625 -0.125,-0.23438 -0.0156,-0.4375 0.10937,-0.20313 0.375,-0.26563 0.20312,-0.0625 0.40625,0.0469 0.20312,0.0937 0.29687,0.29687 0.21875,0.42188 0.64063,0.76563 0.4375,0.34375 1.01562,0.53125 0.59375,0.17187 1.29688,0.17187 0.78125,0 1.375,-0.25 0.60937,-0.26562 0.95312,-0.75 0.34375,-0.5 0.34375,-1.20312 0,-0.89063 -0.67187,-1.53125 -0.65625,-0.64063 -2.0625,-0.82813 -1.71875,-0.20312 -2.6875,-1.0625 -0.95313,-0.85937 -0.95313,-2.09375 0,-0.90625 0.46875,-1.5625 0.48438,-0.65625 1.3125,-1.01562 0.84375,-0.35938 1.92188,-0.35938 0.8125,0 1.46875,0.26563 0.65625,0.25 1.14062,0.67187 0.5,0.40625 0.79688,0.90625 0.15625,0.23438 0.0937,0.45313 -0.0469,0.21875 -0.25,0.34375 -0.21875,0.0937 -0.45313,0.0312 -0.21875,-0.0781 -0.32812,-0.28125 -0.23438,-0.34375 -0.5625,-0.64063 -0.32813,-0.29687 -0.79688,-0.46875 -0.46875,-0.1875 -1.125,-0.20312 -1.15625,0 -1.85937,0.5 -0.70313,0.48437 -0.70313,1.42187 0,0.5 0.26563,0.92188 0.26562,0.42187 0.85937,0.71875 0.60938,0.29687 1.64063,0.45312 1.82812,0.25 2.71875,1.10938 0.89062,0.85937 0.89062,2.23437 0,0.79688 -0.29687,1.42188 -0.28125,0.60937 -0.79688,1.03125 -0.51562,0.40625 -1.21875,0.625 -0.6875,0.21875 -1.48437,0.21875 z m 9.6712,-0.0625 q -1.1875,0 -2.10937,-0.51563 -0.90625,-0.53125 -1.4375,-1.45312 -0.51563,-0.92188 -0.51563,-2.10938 0,-1.20312 0.48438,-2.10937 0.5,-0.92188 1.35937,-1.45313 0.875,-0.53125 2,-0.53125 1.10938,0 1.9375,0.51563 0.82813,0.5 1.28125,1.39062 0.45313,0.89063 0.45313,2.04688 0,0.23437 -0.14063,0.375 -0.14062,0.125 -0.375,0.125 h -6.23437 v -0.9375 h 6.34375 l -0.625,0.45312 q 0.0156,-0.84375 -0.3125,-1.51562 -0.32813,-0.67188 -0.92188,-1.04688 -0.57812,-0.39062 -1.40625,-0.39062 -0.82812,0 -1.46875,0.40625 -0.625,0.39062 -0.96875,1.09375 -0.34375,0.6875 -0.34375,1.57812 0,0.89063 0.375,1.57813 0.39063,0.6875 1.0625,1.09375 0.6875,0.39062 1.5625,0.39062 0.53125,0 1.0625,-0.17187 0.53125,-0.1875 0.85938,-0.46875 0.15625,-0.14063 0.35937,-0.14063 0.21875,-0.0156 0.35938,0.10938 0.1875,0.17187 0.1875,0.375 0.0156,0.20312 -0.15625,0.35937 -0.48438,0.40625 -1.23438,0.6875 -0.75,0.26563 -1.4375,0.26563 z m 5.82709,-5.01563 q 0.0469,-0.90625 0.48438,-1.625 0.4375,-0.71875 1.125,-1.125 0.70312,-0.42187 1.54687,-0.42187 0.67188,0 1.03125,0.20312 0.375,0.1875 0.29688,0.54688 -0.0625,0.21875 -0.20313,0.29687 -0.14062,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82812,-0.0781 -1.46875,0.17188 -0.625,0.23437 -1,0.73437 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26562,0 -0.42187,-0.14062 -0.14063,-0.15625 -0.14063,-0.42188 v -6.89062 q 0,-0.26563 0.14063,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.26563,0 0.40625,0.15625 0.15625,0.14062 0.15625,0.40625 v 6.89062 q 0,0.26563 -0.15625,0.42188 -0.14062,0.14062 -0.40625,0.14062 z m 8.90009,0 q -0.35938,0 -0.53125,-0.375 l -3.25,-6.90625 q -0.0937,-0.1875 -0.0156,-0.375 0.0781,-0.20312 0.29688,-0.29687 0.20312,-0.10938 0.39062,-0.0312 0.1875,0.0625 0.29688,0.26562 l 3.125,6.75 h -0.60938 l 3.07813,-6.75 q 0.0937,-0.20312 0.29687,-0.26562 0.21875,-0.0781 0.42188,0.0156 0.20312,0.0937 0.28125,0.29688 0.0781,0.20312 -0.0156,0.375 l -3.21875,6.92187 q -0.17187,0.375 -0.54687,0.375 z m 8.70227,0.0781 q -1.1875,0 -2.10938,-0.51563 -0.90625,-0.53125 -1.4375,-1.45312 -0.51562,-0.92188 -0.51562,-2.10938 0,-1.20312 0.48437,-2.10937 0.5,-0.92188 1.35938,-1.45313 0.875,-0.53125 2,-0.53125 1.10937,0 1.9375,0.51563 0.82812,0.5 1.28125,1.39062 0.45312,0.89063 0.45312,2.04688 0,0.23437 -0.14062,0.375 -0.14063,0.125 -0.375,0.125 h -6.23438 v -0.9375 h 6.34375 l -0.625,0.45312 q 0.0156,-0.84375 -0.3125,-1.51562 -0.32812,-0.67188 -0.92187,-1.04688 -0.57813,-0.39062 -1.40625,-0.39062 -0.82813,0 -1.46875,0.40625 -0.625,0.39062 -0.96875,1.09375 -0.34375,0.6875 -0.34375,1.57812 0,0.89063 0.375,1.57813 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.5625,0.39062 0.53125,0 1.0625,-0.17187 0.53125,-0.1875 0.85937,-0.46875 0.15625,-0.14063 0.35938,-0.14063 0.21875,-0.0156 0.35937,0.10938 0.1875,0.17187 0.1875,0.375 0.0156,0.20312 -0.15625,0.35937 -0.48437,0.40625 -1.23437,0.6875 -0.75,0.26563 -1.4375,0.26563 z m 5.82708,-5.01563 q 0.0469,-0.90625 0.48438,-1.625 0.4375,-0.71875 1.125,-1.125 0.70312,-0.42187 1.54687,-0.42187 0.67188,0 1.03125,0.20312 0.375,0.1875 0.29688,0.54688 -0.0625,0.21875 -0.20313,0.29687 -0.14062,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82812,-0.0781 -1.46875,0.17188 -0.625,0.23437 -1,0.73437 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26562,0 -0.42187,-0.14062 -0.14063,-0.15625 -0.14063,-0.42188 v -6.89062 q 0,-0.26563 0.14063,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.26563,0 0.40625,0.15625 0.15625,0.14062 0.15625,0.40625 v 6.89062 q 0,0.26563 -0.15625,0.42188 -0.14062,0.14062 -0.40625,0.14062 z m 5.55634,3.42188 q -0.23438,0 -0.40625,-0.15625 -0.15625,-0.15625 -0.15625,-0.39063 0,-0.14062 0.0781,-0.3125 0.8125,-1.625 1.21875,-3.28125 0.42188,-1.65625 0.42188,-3.29687 0,-3.29688 -1.625,-6.5625 -0.0781,-0.15625 -0.0937,-0.32813 0,-0.23437 0.17187,-0.39062 0.17188,-0.17188 0.39063,-0.17188 0.375,0 0.5625,0.39063 0.85937,1.75 1.28125,3.51562 0.42187,1.76563 0.42187,3.53125 0,1.78125 -0.4375,3.54688 -0.42187,1.76562 -1.26562,3.53125 -0.125,0.20312 -0.25,0.28125 -0.125,0.0937 -0.3125,0.0937 z"
       fill-rule="nonzero"
       id="path13" />
    <path
       fill="#ffffff"
       d="M 346.61942,196.9685 H 484.00525 V 315.04723 H 346.61942 Z"
       fill-rule="evenodd"
       id="path14" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="M 346.61942,196.9685 H 484.00525 V 315.04723 H 346.61942 Z"
       fill-rule="evenodd"
       id="path15" />
    <path
       fill="#999999"
       d="m 371.68576,221.3285 q -0.35937,0 -0.60937,-0.23438 -0.23438,-0.25 -0.23438,-0.59375 v -10.82812 q 0,-0.375 0.23438,-0.60938 0.25,-0.23437 0.60937,-0.23437 0.46875,0 0.73438,0.45312 l 5,10.03125 h -0.51563 l 4.89063,-10.03125 q 0.25,-0.45312 0.73437,-0.45312 0.34375,0 0.57813,0.23437 0.25,0.23438 0.25,0.60938 v 10.82812 q 0,0.34375 -0.25,0.59375 -0.25,0.23438 -0.57813,0.23438 -0.35937,0 -0.59375,-0.23438 -0.23437,-0.25 -0.23437,-0.59375 v -8.53125 l 0.3125,-0.0781 -4.1875,8.54687 q -0.28125,0.40625 -0.71875,0.40625 -0.53125,0 -0.76563,-0.48437 l -4.15625,-8.3125 0.32813,-0.0781 v 8.53125 q 0,0.34375 -0.25,0.59375 -0.23438,0.23438 -0.57813,0.23438 z m 20.47766,0.15625 q -1.29687,0 -2.4375,-0.48438 -1.125,-0.48437 -1.96875,-1.35937 -0.82812,-0.875 -1.29687,-2.03125 -0.46875,-1.17188 -0.46875,-2.53125 0,-1.34375 0.46875,-2.5 0.46875,-1.17188 1.29687,-2.03125 0.84375,-0.875 1.96875,-1.375 1.125,-0.5 2.4375,-0.5 1.23438,0 2.10938,0.32812 0.89062,0.3125 1.79687,1.04688 0.125,0.0937 0.1875,0.20312 0.0781,0.10938 0.0937,0.21875 0.0312,0.0937 0.0312,0.23438 0,0.3125 -0.21875,0.51562 -0.21875,0.1875 -0.51562,0.21875 -0.29688,0.0156 -0.59375,-0.20312 -0.59375,-0.51563 -1.23438,-0.78125 -0.625,-0.28125 -1.65625,-0.28125 -0.95312,0 -1.78125,0.39062 -0.82812,0.375 -1.46875,1.04688 -0.625,0.67187 -0.98437,1.5625 -0.34375,0.89062 -0.34375,1.90625 0,1.01562 0.34375,1.90625 0.35937,0.89062 0.98437,1.5625 0.64063,0.67187 1.46875,1.04687 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.28125 0.73438,-0.28125 1.40625,-0.78125 0.29688,-0.20312 0.5625,-0.17187 0.28125,0.0156 0.46875,0.21875 0.20313,0.20312 0.20313,0.54687 0,0.17188 -0.0625,0.32813 -0.0625,0.14062 -0.1875,0.26562 -0.875,0.6875 -1.85938,1.04688 -0.98437,0.34375 -2.0625,0.34375 z m 7.66638,-0.15625 q -0.35937,0 -0.60937,-0.23438 -0.23438,-0.25 -0.23438,-0.59375 v -10.82812 q 0,-0.375 0.23438,-0.60938 0.25,-0.23437 0.60937,-0.23437 h 3.1875 q 1.20313,0 2.125,0.53125 0.9375,0.53125 1.45313,1.46875 0.53125,0.9375 0.53125,2.14062 0,1.17188 -0.53125,2.09375 -0.51563,0.90625 -1.45313,1.42188 -0.92187,0.5 -2.125,0.5 h -2.35937 v 3.51562 q 0,0.34375 -0.23438,0.59375 -0.23437,0.23438 -0.59375,0.23438 z m 0.82813,-5.875 h 2.35937 q 0.75,0 1.29688,-0.3125 0.5625,-0.32813 0.875,-0.875 0.32812,-0.5625 0.32812,-1.29688 0,-0.76562 -0.32812,-1.34375 -0.3125,-0.57812 -0.875,-0.90625 -0.54688,-0.34375 -1.29688,-0.34375 h -2.35937 z m 18.59353,6.03125 q -1.29687,0 -2.4375,-0.48438 -1.125,-0.48437 -1.96875,-1.35937 -0.82812,-0.875 -1.29687,-2.03125 -0.46875,-1.17188 -0.46875,-2.53125 0,-1.34375 0.46875,-2.5 0.46875,-1.17188 1.29687,-2.03125 0.84375,-0.875 1.96875,-1.375 1.125,-0.5 2.4375,-0.5 1.23438,0 2.10938,0.32812 0.89062,0.3125 1.79687,1.04688 0.125,0.0937 0.1875,0.20312 0.0781,0.10938 0.0937,0.21875 0.0312,0.0937 0.0312,0.23438 0,0.3125 -0.21875,0.51562 -0.21875,0.1875 -0.51562,0.21875 -0.29688,0.0156 -0.59375,-0.20312 -0.59375,-0.51563 -1.23438,-0.78125 -0.625,-0.28125 -1.65625,-0.28125 -0.95312,0 -1.78125,0.39062 -0.82812,0.375 -1.46875,1.04688 -0.625,0.67187 -0.98437,1.5625 -0.34375,0.89062 -0.34375,1.90625 0,1.01562 0.34375,1.90625 0.35937,0.89062 0.98437,1.5625 0.64063,0.67187 1.46875,1.04687 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.28125 0.73438,-0.28125 1.40625,-0.78125 0.29688,-0.20312 0.5625,-0.17187 0.28125,0.0156 0.46875,0.21875 0.20313,0.20312 0.20313,0.54687 0,0.17188 -0.0625,0.32813 -0.0625,0.14062 -0.1875,0.26562 -0.875,0.6875 -1.85938,1.04688 -0.98437,0.34375 -2.0625,0.34375 z m 8.74451,-0.15625 q -0.70312,0 -1.25,-0.375 -0.53125,-0.39063 -0.84375,-1.04688 -0.29687,-0.67187 -0.29687,-1.53125 v -8.75 q 0,-0.34375 0.21875,-0.5625 0.21875,-0.23437 0.57812,-0.23437 0.34375,0 0.5625,0.23437 0.23438,0.21875 0.23438,0.5625 v 8.75 q 0,0.57813 0.21875,0.96875 0.23437,0.39063 0.57812,0.39063 h 0.40625 q 0.3125,0 0.51563,0.21875 0.20312,0.21875 0.20312,0.57812 0,0.34375 -0.3125,0.57813 -0.29687,0.21875 -0.78125,0.21875 z m 3.70627,0 q -0.35938,0 -0.59375,-0.23438 -0.23438,-0.23437 -0.23438,-0.57812 v -7.125 q 0,-0.35938 0.23438,-0.57813 0.23437,-0.23437 0.59375,-0.23437 0.35937,0 0.57812,0.23437 0.23438,0.21875 0.23438,0.57813 v 7.125 q 0,0.34375 -0.23438,0.57812 -0.21875,0.23438 -0.57812,0.23438 z m 0,-10.17188 q -0.4375,0 -0.75,-0.3125 -0.3125,-0.3125 -0.3125,-0.75 0,-0.42187 0.3125,-0.73437 0.3125,-0.3125 0.75,-0.3125 0.42187,0 0.73437,0.3125 0.3125,0.3125 0.3125,0.73437 0,0.4375 -0.3125,0.75 -0.3125,0.3125 -0.73437,0.3125 z m 7.957,10.23438 q -1.32813,0 -2.35938,-0.5625 -1.03125,-0.57813 -1.625,-1.57813 -0.57812,-1 -0.57812,-2.29687 0,-1.3125 0.54687,-2.3125 0.5625,-1 1.53125,-1.5625 0.98438,-0.5625 2.25,-0.5625 1.25,0 2.14063,0.54687 0.90625,0.54688 1.375,1.51563 0.46875,0.96875 0.46875,2.23437 0,0.3125 -0.21875,0.51563 -0.20313,0.1875 -0.51563,0.1875 h -6.45312 v -1.28125 h 6.40625 l -0.65625,0.45312 q -0.0156,-0.79687 -0.32813,-1.42187 -0.29687,-0.64063 -0.85937,-1 -0.5625,-0.375 -1.35938,-0.375 -0.90625,0 -1.5625,0.40625 -0.64062,0.39062 -0.98437,1.09375 -0.32813,0.6875 -0.32813,1.5625 0,0.89062 0.39063,1.57812 0.40625,0.6875 1.10937,1.09375 0.70313,0.39063 1.60938,0.39063 0.5,0 1.01562,-0.1875 0.53125,-0.1875 0.84375,-0.42188 0.23438,-0.17187 0.51563,-0.17187 0.28125,-0.0156 0.5,0.15625 0.26562,0.23437 0.28125,0.53125 0.0156,0.28125 -0.25,0.5 -0.54688,0.42187 -1.35938,0.70312 -0.8125,0.26563 -1.54687,0.26563 z m 13.21729,-0.0469 q -0.34375,0 -0.57813,-0.23437 -0.23437,-0.23438 -0.23437,-0.57813 v -3.9375 q 0,-0.90625 -0.34375,-1.48437 -0.32813,-0.57813 -0.90625,-0.85938 -0.5625,-0.28125 -1.29688,-0.28125 -0.67187,0 -1.21875,0.28125 -0.53125,0.26563 -0.85937,0.71875 -0.3125,0.45313 -0.3125,1.04688 h -1.01563 q 0,-1 0.48438,-1.79688 0.5,-0.79687 1.34375,-1.25 0.84375,-0.46875 1.90625,-0.46875 1.09375,0 1.96875,0.46875 0.875,0.46875 1.375,1.39063 0.5,0.90625 0.5,2.23437 v 3.9375 q 0,0.34375 -0.23438,0.57813 -0.21875,0.23437 -0.57812,0.23437 z m -6.57813,0 q -0.34375,0 -0.57812,-0.23437 -0.23438,-0.23438 -0.23438,-0.57813 v -7.1406 q 0,-0.35938 0.23438,-0.57813 0.23437,-0.23437 0.57812,-0.23437 0.375,0 0.59375,0.23437 0.23438,0.21875 0.23438,0.57813 v 7.14062 q 0,0.34375 -0.23438,0.57813 -0.21875,0.23437 -0.59375,0.23437 z m 13.28702,-0.0156 q -0.79688,0 -1.4375,-0.40625 -0.64063,-0.40625 -1.01563,-1.10938 -0.35937,-0.70312 -0.35937,-1.59375 v -7.625 q 0,-0.35937 0.21875,-0.57812 0.21875,-0.21875 0.57812,-0.21875 0.34375,0 0.5625,0.21875 0.23438,0.21875 0.23438,0.57812 v 7.625 q 0,0.64063 0.34375,1.07813 0.35937,0.4375 0.875,0.4375 h 0.54687 q 0.28125,0 0.48438,0.21875 0.20312,0.21875 0.20312,0.57812 0,0.34375 -0.26562,0.57813 -0.26563,0.21875 -0.6875,0.21875 z m -3.54688,-7.0625 q -0.34375,0 -0.5625,-0.1875 -0.20312,-0.1875 -0.20312,-0.48438 0,-0.3125 0.20312,-0.5 0.21875,-0.20312 0.5625,-0.20312 h 3.6875 q 0.34375,0 0.54688,0.20312 0.20312,0.1875 0.20312,0.5 0,0.29688 -0.20312,0.48438 -0.20313,0.1875 -0.54688,0.1875 z"
       fill-rule="nonzero"
       id="path16" />
    <path
       fill="#ffffff"
       d="m 346.60104,233.56168 h 137.38583 v 74.77167 H 346.60104 Z"
       fill-rule="evenodd"
       id="path17" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="m 346.60104,233.56168 h 137.38583 v 74.77167 H 346.60104 Z"
       fill-rule="evenodd"
       id="path18" />
    <path
       fill="#999999"
       d="m 368.58566,256.6417 q -0.23437,0 -0.40625,-0.17187 -0.15625,-0.17188 -0.15625,-0.40625 v -10.29689 q 0,-0.25 0.15625,-0.40625 0.17188,-0.17188 0.40625,-0.17188 0.35938,0 0.51563,0.29688 l 4.9375,9.82812 h -0.5 l 4.85937,-9.82812 q 0.17188,-0.29688 0.51563,-0.29688 0.23437,0 0.39062,0.17188 0.15625,0.15625 0.15625,0.40625 v 10.29689 q 0,0.23437 -0.15625,0.40625 -0.15625,0.17187 -0.39062,0.17187 -0.25,0 -0.42188,-0.17187 -0.17187,-0.17188 -0.17187,-0.40625 v -8.81252 l 0.25,0.0156 -4.32813,8.82814 q -0.15625,0.28125 -0.48437,0.28125 -0.375,0 -0.53125,-0.34375 l -4.35938,-8.71877 0.29688,-0.0625 v 8.81252 q 0,0.23437 -0.17188,0.40625 -0.17187,0.17187 -0.40625,0.17187 z m 18.95596,0.14063 q -1.1875,0 -2.21875,-0.45313 -1.03125,-0.45314 -1.82812,-1.26564 -0.78125,-0.8125 -1.21875,-1.875 -0.4375,-1.0625 -0.4375,-2.28125 0,-1.20313 0.42187,-2.26563 0.4375,-1.0625 1.21875,-1.85937 0.79688,-0.8125 1.82813,-1.26563 1.03125,-0.46875 2.23437,-0.46875 1.0625,0 1.92188,0.3125 0.85937,0.29688 1.67187,0.98438 0.125,0.0937 0.14063,0.23437 0.0312,0.14063 -0.0312,0.26563 -0.0469,0.125 -0.17188,0.1875 -0.0312,0.10937 -0.15625,0.17187 -0.10937,0.0625 -0.26562,0.0469 -0.14063,-0.0156 -0.29688,-0.14063 -0.5625,-0.5 -1.25,-0.73437 -0.67187,-0.25 -1.5625,-0.25 -0.95312,0 -1.78125,0.39062 -0.82812,0.375 -1.46875,1.04688 -0.625,0.65625 -0.98437,1.51562 -0.35938,0.85938 -0.35938,1.82813 0,1 0.35938,1.875 0.35937,0.85937 0.98437,1.51562 0.64063,0.65625 1.46875,1.03125 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.26562 0.71875,-0.26563 1.35938,-0.76563 0.17187,-0.14062 0.35937,-0.10937 0.20313,0.0312 0.34375,0.17187 0.15625,0.14063 0.15625,0.375 0,0.125 -0.0469,0.21875 -0.0312,0.0937 -0.10938,0.20313 -0.75,0.68751 -1.67187,0.96876 -0.92188,0.28125 -1.92188,0.28126 z m 6.67792,-0.14063 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17187 -0.15625,-0.42187 v -10.29689 q 0,-0.25 0.15625,-0.40625 0.15625,-0.17188 0.40625,-0.17188 h 2.9375 q 1.07813,0 1.90625,0.48438 0.84375,0.46875 1.3125,1.3125 0.46875,0.82812 0.46875,1.9375 0,1.0625 -0.46875,1.89062 -0.46875,0.82813 -1.3125,1.3125 -0.82812,0.46875 -1.90625,0.46875 h -2.35937 v 3.46877 q 0,0.25 -0.17188,0.42187 -0.15625,0.15625 -0.40625,0.15625 z m 0.57813,-5.14064 h 2.35937 q 0.75,0 1.32813,-0.32813 0.59375,-0.32812 0.92187,-0.90625 0.32813,-0.59375 0.32813,-1.34375 0,-0.78125 -0.32813,-1.35937 -0.32812,-0.59375 -0.92187,-0.92188 -0.57813,-0.34375 -1.32813,-0.34375 h -2.35937 z m 15.63897,5.28127 q -0.9375,0 -1.73437,-0.26563 -0.79688,-0.26562 -1.39063,-0.76564 -0.57812,-0.5 -0.89062,-1.15625 -0.125,-0.23438 -0.0156,-0.4375 0.10938,-0.20313 0.375,-0.26563 0.20313,-0.0625 0.40625,0.0469 0.20313,0.0937 0.29688,0.29687 0.21875,0.42188 0.64062,0.76563 0.4375,0.34375 1.01563,0.53125 0.59375,0.17187 1.29687,0.17187 0.78125,0 1.375,-0.25 0.60938,-0.26562 0.95313,-0.75 0.34375,-0.5 0.34375,-1.20312 0,-0.89063 -0.67188,-1.53125 -0.65625,-0.64063 -2.0625,-0.82813 -1.71875,-0.20312 -2.6875,-1.0625 -0.95312,-0.85937 -0.95312,-2.09375 0,-0.90625 0.46875,-1.5625 0.48437,-0.65625 1.3125,-1.01562 0.84375,-0.35938 1.92187,-0.35938 0.8125,0 1.46875,0.26563 0.65625,0.25 1.14063,0.67187 0.5,0.40625 0.79687,0.90625 0.15625,0.23438 0.0937,0.45313 -0.0469,0.21875 -0.25,0.34375 -0.21875,0.0937 -0.45312,0.0312 -0.21875,-0.0781 -0.32813,-0.28125 -0.23437,-0.34375 -0.5625,-0.64063 -0.32812,-0.29687 -0.79687,-0.46875 -0.46875,-0.1875 -1.125,-0.20312 -1.15625,0 -1.85938,0.5 -0.70312,0.48437 -0.70312,1.42187 0,0.5 0.26562,0.92188 0.26563,0.42187 0.85938,0.71875 0.60937,0.29687 1.64062,0.45312 1.82813,0.25 2.71875,1.10938 0.89063,0.85937 0.89063,2.23437 0,0.79688 -0.29688,1.42188 -0.28125,0.60937 -0.79687,1.03125 -0.51563,0.40627 -1.21875,0.62502 -0.6875,0.21875 -1.48438,0.21875 z m 9.67121,-0.0625 q -1.1875,0 -2.10938,-0.51563 -0.90625,-0.53127 -1.4375,-1.45314 -0.51562,-0.92188 -0.51562,-2.10938 0,-1.20312 0.48437,-2.10937 0.5,-0.92188 1.35938,-1.45313 0.875,-0.53125 2,-0.53125 1.10937,0 1.9375,0.51563 0.82812,0.5 1.28125,1.39062 0.45312,0.89063 0.45312,2.04688 0,0.23437 -0.14062,0.375 -0.14063,0.125 -0.375,0.125 h -6.23438 v -0.9375 h 6.34375 l -0.625,0.45312 q 0.0156,-0.84375 -0.3125,-1.51562 -0.32812,-0.67188 -0.92187,-1.04688 -0.57813,-0.39062 -1.40625,-0.39062 -0.82813,0 -1.46875,0.40625 -0.625,0.39062 -0.96875,1.09375 -0.34375,0.6875 -0.34375,1.57812 0,0.89063 0.375,1.57813 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.5625,0.39062 0.53125,0 1.0625,-0.17187 0.53125,-0.1875 0.85937,-0.46875 0.15625,-0.14063 0.35938,-0.14063 0.21875,-0.0156 0.35937,0.10938 0.1875,0.17187 0.1875,0.375 0.0156,0.20312 -0.15625,0.35937 -0.48437,0.40627 -1.23437,0.68752 -0.75,0.26562 -1.4375,0.26563 z m 8.17086,0 q -0.875,0 -1.73437,-0.29688 -0.84375,-0.29687 -1.35938,-0.87502 -0.17187,-0.1875 -0.14062,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20312,-0.14062 0.42187,-0.10937 0.23438,0.0156 0.375,0.1875 0.34375,0.40625 0.92188,0.625 0.59375,0.21875 1.29687,0.21875 1.07813,0 1.5625,-0.375 0.48438,-0.375 0.5,-0.90625 0,-0.51563 -0.5,-0.85938 -0.5,-0.34375 -1.64062,-0.54687 -1.48438,-0.23438 -2.17188,-0.8125 -0.6875,-0.59375 -0.6875,-1.39063 0,-0.75 0.39063,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45312,-0.25 0.98438,0 1.6875,0.34375 0.71875,0.32813 1.15625,0.90625 0.14063,0.1875 0.10938,0.39063 -0.0312,0.20312 -0.23438,0.34375 -0.17187,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42188 -0.85937,-0.60938 -0.48438,-0.20312 -1.10938,-0.20312 -0.8125,0 -1.29687,0.32812 -0.48438,0.32813 -0.48438,0.82813 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45313,0.1875 1.26563,0.3125 1.09375,0.1875 1.73437,0.53125 0.64063,0.34375 0.90625,0.8125 0.26563,0.45312 0.26563,0.98437 0,0.70313 -0.40625,1.21875 -0.39063,0.51565 -1.10938,0.81252 -0.70312,0.29688 -1.625,0.29688 z m 7.89975,0 q -0.875,0 -1.73437,-0.29688 -0.84375,-0.29687 -1.35938,-0.87502 -0.17187,-0.1875 -0.14062,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20312,-0.14062 0.42187,-0.10937 0.23438,0.0156 0.375,0.1875 0.34375,0.40625 0.92188,0.625 0.59375,0.21875 1.29687,0.21875 1.07813,0 1.5625,-0.375 0.48438,-0.375 0.5,-0.90625 0,-0.51563 -0.5,-0.85938 -0.5,-0.34375 -1.64062,-0.54687 -1.48438,-0.23438 -2.17188,-0.8125 -0.6875,-0.59375 -0.6875,-1.39063 0,-0.75 0.39063,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45312,-0.25 0.98438,0 1.6875,0.34375 0.71875,0.32813 1.15625,0.90625 0.14063,0.1875 0.10938,0.39063 -0.0312,0.20312 -0.23438,0.34375 -0.17187,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42188 -0.85937,-0.60938 -0.48438,-0.20312 -1.10938,-0.20312 -0.8125,0 -1.29687,0.32812 -0.48438,0.32813 -0.48438,0.82813 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45313,0.1875 1.26563,0.3125 1.09375,0.1875 1.73437,0.53125 0.64063,0.34375 0.90625,0.8125 0.26563,0.45312 0.26563,0.98437 0,0.70313 -0.40625,1.21875 -0.39063,0.51565 -1.10938,0.81252 -0.70312,0.29688 -1.625,0.29688 z m 5.89975,-0.0781 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.15625 -0.15625,-0.42187 v -6.87502 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.87502 q 0,0.26562 -0.15625,0.42187 -0.15625,0.15625 -0.40625,0.15625 z m -0.0156,-9.54689 q -0.32813,0 -0.5625,-0.23437 -0.23438,-0.23438 -0.23438,-0.5625 0,-0.375 0.23438,-0.57813 0.25,-0.21875 0.57812,-0.21875 0.29688,0 0.53125,0.21875 0.25,0.20313 0.25,0.57813 0,0.32812 -0.23437,0.5625 -0.23438,0.23437 -0.5625,0.23437 z m 7.09503,9.62502 q -1.17187,0 -2.09375,-0.53125 -0.92187,-0.53127 -1.45312,-1.45315 -0.53125,-0.92187 -0.53125,-2.09375 0,-1.1875 0.53125,-2.10937 0.53125,-0.92188 1.45312,-1.45313 0.92188,-0.53125 2.09375,-0.53125 1.17188,0 2.07813,0.53125 0.92187,0.53125 1.45312,1.45313 0.53125,0.92187 0.54688,2.10937 0,1.17188 -0.54688,2.09375 -0.53125,0.92188 -1.45312,1.45315 -0.90625,0.53125 -2.07813,0.53125 z m 0,-1.03127 q 0.84375,0 1.51563,-0.39063 0.6875,-0.40625 1.0625,-1.09375 0.375,-0.6875 0.375,-1.5625 0,-0.875 -0.375,-1.5625 -0.375,-0.70312 -1.0625,-1.09375 -0.67188,-0.40625 -1.51563,-0.40625 -0.84375,0 -1.53125,0.40625 -0.67187,0.39063 -1.0625,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.875 0.375,1.5625 0.39063,0.6875 1.0625,1.09375 0.6875,0.39063 1.53125,0.39063 z m 13.14108,0.95314 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.40625 v -3.81252 q 0,-0.90625 -0.34375,-1.48437 -0.34375,-0.59375 -0.9375,-0.875 -0.59375,-0.29688 -1.34375,-0.29688 -0.71875,0 -1.29687,0.28125 -0.57813,0.26563 -0.92188,0.75 -0.32812,0.48438 -0.32812,1.10938 h -0.8125 q 0.0312,-0.92188 0.5,-1.64063 0.46875,-0.73437 1.23437,-1.15625 0.78125,-0.42187 1.73438,-0.42187 1.04687,0 1.85937,0.4375 0.82813,0.4375 1.29688,1.28125 0.48437,0.82812 0.48437,2.01562 v 3.81252 q 0,0.23437 -0.17187,0.40625 -0.15625,0.15625 -0.39063,0.15625 z m -6.29687,0 q -0.26563,0 -0.42188,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -6.89064 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.89064 q 0,0.25 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z"
       fill-rule="nonzero"
       id="path19" />
    <path
       fill="#999999"
       d="m 346.60104,269.38315 h 137.38583 v 45.66928 H 346.60104 Z"
       fill-rule="evenodd"
       id="path20" />
    <path
       stroke="#999999"
       stroke-width="1"
       stroke-linejoin="round"
       stroke-linecap="butt"
       d="m 346.60104,269.38315 h 137.38583 v 45.66928 H 346.60104 Z"
       fill-rule="evenodd"
       id="path21" />
    <path
       fill="#ffffff"
       d="m 360.72348,288.2978 q -0.23438,0 -0.40625,-0.17188 -0.15625,-0.17187 -0.15625,-0.40625 V 277.4228 q 0,-0.25 0.15625,-0.40625 0.17187,-0.17188 0.40625,-0.17188 0.35937,0 0.51562,0.29688 l 4.9375,9.82812 h -0.5 l 4.85938,-9.82812 q 0.17187,-0.29688 0.51562,-0.29688 0.23438,0 0.39063,0.17188 0.15625,0.15625 0.15625,0.40625 v 10.29687 q 0,0.23438 -0.15625,0.40625 -0.15625,0.17188 -0.39063,0.17188 -0.25,0 -0.42187,-0.17188 -0.17188,-0.17187 -0.17188,-0.40625 v -8.8125 l 0.25,0.0156 -4.32812,8.82812 q -0.15625,0.28125 -0.48438,0.28125 -0.375,0 -0.53125,-0.34375 l -4.35937,-8.71875 0.29687,-0.0625 v 8.8125 q 0,0.23438 -0.17187,0.40625 -0.17188,0.17188 -0.40625,0.17188 z m 18.95596,0.14062 q -1.1875,0 -2.21875,-0.45312 -1.03125,-0.45313 -1.82812,-1.26563 -0.78125,-0.8125 -1.21875,-1.875 -0.4375,-1.0625 -0.4375,-2.28125 0,-1.20312 0.42187,-2.26562 0.4375,-1.0625 1.21875,-1.85938 0.79688,-0.8125 1.82813,-1.26562 1.03125,-0.46875 2.23437,-0.46875 1.0625,0 1.92188,0.3125 0.85937,0.29687 1.67187,0.98437 0.125,0.0937 0.14063,0.23438 0.0312,0.14062 -0.0312,0.26562 -0.0469,0.125 -0.17188,0.1875 -0.0312,0.10938 -0.15625,0.17188 -0.10937,0.0625 -0.26562,0.0469 -0.14063,-0.0156 -0.29688,-0.14062 -0.5625,-0.5 -1.25,-0.73438 -0.67187,-0.25 -1.5625,-0.25 -0.95312,0 -1.78125,0.39063 -0.82812,0.375 -1.46875,1.04687 -0.625,0.65625 -0.98437,1.51563 -0.35938,0.85937 -0.35938,1.82812 0,1 0.35938,1.875 0.35937,0.85938 0.98437,1.51563 0.64063,0.65625 1.46875,1.03125 0.82813,0.375 1.78125,0.375 0.8125,0 1.53125,-0.26563 0.71875,-0.26562 1.35938,-0.76562 0.17187,-0.14063 0.35937,-0.10938 0.20313,0.0312 0.34375,0.17188 0.15625,0.14062 0.15625,0.375 0,0.125 -0.0469,0.21875 -0.0312,0.0937 -0.10938,0.20312 -0.75,0.6875 -1.67187,0.96875 -0.92188,0.28125 -1.92188,0.28125 z m 6.67792,-0.14062 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.42188 V 277.4228 q 0,-0.25 0.15625,-0.40625 0.15625,-0.17188 0.40625,-0.17188 h 2.9375 q 1.07813,0 1.90625,0.48438 0.84375,0.46875 1.3125,1.3125 0.46875,0.82812 0.46875,1.9375 0,1.0625 -0.46875,1.89062 -0.46875,0.82813 -1.3125,1.3125 -0.82812,0.46875 -1.90625,0.46875 h -2.35937 v 3.46875 q 0,0.25 -0.17188,0.42188 -0.15625,0.15625 -0.40625,0.15625 z m 0.57813,-5.14063 h 2.35937 q 0.75,0 1.32813,-0.32812 0.59375,-0.32813 0.92187,-0.90625 0.32813,-0.59375 0.32813,-1.34375 0,-0.78125 -0.32813,-1.35938 -0.32812,-0.59375 -0.92187,-0.92187 -0.57813,-0.34375 -1.32813,-0.34375 h -2.35937 z m 15.45147,5.14063 q -0.23437,0 -0.40625,-0.17188 -0.17187,-0.17187 -0.17187,-0.40625 v -10.875 h 1.14062 v 10.875 q 0,0.23438 -0.15625,0.40625 -0.15625,0.17188 -0.40625,0.17188 z m -4.04687,-10.40625 q -0.23438,0 -0.39063,-0.14063 -0.14062,-0.15625 -0.14062,-0.375 0,-0.23437 0.14062,-0.375 0.15625,-0.15625 0.39063,-0.15625 h 8.10937 q 0.23438,0 0.375,0.15625 0.14063,0.14063 0.14063,0.375 0,0.21875 -0.14063,0.375 -0.14062,0.14063 -0.375,0.14063 z m 8.57779,5.46875 q 0.0469,-0.90625 0.48437,-1.625 0.4375,-0.71875 1.125,-1.125 0.70313,-0.42188 1.54688,-0.42188 0.67187,0 1.03125,0.20313 0.375,0.1875 0.29687,0.54687 -0.0625,0.21875 -0.20312,0.29688 -0.14063,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82813,-0.0781 -1.46875,0.17187 -0.625,0.23438 -1,0.73438 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26563,0 -0.42188,-0.14063 -0.14062,-0.15625 -0.14062,-0.42187 v -6.89063 q 0,-0.26562 0.14062,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.26562,0 0.40625,0.15625 0.15625,0.14063 0.15625,0.40625 v 6.89063 q 0,0.26562 -0.15625,0.42187 -0.14063,0.14063 -0.40625,0.14063 z m 9.09466,0.0781 q -1.125,0 -2.01562,-0.53125 -0.89063,-0.54687 -1.42188,-1.46875 -0.51562,-0.92187 -0.51562,-2.07812 0,-1.17188 0.53125,-2.09375 0.54687,-0.92188 1.46875,-1.45313 0.92187,-0.54687 2.07812,-0.54687 1.15625,0 2.0625,0.54687 0.92188,0.53125 1.45313,1.45313 0.54687,0.92187 0.5625,2.09375 l -0.45313,0.34375 q 0,1.0625 -0.5,1.90625 -0.48437,0.84375 -1.32812,1.34375 -0.84375,0.48437 -1.92188,0.48437 z m 0.125,-1.03125 q 0.84375,0 1.51563,-0.39062 0.67187,-0.40625 1.04687,-1.09375 0.39063,-0.70313 0.39063,-1.5625 0,-0.875 -0.39063,-1.5625 -0.375,-0.70313 -1.04687,-1.09375 -0.67188,-0.40625 -1.51563,-0.40625 -0.82812,0 -1.51562,0.40625 -0.67188,0.39062 -1.0625,1.09375 -0.39063,0.6875 -0.39063,1.5625 0,0.85937 0.39063,1.5625 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.51562,0.39062 z m 3.5,0.95313 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -2.5 l 0.26563,-1.15625 0.875,0.21875 v 3.4375 q 0,0.25 -0.17188,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 9.64109,0 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17188 -0.15625,-0.40625 v -3.8125 q 0,-0.90625 -0.34375,-1.48438 -0.34375,-0.59375 -0.9375,-0.875 -0.59375,-0.29687 -1.34375,-0.29687 -0.71875,0 -1.29688,0.28125 -0.57812,0.26562 -0.92187,0.75 -0.32813,0.48437 -0.32813,1.10937 h -0.8125 q 0.0312,-0.92187 0.5,-1.64062 0.46875,-0.73438 1.23438,-1.15625 0.78125,-0.42188 1.73437,-0.42188 1.04688,0 1.85938,0.4375 0.82812,0.4375 1.29687,1.28125 0.48438,0.82813 0.48438,2.01563 v 3.8125 q 0,0.23437 -0.17188,0.40625 -0.15625,0.15625 -0.39062,0.15625 z m -6.29688,0 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -6.89063 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.89063 q 0,0.25 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 12.15668,0.0781 q -0.875,0 -1.73438,-0.29687 -0.84375,-0.29688 -1.35937,-0.875 -0.17188,-0.1875 -0.14063,-0.40625 0.0312,-0.21875 0.21875,-0.375 0.20313,-0.14063 0.42188,-0.10938 0.23437,0.0156 0.375,0.1875 0.34375,0.40625 0.92187,0.625 0.59375,0.21875 1.29688,0.21875 1.07812,0 1.5625,-0.375 0.48437,-0.375 0.5,-0.90625 0,-0.51562 -0.5,-0.85937 -0.5,-0.34375 -1.64063,-0.54688 -1.48437,-0.23437 -2.17187,-0.8125 -0.6875,-0.59375 -0.6875,-1.39062 0,-0.75 0.39062,-1.25 0.40625,-0.5 1.0625,-0.75 0.65625,-0.25 1.45313,-0.25 0.98437,0 1.6875,0.34375 0.71875,0.32812 1.15625,0.90625 0.14062,0.1875 0.10937,0.39062 -0.0312,0.20313 -0.23437,0.34375 -0.17188,0.0937 -0.40625,0.0625 -0.21875,-0.0312 -0.375,-0.21875 -0.375,-0.42187 -0.85938,-0.60937 -0.48437,-0.20313 -1.10937,-0.20313 -0.8125,0 -1.29688,0.32813 -0.48437,0.32812 -0.48437,0.82812 0,0.34375 0.1875,0.59375 0.1875,0.25 0.625,0.4375 0.45312,0.1875 1.26562,0.3125 1.09375,0.1875 1.73438,0.53125 0.64062,0.34375 0.90625,0.8125 0.26562,0.45313 0.26562,0.98438 0,0.70312 -0.40625,1.21875 -0.39062,0.51562 -1.10937,0.8125 -0.70313,0.29687 -1.625,0.29687 z m 5.66537,3.34375 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.14062 -0.15625,-0.40625 v -6.92187 q 0.0156,-1.14063 0.54687,-2.04688 0.54688,-0.92187 1.45313,-1.45312 0.92187,-0.53125 2.0625,-0.53125 1.17187,0 2.09375,0.54687 0.92187,0.53125 1.45312,1.45313 0.54688,0.92187 0.54688,2.09375 0,1.15625 -0.53125,2.07812 -0.51563,0.92188 -1.40625,1.46875 -0.89063,0.53125 -2.01563,0.53125 -0.98437,0 -1.78125,-0.42187 -0.79687,-0.42188 -1.28125,-1.10938 v 4.3125 q 0,0.26563 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 3.48438,-4.375 q 0.85937,0 1.53125,-0.39062 0.67187,-0.40625 1.0625,-1.09375 0.39062,-0.70313 0.39062,-1.5625 0,-0.875 -0.39062,-1.5625 -0.39063,-0.70313 -1.0625,-1.09375 -0.67188,-0.40625 -1.53125,-0.40625 -0.82813,0 -1.51563,0.40625 -0.67187,0.39062 -1.04687,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.85937 0.375,1.5625 0.375,0.6875 1.04687,1.09375 0.6875,0.39062 1.51563,0.39062 z m 9.95578,1.03125 q -1.17188,0 -2.09375,-0.53125 -0.92188,-0.53125 -1.45313,-1.45312 -0.53125,-0.92188 -0.53125,-2.09375 0,-1.1875 0.53125,-2.10938 0.53125,-0.92187 1.45313,-1.45312 0.92187,-0.53125 2.09375,-0.53125 1.17187,0 2.07812,0.53125 0.92188,0.53125 1.45313,1.45312 0.53125,0.92188 0.54687,2.10938 0,1.17187 -0.54687,2.09375 -0.53125,0.92187 -1.45313,1.45312 -0.90625,0.53125 -2.07812,0.53125 z m 0,-1.03125 q 0.84375,0 1.51562,-0.39062 0.6875,-0.40625 1.0625,-1.09375 0.375,-0.6875 0.375,-1.5625 0,-0.875 -0.375,-1.5625 -0.375,-0.70313 -1.0625,-1.09375 -0.67187,-0.40625 -1.51562,-0.40625 -0.84375,0 -1.53125,0.40625 -0.67188,0.39062 -1.0625,1.09375 -0.375,0.6875 -0.375,1.5625 0,0.875 0.375,1.5625 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.53125,0.39062 z m 6.7348,-3.98437 q 0.0469,-0.90625 0.48437,-1.625 0.4375,-0.71875 1.125,-1.125 0.70313,-0.42188 1.54688,-0.42188 0.67187,0 1.03125,0.20313 0.375,0.1875 0.29687,0.54687 -0.0625,0.21875 -0.20312,0.29688 -0.14063,0.0781 -0.34375,0.0625 -0.1875,-0.0156 -0.4375,-0.0312 -0.82813,-0.0781 -1.46875,0.17187 -0.625,0.23438 -1,0.73438 -0.375,0.5 -0.375,1.1875 z m 0.0937,4.9375 q -0.26563,0 -0.42188,-0.14063 -0.14062,-0.15625 -0.14062,-0.42187 v -6.89063 q 0,-0.26562 0.14062,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.26562,0 0.40625,0.15625 0.15625,0.14063 0.15625,0.40625 v 6.89063 q 0,0.26562 -0.15625,0.42187 -0.14063,0.14063 -0.40625,0.14063 z m 9.29071,0 q -0.78125,0 -1.39063,-0.35938 -0.59375,-0.375 -0.95312,-1.01562 -0.34375,-0.64063 -0.34375,-1.45313 v -7.17187 q 0,-0.25 0.14062,-0.40625 0.15625,-0.15625 0.40625,-0.15625 0.25,0 0.40625,0.15625 0.17188,0.15625 0.17188,0.40625 v 7.17187 q 0,0.75 0.4375,1.23438 0.4375,0.46875 1.125,0.46875 h 0.39062 q 0.23438,0 0.375,0.15625 0.15625,0.15625 0.15625,0.40625 0,0.25 -0.17187,0.40625 -0.17188,0.15625 -0.4375,0.15625 z m -3.64063,-6.73438 q -0.21875,0 -0.375,-0.14062 -0.14062,-0.14063 -0.14062,-0.34375 0,-0.23438 0.14062,-0.35938 0.15625,-0.14062 0.375,-0.14062 h 3.73438 q 0.21875,0 0.35937,0.14062 0.15625,0.125 0.15625,0.35938 0,0.20312 -0.15625,0.34375 -0.14062,0.14062 -0.35937,0.14062 z"
       fill-rule="nonzero"
       id="path22" />
    <path
       fill="#ffffff"
       d="m 392.35425,309.71967 q -0.17188,0 -0.3125,-0.0937 -0.125,-0.0781 -0.23438,-0.28125 -0.85937,-1.76563 -1.28125,-3.53125 -0.42187,-1.76563 -0.42187,-3.54688 0,-1.76562 0.42187,-3.53125 0.42188,-1.76562 1.28125,-3.51562 0.1875,-0.39063 0.54688,-0.39063 0.23437,0 0.39062,0.17188 0.17188,0.15625 0.17188,0.39062 0,0.17188 -0.0937,0.32813 -1.60938,3.26562 -1.60938,6.5625 0,1.64062 0.40625,3.29687 0.42188,1.65625 1.21875,3.28125 0.0937,0.17188 0.0937,0.3125 0,0.23438 -0.17187,0.39063 -0.15625,0.15625 -0.40625,0.15625 z m 7.33014,-3.28125 q -1.1875,0 -2.21875,-0.45313 -1.03125,-0.45312 -1.82813,-1.26562 -0.78125,-0.8125 -1.21875,-1.875 -0.4375,-1.0625 -0.4375,-2.28125 0,-1.20313 0.42188,-2.26563 0.4375,-1.0625 1.21875,-1.85937 0.79687,-0.8125 1.82812,-1.26563 1.03125,-0.46875 2.23438,-0.46875 1.0625,0 1.92187,0.3125 0.85938,0.29688 1.67188,0.98438 0.125,0.0937 0.14062,0.23437 0.0312,0.14063 -0.0312,0.26563 -0.0469,0.125 -0.17187,0.1875 -0.0312,0.10937 -0.15625,0.17187 -0.10938,0.0625 -0.26563,0.0469 -0.14062,-0.0156 -0.29687,-0.14063 -0.5625,-0.5 -1.25,-0.73437 -0.67188,-0.25 -1.5625,-0.25 -0.95313,0 -1.78125,0.39062 -0.82813,0.375 -1.46875,1.04688 -0.625,0.65625 -0.98438,1.51562 -0.35937,0.85938 -0.35937,1.82813 0,1 0.35937,1.875 0.35938,0.85937 0.98438,1.51562 0.64062,0.65625 1.46875,1.03125 0.82812,0.375 1.78125,0.375 0.8125,0 1.53125,-0.26562 0.71875,-0.26563 1.35937,-0.76563 0.17188,-0.14062 0.35938,-0.10937 0.20312,0.0312 0.34375,0.17187 0.15625,0.14063 0.15625,0.375 0,0.125 -0.0469,0.21875 -0.0312,0.0937 -0.10937,0.20313 -0.75,0.6875 -1.67188,0.96875 -0.92187,0.28125 -1.92187,0.28125 z m 7.69354,-0.14063 q -0.57812,0 -1.04687,-0.3125 -0.46875,-0.32812 -0.71875,-0.89062 -0.25,-0.57813 -0.25,-1.32813 v -8.35937 q 0,-0.25 0.14062,-0.40625 0.15625,-0.15625 0.40625,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 8.35937 q 0,0.625 0.25,1.03125 0.26563,0.39063 0.65625,0.39063 h 0.375 q 0.21875,0 0.34375,0.15625 0.14063,0.14062 0.14063,0.39062 0,0.25 -0.1875,0.40625 -0.1875,0.15625 -0.48438,0.15625 z m 3.21118,0 q -0.26562,0 -0.42187,-0.15625 -0.15625,-0.15625 -0.15625,-0.42187 v -6.875 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42187,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.875 q 0,0.26562 -0.15625,0.42187 -0.15625,0.15625 -0.40625,0.15625 z m -0.0156,-9.54687 q -0.32813,0 -0.5625,-0.23438 -0.23438,-0.23437 -0.23438,-0.5625 0,-0.375 0.23438,-0.57812 0.25,-0.21875 0.57812,-0.21875 0.29688,0 0.53125,0.21875 0.25,0.20312 0.25,0.57812 0,0.32813 -0.23437,0.5625 -0.23438,0.23438 -0.5625,0.23438 z m 7.07944,9.625 q -1.1875,0 -2.10938,-0.51563 -0.90625,-0.53125 -1.4375,-1.45312 -0.51562,-0.92188 -0.51562,-2.10938 0,-1.20312 0.48437,-2.10937 0.5,-0.92188 1.35938,-1.45313 0.875,-0.53125 2,-0.53125 1.10937,0 1.9375,0.51563 0.82812,0.5 1.28125,1.39062 0.45312,0.89063 0.45312,2.04688 0,0.23437 -0.14062,0.375 -0.14063,0.125 -0.375,0.125 h -6.23438 v -0.9375 h 6.34375 l -0.625,0.45312 q 0.0156,-0.84375 -0.3125,-1.51562 -0.32812,-0.67188 -0.92187,-1.04688 -0.57813,-0.39062 -1.40625,-0.39062 -0.82813,0 -1.46875,0.40625 -0.625,0.39062 -0.96875,1.09375 -0.34375,0.6875 -0.34375,1.57812 0,0.89063 0.375,1.57813 0.39062,0.6875 1.0625,1.09375 0.6875,0.39062 1.5625,0.39062 0.53125,0 1.0625,-0.17187 0.53125,-0.1875 0.85937,-0.46875 0.15625,-0.14063 0.35938,-0.14063 0.21875,-0.0156 0.35937,0.10938 0.1875,0.17187 0.1875,0.375 0.0156,0.20312 -0.15625,0.35937 -0.48437,0.40625 -1.23437,0.6875 -0.75,0.26563 -1.4375,0.26563 z m 12.23333,-0.0781 q -0.25,0 -0.40625,-0.15625 -0.15625,-0.17187 -0.15625,-0.40625 v -3.8125 q 0,-0.90625 -0.34375,-1.48437 -0.34375,-0.59375 -0.9375,-0.875 -0.59375,-0.29688 -1.34375,-0.29688 -0.71875,0 -1.29687,0.28125 -0.57813,0.26563 -0.92188,0.75 -0.32812,0.48438 -0.32812,1.10938 h -0.8125 q 0.0312,-0.92188 0.5,-1.64063 0.46875,-0.73437 1.23437,-1.15625 0.78125,-0.42187 1.73438,-0.42187 1.04687,0 1.85937,0.4375 0.82813,0.4375 1.29688,1.28125 0.48437,0.82812 0.48437,2.01562 v 3.8125 q 0,0.23438 -0.17187,0.40625 -0.15625,0.15625 -0.39063,0.15625 z m -6.29687,0 q -0.26563,0 -0.42188,-0.15625 -0.15625,-0.15625 -0.15625,-0.40625 v -6.89062 q 0,-0.25 0.15625,-0.40625 0.15625,-0.15625 0.42188,-0.15625 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.40625 v 6.89062 q 0,0.25 -0.15625,0.40625 -0.15625,0.15625 -0.40625,0.15625 z m 12.48483,0 q -0.78125,0 -1.39062,-0.35937 -0.59375,-0.375 -0.95313,-1.01563 -0.34375,-0.64062 -0.34375,-1.45312 v -7.17188 q 0,-0.25 0.14063,-0.40625 0.15625,-0.15625 0.40625,-0.15625 0.25,0 0.40625,0.15625 0.17187,0.15625 0.17187,0.40625 v 7.17188 q 0,0.75 0.4375,1.23437 0.4375,0.46875 1.125,0.46875 h 0.39063 q 0.23437,0 0.375,0.15625 0.15625,0.15625 0.15625,0.40625 0,0.25 -0.17188,0.40625 -0.17187,0.15625 -0.4375,0.15625 z m -3.64062,-6.73437 q -0.21875,0 -0.375,-0.14063 -0.14063,-0.14062 -0.14063,-0.34375 0,-0.23437 0.14063,-0.35937 0.15625,-0.14063 0.375,-0.14063 h 3.73437 q 0.21875,0 0.35938,0.14063 0.15625,0.125 0.15625,0.35937 0,0.20313 -0.15625,0.34375 -0.14063,0.14063 -0.35938,0.14063 z m 5.79806,10.15625 q -0.23437,0 -0.40625,-0.15625 -0.15625,-0.15625 -0.15625,-0.39063 0,-0.14062 0.0781,-0.3125 0.8125,-1.625 1.21875,-3.28125 0.42187,-1.65625 0.42187,-3.29687 0,-3.29688 -1.625,-6.5625 -0.0781,-0.15625 -0.0937,-0.32813 0,-0.23437 0.17188,-0.39062 0.17187,-0.17188 0.39062,-0.17188 0.375,0 0.5625,0.39063 0.85938,1.75 1.28125,3.51562 0.42188,1.76563 0.42188,3.53125 0,1.78125 -0.4375,3.54688 -0.42188,1.76562 -1.26563,3.53125 -0.125,0.20312 -0.25,0.28125 -0.125,0.0937 -0.3125,0.0937 z"
       fill-rule="nonzero"
       id="path23" />
    <path
       fill="#999999"
       d="m 370.27295,324.2128 h 264.66144 v 39.59055 H 370.27295 Z"
       fill-rule="evenodd"
       id="path24" />
    <path
       fill="#ffffff"
       d="m 448.76105,350.02432 q -1.01563,0 -1.89063,-0.29688 -0.875,-0.29687 -1.51562,-0.82812 -0.64063,-0.54688 -0.96875,-1.26563 -0.14063,-0.26562 -0.0156,-0.46875 0.125,-0.21875 0.40625,-0.3125 0.23438,-0.0625 0.4375,0.0625 0.21875,0.10938 0.32813,0.32813 0.25,0.46875 0.70312,0.84375 0.46875,0.35937 1.10938,0.5625 0.64062,0.1875 1.40625,0.1875 0.84375,0 1.5,-0.26563 0.65625,-0.28125 1.03125,-0.8125 0.39062,-0.54687 0.39062,-1.3125 0,-0.98437 -0.73437,-1.6875 -0.71875,-0.70312 -2.25,-0.89062 -1.875,-0.21875 -2.9375,-1.15625 -1.04688,-0.9375 -1.04688,-2.29688 0,-0.98437 0.51563,-1.70312 0.53125,-0.71875 1.4375,-1.10938 0.90625,-0.39062 2.09375,-0.39062 0.875,0 1.59375,0.28125 0.73437,0.28125 1.26562,0.73437 0.53125,0.45313 0.875,1 0.15625,0.25 0.0937,0.5 -0.0469,0.23438 -0.28125,0.35938 -0.23437,0.125 -0.48437,0.0469 -0.25,-0.0937 -0.375,-0.3125 -0.23438,-0.375 -0.59375,-0.70312 -0.35938,-0.32813 -0.875,-0.51563 -0.51563,-0.1875 -1.23438,-0.20312 -1.26562,0 -2.03125,0.53125 -0.76562,0.53125 -0.76562,1.5625 0,0.54687 0.28125,1 0.29687,0.45312 0.95312,0.78125 0.67188,0.32812 1.78125,0.48437 2,0.29688 2.96875,1.23438 0.96875,0.9375 0.96875,2.4375 0,0.85937 -0.3125,1.53125 -0.3125,0.67187 -0.875,1.14062 -0.5625,0.45313 -1.32812,0.6875 -0.76563,0.23438 -1.625,0.23438 z m 10.01392,-0.15625 q -0.84375,0 -1.51563,-0.39063 -0.65625,-0.40625 -1.04687,-1.09375 -0.375,-0.70312 -0.375,-1.60937 v -7.8125 q 0,-0.28125 0.15625,-0.45313 0.17187,-0.17187 0.45312,-0.17187 0.26563,0 0.4375,0.17187 0.1875,0.17188 0.1875,0.45313 v 7.8125 q 0,0.82812 0.46875,1.34375 0.48438,0.51562 1.23438,0.51562 h 0.4375 q 0.25,0 0.40625,0.1875 0.17187,0.17188 0.17187,0.4375 0,0.26563 -0.20312,0.4375 -0.1875,0.17188 -0.46875,0.17188 z m -3.98438,-7.35938 q -0.23437,0 -0.40625,-0.14062 -0.15625,-0.15625 -0.15625,-0.39063 0,-0.23437 0.15625,-0.39062 0.17188,-0.15625 0.40625,-0.15625 h 4.07813 q 0.25,0 0.40625,0.15625 0.15625,0.15625 0.15625,0.39062 0,0.23438 -0.15625,0.39063 -0.15625,0.14062 -0.40625,0.14062 z m 10.97888,7.4375 q -1.26562,0 -2.28125,-0.57812 -1,-0.59375 -1.59375,-1.59375 -0.57812,-1.01563 -0.57812,-2.29688 0,-1.25 0.5625,-2.25 0.57812,-1.01562 1.54687,-1.59375 0.98438,-0.59375 2.21875,-0.59375 1.07813,0 1.9375,0.45313 0.85938,0.45312 1.39063,1.20312 v -4.70312 q 0,-0.28125 0.17187,-0.45313 0.17188,-0.17187 0.45313,-0.17187 0.26562,0 0.4375,0.17187 0.1875,0.17188 0.1875,0.45313 v 7.5625 q -0.0312,1.23437 -0.625,2.23437 -0.57813,1 -1.57813,1.57813 -1,0.57812 -2.25,0.57812 z m 0,-1.125 q 0.9375,0 1.65625,-0.4375 0.73438,-0.4375 1.15625,-1.1875 0.42188,-0.75 0.42188,-1.71875 0,-0.9375 -0.42188,-1.6875 -0.42187,-0.76562 -1.15625,-1.20312 -0.71875,-0.4375 -1.65625,-0.4375 -0.90625,0 -1.64062,0.4375 -0.73438,0.4375 -1.17188,1.20312 -0.4375,0.75 -0.4375,1.6875 0,0.96875 0.4375,1.71875 0.4375,0.75 1.17188,1.1875 0.73437,0.4375 1.64062,0.4375 z m 8.20264,1.04688 q -0.28125,0 -0.45313,-0.17188 -0.15625,-0.17187 -0.15625,-0.45312 v -7.5 q 0,-0.29688 0.15625,-0.45313 0.17188,-0.17187 0.45313,-0.17187 0.28125,0 0.4375,0.17187 0.17187,0.15625 0.17187,0.45313 v 7.5 q 0,0.28125 -0.17187,0.45312 -0.15625,0.17188 -0.4375,0.17188 z m 0,-10.42188 q -0.35938,0 -0.625,-0.25 -0.25,-0.25 -0.25,-0.625 0,-0.40625 0.26562,-0.625 0.26563,-0.23437 0.625,-0.23437 0.32813,0 0.59375,0.23437 0.26563,0.21875 0.26563,0.625 0,0.375 -0.26563,0.625 -0.25,0.25 -0.60937,0.25 z m 7.7334,10.5 q -1.28125,0 -2.29688,-0.57812 -1,-0.57813 -1.57812,-1.57813 -0.57813,-1.01562 -0.57813,-2.29687 0,-1.28125 0.57813,-2.29688 0.57812,-1.01562 1.57812,-1.57812 1.01563,-0.57813 2.29688,-0.57813 1.28125,0 2.28125,0.57813 1,0.5625 1.57812,1.57812 0.57813,1.01563 0.59375,2.29688 0,1.28125 -0.59375,2.29687 -0.57812,1 -1.57812,1.57813 -1,0.57812 -2.28125,0.57812 z m 0,-1.125 q 0.9375,0 1.67187,-0.42187 0.73438,-0.4375 1.14063,-1.1875 0.42187,-0.75 0.42187,-1.71875 0,-0.95313 -0.42187,-1.70313 -0.40625,-0.76562 -1.14063,-1.20312 -0.73437,-0.4375 -1.67187,-0.4375 -0.92188,0 -1.65625,0.4375 -0.73438,0.4375 -1.17188,1.20312 -0.42187,0.75 -0.42187,1.70313 0,0.96875 0.42187,1.71875 0.4375,0.75 1.17188,1.1875 0.73437,0.42187 1.65625,0.42187 z m 13.22314,4.79688 q -0.26562,0 -0.45312,-0.1875 -0.17188,-0.17188 -0.17188,-0.4375 v -15.01563 q 0,-0.25 0.17188,-0.4375 0.1875,-0.1875 0.45312,-0.1875 0.26563,0 0.4375,0.1875 0.1875,0.1875 0.1875,0.4375 v 15.01563 q 0,0.26562 -0.1875,0.4375 -0.17187,0.1875 -0.4375,0.1875 z m 13.2565,-3.59375 q -1.01562,0 -1.89062,-0.29688 -0.875,-0.29687 -1.51563,-0.82812 -0.64062,-0.54688 -0.96875,-1.26563 -0.14062,-0.26562 -0.0156,-0.46875 0.125,-0.21875 0.40625,-0.3125 0.23437,-0.0625 0.4375,0.0625 0.21875,0.10938 0.32812,0.32813 0.25,0.46875 0.70313,0.84375 0.46875,0.35937 1.10937,0.5625 0.64063,0.1875 1.40625,0.1875 0.84375,0 1.5,-0.26563 0.65625,-0.28125 1.03125,-0.8125 0.39063,-0.54687 0.39063,-1.3125 0,-0.98437 -0.73438,-1.6875 -0.71875,-0.70312 -2.25,-0.89062 -1.875,-0.21875 -2.9375,-1.15625 -1.04687,-0.9375 -1.04687,-2.29688 0,-0.98437 0.51562,-1.70312 0.53125,-0.71875 1.4375,-1.10938 0.90625,-0.39062 2.09375,-0.39062 0.875,0 1.59375,0.28125 0.73438,0.28125 1.26563,0.73437 0.53125,0.45313 0.875,1 0.15628,0.25 0.0938,0.5 -0.0469,0.23438 -0.28128,0.35938 -0.23438,0.125 -0.48438,0.0469 -0.25,-0.0937 -0.375,-0.3125 -0.23437,-0.375 -0.59375,-0.70312 -0.35937,-0.32813 -0.875,-0.51563 -0.51562,-0.1875 -1.23437,-0.20312 -1.26563,0 -2.03125,0.53125 -0.76563,0.53125 -0.76563,1.5625 0,0.54687 0.28125,1 0.29688,0.45312 0.95313,0.78125 0.67187,0.32812 1.78125,0.48437 2,0.29688 2.96875,1.23438 0.96878,0.9375 0.96878,2.4375 0,0.85937 -0.3125,1.53125 -0.31253,0.67187 -0.87503,1.14062 -0.5625,0.45313 -1.32813,0.6875 -0.76562,0.23438 -1.625,0.23438 z m 10.59208,0 q -1.01563,0 -1.89063,-0.29688 -0.875,-0.29687 -1.51562,-0.82812 -0.64063,-0.54688 -0.96875,-1.26563 -0.14063,-0.26562 -0.0156,-0.46875 0.125,-0.21875 0.40625,-0.3125 0.23438,-0.0625 0.4375,0.0625 0.21875,0.10938 0.32813,0.32813 0.25,0.46875 0.70312,0.84375 0.46875,0.35937 1.10938,0.5625 0.64062,0.1875 1.40625,0.1875 0.84375,0 1.5,-0.26563 0.65625,-0.28125 1.03125,-0.8125 0.39062,-0.54687 0.39062,-1.3125 0,-0.98437 -0.73437,-1.6875 -0.71875,-0.70312 -2.25,-0.89062 -1.875,-0.21875 -2.9375,-1.15625 -1.04688,-0.9375 -1.04688,-2.29688 0,-0.98437 0.51563,-1.70312 0.53125,-0.71875 1.4375,-1.10938 0.90625,-0.39062 2.09375,-0.39062 0.875,0 1.59375,0.28125 0.73437,0.28125 1.26562,0.73437 0.53125,0.45313 0.875,1 0.15625,0.25 0.0937,0.5 -0.0469,0.23438 -0.28125,0.35938 -0.23437,0.125 -0.48437,0.0469 -0.25,-0.0937 -0.375,-0.3125 -0.23438,-0.375 -0.59375,-0.70312 -0.35938,-0.32813 -0.875,-0.51563 -0.51563,-0.1875 -1.23438,-0.20312 -1.26562,0 -2.03125,0.53125 -0.76562,0.53125 -0.76562,1.5625 0,0.54687 0.28125,1 0.29687,0.45312 0.95312,0.78125 0.67188,0.32812 1.78125,0.48437 2,0.29688 2.96875,1.23438 0.96875,0.9375 0.96875,2.4375 0,0.85937 -0.3125,1.53125 -0.3125,0.67187 -0.875,1.14062 -0.5625,0.45313 -1.32812,0.6875 -0.76563,0.23438 -1.625,0.23438 z m 7.37323,-0.15625 q -0.26563,0 -0.45313,-0.17188 -0.17187,-0.1875 -0.17187,-0.45312 v -11.25 q 0,-0.26563 0.17187,-0.4375 0.1875,-0.1875 0.45313,-0.1875 h 7.51562 q 0.25,0 0.4375,0.17187 0.1875,0.17188 0.1875,0.4375 0,0.25 -0.1875,0.42188 -0.1875,0.17187 -0.4375,0.17187 h -6.89062 v 4.42188 h 5.01562 q 0.26563,0 0.4375,0.17187 0.1875,0.17188 0.1875,0.4375 0,0.25 -0.1875,0.4375 -0.17187,0.17188 -0.4375,0.17188 h -5.01562 v 4.45312 h 6.89062 q 0.25,0 0.4375,0.1875 0.1875,0.17188 0.1875,0.40625 0,0.26563 -0.1875,0.4375 -0.1875,0.17188 -0.4375,0.17188 z m 16.66632,3.75 q -0.26563,0 -0.45313,-0.1875 -0.17187,-0.17188 -0.17187,-0.4375 v -15.01563 q 0,-0.25 0.17187,-0.4375 0.1875,-0.1875 0.45313,-0.1875 0.26562,0 0.4375,0.1875 0.1875,0.1875 0.1875,0.4375 v 15.01563 q 0,0.26562 -0.1875,0.4375 -0.17188,0.1875 -0.4375,0.1875 z m 9.36584,-3.75 q -0.375,0 -0.65625,-0.26563 -0.26562,-0.28125 -0.26562,-0.65625 0,-0.40625 0.26562,-0.67187 0.28125,-0.28125 0.65625,-0.28125 0.40625,0 0.67188,0.28125 0.28125,0.28125 0.28125,0.67187 0,0.375 -0.28125,0.65625 -0.26563,0.26563 -0.67188,0.26563 z m 3.73438,0 q -0.39063,0 -0.65625,-0.26563 -0.26563,-0.28125 -0.26563,-0.65625 0,-0.40625 0.26563,-0.67187 0.26562,-0.28125 0.65625,-0.28125 0.375,0 0.65625,0.28125 0.28125,0.28125 0.28125,0.67187 0,0.375 -0.26563,0.65625 -0.26562,0.26563 -0.67187,0.26563 z m 3.73437,0 q -0.40625,0 -0.67187,-0.26563 -0.26563,-0.28125 -0.26563,-0.65625 0,-0.39062 0.26563,-0.67187 0.26562,-0.28125 0.67187,-0.28125 0.375,0 0.64063,0.28125 0.28125,0.26562 0.28125,0.67187 0,0.375 -0.28125,0.65625 -0.26563,0.26563 -0.64063,0.26563 z"
       fill-rule="nonzero"
       id="path25" />
    <path
       fill="#999999"
       d="m 382.9029,363.81628 h -18.60034 v 0 c -4.81516,0 -9.43311,-1.91281 -12.83792,-5.31766 -3.40485,-3.40484 -5.31766,-8.02276 -5.31766,-12.83792 v -21.52948 h 36.75592 z"
       fill-rule="evenodd"
       id="path26" />
    <path
       fill="#999999"
       d="m 667.9974,324.28458 -0.016,20.17407 v 0 c -0.004,5.13288 -2.04706,10.05551 -5.67945,13.685 -3.63238,3.62949 -8.55664,5.66849 -13.68951,5.66849 h -19.82758 l 0.0315,-39.52756 z"
       fill-rule="evenodd"
       id="path27" />
  </g>
</svg>


---
modelcontextprotocol/docs/logo/dark.svg
---
<svg width="1338" height="195" viewBox="0 0 1338 195" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="white" stroke-width="12" stroke-linecap="round"/>
<path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="white" stroke-width="12" stroke-linecap="round"/>
<path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="white" stroke-width="12" stroke-linecap="round"/>
<path d="M223.886 63.1818H239.364L260.091 113.773H260.909L281.636 63.1818H297.114V133H284.977V85.0341H284.33L265.034 132.795H255.966L236.67 84.9318H236.023V133H223.886V63.1818ZM333.182 134.023C328.068 134.023 323.636 132.898 319.886 130.648C316.136 128.398 313.227 125.25 311.159 121.205C309.114 117.159 308.091 112.432 308.091 107.023C308.091 101.614 309.114 96.875 311.159 92.8068C313.227 88.7386 316.136 85.5795 319.886 83.3295C323.636 81.0795 328.068 79.9545 333.182 79.9545C338.295 79.9545 342.727 81.0795 346.477 83.3295C350.227 85.5795 353.125 88.7386 355.17 92.8068C357.239 96.875 358.273 101.614 358.273 107.023C358.273 112.432 357.239 117.159 355.17 121.205C353.125 125.25 350.227 128.398 346.477 130.648C342.727 132.898 338.295 134.023 333.182 134.023ZM333.25 124.136C336.023 124.136 338.341 123.375 340.205 121.852C342.068 120.307 343.455 118.239 344.364 115.648C345.295 113.057 345.761 110.17 345.761 106.989C345.761 103.784 345.295 100.886 344.364 98.2955C343.455 95.6818 342.068 93.6023 340.205 92.0568C338.341 90.5114 336.023 89.7386 333.25 89.7386C330.409 89.7386 328.045 90.5114 326.159 92.0568C324.295 93.6023 322.898 95.6818 321.966 98.2955C321.057 100.886 320.602 103.784 320.602 106.989C320.602 110.17 321.057 113.057 321.966 115.648C322.898 118.239 324.295 120.307 326.159 121.852C328.045 123.375 330.409 124.136 333.25 124.136ZM388.179 133.92C384.065 133.92 380.384 132.864 377.134 130.75C373.884 128.636 371.315 125.568 369.429 121.545C367.543 117.523 366.599 112.636 366.599 106.886C366.599 101.068 367.554 96.1591 369.463 92.1591C371.395 88.1364 373.997 85.1023 377.27 83.0568C380.543 80.9886 384.19 79.9545 388.213 79.9545C391.281 79.9545 393.804 80.4773 395.781 81.5227C397.759 82.5455 399.327 83.7841 400.486 85.2386C401.645 86.6705 402.543 88.0227 403.179 89.2955H403.69V63.1818H416.065V133H403.929V124.75H403.179C402.543 126.023 401.622 127.375 400.418 128.807C399.213 130.216 397.622 131.42 395.645 132.42C393.668 133.42 391.179 133.92 388.179 133.92ZM391.622 123.795C394.236 123.795 396.463 123.091 398.304 121.682C400.145 120.25 401.543 118.261 402.497 115.716C403.452 113.17 403.929 110.205 403.929 106.818C403.929 103.432 403.452 100.489 402.497 97.9886C401.565 95.4886 400.179 93.5455 398.338 92.1591C396.52 90.7727 394.281 90.0795 391.622 90.0795C388.872 90.0795 386.577 90.7955 384.736 92.2273C382.895 93.6591 381.509 95.6364 380.577 98.1591C379.645 100.682 379.179 103.568 379.179 106.818C379.179 110.091 379.645 113.011 380.577 115.58C381.531 118.125 382.929 120.136 384.77 121.614C386.634 123.068 388.918 123.795 391.622 123.795ZM452.398 134.023C447.148 134.023 442.614 132.932 438.795 130.75C435 128.545 432.08 125.432 430.034 121.409C427.989 117.364 426.966 112.602 426.966 107.125C426.966 101.739 427.989 97.0114 430.034 92.9432C432.102 88.8523 434.989 85.6705 438.693 83.3977C442.398 81.1023 446.75 79.9545 451.75 79.9545C454.977 79.9545 458.023 80.4773 460.886 81.5227C463.773 82.5455 466.318 84.1364 468.523 86.2955C470.75 88.4545 472.5 91.2045 473.773 94.5455C475.045 97.8636 475.682 101.818 475.682 106.409V110.193H432.761V101.875H463.852C463.83 99.5114 463.318 97.4091 462.318 95.5682C461.318 93.7045 459.92 92.2386 458.125 91.1705C456.352 90.1023 454.284 89.5682 451.92 89.5682C449.398 89.5682 447.182 90.1818 445.273 91.4091C443.364 92.6136 441.875 94.2045 440.807 96.1818C439.761 98.1364 439.227 100.284 439.205 102.625V109.886C439.205 112.932 439.761 115.545 440.875 117.727C441.989 119.886 443.545 121.545 445.545 122.705C447.545 123.841 449.886 124.409 452.568 124.409C454.364 124.409 455.989 124.159 457.443 123.659C458.898 123.136 460.159 122.375 461.227 121.375C462.295 120.375 463.102 119.136 463.648 117.659L475.17 118.955C474.443 122 473.057 124.659 471.011 126.932C468.989 129.182 466.398 130.932 463.239 132.182C460.08 133.409 456.466 134.023 452.398 134.023ZM498.463 63.1818V133H486.122V63.1818H498.463ZM595.273 86.7386H582.523C582.159 84.6477 581.489 82.7955 580.511 81.1818C579.534 79.5455 578.318 78.1591 576.864 77.0227C575.409 75.8864 573.75 75.0341 571.886 74.4659C570.045 73.875 568.057 73.5795 565.92 73.5795C562.125 73.5795 558.761 74.5341 555.83 76.4432C552.898 78.3295 550.602 81.1023 548.943 84.7614C547.284 88.3977 546.455 92.8409 546.455 98.0909C546.455 103.432 547.284 107.932 548.943 111.591C550.625 115.227 552.92 117.977 555.83 119.841C558.761 121.682 562.114 122.602 565.886 122.602C567.977 122.602 569.932 122.33 571.75 121.784C573.591 121.216 575.239 120.386 576.693 119.295C578.17 118.205 579.409 116.864 580.409 115.273C581.432 113.682 582.136 111.864 582.523 109.818L595.273 109.886C594.795 113.205 593.761 116.318 592.17 119.227C590.602 122.136 588.545 124.705 586 126.932C583.455 129.136 580.477 130.864 577.068 132.114C573.659 133.341 569.875 133.955 565.716 133.955C559.58 133.955 554.102 132.534 549.284 129.693C544.466 126.852 540.67 122.75 537.898 117.386C535.125 112.023 533.739 105.591 533.739 98.0909C533.739 90.5682 535.136 84.1364 537.932 78.7955C540.727 73.4318 544.534 69.3295 549.352 66.4886C554.17 63.6477 559.625 62.2273 565.716 62.2273C569.602 62.2273 573.216 62.7727 576.557 63.8636C579.898 64.9545 582.875 66.5568 585.489 68.6705C588.102 70.7614 590.25 73.3295 591.932 76.375C593.636 79.3977 594.75 82.8523 595.273 86.7386ZM629.151 134.023C624.037 134.023 619.605 132.898 615.855 130.648C612.105 128.398 609.196 125.25 607.128 121.205C605.082 117.159 604.06 112.432 604.06 107.023C604.06 101.614 605.082 96.875 607.128 92.8068C609.196 88.7386 612.105 85.5795 615.855 83.3295C619.605 81.0795 624.037 79.9545 629.151 79.9545C634.264 79.9545 638.696 81.0795 642.446 83.3295C646.196 85.5795 649.094 88.7386 651.139 92.8068C653.207 96.875 654.241 101.614 654.241 107.023C654.241 112.432 653.207 117.159 651.139 121.205C649.094 125.25 646.196 128.398 642.446 130.648C638.696 132.898 634.264 134.023 629.151 134.023ZM629.219 124.136C631.991 124.136 634.31 123.375 636.173 121.852C638.037 120.307 639.423 118.239 640.332 115.648C641.264 113.057 641.73 110.17 641.73 106.989C641.73 103.784 641.264 100.886 640.332 98.2955C639.423 95.6818 638.037 93.6023 636.173 92.0568C634.31 90.5114 631.991 89.7386 629.219 89.7386C626.378 89.7386 624.014 90.5114 622.128 92.0568C620.264 93.6023 618.866 95.6818 617.935 98.2955C617.026 100.886 616.571 103.784 616.571 106.989C616.571 110.17 617.026 113.057 617.935 115.648C618.866 118.239 620.264 120.307 622.128 121.852C624.014 123.375 626.378 124.136 629.219 124.136ZM677.057 102.318V133H664.716V80.6364H676.511V89.5341H677.125C678.33 86.6023 680.25 84.2727 682.886 82.5455C685.545 80.8182 688.83 79.9545 692.739 79.9545C696.352 79.9545 699.5 80.7273 702.182 82.2727C704.886 83.8182 706.977 86.0568 708.455 88.9886C709.955 91.9205 710.693 95.4773 710.67 99.6591V133H698.33V101.568C698.33 98.0682 697.42 95.3295 695.602 93.3523C693.807 91.375 691.318 90.3864 688.136 90.3864C685.977 90.3864 684.057 90.8636 682.375 91.8182C680.716 92.75 679.409 94.1023 678.455 95.875C677.523 97.6477 677.057 99.7955 677.057 102.318ZM749.364 80.6364V90.1818H719.261V80.6364H749.364ZM726.693 68.0909H739.034V117.25C739.034 118.909 739.284 120.182 739.784 121.068C740.307 121.932 740.989 122.523 741.83 122.841C742.67 123.159 743.602 123.318 744.625 123.318C745.398 123.318 746.102 123.261 746.739 123.148C747.398 123.034 747.898 122.932 748.239 122.841L750.318 132.489C749.659 132.716 748.716 132.966 747.489 133.239C746.284 133.511 744.807 133.67 743.057 133.716C739.966 133.807 737.182 133.341 734.705 132.318C732.227 131.273 730.261 129.659 728.807 127.477C727.375 125.295 726.67 122.568 726.693 119.295V68.0909ZM782.304 134.023C777.054 134.023 772.52 132.932 768.702 130.75C764.906 128.545 761.986 125.432 759.94 121.409C757.895 117.364 756.872 112.602 756.872 107.125C756.872 101.739 757.895 97.0114 759.94 92.9432C762.009 88.8523 764.895 85.6705 768.599 83.3977C772.304 81.1023 776.656 79.9545 781.656 79.9545C784.884 79.9545 787.929 80.4773 790.793 81.5227C793.679 82.5455 796.224 84.1364 798.429 86.2955C800.656 88.4545 802.406 91.2045 803.679 94.5455C804.952 97.8636 805.588 101.818 805.588 106.409V110.193H762.668V101.875H793.759C793.736 99.5114 793.224 97.4091 792.224 95.5682C791.224 93.7045 789.827 92.2386 788.031 91.1705C786.259 90.1023 784.19 89.5682 781.827 89.5682C779.304 89.5682 777.088 90.1818 775.179 91.4091C773.27 92.6136 771.781 94.2045 770.713 96.1818C769.668 98.1364 769.134 100.284 769.111 102.625V109.886C769.111 112.932 769.668 115.545 770.781 117.727C771.895 119.886 773.452 121.545 775.452 122.705C777.452 123.841 779.793 124.409 782.474 124.409C784.27 124.409 785.895 124.159 787.349 123.659C788.804 123.136 790.065 122.375 791.134 121.375C792.202 120.375 793.009 119.136 793.554 117.659L805.077 118.955C804.349 122 802.963 124.659 800.918 126.932C798.895 129.182 796.304 130.932 793.145 132.182C789.986 133.409 786.372 134.023 782.304 134.023ZM824.994 80.6364L835.562 99.9659L846.301 80.6364H859.358L843.574 106.818L859.631 133H846.642L835.562 114.148L824.585 133H811.494L827.449 106.818L811.903 80.6364H824.994ZM895.051 80.6364V90.1818H864.949V80.6364H895.051ZM872.381 68.0909H884.722V117.25C884.722 118.909 884.972 120.182 885.472 121.068C885.994 121.932 886.676 122.523 887.517 122.841C888.358 123.159 889.29 123.318 890.312 123.318C891.085 123.318 891.79 123.261 892.426 123.148C893.085 123.034 893.585 122.932 893.926 122.841L896.006 132.489C895.347 132.716 894.403 132.966 893.176 133.239C891.972 133.511 890.494 133.67 888.744 133.716C885.653 133.807 882.869 133.341 880.392 132.318C877.915 131.273 875.949 129.659 874.494 127.477C873.063 125.295 872.358 122.568 872.381 119.295V68.0909ZM929.73 133V63.1818H955.912C961.276 63.1818 965.776 64.1818 969.412 66.1818C973.071 68.1818 975.832 70.9318 977.696 74.4318C979.582 77.9091 980.526 81.8636 980.526 86.2955C980.526 90.7727 979.582 94.75 977.696 98.2273C975.81 101.705 973.026 104.443 969.344 106.443C965.662 108.42 961.128 109.409 955.741 109.409H938.389V99.0114H954.037C957.173 99.0114 959.741 98.4659 961.741 97.375C963.741 96.2841 965.219 94.7841 966.173 92.875C967.151 90.9659 967.639 88.7727 967.639 86.2955C967.639 83.8182 967.151 81.6364 966.173 79.75C965.219 77.8636 963.73 76.3977 961.707 75.3523C959.707 74.2841 957.128 73.75 953.969 73.75H942.378V133H929.73ZM990.966 133V80.6364H1002.93V89.3636H1003.48C1004.43 86.3409 1006.07 84.0114 1008.39 82.375C1010.73 80.7159 1013.4 79.8864 1016.4 79.8864C1017.08 79.8864 1017.84 79.9205 1018.68 79.9886C1019.55 80.0341 1020.26 80.1136 1020.83 80.2273V91.5795C1020.31 91.3977 1019.48 91.2386 1018.34 91.1023C1017.23 90.9432 1016.15 90.8636 1015.1 90.8636C1012.85 90.8636 1010.83 91.3523 1009.03 92.3295C1007.26 93.2841 1005.86 94.6136 1004.84 96.3182C1003.82 98.0227 1003.31 99.9886 1003.31 102.216V133H990.966ZM1049.71 134.023C1044.6 134.023 1040.17 132.898 1036.42 130.648C1032.67 128.398 1029.76 125.25 1027.69 121.205C1025.64 117.159 1024.62 112.432 1024.62 107.023C1024.62 101.614 1025.64 96.875 1027.69 92.8068C1029.76 88.7386 1032.67 85.5795 1036.42 83.3295C1040.17 81.0795 1044.6 79.9545 1049.71 79.9545C1054.83 79.9545 1059.26 81.0795 1063.01 83.3295C1066.76 85.5795 1069.66 88.7386 1071.7 92.8068C1073.77 96.875 1074.8 101.614 1074.8 107.023C1074.8 112.432 1073.77 117.159 1071.7 121.205C1069.66 125.25 1066.76 128.398 1063.01 130.648C1059.26 132.898 1054.83 134.023 1049.71 134.023ZM1049.78 124.136C1052.55 124.136 1054.87 123.375 1056.74 121.852C1058.6 120.307 1059.99 118.239 1060.89 115.648C1061.83 113.057 1062.29 110.17 1062.29 106.989C1062.29 103.784 1061.83 100.886 1060.89 98.2955C1059.99 95.6818 1058.6 93.6023 1056.74 92.0568C1054.87 90.5114 1052.55 89.7386 1049.78 89.7386C1046.94 89.7386 1044.58 90.5114 1042.69 92.0568C1040.83 93.6023 1039.43 95.6818 1038.5 98.2955C1037.59 100.886 1037.13 103.784 1037.13 106.989C1037.13 110.17 1037.59 113.057 1038.5 115.648C1039.43 118.239 1040.83 120.307 1042.69 121.852C1044.58 123.375 1046.94 124.136 1049.78 124.136ZM1111.43 80.6364V90.1818H1081.32V80.6364H1111.43ZM1088.76 68.0909H1101.1V117.25C1101.1 118.909 1101.35 120.182 1101.85 121.068C1102.37 121.932 1103.05 122.523 1103.89 122.841C1104.73 123.159 1105.66 123.318 1106.69 123.318C1107.46 123.318 1108.16 123.261 1108.8 123.148C1109.46 123.034 1109.96 122.932 1110.3 122.841L1112.38 132.489C1111.72 132.716 1110.78 132.966 1109.55 133.239C1108.35 133.511 1106.87 133.67 1105.12 133.716C1102.03 133.807 1099.24 133.341 1096.77 132.318C1094.29 131.273 1092.32 129.659 1090.87 127.477C1089.44 125.295 1088.73 122.568 1088.76 119.295V68.0909ZM1144.03 134.023C1138.91 134.023 1134.48 132.898 1130.73 130.648C1126.98 128.398 1124.07 125.25 1122 121.205C1119.96 117.159 1118.93 112.432 1118.93 107.023C1118.93 101.614 1119.96 96.875 1122 92.8068C1124.07 88.7386 1126.98 85.5795 1130.73 83.3295C1134.48 81.0795 1138.91 79.9545 1144.03 79.9545C1149.14 79.9545 1153.57 81.0795 1157.32 83.3295C1161.07 85.5795 1163.97 88.7386 1166.01 92.8068C1168.08 96.875 1169.12 101.614 1169.12 107.023C1169.12 112.432 1168.08 117.159 1166.01 121.205C1163.97 125.25 1161.07 128.398 1157.32 130.648C1153.57 132.898 1149.14 134.023 1144.03 134.023ZM1144.09 124.136C1146.87 124.136 1149.18 123.375 1151.05 121.852C1152.91 120.307 1154.3 118.239 1155.21 115.648C1156.14 113.057 1156.61 110.17 1156.61 106.989C1156.61 103.784 1156.14 100.886 1155.21 98.2955C1154.3 95.6818 1152.91 93.6023 1151.05 92.0568C1149.18 90.5114 1146.87 89.7386 1144.09 89.7386C1141.25 89.7386 1138.89 90.5114 1137 92.0568C1135.14 93.6023 1133.74 95.6818 1132.81 98.2955C1131.9 100.886 1131.45 103.784 1131.45 106.989C1131.45 110.17 1131.9 113.057 1132.81 115.648C1133.74 118.239 1135.14 120.307 1137 121.852C1138.89 123.375 1141.25 124.136 1144.09 124.136ZM1202.43 134.023C1197.2 134.023 1192.72 132.875 1188.97 130.58C1185.24 128.284 1182.36 125.114 1180.34 121.068C1178.34 117 1177.34 112.318 1177.34 107.023C1177.34 101.705 1178.36 97.0114 1180.41 92.9432C1182.45 88.8523 1185.34 85.6705 1189.07 83.3977C1192.82 81.1023 1197.25 79.9545 1202.36 79.9545C1206.61 79.9545 1210.38 80.7386 1213.65 82.3068C1216.94 83.8523 1219.57 86.0455 1221.52 88.8864C1223.48 91.7045 1224.59 95 1224.86 98.7727H1213.07C1212.59 96.25 1211.45 94.1477 1209.66 92.4659C1207.89 90.7614 1205.51 89.9091 1202.53 89.9091C1200.01 89.9091 1197.8 90.5909 1195.89 91.9545C1193.98 93.2955 1192.49 95.2273 1191.42 97.75C1190.38 100.273 1189.85 103.295 1189.85 106.818C1189.85 110.386 1190.38 113.455 1191.42 116.023C1192.47 118.568 1193.93 120.534 1195.82 121.92C1197.73 123.284 1199.97 123.966 1202.53 123.966C1204.35 123.966 1205.98 123.625 1207.41 122.943C1208.86 122.239 1210.08 121.227 1211.06 119.909C1212.03 118.591 1212.7 116.989 1213.07 115.102H1224.86C1224.57 118.807 1223.48 122.091 1221.59 124.955C1219.7 127.795 1217.14 130.023 1213.89 131.636C1210.64 133.227 1206.82 134.023 1202.43 134.023ZM1257.84 134.023C1252.72 134.023 1248.29 132.898 1244.54 130.648C1240.79 128.398 1237.88 125.25 1235.82 121.205C1233.77 117.159 1232.75 112.432 1232.75 107.023C1232.75 101.614 1233.77 96.875 1235.82 92.8068C1237.88 88.7386 1240.79 85.5795 1244.54 83.3295C1248.29 81.0795 1252.72 79.9545 1257.84 79.9545C1262.95 79.9545 1267.38 81.0795 1271.13 83.3295C1274.88 85.5795 1277.78 88.7386 1279.83 92.8068C1281.89 96.875 1282.93 101.614 1282.93 107.023C1282.93 112.432 1281.89 117.159 1279.83 121.205C1277.78 125.25 1274.88 128.398 1271.13 130.648C1267.38 132.898 1262.95 134.023 1257.84 134.023ZM1257.91 124.136C1260.68 124.136 1263 123.375 1264.86 121.852C1266.72 120.307 1268.11 118.239 1269.02 115.648C1269.95 113.057 1270.42 110.17 1270.42 106.989C1270.42 103.784 1269.95 100.886 1269.02 98.2955C1268.11 95.6818 1266.72 93.6023 1264.86 92.0568C1263 90.5114 1260.68 89.7386 1257.91 89.7386C1255.07 89.7386 1252.7 90.5114 1250.82 92.0568C1248.95 93.6023 1247.55 95.6818 1246.62 98.2955C1245.71 100.886 1245.26 103.784 1245.26 106.989C1245.26 110.17 1245.71 113.057 1246.62 115.648C1247.55 118.239 1248.95 120.307 1250.82 121.852C1252.7 123.375 1255.07 124.136 1257.91 124.136ZM1305.74 63.1818V133H1293.4V63.1818H1305.74Z" fill="white"/>
</svg>


---
modelcontextprotocol/docs/logo/light.svg
---
<svg width="1338" height="195" viewBox="0 0 1338 195" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="black" stroke-width="12" stroke-linecap="round"/>
<path d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="black" stroke-width="12" stroke-linecap="round"/>
<path d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822" stroke="black" stroke-width="12" stroke-linecap="round"/>
<path d="M223.886 63.1818H239.364L260.091 113.773H260.909L281.636 63.1818H297.114V133H284.977V85.0341H284.33L265.034 132.795H255.966L236.67 84.9318H236.023V133H223.886V63.1818ZM333.182 134.023C328.068 134.023 323.636 132.898 319.886 130.648C316.136 128.398 313.227 125.25 311.159 121.205C309.114 117.159 308.091 112.432 308.091 107.023C308.091 101.614 309.114 96.875 311.159 92.8068C313.227 88.7386 316.136 85.5795 319.886 83.3295C323.636 81.0795 328.068 79.9545 333.182 79.9545C338.295 79.9545 342.727 81.0795 346.477 83.3295C350.227 85.5795 353.125 88.7386 355.17 92.8068C357.239 96.875 358.273 101.614 358.273 107.023C358.273 112.432 357.239 117.159 355.17 121.205C353.125 125.25 350.227 128.398 346.477 130.648C342.727 132.898 338.295 134.023 333.182 134.023ZM333.25 124.136C336.023 124.136 338.341 123.375 340.205 121.852C342.068 120.307 343.455 118.239 344.364 115.648C345.295 113.057 345.761 110.17 345.761 106.989C345.761 103.784 345.295 100.886 344.364 98.2955C343.455 95.6818 342.068 93.6023 340.205 92.0568C338.341 90.5114 336.023 89.7386 333.25 89.7386C330.409 89.7386 328.045 90.5114 326.159 92.0568C324.295 93.6023 322.898 95.6818 321.966 98.2955C321.057 100.886 320.602 103.784 320.602 106.989C320.602 110.17 321.057 113.057 321.966 115.648C322.898 118.239 324.295 120.307 326.159 121.852C328.045 123.375 330.409 124.136 333.25 124.136ZM388.179 133.92C384.065 133.92 380.384 132.864 377.134 130.75C373.884 128.636 371.315 125.568 369.429 121.545C367.543 117.523 366.599 112.636 366.599 106.886C366.599 101.068 367.554 96.1591 369.463 92.1591C371.395 88.1364 373.997 85.1023 377.27 83.0568C380.543 80.9886 384.19 79.9545 388.213 79.9545C391.281 79.9545 393.804 80.4773 395.781 81.5227C397.759 82.5455 399.327 83.7841 400.486 85.2386C401.645 86.6705 402.543 88.0227 403.179 89.2955H403.69V63.1818H416.065V133H403.929V124.75H403.179C402.543 126.023 401.622 127.375 400.418 128.807C399.213 130.216 397.622 131.42 395.645 132.42C393.668 133.42 391.179 133.92 388.179 133.92ZM391.622 123.795C394.236 123.795 396.463 123.091 398.304 121.682C400.145 120.25 401.543 118.261 402.497 115.716C403.452 113.17 403.929 110.205 403.929 106.818C403.929 103.432 403.452 100.489 402.497 97.9886C401.565 95.4886 400.179 93.5455 398.338 92.1591C396.52 90.7727 394.281 90.0795 391.622 90.0795C388.872 90.0795 386.577 90.7955 384.736 92.2273C382.895 93.6591 381.509 95.6364 380.577 98.1591C379.645 100.682 379.179 103.568 379.179 106.818C379.179 110.091 379.645 113.011 380.577 115.58C381.531 118.125 382.929 120.136 384.77 121.614C386.634 123.068 388.918 123.795 391.622 123.795ZM452.398 134.023C447.148 134.023 442.614 132.932 438.795 130.75C435 128.545 432.08 125.432 430.034 121.409C427.989 117.364 426.966 112.602 426.966 107.125C426.966 101.739 427.989 97.0114 430.034 92.9432C432.102 88.8523 434.989 85.6705 438.693 83.3977C442.398 81.1023 446.75 79.9545 451.75 79.9545C454.977 79.9545 458.023 80.4773 460.886 81.5227C463.773 82.5455 466.318 84.1364 468.523 86.2955C470.75 88.4545 472.5 91.2045 473.773 94.5455C475.045 97.8636 475.682 101.818 475.682 106.409V110.193H432.761V101.875H463.852C463.83 99.5114 463.318 97.4091 462.318 95.5682C461.318 93.7045 459.92 92.2386 458.125 91.1705C456.352 90.1023 454.284 89.5682 451.92 89.5682C449.398 89.5682 447.182 90.1818 445.273 91.4091C443.364 92.6136 441.875 94.2045 440.807 96.1818C439.761 98.1364 439.227 100.284 439.205 102.625V109.886C439.205 112.932 439.761 115.545 440.875 117.727C441.989 119.886 443.545 121.545 445.545 122.705C447.545 123.841 449.886 124.409 452.568 124.409C454.364 124.409 455.989 124.159 457.443 123.659C458.898 123.136 460.159 122.375 461.227 121.375C462.295 120.375 463.102 119.136 463.648 117.659L475.17 118.955C474.443 122 473.057 124.659 471.011 126.932C468.989 129.182 466.398 130.932 463.239 132.182C460.08 133.409 456.466 134.023 452.398 134.023ZM498.463 63.1818V133H486.122V63.1818H498.463ZM595.273 86.7386H582.523C582.159 84.6477 581.489 82.7955 580.511 81.1818C579.534 79.5455 578.318 78.1591 576.864 77.0227C575.409 75.8864 573.75 75.0341 571.886 74.4659C570.045 73.875 568.057 73.5795 565.92 73.5795C562.125 73.5795 558.761 74.5341 555.83 76.4432C552.898 78.3295 550.602 81.1023 548.943 84.7614C547.284 88.3977 546.455 92.8409 546.455 98.0909C546.455 103.432 547.284 107.932 548.943 111.591C550.625 115.227 552.92 117.977 555.83 119.841C558.761 121.682 562.114 122.602 565.886 122.602C567.977 122.602 569.932 122.33 571.75 121.784C573.591 121.216 575.239 120.386 576.693 119.295C578.17 118.205 579.409 116.864 580.409 115.273C581.432 113.682 582.136 111.864 582.523 109.818L595.273 109.886C594.795 113.205 593.761 116.318 592.17 119.227C590.602 122.136 588.545 124.705 586 126.932C583.455 129.136 580.477 130.864 577.068 132.114C573.659 133.341 569.875 133.955 565.716 133.955C559.58 133.955 554.102 132.534 549.284 129.693C544.466 126.852 540.67 122.75 537.898 117.386C535.125 112.023 533.739 105.591 533.739 98.0909C533.739 90.5682 535.136 84.1364 537.932 78.7955C540.727 73.4318 544.534 69.3295 549.352 66.4886C554.17 63.6477 559.625 62.2273 565.716 62.2273C569.602 62.2273 573.216 62.7727 576.557 63.8636C579.898 64.9545 582.875 66.5568 585.489 68.6705C588.102 70.7614 590.25 73.3295 591.932 76.375C593.636 79.3977 594.75 82.8523 595.273 86.7386ZM629.151 134.023C624.037 134.023 619.605 132.898 615.855 130.648C612.105 128.398 609.196 125.25 607.128 121.205C605.082 117.159 604.06 112.432 604.06 107.023C604.06 101.614 605.082 96.875 607.128 92.8068C609.196 88.7386 612.105 85.5795 615.855 83.3295C619.605 81.0795 624.037 79.9545 629.151 79.9545C634.264 79.9545 638.696 81.0795 642.446 83.3295C646.196 85.5795 649.094 88.7386 651.139 92.8068C653.207 96.875 654.241 101.614 654.241 107.023C654.241 112.432 653.207 117.159 651.139 121.205C649.094 125.25 646.196 128.398 642.446 130.648C638.696 132.898 634.264 134.023 629.151 134.023ZM629.219 124.136C631.991 124.136 634.31 123.375 636.173 121.852C638.037 120.307 639.423 118.239 640.332 115.648C641.264 113.057 641.73 110.17 641.73 106.989C641.73 103.784 641.264 100.886 640.332 98.2955C639.423 95.6818 638.037 93.6023 636.173 92.0568C634.31 90.5114 631.991 89.7386 629.219 89.7386C626.378 89.7386 624.014 90.5114 622.128 92.0568C620.264 93.6023 618.866 95.6818 617.935 98.2955C617.026 100.886 616.571 103.784 616.571 106.989C616.571 110.17 617.026 113.057 617.935 115.648C618.866 118.239 620.264 120.307 622.128 121.852C624.014 123.375 626.378 124.136 629.219 124.136ZM677.057 102.318V133H664.716V80.6364H676.511V89.5341H677.125C678.33 86.6023 680.25 84.2727 682.886 82.5455C685.545 80.8182 688.83 79.9545 692.739 79.9545C696.352 79.9545 699.5 80.7273 702.182 82.2727C704.886 83.8182 706.977 86.0568 708.455 88.9886C709.955 91.9205 710.693 95.4773 710.67 99.6591V133H698.33V101.568C698.33 98.0682 697.42 95.3295 695.602 93.3523C693.807 91.375 691.318 90.3864 688.136 90.3864C685.977 90.3864 684.057 90.8636 682.375 91.8182C680.716 92.75 679.409 94.1023 678.455 95.875C677.523 97.6477 677.057 99.7955 677.057 102.318ZM749.364 80.6364V90.1818H719.261V80.6364H749.364ZM726.693 68.0909H739.034V117.25C739.034 118.909 739.284 120.182 739.784 121.068C740.307 121.932 740.989 122.523 741.83 122.841C742.67 123.159 743.602 123.318 744.625 123.318C745.398 123.318 746.102 123.261 746.739 123.148C747.398 123.034 747.898 122.932 748.239 122.841L750.318 132.489C749.659 132.716 748.716 132.966 747.489 133.239C746.284 133.511 744.807 133.67 743.057 133.716C739.966 133.807 737.182 133.341 734.705 132.318C732.227 131.273 730.261 129.659 728.807 127.477C727.375 125.295 726.67 122.568 726.693 119.295V68.0909ZM782.304 134.023C777.054 134.023 772.52 132.932 768.702 130.75C764.906 128.545 761.986 125.432 759.94 121.409C757.895 117.364 756.872 112.602 756.872 107.125C756.872 101.739 757.895 97.0114 759.94 92.9432C762.009 88.8523 764.895 85.6705 768.599 83.3977C772.304 81.1023 776.656 79.9545 781.656 79.9545C784.884 79.9545 787.929 80.4773 790.793 81.5227C793.679 82.5455 796.224 84.1364 798.429 86.2955C800.656 88.4545 802.406 91.2045 803.679 94.5455C804.952 97.8636 805.588 101.818 805.588 106.409V110.193H762.668V101.875H793.759C793.736 99.5114 793.224 97.4091 792.224 95.5682C791.224 93.7045 789.827 92.2386 788.031 91.1705C786.259 90.1023 784.19 89.5682 781.827 89.5682C779.304 89.5682 777.088 90.1818 775.179 91.4091C773.27 92.6136 771.781 94.2045 770.713 96.1818C769.668 98.1364 769.134 100.284 769.111 102.625V109.886C769.111 112.932 769.668 115.545 770.781 117.727C771.895 119.886 773.452 121.545 775.452 122.705C777.452 123.841 779.793 124.409 782.474 124.409C784.27 124.409 785.895 124.159 787.349 123.659C788.804 123.136 790.065 122.375 791.134 121.375C792.202 120.375 793.009 119.136 793.554 117.659L805.077 118.955C804.349 122 802.963 124.659 800.918 126.932C798.895 129.182 796.304 130.932 793.145 132.182C789.986 133.409 786.372 134.023 782.304 134.023ZM824.994 80.6364L835.562 99.9659L846.301 80.6364H859.358L843.574 106.818L859.631 133H846.642L835.562 114.148L824.585 133H811.494L827.449 106.818L811.903 80.6364H824.994ZM895.051 80.6364V90.1818H864.949V80.6364H895.051ZM872.381 68.0909H884.722V117.25C884.722 118.909 884.972 120.182 885.472 121.068C885.994 121.932 886.676 122.523 887.517 122.841C888.358 123.159 889.29 123.318 890.312 123.318C891.085 123.318 891.79 123.261 892.426 123.148C893.085 123.034 893.585 122.932 893.926 122.841L896.006 132.489C895.347 132.716 894.403 132.966 893.176 133.239C891.972 133.511 890.494 133.67 888.744 133.716C885.653 133.807 882.869 133.341 880.392 132.318C877.915 131.273 875.949 129.659 874.494 127.477C873.063 125.295 872.358 122.568 872.381 119.295V68.0909ZM929.73 133V63.1818H955.912C961.276 63.1818 965.776 64.1818 969.412 66.1818C973.071 68.1818 975.832 70.9318 977.696 74.4318C979.582 77.9091 980.526 81.8636 980.526 86.2955C980.526 90.7727 979.582 94.75 977.696 98.2273C975.81 101.705 973.026 104.443 969.344 106.443C965.662 108.42 961.128 109.409 955.741 109.409H938.389V99.0114H954.037C957.173 99.0114 959.741 98.4659 961.741 97.375C963.741 96.2841 965.219 94.7841 966.173 92.875C967.151 90.9659 967.639 88.7727 967.639 86.2955C967.639 83.8182 967.151 81.6364 966.173 79.75C965.219 77.8636 963.73 76.3977 961.707 75.3523C959.707 74.2841 957.128 73.75 953.969 73.75H942.378V133H929.73ZM990.966 133V80.6364H1002.93V89.3636H1003.48C1004.43 86.3409 1006.07 84.0114 1008.39 82.375C1010.73 80.7159 1013.4 79.8864 1016.4 79.8864C1017.08 79.8864 1017.84 79.9205 1018.68 79.9886C1019.55 80.0341 1020.26 80.1136 1020.83 80.2273V91.5795C1020.31 91.3977 1019.48 91.2386 1018.34 91.1023C1017.23 90.9432 1016.15 90.8636 1015.1 90.8636C1012.85 90.8636 1010.83 91.3523 1009.03 92.3295C1007.26 93.2841 1005.86 94.6136 1004.84 96.3182C1003.82 98.0227 1003.31 99.9886 1003.31 102.216V133H990.966ZM1049.71 134.023C1044.6 134.023 1040.17 132.898 1036.42 130.648C1032.67 128.398 1029.76 125.25 1027.69 121.205C1025.64 117.159 1024.62 112.432 1024.62 107.023C1024.62 101.614 1025.64 96.875 1027.69 92.8068C1029.76 88.7386 1032.67 85.5795 1036.42 83.3295C1040.17 81.0795 1044.6 79.9545 1049.71 79.9545C1054.83 79.9545 1059.26 81.0795 1063.01 83.3295C1066.76 85.5795 1069.66 88.7386 1071.7 92.8068C1073.77 96.875 1074.8 101.614 1074.8 107.023C1074.8 112.432 1073.77 117.159 1071.7 121.205C1069.66 125.25 1066.76 128.398 1063.01 130.648C1059.26 132.898 1054.83 134.023 1049.71 134.023ZM1049.78 124.136C1052.55 124.136 1054.87 123.375 1056.74 121.852C1058.6 120.307 1059.99 118.239 1060.89 115.648C1061.83 113.057 1062.29 110.17 1062.29 106.989C1062.29 103.784 1061.83 100.886 1060.89 98.2955C1059.99 95.6818 1058.6 93.6023 1056.74 92.0568C1054.87 90.5114 1052.55 89.7386 1049.78 89.7386C1046.94 89.7386 1044.58 90.5114 1042.69 92.0568C1040.83 93.6023 1039.43 95.6818 1038.5 98.2955C1037.59 100.886 1037.13 103.784 1037.13 106.989C1037.13 110.17 1037.59 113.057 1038.5 115.648C1039.43 118.239 1040.83 120.307 1042.69 121.852C1044.58 123.375 1046.94 124.136 1049.78 124.136ZM1111.43 80.6364V90.1818H1081.32V80.6364H1111.43ZM1088.76 68.0909H1101.1V117.25C1101.1 118.909 1101.35 120.182 1101.85 121.068C1102.37 121.932 1103.05 122.523 1103.89 122.841C1104.73 123.159 1105.66 123.318 1106.69 123.318C1107.46 123.318 1108.16 123.261 1108.8 123.148C1109.46 123.034 1109.96 122.932 1110.3 122.841L1112.38 132.489C1111.72 132.716 1110.78 132.966 1109.55 133.239C1108.35 133.511 1106.87 133.67 1105.12 133.716C1102.03 133.807 1099.24 133.341 1096.77 132.318C1094.29 131.273 1092.32 129.659 1090.87 127.477C1089.44 125.295 1088.73 122.568 1088.76 119.295V68.0909ZM1144.03 134.023C1138.91 134.023 1134.48 132.898 1130.73 130.648C1126.98 128.398 1124.07 125.25 1122 121.205C1119.96 117.159 1118.93 112.432 1118.93 107.023C1118.93 101.614 1119.96 96.875 1122 92.8068C1124.07 88.7386 1126.98 85.5795 1130.73 83.3295C1134.48 81.0795 1138.91 79.9545 1144.03 79.9545C1149.14 79.9545 1153.57 81.0795 1157.32 83.3295C1161.07 85.5795 1163.97 88.7386 1166.01 92.8068C1168.08 96.875 1169.12 101.614 1169.12 107.023C1169.12 112.432 1168.08 117.159 1166.01 121.205C1163.97 125.25 1161.07 128.398 1157.32 130.648C1153.57 132.898 1149.14 134.023 1144.03 134.023ZM1144.09 124.136C1146.87 124.136 1149.18 123.375 1151.05 121.852C1152.91 120.307 1154.3 118.239 1155.21 115.648C1156.14 113.057 1156.61 110.17 1156.61 106.989C1156.61 103.784 1156.14 100.886 1155.21 98.2955C1154.3 95.6818 1152.91 93.6023 1151.05 92.0568C1149.18 90.5114 1146.87 89.7386 1144.09 89.7386C1141.25 89.7386 1138.89 90.5114 1137 92.0568C1135.14 93.6023 1133.74 95.6818 1132.81 98.2955C1131.9 100.886 1131.45 103.784 1131.45 106.989C1131.45 110.17 1131.9 113.057 1132.81 115.648C1133.74 118.239 1135.14 120.307 1137 121.852C1138.89 123.375 1141.25 124.136 1144.09 124.136ZM1202.43 134.023C1197.2 134.023 1192.72 132.875 1188.97 130.58C1185.24 128.284 1182.36 125.114 1180.34 121.068C1178.34 117 1177.34 112.318 1177.34 107.023C1177.34 101.705 1178.36 97.0114 1180.41 92.9432C1182.45 88.8523 1185.34 85.6705 1189.07 83.3977C1192.82 81.1023 1197.25 79.9545 1202.36 79.9545C1206.61 79.9545 1210.38 80.7386 1213.65 82.3068C1216.94 83.8523 1219.57 86.0455 1221.52 88.8864C1223.48 91.7045 1224.59 95 1224.86 98.7727H1213.07C1212.59 96.25 1211.45 94.1477 1209.66 92.4659C1207.89 90.7614 1205.51 89.9091 1202.53 89.9091C1200.01 89.9091 1197.8 90.5909 1195.89 91.9545C1193.98 93.2955 1192.49 95.2273 1191.42 97.75C1190.38 100.273 1189.85 103.295 1189.85 106.818C1189.85 110.386 1190.38 113.455 1191.42 116.023C1192.47 118.568 1193.93 120.534 1195.82 121.92C1197.73 123.284 1199.97 123.966 1202.53 123.966C1204.35 123.966 1205.98 123.625 1207.41 122.943C1208.86 122.239 1210.08 121.227 1211.06 119.909C1212.03 118.591 1212.7 116.989 1213.07 115.102H1224.86C1224.57 118.807 1223.48 122.091 1221.59 124.955C1219.7 127.795 1217.14 130.023 1213.89 131.636C1210.64 133.227 1206.82 134.023 1202.43 134.023ZM1257.84 134.023C1252.72 134.023 1248.29 132.898 1244.54 130.648C1240.79 128.398 1237.88 125.25 1235.82 121.205C1233.77 117.159 1232.75 112.432 1232.75 107.023C1232.75 101.614 1233.77 96.875 1235.82 92.8068C1237.88 88.7386 1240.79 85.5795 1244.54 83.3295C1248.29 81.0795 1252.72 79.9545 1257.84 79.9545C1262.95 79.9545 1267.38 81.0795 1271.13 83.3295C1274.88 85.5795 1277.78 88.7386 1279.83 92.8068C1281.89 96.875 1282.93 101.614 1282.93 107.023C1282.93 112.432 1281.89 117.159 1279.83 121.205C1277.78 125.25 1274.88 128.398 1271.13 130.648C1267.38 132.898 1262.95 134.023 1257.84 134.023ZM1257.91 124.136C1260.68 124.136 1263 123.375 1264.86 121.852C1266.72 120.307 1268.11 118.239 1269.02 115.648C1269.95 113.057 1270.42 110.17 1270.42 106.989C1270.42 103.784 1269.95 100.886 1269.02 98.2955C1268.11 95.6818 1266.72 93.6023 1264.86 92.0568C1263 90.5114 1260.68 89.7386 1257.91 89.7386C1255.07 89.7386 1252.7 90.5114 1250.82 92.0568C1248.95 93.6023 1247.55 95.6818 1246.62 98.2955C1245.71 100.886 1245.26 103.784 1245.26 106.989C1245.26 110.17 1245.71 113.057 1246.62 115.648C1247.55 118.239 1248.95 120.307 1250.82 121.852C1252.7 123.375 1255.07 124.136 1257.91 124.136ZM1305.74 63.1818V133H1293.4V63.1818H1305.74Z" fill="black"/>
</svg>


---
modelcontextprotocol/docs/quickstart/client.mdx
---
---
title: "For Client Developers"
description: "Get started building your own client that can integrate with all MCP servers."
---

In this tutorial, you'll learn how to build a LLM-powered chatbot client that connects to MCP servers. It helps to have gone through the [Server quickstart](/quickstart/server) that guides you through the basic of building your first server.

<Tabs>
<Tab title="Python">

[You can find the complete code for this tutorial here.](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/mcp-client-python)

## System Requirements

Before starting, ensure your system meets these requirements:
- Mac or Windows computer
- Latest Python version installed
- Latest version of `uv` installed

## Setting Up Your Environment

First, create a new Python project with `uv`:

```bash
# Create project directory
uv init mcp-client
cd mcp-client

# Create virtual environment
uv venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Unix or MacOS:
source .venv/bin/activate

# Install required packages
uv add mcp anthropic python-dotenv

# Remove boilerplate files
# On Windows:
del main.py
# On Unix or MacOS:
rm main.py

# Create our main file
touch client.py
```

## Setting Up Your API Key

You'll need an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

Create a `.env` file to store it:

```bash
# Create .env file
touch .env
```

Add your key to the `.env` file:
```bash
ANTHROPIC_API_KEY=<your key here>
```

Add `.env` to your `.gitignore`:
```bash
echo ".env" >> .gitignore
```

<Warning>
Make sure you keep your `ANTHROPIC_API_KEY` secure!
</Warning>

## Creating the Client

### Basic Client Structure
First, let's set up our imports and create the basic client class:

```python
import asyncio
from typing import Optional
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()  # load environment variables from .env

class MCPClient:
    def __init__(self):
        # Initialize session and client objects
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.anthropic = Anthropic()
    # methods will go here
```

### Server Connection Management

Next, we'll implement the method to connect to an MCP server:

```python
async def connect_to_server(self, server_script_path: str):
    """Connect to an MCP server

    Args:
        server_script_path: Path to the server script (.py or .js)
    """
    is_python = server_script_path.endswith('.py')
    is_js = server_script_path.endswith('.js')
    if not (is_python or is_js):
        raise ValueError("Server script must be a .py or .js file")

    command = "python" if is_python else "node"
    server_params = StdioServerParameters(
        command=command,
        args=[server_script_path],
        env=None
    )

    stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
    self.stdio, self.write = stdio_transport
    self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))

    await self.session.initialize()

    # List available tools
    response = await self.session.list_tools()
    tools = response.tools
    print("\nConnected to server with tools:", [tool.name for tool in tools])
```

### Query Processing Logic

Now let's add the core functionality for processing queries and handling tool calls:

```python
async def process_query(self, query: str) -> str:
    """Process a query using Claude and available tools"""
    messages = [
        {
            "role": "user",
            "content": query
        }
    ]

    response = await self.session.list_tools()
    available_tools = [{
        "name": tool.name,
        "description": tool.description,
        "input_schema": tool.inputSchema
    } for tool in response.tools]

    # Initial Claude API call
    response = self.anthropic.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=messages,
        tools=available_tools
    )

    # Process response and handle tool calls
    final_text = []

    assistant_message_content = []
    for content in response.content:
        if content.type == 'text':
            final_text.append(content.text)
            assistant_message_content.append(content)
        elif content.type == 'tool_use':
            tool_name = content.name
            tool_args = content.input

            # Execute tool call
            result = await self.session.call_tool(tool_name, tool_args)
            final_text.append(f"[Calling tool {tool_name} with args {tool_args}]")

            assistant_message_content.append(content)
            messages.append({
                "role": "assistant",
                "content": assistant_message_content
            })
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": content.id,
                        "content": result.content
                    }
                ]
            })

            # Get next response from Claude
            response = self.anthropic.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=messages,
                tools=available_tools
            )

            final_text.append(response.content[0].text)

    return "\n".join(final_text)
```

### Interactive Chat Interface
Now we'll add the chat loop and cleanup functionality:

```python
async def chat_loop(self):
    """Run an interactive chat loop"""
    print("\nMCP Client Started!")
    print("Type your queries or 'quit' to exit.")

    while True:
        try:
            query = input("\nQuery: ").strip()

            if query.lower() == 'quit':
                break

            response = await self.process_query(query)
            print("\n" + response)

        except Exception as e:
            print(f"\nError: {str(e)}")

async def cleanup(self):
    """Clean up resources"""
    await self.exit_stack.aclose()
```

### Main Entry Point

Finally, we'll add the main execution logic:

```python
async def main():
    if len(sys.argv) < 2:
        print("Usage: python client.py <path_to_server_script>")
        sys.exit(1)

    client = MCPClient()
    try:
        await client.connect_to_server(sys.argv[1])
        await client.chat_loop()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    import sys
    asyncio.run(main())
```

You can find the complete `client.py` file [here.](https://gist.github.com/zckly/f3f28ea731e096e53b39b47bf0a2d4b1)

## Key Components Explained

### 1. Client Initialization
- The `MCPClient` class initializes with session management and API clients
- Uses `AsyncExitStack` for proper resource management
- Configures the Anthropic client for Claude interactions

### 2. Server Connection
- Supports both Python and Node.js servers
- Validates server script type
- Sets up proper communication channels
- Initializes the session and lists available tools

### 3. Query Processing
- Maintains conversation context
- Handles Claude's responses and tool calls
- Manages the message flow between Claude and tools
- Combines results into a coherent response

### 4. Interactive Interface
- Provides a simple command-line interface
- Handles user input and displays responses
- Includes basic error handling
- Allows graceful exit

### 5. Resource Management
- Proper cleanup of resources
- Error handling for connection issues
- Graceful shutdown procedures

## Common Customization Points

1. **Tool Handling**
   - Modify `process_query()` to handle specific tool types
   - Add custom error handling for tool calls
   - Implement tool-specific response formatting

2. **Response Processing**
   - Customize how tool results are formatted
   - Add response filtering or transformation
   - Implement custom logging

3. **User Interface**
   - Add a GUI or web interface
   - Implement rich console output
   - Add command history or auto-completion

## Running the Client

To run your client with any MCP server:

```bash
uv run client.py path/to/server.py # python server
uv run client.py path/to/build/index.js # node server
```

<Note>
If you're continuing the weather tutorial from the server quickstart, your command might look something like this: `python client.py .../quickstart-resources/weather-server-python/weather.py`
</Note>

The client will:
1. Connect to the specified server
2. List available tools
3. Start an interactive chat session where you can:
   - Enter queries
   - See tool executions
   - Get responses from Claude

Here's an example of what it should look like if connected to the weather server from the server quickstart:

<Frame>
  <img src="/images/client-claude-cli-python.png" />
</Frame>

## How It Works

When you submit a query:

1. The client gets the list of available tools from the server
2. Your query is sent to Claude along with tool descriptions
3. Claude decides which tools (if any) to use
4. The client executes any requested tool calls through the server
5. Results are sent back to Claude
6. Claude provides a natural language response
7. The response is displayed to you

## Best practices

1. **Error Handling**
   - Always wrap tool calls in try-catch blocks
   - Provide meaningful error messages
   - Gracefully handle connection issues

2. **Resource Management**
   - Use `AsyncExitStack` for proper cleanup
   - Close connections when done
   - Handle server disconnections

3. **Security**
   - Store API keys securely in `.env`
   - Validate server responses
   - Be cautious with tool permissions

## Troubleshooting

### Server Path Issues
- Double-check the path to your server script is correct
- Use the absolute path if the relative path isn't working
- For Windows users, make sure to use forward slashes (/) or escaped backslashes (\\) in the path
- Verify the server file has the correct extension (.py for Python or .js for Node.js)

Example of correct path usage:
```bash
# Relative path
uv run client.py ./server/weather.py

# Absolute path
uv run client.py /Users/username/projects/mcp-server/weather.py

# Windows path (either format works)
uv run client.py C:/projects/mcp-server/weather.py
uv run client.py C:\\projects\\mcp-server\\weather.py
```

### Response Timing
- The first response might take up to 30 seconds to return
- This is normal and happens while:
  - The server initializes
  - Claude processes the query
  - Tools are being executed
- Subsequent responses are typically faster
- Don't interrupt the process during this initial waiting period

### Common Error Messages

If you see:
- `FileNotFoundError`: Check your server path
- `Connection refused`: Ensure the server is running and the path is correct
- `Tool execution failed`: Verify the tool's required environment variables are set
- `Timeout error`: Consider increasing the timeout in your client configuration

</Tab>

<Tab title="Node">

[You can find the complete code for this tutorial here.](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/mcp-client-typescript)
## System Requirements

Before starting, ensure your system meets these requirements:
- Mac or Windows computer
- Node.js 17 or higher installed
- Latest version of `npm` installed
- Anthropic API key (Claude)

## Setting Up Your Environment

First, let's create and set up our project:

<CodeGroup>
```bash MacOS/Linux
# Create project directory
mkdir mcp-client-typescript
cd mcp-client-typescript

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk dotenv

# Install dev dependencies
npm install -D @types/node typescript

# Create source file
touch index.ts
```

```powershell Windows
# Create project directory
md mcp-client-typescript
cd mcp-client-typescript

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk dotenv

# Install dev dependencies
npm install -D @types/node typescript

# Create source file
new-item index.ts
```
</CodeGroup>

Update your `package.json` to set `type: "module"` and a build script:

```json package.json
{
  "type": "module",
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  }
}
```

Create a `tsconfig.json` in the root of your project:

```json tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["index.ts"],
  "exclude": ["node_modules"]
}
```

## Setting Up Your API Key

You'll need an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

Create a `.env` file to store it:

```bash
echo "ANTHROPIC_API_KEY=<your key here>" > .env
```

Add `.env` to your `.gitignore`:
```bash
echo ".env" >> .gitignore
```

<Warning>
Make sure you keep your `ANTHROPIC_API_KEY` secure!
</Warning>

## Creating the Client

### Basic Client Structure

First, let's set up our imports and create the basic client class in `index.ts`:

```typescript
import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }
  // methods will go here
}
```

### Server Connection Management

Next, we'll implement the method to connect to an MCP server:

```typescript
async connectToServer(serverScriptPath: string) {
  try {
    const isJs = serverScriptPath.endsWith(".js");
    const isPy = serverScriptPath.endsWith(".py");
    if (!isJs && !isPy) {
      throw new Error("Server script must be a .js or .py file");
    }
    const command = isPy
      ? process.platform === "win32"
        ? "python"
        : "python3"
      : process.execPath;

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });
    this.mcp.connect(this.transport);

    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      };
    });
    console.log(
      "Connected to server with tools:",
      this.tools.map(({ name }) => name)
    );
  } catch (e) {
    console.log("Failed to connect to MCP server: ", e);
    throw e;
  }
}
```

### Query Processing Logic

Now let's add the core functionality for processing queries and handling tool calls:

```typescript
async processQuery(query: string) {
  const messages: MessageParam[] = [
    {
      role: "user",
      content: query,
    },
  ];

  const response = await this.anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    messages,
    tools: this.tools,
  });

  const finalText = [];
  const toolResults = [];

  for (const content of response.content) {
    if (content.type === "text") {
      finalText.push(content.text);
    } else if (content.type === "tool_use") {
      const toolName = content.name;
      const toolArgs = content.input as { [x: string]: unknown } | undefined;

      const result = await this.mcp.callTool({
        name: toolName,
        arguments: toolArgs,
      });
      toolResults.push(result);
      finalText.push(
        `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
      );

      messages.push({
        role: "user",
        content: result.content as string,
      });

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages,
      });

      finalText.push(
        response.content[0].type === "text" ? response.content[0].text : ""
      );
    }
  }

  return finalText.join("\n");
}
```

### Interactive Chat Interface

Now we'll add the chat loop and cleanup functionality:

```typescript
async chatLoop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("\nMCP Client Started!");
    console.log("Type your queries or 'quit' to exit.");

    while (true) {
      const message = await rl.question("\nQuery: ");
      if (message.toLowerCase() === "quit") {
        break;
      }
      const response = await this.processQuery(message);
      console.log("\n" + response);
    }
  } finally {
    rl.close();
  }
}

async cleanup() {
  await this.mcp.close();
}
```

### Main Entry Point

Finally, we'll add the main execution logic:

```typescript
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node index.ts <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
```

## Running the Client

To run your client with any MCP server:

```bash
# Build TypeScript
npm run build

# Run the client
node build/index.js path/to/server.py # python server
node build/index.js path/to/build/index.js # node server
```

<Note>
If you're continuing the weather tutorial from the server quickstart, your command might look something like this: `node build/index.js .../quickstart-resources/weather-server-typescript/build/index.js`
</Note>

**The client will:**
1. Connect to the specified server
2. List available tools
3. Start an interactive chat session where you can:
   - Enter queries
   - See tool executions
   - Get responses from Claude

## How It Works

When you submit a query:

1. The client gets the list of available tools from the server
2. Your query is sent to Claude along with tool descriptions
3. Claude decides which tools (if any) to use
4. The client executes any requested tool calls through the server
5. Results are sent back to Claude
6. Claude provides a natural language response
7. The response is displayed to you

## Best practices

1. **Error Handling**
   - Use TypeScript's type system for better error detection
   - Wrap tool calls in try-catch blocks
   - Provide meaningful error messages
   - Gracefully handle connection issues

2. **Security**
   - Store API keys securely in `.env`
   - Validate server responses
   - Be cautious with tool permissions

## Troubleshooting

### Server Path Issues
- Double-check the path to your server script is correct
- Use the absolute path if the relative path isn't working
- For Windows users, make sure to use forward slashes (/) or escaped backslashes (\\) in the path
- Verify the server file has the correct extension (.js for Node.js or .py for Python)

Example of correct path usage:
```bash
# Relative path
node build/index.js ./server/build/index.js

# Absolute path
node build/index.js /Users/username/projects/mcp-server/build/index.js

# Windows path (either format works)
node build/index.js C:/projects/mcp-server/build/index.js
node build/index.js C:\\projects\\mcp-server\\build\\index.js
```

### Response Timing
- The first response might take up to 30 seconds to return
- This is normal and happens while:
  - The server initializes
  - Claude processes the query
  - Tools are being executed
- Subsequent responses are typically faster
- Don't interrupt the process during this initial waiting period

### Common Error Messages

If you see:
- `Error: Cannot find module`: Check your build folder and ensure TypeScript compilation succeeded
- `Connection refused`: Ensure the server is running and the path is correct
- `Tool execution failed`: Verify the tool's required environment variables are set
- `ANTHROPIC_API_KEY is not set`: Check your .env file and environment variables
- `TypeError`: Ensure you're using the correct types for tool arguments

</Tab>


<Tab title="Java">

<Note>
This is a quickstart demo based on Spring AI MCP auto-configuration and boot starters.
To learn how to create sync and async MCP Clients manually, consult the [Java SDK Client](/sdk/java/mcp-client) documentation
</Note>

This example demonstrates how to build an interactive chatbot that combines Spring AI's Model Context Protocol (MCP) with the [Brave Search MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search). The application creates a conversational interface powered by Anthropic's Claude AI model that can perform internet searches through Brave Search, enabling natural language interactions with real-time web data.
[You can find the complete code for this tutorial here.](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/web-search/brave-chatbot)

## System Requirements

Before starting, ensure your system meets these requirements:
- Java 17 or higher
- Maven 3.6+
- npx package manager
- Anthropic API key (Claude)
- Brave Search API key

## Setting Up Your Environment

1. Install npx (Node Package eXecute):
   First, make sure to install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
   and then run:
   ```bash
   npm install -g npx
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/spring-projects/spring-ai-examples.git
   cd model-context-protocol/brave-chatbot
   ```

3. Set up your API keys:
   ```bash
   export ANTHROPIC_API_KEY='your-anthropic-api-key-here'
   export BRAVE_API_KEY='your-brave-api-key-here'
   ```

4. Build the application:
   ```bash
   ./mvnw clean install
   ```

5. Run the application using Maven:
   ```bash
   ./mvnw spring-boot:run
   ```

<Warning>
Make sure you keep your `ANTHROPIC_API_KEY` and `BRAVE_API_KEY` keys secure!
</Warning>


## How it Works

The application integrates Spring AI with the Brave Search MCP server through several components:

### MCP Client Configuration

1. Required dependencies in pom.xml:
```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-anthropic</artifactId>
</dependency>
```

2. Application properties (application.yml):
```yml
spring:
  ai:
    mcp:
      client:
        enabled: true
        name: brave-search-client
        version: 1.0.0
        type: SYNC
        request-timeout: 20s
        stdio:
          root-change-notification: true
          servers-configuration: classpath:/mcp-servers-config.json
        toolcallback:
          enabled: true
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
```

This activates the `spring-ai-starter-mcp-client` to create one or more `McpClient`s based on the provided server configuration.
The `spring.ai.mcp.client.toolcallback.enabled=true` property enables the tool callback mechanism, that automatically registers all MCP tool as spring ai tools.
It is disabled by default.

3. MCP Server Configuration (`mcp-servers-config.json`):
```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "<PUT YOUR BRAVE API KEY>"
      }
    }
  }
}
```

### Chat Implementation

The chatbot is implemented using Spring AI's ChatClient with MCP tool integration:

```java
var chatClient = chatClientBuilder
    .defaultSystem("You are useful assistant, expert in AI and Java.")
    .defaultTools((Object[]) mcpToolAdapter.toolCallbacks())
    .defaultAdvisors(new MessageChatMemoryAdvisor(new InMemoryChatMemory()))
    .build();
```

Key features:
- Uses Claude AI model for natural language understanding
- Integrates Brave Search through MCP for real-time web search capabilities
- Maintains conversation memory using InMemoryChatMemory
- Runs as an interactive command-line application

### Build and run

```bash
./mvnw clean install
java -jar ./target/ai-mcp-brave-chatbot-0.0.1-SNAPSHOT.jar
```

or

```bash
./mvnw spring-boot:run
```

The application will start an interactive chat session where you can ask questions. The chatbot will use Brave Search when it needs to find information from the internet to answer your queries.

The chatbot can:
- Answer questions using its built-in knowledge
- Perform web searches when needed using Brave Search
- Remember context from previous messages in the conversation
- Combine information from multiple sources to provide comprehensive answers

### Advanced Configuration

The MCP client supports additional configuration options:

- Client customization through `McpSyncClientCustomizer` or `McpAsyncClientCustomizer`
- Multiple clients with multiple transport types: `STDIO` and `SSE` (Server-Sent Events)
- Integration with Spring AI's tool execution framework
- Automatic client initialization and lifecycle management

For WebFlux-based applications, you can use the WebFlux starter instead:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mcp-client-webflux-spring-boot-starter</artifactId>
</dependency>
```

This provides similar functionality but uses a WebFlux-based SSE transport implementation, recommended for production deployments.

</Tab>

<Tab title="Kotlin">

[You can find the complete code for this tutorial here.](https://github.com/modelcontextprotocol/kotlin-sdk/tree/main/samples/kotlin-mcp-client)

## System Requirements

Before starting, ensure your system meets these requirements:
- Java 17 or higher
- Anthropic API key (Claude)

## Setting up your environment

First, let's install `java` and `gradle` if you haven't already.
You can download `java` from [official Oracle JDK website](https://www.oracle.com/java/technologies/downloads/).
Verify your `java` installation:
```bash
java --version
```

Now, let's create and set up your project:

<CodeGroup>
```bash MacOS/Linux
# Create a new directory for our project
mkdir kotlin-mcp-client
cd kotlin-mcp-client

# Initialize a new kotlin project
gradle init
```

```powershell Windows
# Create a new directory for our project
md kotlin-mcp-client
cd kotlin-mcp-client
# Initialize a new kotlin project
gradle init
```
</CodeGroup>

After running `gradle init`, you will be presented with options for creating your project.
Select **Application** as the project type, **Kotlin** as the programming language, and **Java 17** as the Java version.

Alternatively, you can create a Kotlin application using the [IntelliJ IDEA project wizard](https://kotlinlang.org/docs/jvm-get-started.html).

After creating the project, add the following dependencies:

<CodeGroup>
```kotlin build.gradle.kts
val mcpVersion = "0.4.0"
val slf4jVersion = "2.0.9"
val anthropicVersion = "0.8.0"

dependencies {
    implementation("io.modelcontextprotocol:kotlin-sdk:$mcpVersion")
    implementation("org.slf4j:slf4j-nop:$slf4jVersion")
    implementation("com.anthropic:anthropic-java:$anthropicVersion")
}
```

```groovy build.gradle
def mcpVersion = '0.3.0'
def slf4jVersion = '2.0.9'
def anthropicVersion = '0.8.0'
dependencies {
    implementation "io.modelcontextprotocol:kotlin-sdk:$mcpVersion"
    implementation "org.slf4j:slf4j-nop:$slf4jVersion"
    implementation "com.anthropic:anthropic-java:$anthropicVersion"
}
```
</CodeGroup>

Also, add the following plugins to your build script:
<CodeGroup>
```kotlin build.gradle.kts
plugins {
    id("com.github.johnrengelman.shadow") version "8.1.1"
}
```

```groovy build.gradle
plugins {
    id 'com.github.johnrengelman.shadow' version '8.1.1'
}
```
</CodeGroup>

## Setting up your API key

You'll need an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

Set up your API key:
```bash
export ANTHROPIC_API_KEY='your-anthropic-api-key-here'
```

<Warning>
Make sure your keep your `ANTHROPIC_API_KEY` secure!
</Warning>

## Creating the Client

### Basic Client Structure

First, let's create the basic client class:

```kotlin
class MCPClient : AutoCloseable {
    private val anthropic = AnthropicOkHttpClient.fromEnv()
    private val mcp: Client = Client(clientInfo = Implementation(name = "mcp-client-cli", version = "1.0.0"))
    private lateinit var tools: List<ToolUnion>

    // methods will go here

    override fun close() {
        runBlocking {
            mcp.close()
            anthropic.close()
        }
    }
```

### Server connection management

Next, we'll implement the method to connect to an MCP server:

```kotlin
suspend fun connectToServer(serverScriptPath: String) {
    try {
        val command = buildList {
            when (serverScriptPath.substringAfterLast(".")) {
                "js" -> add("node")
                "py" -> add(if (System.getProperty("os.name").lowercase().contains("win")) "python" else "python3")
                "jar" -> addAll(listOf("java", "-jar"))
                else -> throw IllegalArgumentException("Server script must be a .js, .py or .jar file")
            }
            add(serverScriptPath)
        }

        val process = ProcessBuilder(command).start()
        val transport = StdioClientTransport(
            input = process.inputStream.asSource().buffered(),
            output = process.outputStream.asSink().buffered()
        )

        mcp.connect(transport)

        val toolsResult = mcp.listTools()
        tools = toolsResult?.tools?.map { tool ->
            ToolUnion.ofTool(
                Tool.builder()
                    .name(tool.name)
                    .description(tool.description ?: "")
                    .inputSchema(
                        Tool.InputSchema.builder()
                            .type(JsonValue.from(tool.inputSchema.type))
                            .properties(tool.inputSchema.properties.toJsonValue())
                            .putAdditionalProperty("required", JsonValue.from(tool.inputSchema.required))
                            .build()
                    )
                    .build()
            )
        } ?: emptyList()
        println("Connected to server with tools: ${tools.joinToString(", ") { it.tool().get().name() }}")
    } catch (e: Exception) {
        println("Failed to connect to MCP server: $e")
        throw e
    }
}
```

Also create a helper function to convert from `JsonObject` to `JsonValue` for Anthropic:
```kotlin
private fun JsonObject.toJsonValue(): JsonValue {
    val mapper = ObjectMapper()
    val node = mapper.readTree(this.toString())
    return JsonValue.fromJsonNode(node)
}
```

### Query processing logic

Now let's add the core functionality for processing queries and handling tool calls:

```kotlin
private val messageParamsBuilder: MessageCreateParams.Builder = MessageCreateParams.builder()
    .model(Model.CLAUDE_3_5_SONNET_20241022)
    .maxTokens(1024)

suspend fun processQuery(query: String): String {
    val messages = mutableListOf(
        MessageParam.builder()
            .role(MessageParam.Role.USER)
            .content(query)
            .build()
    )

    val response = anthropic.messages().create(
        messageParamsBuilder
            .messages(messages)
            .tools(tools)
            .build()
    )

    val finalText = mutableListOf<String>()
    response.content().forEach { content ->
        when {
            content.isText() -> finalText.add(content.text().getOrNull()?.text() ?: "")

            content.isToolUse() -> {
                val toolName = content.toolUse().get().name()
                val toolArgs =
                    content.toolUse().get()._input().convert(object : TypeReference<Map<String, JsonValue>>() {})

                val result = mcp.callTool(
                    name = toolName,
                    arguments = toolArgs ?: emptyMap()
                )
                finalText.add("[Calling tool $toolName with args $toolArgs]")

                messages.add(
                    MessageParam.builder()
                        .role(MessageParam.Role.USER)
                        .content(
                            """
                                "type": "tool_result",
                                "tool_name": $toolName,
                                "result": ${result?.content?.joinToString("\n") { (it as TextContent).text ?: "" }}
                            """.trimIndent()
                        )
                        .build()
                )

                val aiResponse = anthropic.messages().create(
                    messageParamsBuilder
                        .messages(messages)
                        .build()
                )

                finalText.add(aiResponse.content().first().text().getOrNull()?.text() ?: "")
            }
        }
    }

    return finalText.joinToString("\n", prefix = "", postfix = "")
}
```

### Interactive chat

We'll add the chat loop:

```kotlin
suspend fun chatLoop() {
    println("\nMCP Client Started!")
    println("Type your queries or 'quit' to exit.")

    while (true) {
        print("\nQuery: ")
        val message = readLine() ?: break
        if (message.lowercase() == "quit") break
        val response = processQuery(message)
        println("\n$response")
    }
}
```

### Main entry point

Finally, we'll add the main execution function:

```kotlin
fun main(args: Array<String>) = runBlocking {
    if (args.isEmpty()) throw IllegalArgumentException("Usage: java -jar <your_path>/build/libs/kotlin-mcp-client-0.1.0-all.jar <path_to_server_script>")
    val serverPath = args.first()
    val client = MCPClient()
    client.use {
        client.connectToServer(serverPath)
        client.chatLoop()
    }
}
```

## Running the client

To run your client with any MCP server:

```bash
./gradlew build

# Run the client
java -jar build/libs/<your-jar-name>.jar path/to/server.jar # jvm server
java -jar build/libs/<your-jar-name>.jar path/to/server.py # python server
java -jar build/libs/<your-jar-name>.jar path/to/build/index.js # node server
```

<Note>
If you're continuing the weather tutorial from the server quickstart, your command might look something like this: `java -jar build/libs/kotlin-mcp-client-0.1.0-all.jar .../samples/weather-stdio-server/build/libs/weather-stdio-server-0.1.0-all.jar`
</Note>

**The client will:**
1. Connect to the specified server
2. List available tools
3. Start an interactive chat session where you can:
   - Enter queries
   - See tool executions
   - Get responses from Claude

## How it works

Here's a high-level workflow schema:

```mermaid
---
config:
    theme: neutral
---
sequenceDiagram
    actor User
    participant Client
    participant Claude
    participant MCP_Server as MCP Server
    participant Tools

    User->>Client: Send query
    Client<<->>MCP_Server: Get available tools
    Client->>Claude: Send query with tool descriptions
    Claude-->>Client: Decide tool execution
    Client->>MCP_Server: Request tool execution
    MCP_Server->>Tools: Execute chosen tools
    Tools-->>MCP_Server: Return results
    MCP_Server-->>Client: Send results
    Client->>Claude: Send tool results
    Claude-->>Client: Provide final response
    Client-->>User: Display response
```

When you submit a query:
1. The client gets the list of available tools from the server
2. Your query is sent to Claude along with tool descriptions
3. Claude decides which tools (if any) to use
4. The client executes any requested tool calls through the server
5. Results are sent back to Claude
6. Claude provides a natural language response
7. The response is displayed to you

## Best practices

1. **Error Handling**
   - Leverage Kotlin's type system to model errors explicitly
   - Wrap external tool and API calls in `try-catch` blocks when exceptions are possible
   - Provide clear and meaningful error messages
   - Handle network timeouts and connection issues gracefully

2. **Security**
   - Store API keys and secrets securely in `local.properties`, environment variables, or secret managers
   - Validate all external responses to avoid unexpected or unsafe data usage
   - Be cautious with permissions and trust boundaries when using tools

## Troubleshooting

### Server Path Issues
- Double-check the path to your server script is correct
- Use the absolute path if the relative path isn't working
- For Windows users, make sure to use forward slashes (/) or escaped backslashes (\\) in the path
- Make sure that the required runtime is installed (java for Java, npm for Node.js, or uv for Python)
- Verify the server file has the correct extension (.jar for Java, .js for Node.js or .py for Python)

Example of correct path usage:
```bash
# Relative path
java -jar build/libs/client.jar ./server/build/libs/server.jar

# Absolute path
java -jar build/libs/client.jar /Users/username/projects/mcp-server/build/libs/server.jar

# Windows path (either format works)
java -jar build/libs/client.jar C:/projects/mcp-server/build/libs/server.jar
java -jar build/libs/client.jar C:\\projects\\mcp-server\\build\\libs\\server.jar
```

### Response Timing
- The first response might take up to 30 seconds to return
- This is normal and happens while:
  - The server initializes
  - Claude processes the query
  - Tools are being executed
- Subsequent responses are typically faster
- Don't interrupt the process during this initial waiting period

### Common Error Messages

If you see:
- `Connection refused`: Ensure the server is running and the path is correct
- `Tool execution failed`: Verify the tool's required environment variables are set
- `ANTHROPIC_API_KEY is not set`: Check your environment variables

</Tab>

<Tab title="C#">
[You can find the complete code for this tutorial here.](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/QuickstartClient)

## System Requirements
Before starting, ensure your system meets these requirements:
- .NET 8.0 or higher
- Anthropic API key (Claude)
- Windows, Linux, or MacOS

## Setting up your environment

First, create a new .NET project:
```bash
dotnet new console -n QuickstartClient
cd QuickstartClient
```

Then, add the required dependencies to your project:
```bash
dotnet add package ModelContextProtocol --prerelease
dotnet add package Anthropic.SDK
dotnet add package Microsoft.Extensions.Hosting
```

## Setting up your API key
You'll need an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

```bash
dotnet user-secrets init
dotnet user-secrets set "ANTHROPIC_API_KEY" "<your key here>"
```

## Creating the Client
### Basic Client Structure
First, let's setup the basic client class in the file `Program.cs`:
```csharp
using Anthropic.SDK;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol.Transport;

var builder = Host.CreateApplicationBuilder(args);

builder.Configuration
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>();
```

This creates the beginnings of a .NET console application that can read the API key from user secrets.

Next, we'll setup the MCP Client:

```csharp
var (command, arguments) = GetCommandAndArguments(args);

var clientTransport = new StdioClientTransport(new()
{
    Name = "Demo Server",
    Command = command,
    Arguments = arguments,
});

await using var mcpClient = await McpClientFactory.CreateAsync(clientTransport);

var tools = await mcpClient.ListToolsAsync();
foreach (var tool in tools)
{
    Console.WriteLine($"Connected to server with tools: {tool.Name}");
}
```

Add this function at the end of the `Program.cs` file:

```csharp
static (string command, string[] arguments) GetCommandAndArguments(string[] args)
{
    return args switch
    {
        [var script] when script.EndsWith(".py") => ("python", args),
        [var script] when script.EndsWith(".js") => ("node", args),
        [var script] when Directory.Exists(script) || (File.Exists(script) && script.EndsWith(".csproj")) => ("dotnet", ["run", "--project", script, "--no-build"]),
        _ => throw new NotSupportedException("An unsupported server script was provided. Supported scripts are .py, .js, or .csproj")
    };
}
```

This creates a MCP client that will connect to a server that is provided as a command line argument. It then lists the available tools from the connected server.

### Query processing logic
Now let's add the core functionality for processing queries and handling tool calls:

```csharp
using var anthropicClient = new AnthropicClient(new APIAuthentication(builder.Configuration["ANTHROPIC_API_KEY"]))
    .Messages
    .AsBuilder()
    .UseFunctionInvocation()
    .Build();

var options = new ChatOptions
{
    MaxOutputTokens = 1000,
    ModelId = "claude-3-5-sonnet-20241022",
    Tools = [.. tools]
};

Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("MCP Client Started!");
Console.ResetColor();

PromptForInput();
while(Console.ReadLine() is string query && !"exit".Equals(query, StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(query))
    {
        PromptForInput();
        continue;
    }

    await foreach (var message in anthropicClient.GetStreamingResponseAsync(query, options))
    {
        Console.Write(message);
    }
    Console.WriteLine();

    PromptForInput();
}

static void PromptForInput()
{
    Console.WriteLine("Enter a command (or 'exit' to quit):");
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.Write("> ");
    Console.ResetColor();
}
```

## Key Components Explained

### 1. Client Initialization
* The client is initialized using `McpClientFactory.CreateAsync()`, which sets up the transport type and command to run the server.

### 2. Server Connection
* Supports Python, Node.js, and .NET servers.
* The server is started using the command specified in the arguments.
* Configures to use stdio for communication with the server.
* Initializes the session and available tools.

### 3. Query Processing
* Leverages [Microsoft.Extensions.AI](https://learn.microsoft.com/dotnet/ai/ai-extensions) for the chat client.
* Configures the `IChatClient` to use automatic tool (function) invocation.
* The client reads user input and sends it to the server.
* The server processes the query and returns a response.
* The response is displayed to the user.

## Running the Client

To run your client with any MCP server:
```bash
dotnet run -- path/to/server.csproj # dotnet server
dotnet run -- path/to/server.py # python server
dotnet run -- path/to/server.js # node server
```
<Note>
If you're continuing the weather tutorial from the server quickstart, your command might look something like this: `dotnet run -- path/to/QuickstartWeatherServer`.
</Note>

The client will:

1. Connect to the specified server
2. List available tools
3. Start an interactive chat session where you can:
   - Enter queries
   - See tool executions
   - Get responses from Claude
4. Exit the session when done

Here's an example of what it should look like it connected to a weather server quickstart:

<Frame>
  <img src="/images/quickstart-dotnet-client.png" />
</Frame>

</Tab>

</Tabs>

## Next steps

<CardGroup cols={2}>
  <Card
    title="Example servers"
    icon="grid"
    href="/examples"
  >
    Check out our gallery of official MCP servers and implementations
  </Card>
  <Card
    title="Clients"
    icon="cubes"
    href="/clients"
  >
    View the list of clients that support MCP integrations
  </Card>
  <Card
    title="Building MCP with LLMs"
    icon="comments"
    href="/tutorials/building-mcp-with-llms"
  >
    Learn how to use LLMs like Claude to speed up your MCP development
  </Card>
   <Card
    title="Core architecture"
    icon="sitemap"
    href="/docs/concepts/architecture"
  >
    Understand how MCP connects clients, servers, and LLMs
  </Card>
</CardGroup>


---
modelcontextprotocol/docs/quickstart/server.mdx
---
---
title: "For Server Developers"
description: "Get started building your own server to use in Claude for Desktop and other clients."
---

In this tutorial, we'll build a simple MCP weather server and connect it to a host, Claude for Desktop. We'll start with a basic setup, and then progress to more complex use cases.

### What we'll be building

Many LLMs do not currently have the ability to fetch the forecast and severe weather alerts. Let's use MCP to solve that!

We'll build a server that exposes two tools: `get-alerts` and `get-forecast`. Then we'll connect the server to an MCP host (in this case, Claude for Desktop):

<Frame>
  <img src="/images/weather-alerts.png" />
</Frame>
<Frame>
  <img src="/images/current-weather.png" />
</Frame>

<Note>
Servers can connect to any client. We've chosen Claude for Desktop here for simplicity, but we also have guides on [building your own client](/quickstart/client) as well as a [list of other clients here](/clients).
</Note>

<Accordion title="Why Claude for Desktop and not Claude.ai?">
  Because servers are locally run, MCP currently only supports desktop hosts. Remote hosts are in active development.
</Accordion>

### Core MCP Concepts

MCP servers can provide three main types of capabilities:

1. **Resources**: File-like data that can be read by clients (like API responses or file contents)
2. **Tools**: Functions that can be called by the LLM (with user approval)
3. **Prompts**: Pre-written templates that help users accomplish specific tasks

This tutorial will primarily focus on tools.

<Tabs>
<Tab title='Python'>

Let's get started with building our weather server! [You can find the complete code for what we'll be building here.](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/weather-server-python)

### Prerequisite knowledge

This quickstart assumes you have familiarity with:
- Python
- LLMs like Claude

### System requirements

- Python 3.10 or higher installed.
- You must use the Python MCP SDK 1.2.0 or higher.

### Set up your environment

First, let's install `uv` and set up our Python project and environment:

<CodeGroup>

```bash MacOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```powershell Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

</CodeGroup>

Make sure to restart your terminal afterwards to ensure that the `uv` command gets picked up.

Now, let's create and set up our project:

<CodeGroup>
```bash MacOS/Linux
# Create a new directory for our project
uv init weather
cd weather

# Create virtual environment and activate it
uv venv
source .venv/bin/activate

# Install dependencies
uv add "mcp[cli]" httpx

# Create our server file
touch weather.py
```

```powershell Windows
# Create a new directory for our project
uv init weather
cd weather

# Create virtual environment and activate it
uv venv
.venv\Scripts\activate

# Install dependencies
uv add mcp[cli] httpx

# Create our server file
new-item weather.py
```
</CodeGroup>

Now let's dive into building your server.

## Building your server

### Importing packages and setting up the instance

Add these to the top of your `weather.py`:
```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"
```

The FastMCP class uses Python type hints and docstrings to automatically generate tool definitions, making it easy to create and maintain MCP tools.

### Helper functions

Next, let's add our helper functions for querying and formatting the data from the National Weather Service API:

```python
async def make_nws_request(url: str) -> dict[str, Any] | None:
    """Make a request to the NWS API with proper error handling."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

def format_alert(feature: dict) -> str:
    """Format an alert feature into a readable string."""
    props = feature["properties"]
    return f"""
Event: {props.get('event', 'Unknown')}
Area: {props.get('areaDesc', 'Unknown')}
Severity: {props.get('severity', 'Unknown')}
Description: {props.get('description', 'No description available')}
Instructions: {props.get('instruction', 'No specific instructions provided')}
"""
```

### Implementing tool execution

The tool execution handler is responsible for actually executing the logic of each tool. Let's add it:

```python
@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."

    if not data["features"]:
        return "No active alerts for this state."

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    # First get the forecast grid endpoint
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "Unable to fetch forecast data for this location."

    # Get the forecast URL from the points response
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "Unable to fetch detailed forecast."

    # Format the periods into a readable forecast
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:  # Only show next 5 periods
        forecast = f"""
{period['name']}:
Temperature: {period['temperature']}°{period['temperatureUnit']}
Wind: {period['windSpeed']} {period['windDirection']}
Forecast: {period['detailedForecast']}
"""
        forecasts.append(forecast)

    return "\n---\n".join(forecasts)
```

### Running the server

Finally, let's initialize and run the server:

```python
if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
```

Your server is complete! Run `uv run weather.py` to confirm that everything's working.

Let's now test your server from an existing MCP host, Claude for Desktop.

## Testing your server with Claude for Desktop

<Note>
Claude for Desktop is not yet available on Linux. Linux users can proceed to the [Building a client](/quickstart/client) tutorial to build an MCP client that connects to the server we just built.
</Note>

First, make sure you have Claude for Desktop installed. [You can install the latest version
here.](https://claude.ai/download) If you already have Claude for Desktop, **make sure it's updated to the latest version.**

We'll need to configure Claude for Desktop for whichever MCP servers you want to use. To do this, open your Claude for Desktop App configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor. Make sure to create the file if it doesn't exist.

For example, if you have [VS Code](https://code.visualstudio.com/) installed:

<Tabs>
<Tab title="MacOS/Linux">
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
</Tab>
<Tab title="Windows">
```powershell
code $env:AppData\Claude\claude_desktop_config.json
```
</Tab>
</Tabs>

You'll then add your servers in the `mcpServers` key. The MCP UI elements will only show up in Claude for Desktop if at least one server is properly configured.

In this case, we'll add our single weather server like so:

<Tabs>
<Tab title="MacOS/Linux">
```json Python
{
    "mcpServers": {
        "weather": {
            "command": "uv",
            "args": [
                "--directory",
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather",
                "run",
                "weather.py"
            ]
        }
    }
}
```
</Tab>
<Tab title="Windows">
```json Python
{
    "mcpServers": {
        "weather": {
            "command": "uv",
            "args": [
                "--directory",
                "C:\\ABSOLUTE\\PATH\\TO\\PARENT\\FOLDER\\weather",
                "run",
                "weather.py"
            ]
        }
    }
}
```
</Tab>
</Tabs>

<Warning>
You may need to put the full path to the `uv` executable in the `command` field. You can get this by running `which uv` on MacOS/Linux or `where uv` on Windows.
</Warning>

<Note>
Make sure you pass in the absolute path to your server.
</Note>

This tells Claude for Desktop:
1. There's an MCP server named "weather"
2. To launch it by running `uv --directory /ABSOLUTE/PATH/TO/PARENT/FOLDER/weather run weather.py`

Save the file, and restart **Claude for Desktop**.
</Tab>

<Tab title='Node'>
Let's get started with building our weather server! [You can find the complete code for what we'll be building here.](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/weather-server-typescript)

### Prerequisite knowledge

This quickstart assumes you have familiarity with:
- TypeScript
- LLMs like Claude

### System requirements

For TypeScript, make sure you have the latest version of Node installed.

### Set up your environment

First, let's install Node.js and npm if you haven't already. You can download them from [nodejs.org](https://nodejs.org/).
Verify your Node.js installation:
```bash
node --version
npm --version
```
For this tutorial, you'll need Node.js version 16 or higher.

Now, let's create and set up our project:

<CodeGroup>
```bash MacOS/Linux
# Create a new directory for our project
mkdir weather
cd weather

# Initialize a new npm project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk zod
npm install -D @types/node typescript

# Create our files
mkdir src
touch src/index.ts
```

```powershell Windows
# Create a new directory for our project
md weather
cd weather

# Initialize a new npm project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk zod
npm install -D @types/node typescript

# Create our files
md src
new-item src\index.ts
```
</CodeGroup>

Update your package.json to add type: "module" and a build script:

```json package.json
{
  "type": "module",
  "bin": {
    "weather": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  },
  "files": [
    "build"
  ],
}
```

Create a `tsconfig.json` in the root of your project:

```json tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Now let's dive into building your server.

## Building your server

### Importing packages and setting up the instance

Add these to the top of your `src/index.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});
```

### Helper functions

Next, let's add our helper functions for querying and formatting the data from the National Weather Service API:

```typescript
// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}
```

### Implementing tool execution

The tool execution handler is responsible for actually executing the logic of each tool. Let's add it:

```typescript
// Register weather tools
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  },
);

server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
          },
        ],
      };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available",
          },
        ],
      };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n"),
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  },
);
```

### Running the server

Finally, implement the main function to run the server:

```typescript
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

Make sure to run `npm run build` to build your server! This is a very important step in getting your server to connect.

Let's now test your server from an existing MCP host, Claude for Desktop.

## Testing your server with Claude for Desktop

<Note>
Claude for Desktop is not yet available on Linux. Linux users can proceed to the [Building a client](/quickstart/client) tutorial to build an MCP client that connects to the server we just built.
</Note>

First, make sure you have Claude for Desktop installed. [You can install the latest version
here.](https://claude.ai/download) If you already have Claude for Desktop, **make sure it's updated to the latest version.**

We'll need to configure Claude for Desktop for whichever MCP servers you want to use. To do this, open your Claude for Desktop App configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor. Make sure to create the file if it doesn't exist.

For example, if you have [VS Code](https://code.visualstudio.com/) installed:

<Tabs>
<Tab title="MacOS/Linux">
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
</Tab>
<Tab title="Windows">
```powershell
code $env:AppData\Claude\claude_desktop_config.json
```
</Tab>
</Tabs>

You'll then add your servers in the `mcpServers` key. The MCP UI elements will only show up in Claude for Desktop if at least one server is properly configured.

In this case, we'll add our single weather server like so:

<Tabs>
<Tab title="MacOS/Linux">
<CodeGroup>
```json Node
{
    "mcpServers": {
        "weather": {
            "command": "node",
            "args": [
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather/build/index.js"
            ]
        }
    }
}
```
</CodeGroup>
</Tab>
<Tab title="Windows">
<CodeGroup>
```json Node
{
    "mcpServers": {
        "weather": {
            "command": "node",
            "args": [
                "C:\\PATH\\TO\\PARENT\\FOLDER\\weather\\build\\index.js"
            ]
        }
    }
}
```
</CodeGroup>
</Tab>
</Tabs>

This tells Claude for Desktop:
1. There's an MCP server named "weather"
2. Launch it by running `node /ABSOLUTE/PATH/TO/PARENT/FOLDER/weather/build/index.js`

Save the file, and restart **Claude for Desktop**.
</Tab>
<Tab title='Java'>

<Note>
This is a quickstart demo based on Spring AI MCP auto-configuration and boot starters. 
To learn how to create sync and async MCP Servers, manually, consult the [Java SDK Server](/sdk/java/mcp-server) documentation.
</Note>


Let's get started with building our weather server! 
[You can find the complete code for what we'll be building here.](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-stdio-server)

For more information, see the [MCP Server Boot Starter](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html) reference documentation.
For manual MCP Server implementation, refer to the [MCP Server Java SDK documentation](/sdk/java/mcp-server).

### System requirements

- Java 17 or higher installed.
- [Spring Boot 3.3.x](https://docs.spring.io/spring-boot/installing.html) or higher

### Set up your environment

Use the [Spring Initializer](https://start.spring.io/) to bootstrap the project.

You will need to add the following dependencies:

<Tabs>
  <Tab title="Maven">
  ```xml
  <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-mcp-server</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-web</artifactId>
        </dependency>
  </dependencies>
  ```
  </Tab>
  <Tab title="Gradle">
  ```groovy
  dependencies {
    implementation platform("org.springframework.ai:spring-ai-starter-mcp-server")
    implementation platform("org.springframework:spring-web")   
  }
  ```
  </Tab>
</Tabs>

Then configure your application by setting the application properties:

<CodeGroup>

```bash application.properties
spring.main.bannerMode=off
logging.pattern.console=
```

```yaml application.yml
logging:
  pattern:
    console:
spring:
  main:
    banner-mode: off
```
</CodeGroup>

The [Server Configuration Properties](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html#_configuration_properties) documents all available properties.

Now let's dive into building your server.

## Building your server

### Weather Service

Let's implement a [WeatherService.java](https://github.com/spring-projects/spring-ai-examples/blob/main/model-context-protocol/weather/starter-stdio-server/src/main/java/org/springframework/ai/mcp/sample/server/WeatherService.java) that uses a REST client to query the data from the National Weather Service API:

```java
@Service
public class WeatherService {

	private final RestClient restClient;

	public WeatherService() {
		this.restClient = RestClient.builder()
			.baseUrl("https://api.weather.gov")
			.defaultHeader("Accept", "application/geo+json")
			.defaultHeader("User-Agent", "WeatherApiClient/1.0 (your@email.com)")
			.build();
	}

  @Tool(description = "Get weather forecast for a specific latitude/longitude")
  public String getWeatherForecastByLocation(
      double latitude,   // Latitude coordinate
      double longitude   // Longitude coordinate
  ) {
      // Returns detailed forecast including:
      // - Temperature and unit
      // - Wind speed and direction
      // - Detailed forecast description
  }
	
  @Tool(description = "Get weather alerts for a US state")
  public String getAlerts(
      @ToolParam(description = "Two-letter US state code (e.g. CA, NY)" String state
  ) {
      // Returns active alerts including:
      // - Event type
      // - Affected area
      // - Severity
      // - Description
      // - Safety instructions
  }

  // ......
}
```

The `@Service` annotation with auto-register the service in your application context.
The Spring AI `@Tool` annotation, making it easy to create and maintain MCP tools.

The auto-configuration will automatically register these tools with the MCP server. 

### Create your Boot Application

```java
@SpringBootApplication
public class McpServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(McpServerApplication.class, args);
	}

	@Bean
	public ToolCallbackProvider weatherTools(WeatherService weatherService) {
		return  MethodToolCallbackProvider.builder().toolObjects(weatherService).build();
	}
}
```

Uses the the `MethodToolCallbackProvider` utils to convert the `@Tools` into actionable callbacks used by the MCP server.

### Running the server

Finally, let's build the server:

```bash
./mvnw clean install
```

This will generate a `mcp-weather-stdio-server-0.0.1-SNAPSHOT.jar` file within the `target` folder.

Let's now test your server from an existing MCP host, Claude for Desktop.

## Testing your server with Claude for Desktop

<Note>
Claude for Desktop is not yet available on Linux.
</Note>

First, make sure you have Claude for Desktop installed. 
[You can install the latest version here.](https://claude.ai/download) If you already have Claude for Desktop, **make sure it's updated to the latest version.**

We'll need to configure Claude for Desktop for whichever MCP servers you want to use. 
To do this, open your Claude for Desktop App configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor. 
Make sure to create the file if it doesn't exist.

For example, if you have [VS Code](https://code.visualstudio.com/) installed:

<Tabs>
  <Tab title="MacOS/Linux">
  ```bash
  code ~/Library/Application\ Support/Claude/claude_desktop_config.json
  ```
  </Tab>
  <Tab title="Windows">
  ```powershell
  code $env:AppData\Claude\claude_desktop_config.json
  ```
  </Tab>
</Tabs>

You'll then add your servers in the `mcpServers` key. 
The MCP UI elements will only show up in Claude for Desktop if at least one server is properly configured.

In this case, we'll add our single weather server like so:

<Tabs>
  <Tab title="MacOS/Linux">
  ```json java
  {
    "mcpServers": {
      "spring-ai-mcp-weather": {
        "command": "java",
        "args": [
          "-Dspring.ai.mcp.server.stdio=true",
          "-jar",
          "/ABSOLUTE/PATH/TO/PARENT/FOLDER/mcp-weather-stdio-server-0.0.1-SNAPSHOT.jar"
        ]
      }
    }
  }
  ```
  </Tab>

  <Tab title="Windows">
  ```json java
  {
    "mcpServers": {
      "spring-ai-mcp-weather": {
        "command": "java",
        "args": [
          "-Dspring.ai.mcp.server.transport=STDIO",
          "-jar",
          "C:\\ABSOLUTE\\PATH\\TO\\PARENT\\FOLDER\\weather\\mcp-weather-stdio-server-0.0.1-SNAPSHOT.jar"
        ]
      }
    }
  }
  ```
  </Tab>
</Tabs>

<Note>
Make sure you pass in the absolute path to your server.
</Note>

This tells Claude for Desktop:
1. There's an MCP server named "my-weather-server"
2. To launch it by running `java -jar /ABSOLUTE/PATH/TO/PARENT/FOLDER/mcp-weather-stdio-server-0.0.1-SNAPSHOT.jar`

Save the file, and restart **Claude for Desktop**.

## Testing your server with Java client

### Create a MCP Client manually

Use the `McpClient` to connect to the server:

```java
var stdioParams = ServerParameters.builder("java")
  .args("-jar", "/ABSOLUTE/PATH/TO/PARENT/FOLDER/mcp-weather-stdio-server-0.0.1-SNAPSHOT.jar")
  .build();

var stdioTransport = new StdioClientTransport(stdioParams);

var mcpClient = McpClient.sync(stdioTransport).build();

mcpClient.initialize();

ListToolsResult toolsList = mcpClient.listTools();

CallToolResult weather = mcpClient.callTool(
  new CallToolRequest("getWeatherForecastByLocation",
      Map.of("latitude", "47.6062", "longitude", "-122.3321")));

CallToolResult alert = mcpClient.callTool(
  new CallToolRequest("getAlerts", Map.of("state", "NY")));

mcpClient.closeGracefully();
```

### Use MCP Client Boot Starter

Create a new boot starter application using the `spring-ai-starter-mcp-client` dependency:

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-mcp-client</artifactId>
</dependency>
```

and set the `spring.ai.mcp.client.stdio.servers-configuration` property to point to your `claude_desktop_config.json`.
You can re-use the existing Anthropic Desktop configuration:

```properties
spring.ai.mcp.client.stdio.servers-configuration=file:PATH/TO/claude_desktop_config.json
```

When you start your client application, the auto-configuration will create, automatically MCP clients from the claude_desktop_config.json.

For more information, see the [MCP Client Boot Starters](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-client-docs.html) reference documentation.

## More Java MCP Server examples

The [starter-webflux-server](https://github.com/spring-projects/spring-ai-examples/tree/main/model-context-protocol/weather/starter-webflux-server) demonstrates how to create a MCP server using SSE transport. 
It showcases how to define and register MCP Tools, Resources, and Prompts, using the Spring Boot's auto-configuration capabilities.

</Tab>

<Tab title='Kotlin'>
Let's get started with building our weather server! [You can find the complete code for what we'll be building here.](https://github.com/modelcontextprotocol/kotlin-sdk/tree/main/samples/weather-stdio-server)

### Prerequisite knowledge

This quickstart assumes you have familiarity with:
- Kotlin
- LLMs like Claude

### System requirements

- Java 17 or higher installed.

### Set up your environment

First, let's install `java` and `gradle` if you haven't already.
You can download `java` from [official Oracle JDK website](https://www.oracle.com/java/technologies/downloads/).
Verify your `java` installation:
```bash
java --version
```

Now, let's create and set up your project:

<CodeGroup>
```bash MacOS/Linux
# Create a new directory for our project
mkdir weather
cd weather

# Initialize a new kotlin project
gradle init
```

```powershell Windows
# Create a new directory for our project
md weather
cd weather

# Initialize a new kotlin project
gradle init
```
</CodeGroup>

After running `gradle init`, you will be presented with options for creating your project.
Select **Application** as the project type, **Kotlin** as the programming language, and **Java 17** as the Java version.

Alternatively, you can create a Kotlin application using the [IntelliJ IDEA project wizard](https://kotlinlang.org/docs/jvm-get-started.html).

After creating the project, add the following dependencies:
<CodeGroup>
```kotlin build.gradle.kts
val mcpVersion = "0.4.0"
val slf4jVersion = "2.0.9"
val ktorVersion = "3.1.1"

dependencies {
    implementation("io.modelcontextprotocol:kotlin-sdk:$mcpVersion")
    implementation("org.slf4j:slf4j-nop:$slf4jVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
}
```

```groovy build.gradle
def mcpVersion = '0.3.0'
def slf4jVersion = '2.0.9'
def ktorVersion = '3.1.1'

dependencies {
    implementation "io.modelcontextprotocol:kotlin-sdk:$mcpVersion"
    implementation "org.slf4j:slf4j-nop:$slf4jVersion"
    implementation "io.ktor:ktor-client-content-negotiation:$ktorVersion"
    implementation "io.ktor:ktor-serialization-kotlinx-json:$ktorVersion"
}
```
</CodeGroup>

Also, add the following plugins to your build script:
<CodeGroup>
```kotlin build.gradle.kts
plugins {
    kotlin("plugin.serialization") version "your_version_of_kotlin"
    id("com.github.johnrengelman.shadow") version "8.1.1"
}
```

```groovy build.gradle
plugins {
    id 'org.jetbrains.kotlin.plugin.serialization' version 'your_version_of_kotlin'
    id 'com.github.johnrengelman.shadow' version '8.1.1'
}
```
</CodeGroup>

Now let’s dive into building your server.

## Building your server

### Setting up the instance

Add a server initialization function:

```kotlin
// Main function to run the MCP server
fun `run mcp server`() {
    // Create the MCP Server instance with a basic implementation
    val server = Server(
        Implementation(
            name = "weather", // Tool name is "weather"
            version = "1.0.0" // Version of the implementation
        ),
        ServerOptions(
            capabilities = ServerCapabilities(tools = ServerCapabilities.Tools(listChanged = true))
        )
    )

    // Create a transport using standard IO for server communication
    val transport = StdioServerTransport(
        System.`in`.asInput(),
        System.out.asSink().buffered()
    )

    runBlocking {
        server.connect(transport)
        val done = Job()
        server.onClose {
            done.complete()
        }
        done.join()
    }
}
```

### Weather API helper functions

Next, let's add functions and data classes for querying and converting responses from the National Weather Service API:

```kotlin
// Extension function to fetch forecast information for given latitude and longitude
suspend fun HttpClient.getForecast(latitude: Double, longitude: Double): List<String> {
    val points = this.get("/points/$latitude,$longitude").body<Points>()
    val forecast = this.get(points.properties.forecast).body<Forecast>()
    return forecast.properties.periods.map { period ->
        """
            ${period.name}:
            Temperature: ${period.temperature} ${period.temperatureUnit}
            Wind: ${period.windSpeed} ${period.windDirection}
            Forecast: ${period.detailedForecast}
        """.trimIndent()
    }
}

// Extension function to fetch weather alerts for a given state
suspend fun HttpClient.getAlerts(state: String): List<String> {
    val alerts = this.get("/alerts/active/area/$state").body<Alert>()
    return alerts.features.map { feature ->
        """
            Event: ${feature.properties.event}
            Area: ${feature.properties.areaDesc}
            Severity: ${feature.properties.severity}
            Description: ${feature.properties.description}
            Instruction: ${feature.properties.instruction}
        """.trimIndent()
    }
}

@Serializable
data class Points(
    val properties: Properties
) {
    @Serializable
    data class Properties(val forecast: String)
}

@Serializable
data class Forecast(
    val properties: Properties
) {
    @Serializable
    data class Properties(val periods: List<Period>)

    @Serializable
    data class Period(
        val number: Int, val name: String, val startTime: String, val endTime: String,
        val isDaytime: Boolean, val temperature: Int, val temperatureUnit: String,
        val temperatureTrend: String, val probabilityOfPrecipitation: JsonObject,
        val windSpeed: String, val windDirection: String,
        val shortForecast: String, val detailedForecast: String,
    )
}

@Serializable
data class Alert(
    val features: List<Feature>
) {
    @Serializable
    data class Feature(
        val properties: Properties
    )

    @Serializable
    data class Properties(
        val event: String, val areaDesc: String, val severity: String,
        val description: String, val instruction: String?,
    )
}
```

### Implementing tool execution

The tool execution handler is responsible for actually executing the logic of each tool. Let's add it:

```kotlin
// Create an HTTP client with a default request configuration and JSON content negotiation
val httpClient = HttpClient {
    defaultRequest {
        url("https://api.weather.gov")
        headers {
            append("Accept", "application/geo+json")
            append("User-Agent", "WeatherApiClient/1.0")
        }
        contentType(ContentType.Application.Json)
    }
    // Install content negotiation plugin for JSON serialization/deserialization
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
}

// Register a tool to fetch weather alerts by state
server.addTool(
    name = "get_alerts",
    description = """
        Get weather alerts for a US state. Input is Two-letter US state code (e.g. CA, NY)
    """.trimIndent(),
    inputSchema = Tool.Input(
        properties = buildJsonObject {
            putJsonObject("state") {
                put("type", "string")
                put("description", "Two-letter US state code (e.g. CA, NY)")
            }
        },
        required = listOf("state")
    )
) { request ->
    val state = request.arguments["state"]?.jsonPrimitive?.content
    if (state == null) {
        return@addTool CallToolResult(
            content = listOf(TextContent("The 'state' parameter is required."))
        )
    }

    val alerts = httpClient.getAlerts(state)

    CallToolResult(content = alerts.map { TextContent(it) })
}

// Register a tool to fetch weather forecast by latitude and longitude
server.addTool(
    name = "get_forecast",
    description = """
        Get weather forecast for a specific latitude/longitude
    """.trimIndent(),
    inputSchema = Tool.Input(
        properties = buildJsonObject {
            putJsonObject("latitude") { put("type", "number") }
            putJsonObject("longitude") { put("type", "number") }
        },
        required = listOf("latitude", "longitude")
    )
) { request ->
    val latitude = request.arguments["latitude"]?.jsonPrimitive?.doubleOrNull
    val longitude = request.arguments["longitude"]?.jsonPrimitive?.doubleOrNull
    if (latitude == null || longitude == null) {
        return@addTool CallToolResult(
            content = listOf(TextContent("The 'latitude' and 'longitude' parameters are required."))
        )
    }

    val forecast = httpClient.getForecast(latitude, longitude)

    CallToolResult(content = forecast.map { TextContent(it) })
}
```

### Running the server

Finally, implement the main function to run the server:

```kotlin
fun main() = `run mcp server`()
```

Make sure to run `./gradlew build` to build your server. This is a very important step in getting your server to connect.

Let's now test your server from an existing MCP host, Claude for Desktop.

## Testing your server with Claude for Desktop

<Note>
Claude for Desktop is not yet available on Linux. Linux users can proceed to the [Building a client](/quickstart/client) tutorial to build an MCP client that connects to the server we just built.
</Note>

First, make sure you have Claude for Desktop installed. [You can install the latest version
here.](https://claude.ai/download) If you already have Claude for Desktop, **make sure it's updated to the latest version.**

We'll need to configure Claude for Desktop for whichever MCP servers you want to use.
To do this, open your Claude for Desktop App configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor.
Make sure to create the file if it doesn't exist.

For example, if you have [VS Code](https://code.visualstudio.com/) installed:

<CodeGroup>
```bash MacOS/Linux
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

```powershell Windows
code $env:AppData\Claude\claude_desktop_config.json
```
</CodeGroup>

You'll then add your servers in the `mcpServers` key.
The MCP UI elements will only show up in Claude for Desktop if at least one server is properly configured.

In this case, we'll add our single weather server like so:

<CodeGroup>
```json MacOS/Linux
{
    "mcpServers": {
        "weather": {
            "command": "java",
            "args": [
                "-jar",
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather/build/libs/weather-0.1.0-all.jar"
            ]
        }
    }
}
```

```json Windows
{
    "mcpServers": {
        "weather": {
            "command": "java",
            "args": [
                "-jar",
                "C:\\PATH\\TO\\PARENT\\FOLDER\\weather\\build\\libs\\weather-0.1.0-all.jar"
            ]
        }
    }
}
```
</CodeGroup>

This tells Claude for Desktop:
1. There's an MCP server named "weather"
2. Launch it by running `java -jar /ABSOLUTE/PATH/TO/PARENT/FOLDER/weather/build/libs/weather-0.1.0-all.jar`

Save the file, and restart **Claude for Desktop**.

</Tab>

<Tab title='C#'>
Let's get started with building our weather server! [You can find the complete code for what we'll be building here.](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/QuickstartWeatherServer)

### Prerequisite knowledge
This quickstart assumes you have familiarity with:
- C#
- LLMs like Claude
- .NET 8 or higher

### System requirements
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or higher installed.

### Set up your environment
First, let's install `dotnet` if you haven't already. You can download `dotnet` from [official Microsoft .NET website](https://dotnet.microsoft.com/download/). Verify your `dotnet` installation:
```bash
dotnet --version
```
Now, let's create and set up your project:
<CodeGroup>
```bash MacOS/Linux
# Create a new directory for our project
mkdir weather
cd weather
# Initialize a new C# project
dotnet new console
```

```powershell Windows
# Create a new directory for our project
mkdir weather
cd weather
# Initialize a new C# project
dotnet new console
```
</CodeGroup>
After running `dotnet new console`, you will be presented with a new C# project.
You can open the project in your favorite IDE, such as [Visual Studio](https://visualstudio.microsoft.com/) or [Rider](https://www.jetbrains.com/rider/).
Alternatively, you can create a C# application using the [Visual Studio project wizard](https://learn.microsoft.com/en-us/visualstudio/get-started/csharp/tutorial-console?view=vs-2022).
After creating the project, add NuGet package for the Model Context Protocol SDK and hosting:

```bash
# Add the Model Context Protocol SDK NuGet package
dotnet add package ModelContextProtocol --prerelease
# Add the .NET Hosting NuGet package
dotnet add package Microsoft.Extensions.Hosting
```
Now let’s dive into building your server.

## Building your server

Open the `Program.cs` file in your project and replace its contents with the following code:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol;
using System.Net.Http.Headers;

var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Services.AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

builder.Services.AddSingleton(_ =>
{
    var client = new HttpClient() { BaseAddress = new Uri("https://api.weather.gov") };
    client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("weather-tool", "1.0"));
    return client;
});

var app = builder.Build();

await app.RunAsync();
```
<Note>
When creating the `ApplicationHostBuilder`, ensure you use `CreateEmptyApplicationBuilder` instead of `CreateDefaultBuilder`. This ensures that the server does not write any additional messages to the console. This is only neccessary for servers using STDIO transport.
</Note>

This code sets up a basic console application that uses the Model Context Protocol SDK to create an MCP server with standard I/O transport.

### Weather API helper functions
Next, define a class with the tool execution handlers for querying and converting responses from the National Weather Service API:

```csharp
using ModelContextProtocol.Server;
using System.ComponentModel;
using System.Net.Http.Json;
using System.Text.Json;

namespace QuickstartWeatherServer.Tools;

[McpServerToolType]
public static class WeatherTools
{
    [McpServerTool, Description("Get weather alerts for a US state.")]
    public static async Task<string> GetAlerts(
        HttpClient client,
        [Description("The US state to get alerts for.")] string state)
    {
        var jsonElement = await client.GetFromJsonAsync<JsonElement>($"/alerts/active/area/{state}");
        var alerts = jsonElement.GetProperty("features").EnumerateArray();

        if (!alerts.Any())
        {
            return "No active alerts for this state.";
        }

        return string.Join("\n--\n", alerts.Select(alert =>
        {
            JsonElement properties = alert.GetProperty("properties");
            return $"""
                    Event: {properties.GetProperty("event").GetString()}
                    Area: {properties.GetProperty("areaDesc").GetString()}
                    Severity: {properties.GetProperty("severity").GetString()}
                    Description: {properties.GetProperty("description").GetString()}
                    Instruction: {properties.GetProperty("instruction").GetString()}
                    """;
        }));
    }

    [McpServerTool, Description("Get weather forecast for a location.")]
    public static async Task<string> GetForecast(
        HttpClient client,
        [Description("Latitude of the location.")] double latitude,
        [Description("Longitude of the location.")] double longitude)
    {
        var jsonElement = await client.GetFromJsonAsync<JsonElement>($"/points/{latitude},{longitude}");
        var periods = jsonElement.GetProperty("properties").GetProperty("periods").EnumerateArray();

        return string.Join("\n---\n", periods.Select(period => $"""
                {period.GetProperty("name").GetString()}
                Temperature: {period.GetProperty("temperature").GetInt32()}°F
                Wind: {period.GetProperty("windSpeed").GetString()} {period.GetProperty("windDirection").GetString()}
                Forecast: {period.GetProperty("detailedForecast").GetString()}
                """));
    }
}
```

### Running the server
Finally, run the server using the following command:

```bash
dotnet run
```
This will start the server and listen for incoming requests on standard input/output.

## Testing your server with Claude for Desktop
<Note>
Claude for Desktop is not yet available on Linux. Linux users can proceed to the [Building a client](/quickstart/client) tutorial to build an MCP client that connects to the server we just built.
</Note>

First, make sure you have Claude for Desktop installed. [You can install the latest version
here.](https://claude.ai/download) If you already have Claude for Desktop, **make sure it's updated to the latest version.**
We'll need to configure Claude for Desktop for whichever MCP servers you want to use. To do this, open your Claude for Desktop App configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor. Make sure to create the file if it doesn't exist.
For example, if you have [VS Code](https://code.visualstudio.com/) installed:
<Tabs>
<Tab title="MacOS/Linux">
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
</Tab>
<Tab title="Windows">
```powershell
code $env:AppData\Claude\claude_desktop_config.json
```
</Tab>
</Tabs>

You'll then add your servers in the `mcpServers` key. The MCP UI elements will only show up in Claude for Desktop if at least one server is properly configured.
In this case, we'll add our single weather server like so:

<Tabs>
<Tab title="MacOS/Linux">
```json
{
    "mcpServers": {
        "weather": {
            "command": "dotnet",
            "args": [
                "run",
                "--project",
                "/ABSOLUTE/PATH/TO/PROJECT",
                "--no-build"
            ]
        }
    }
}
```

</Tab>

<Tab title="Windows">
```json
{
    "mcpServers": {
        "weather": {
            "command": "dotnet",
            "args": [
                "run",
                "--project",
                "C:\\ABSOLUTE\\PATH\\TO\\PROJECT",
                "--no-build"
            ]
        }
    }
}
```
</Tab>
</Tabs>

This tells Claude for Desktop:
1. There's an MCP server named "weather"
2. Launch it by running `dotnet run /ABSOLUTE/PATH/TO/PROJECT`
Save the file, and restart **Claude for Desktop**.

</Tab>
</Tabs>

### Test with commands

Let's make sure Claude for Desktop is picking up the two tools we've exposed in our `weather` server. You can do this by looking for the hammer <img src="/images/claude-desktop-mcp-hammer-icon.svg" style={{display: 'inline', margin: 0, height: '1.3em'}} /> icon:

<Frame>
  <img src="/images/visual-indicator-mcp-tools.png" />
</Frame>

After clicking on the hammer icon, you should see two tools listed:

<Frame>
  <img src="/images/available-mcp-tools.png" />
</Frame>

If your server isn't being picked up by Claude for Desktop, proceed to the [Troubleshooting](#troubleshooting) section for debugging tips.

If the hammer icon has shown up, you can now test your server by running the following commands in Claude for Desktop:

- What's the weather in Sacramento?
- What are the active weather alerts in Texas?

<Frame>
  <img src="/images/current-weather.png" />
</Frame>
<Frame>
  <img src="/images/weather-alerts.png" />
</Frame>

<Note>
Since this is the US National Weather service, the queries will only work for US locations.
</Note>

## What's happening under the hood

When you ask a question:

1. The client sends your question to Claude
2. Claude analyzes the available tools and decides which one(s) to use
3. The client executes the chosen tool(s) through the MCP server
4. The results are sent back to Claude
5. Claude formulates a natural language response
6. The response is displayed to you!

## Troubleshooting

<AccordionGroup>
<Accordion title="Claude for Desktop Integration Issues">
**Getting logs from Claude for Desktop**

Claude.app logging related to MCP is written to log files in `~/Library/Logs/Claude`:

- `mcp.log` will contain general logging about MCP connections and connection failures.
- Files named `mcp-server-SERVERNAME.log` will contain error (stderr) logging from the named server.

You can run the following command to list recent logs and follow along with any new ones:
```bash
# Check Claude's logs for errors
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

**Server not showing up in Claude**

1. Check your `claude_desktop_config.json` file syntax
2. Make sure the path to your project is absolute and not relative
3. Restart Claude for Desktop completely

**Tool calls failing silently**

If Claude attempts to use the tools but they fail:

1. Check Claude's logs for errors
2. Verify your server builds and runs without errors
3. Try restarting Claude for Desktop

**None of this is working. What do I do?**

Please refer to our [debugging guide](/docs/tools/debugging) for better debugging tools and more detailed guidance.
</Accordion>
<Accordion title="Weather API Issues">
**Error: Failed to retrieve grid point data**

This usually means either:
1. The coordinates are outside the US
2. The NWS API is having issues
3. You're being rate limited

Fix:

- Verify you're using US coordinates
- Add a small delay between requests
- Check the NWS API status page

**Error: No active alerts for [STATE]**

This isn't an error - it just means there are no current weather alerts for that state. Try a different state or check during severe weather.
</Accordion>

</AccordionGroup>

<Note>
For more advanced troubleshooting, check out our guide on [Debugging MCP](/docs/tools/debugging)
</Note>

## Next steps

<CardGroup cols={2}>
  <Card
    title="Building a client"
    icon="outlet"
    href="/quickstart/client"
  >
    Learn how to build your own MCP client that can connect to your server
  </Card>
  <Card
    title="Example servers"
    icon="grid"
    href="/examples"
  >
    Check out our gallery of official MCP servers and implementations
  </Card>
  <Card
    title="Debugging Guide"
    icon="bug"
    href="/docs/tools/debugging"
  >
    Learn how to effectively debug MCP servers and integrations
  </Card>
  <Card
    title="Building MCP with LLMs"
    icon="comments"
    href="/tutorials/building-mcp-with-llms"
  >
    Learn how to use LLMs like Claude to speed up your MCP development
  </Card>
</CardGroup>


---
modelcontextprotocol/docs/quickstart/user.mdx
---
---
title: "For Claude Desktop Users"
description: "Get started using pre-built servers in Claude for Desktop."
---

In this tutorial, you will extend [Claude for Desktop](https://claude.ai/download) so that it can read from your computer's file system, write new files, move files, and even search files.

<Frame>
  <img src="/images/quickstart-filesystem.png" />
</Frame>

Don't worry — it will ask you for your permission before executing these actions!

## 1. Download Claude for Desktop

Start by downloading [Claude for Desktop](https://claude.ai/download), choosing either macOS or Windows. (Linux is not yet supported for Claude for Desktop.)

Follow the installation instructions.

If you already have Claude for Desktop, make sure it's on the latest version by clicking on the Claude menu on your computer and selecting "Check for Updates..."

<Accordion title="Why Claude for Desktop and not Claude.ai?">
  Because servers are locally run, MCP currently only supports desktop hosts. Remote hosts are in active development.
</Accordion>

## 2. Add the Filesystem MCP Server

To add this filesystem functionality, we will be installing a pre-built [Filesystem MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) to Claude for Desktop. This is one of dozens of [servers](https://github.com/modelcontextprotocol/servers/tree/main) created by Anthropic and the community.

Get started by opening up the Claude menu on your computer and select "Settings..." Please note that these are not the Claude Account Settings found in the app window itself.

This is what it should look like on a Mac:
<Frame style={{ textAlign: 'center' }}>
  <img src="/images/quickstart-menu.png" width="400" />
</Frame>

Click on "Developer" in the left-hand bar of the Settings pane, and then click on "Edit Config":
<Frame>
  <img src="/images/quickstart-developer.png" />
</Frame>

This will create a configuration file at:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

if you don't already have one, and will display the file in your file system.

Open up the configuration file in any text editor. Replace the file contents with this:
<Tabs>
<Tab title="MacOS/Linux">
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/Users/username/Downloads"
      ]
    }
  }
}
```
</Tab>
<Tab title="Windows">
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\username\\Desktop",
        "C:\\Users\\username\\Downloads"
      ]
    }
  }
}
```
</Tab>
</Tabs>

Make sure to replace `username` with your computer's username. The paths should point to valid directories that you want Claude to be able to access and modify. It's set up to work for Desktop and Downloads, but you can add more paths as well.

You will also need [Node.js](https://nodejs.org) on your computer for this to run properly. To verify you have Node installed, open the command line on your computer.
- On macOS, open the Terminal from your Applications folder
- On Windows, press Windows + R, type "cmd", and press Enter

Once in the command line, verify you have Node installed by entering in the following command:
```bash
node --version
```
If you get an error saying "command not found" or "node is not recognized", download Node from [nodejs.org](https://nodejs.org/).

<Tip>
**How does the configuration file work?**

This configuration file tells Claude for Desktop which MCP servers to start up every time you start the application. In this case, we have added one server called "filesystem" that will use the Node `npx` command to install and run `@modelcontextprotocol/server-filesystem`. This server, described [here](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem), will let you access your file system in Claude for Desktop.
</Tip>

<Warning>
**Command Privileges**

Claude for Desktop will run the commands in the configuration file with the permissions of your user account, and access to your local files. Only add commands if you understand and trust the source.
</Warning>

## 3. Restart Claude

After updating your configuration file, you need to restart Claude for Desktop.

Upon restarting, you should see a hammer <img src="/images/claude-desktop-mcp-hammer-icon.svg" style={{display: 'inline', margin: 0, height: '1.3em'}} /> icon in the bottom right corner of the input box:

<Frame>
  <img src="/images/quickstart-hammer.png" />
</Frame>

After clicking on the hammer icon, you should see the tools that come with the Filesystem MCP Server:

<Frame style={{ textAlign: 'center' }}>
  <img src="/images/quickstart-tools.png" width="400" />
</Frame>

If your server isn't being picked up by Claude for Desktop, proceed to the [Troubleshooting](#troubleshooting) section for debugging tips.

## 4. Try it out!

You can now talk to Claude and ask it about your filesystem. It should know when to call the relevant tools.

Things you might try asking Claude:
- Can you write a poem and save it to my desktop?
- What are some work-related files in my downloads folder?
- Can you take all the images on my desktop and move them to a new folder called "Images"?

As needed, Claude will call the relevant tools and seek your approval before taking an action:
<Frame style={{ textAlign: 'center' }}>
  <img src="/images/quickstart-approve.png" width="500" />
</Frame>

## Troubleshooting

<AccordionGroup>
<Accordion title="Server not showing up in Claude / hammer icon missing">
  1. Restart Claude for Desktop completely
  2. Check your `claude_desktop_config.json` file syntax
  3. Make sure the file paths included in `claude_desktop_config.json` are valid and that they are absolute and not relative
  4. Look at [logs](#getting-logs-from-claude-for-desktop) to see why the server is not connecting
  5. In your command line, try manually running the server (replacing `username` as you did in `claude_desktop_config.json`) to see if you get any errors:
<Tabs>
<Tab title="MacOS/Linux">
```bash
npx -y @modelcontextprotocol/server-filesystem /Users/username/Desktop /Users/username/Downloads
```
</Tab>
<Tab title="Windows">
```bash
npx -y @modelcontextprotocol/server-filesystem C:\Users\username\Desktop C:\Users\username\Downloads
```
</Tab>
</Tabs>
</Accordion>
<Accordion title="Getting logs from Claude for Desktop">
  Claude.app logging related to MCP is written to log files in:
  - macOS: `~/Library/Logs/Claude`
  - Windows: `%APPDATA%\Claude\logs`

  - `mcp.log` will contain general logging about MCP connections and connection failures.
  - Files named `mcp-server-SERVERNAME.log` will contain error (stderr) logging from the named server.

  You can run the following command to list recent logs and follow along with any new ones (on Windows, it will only show recent logs):
<Tabs>
<Tab title="MacOS/Linux">
```bash
# Check Claude's logs for errors
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```
</Tab>
<Tab title="Windows">
```bash
type "%APPDATA%\Claude\logs\mcp*.log"
```
</Tab>
</Tabs>
</Accordion>
<Accordion title="Tool calls failing silently">
  If Claude attempts to use the tools but they fail:

  1. Check Claude's logs for errors
  2. Verify your server builds and runs without errors
  3. Try restarting Claude for Desktop
</Accordion>
<Accordion title="None of this is working. What do I do?">
  Please refer to our [debugging guide](/docs/tools/debugging) for better debugging tools and more detailed guidance.
</Accordion>
<Accordion title="ENOENT error and `${APPDATA}` in paths on Windows">
If your configured server fails to load, and you see within its logs an error referring to `${APPDATA}` within a path, you may need to add the expanded value of `%APPDATA%` to your `env` key in `claude_desktop_config.json`:

```json
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "APPDATA": "C:\\Users\\user\\AppData\\Roaming\\",
      "BRAVE_API_KEY": "..."
    }
  }
}
```

With this change in place, launch Claude Desktop once again.

<Warning>
**NPM should be installed globally**

The `npx` command may continue to fail if you have not installed NPM globally. If NPM is already installed globally, you will find `%APPDATA%\npm` exists on your system. If not, you can install NPM globally by running the following command:

```bash
npm install -g npm
```
</Warning>

</Accordion>
</AccordionGroup>

## Next steps
<CardGroup cols={2}>
  <Card
    title="Explore other servers"
    icon="grid"
    href="/examples"
  >
    Check out our gallery of official MCP servers and implementations
  </Card>
  <Card
    title="Build your own server"
    icon="code"
    href="/quickstart/server"
  >
    Now build your own custom server to use in Claude for Desktop and other clients
  </Card>
</CardGroup>


---
modelcontextprotocol/docs/sdk/java/mcp-client.mdx
---
---
title: MCP Client
description: Learn how to use the Model Context Protocol (MCP) client to interact with MCP servers
---

# Model Context Protocol Client

The MCP Client is a key component in the Model Context Protocol (MCP) architecture, responsible for establishing and managing connections with MCP servers. It implements the client-side of the protocol, handling:

- Protocol version negotiation to ensure compatibility with servers
- Capability negotiation to determine available features
- Message transport and JSON-RPC communication
- Tool discovery and execution
- Resource access and management
- Prompt system interactions
- Optional features like roots management and sampling support

<Tip>
The core `io.modelcontextprotocol.sdk:mcp` module provides STDIO and SSE client transport implementations  without requiring external web frameworks. 

Spring-specific transport implementations are available as an **optional** dependency `io.modelcontextprotocol.sdk:mcp-spring-webflux` for [Spring Framework](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html) users.
</Tip>

The client provides both synchronous and asynchronous APIs for flexibility in different application contexts.

<Tabs>
  <Tab title="Sync API">
```java
// Create a sync client with custom configuration
McpSyncClient client = McpClient.sync(transport)
    .requestTimeout(Duration.ofSeconds(10))
    .capabilities(ClientCapabilities.builder()
        .roots(true)      // Enable roots capability
        .sampling()       // Enable sampling capability
        .build())
    .sampling(request -> new CreateMessageResult(response))
    .build();

// Initialize connection
client.initialize();

// List available tools
ListToolsResult tools = client.listTools();

// Call a tool
CallToolResult result = client.callTool(
    new CallToolRequest("calculator", 
        Map.of("operation", "add", "a", 2, "b", 3))
);

// List and read resources
ListResourcesResult resources = client.listResources();
ReadResourceResult resource = client.readResource(
    new ReadResourceRequest("resource://uri")
);

// List and use prompts
ListPromptsResult prompts = client.listPrompts();
GetPromptResult prompt = client.getPrompt(
    new GetPromptRequest("greeting", Map.of("name", "Spring"))
);

// Add/remove roots
client.addRoot(new Root("file:///path", "description"));
client.removeRoot("file:///path");

// Close client
client.closeGracefully();
```
  </Tab>

  <Tab title="Async API">
```java
// Create an async client with custom configuration
McpAsyncClient client = McpClient.async(transport)
    .requestTimeout(Duration.ofSeconds(10))
    .capabilities(ClientCapabilities.builder()
        .roots(true)      // Enable roots capability
        .sampling()       // Enable sampling capability
        .build())
    .sampling(request -> Mono.just(new CreateMessageResult(response)))
    .toolsChangeConsumer(tools -> Mono.fromRunnable(() -> {
        logger.info("Tools updated: {}", tools);
    }))
    .resourcesChangeConsumer(resources -> Mono.fromRunnable(() -> {
        logger.info("Resources updated: {}", resources);
    }))
    .promptsChangeConsumer(prompts -> Mono.fromRunnable(() -> {
        logger.info("Prompts updated: {}", prompts);
    }))
    .build();

// Initialize connection and use features
client.initialize()
    .flatMap(initResult -> client.listTools())
    .flatMap(tools -> {
        return client.callTool(new CallToolRequest(
            "calculator", 
            Map.of("operation", "add", "a", 2, "b", 3)
        ));
    })
    .flatMap(result -> {
        return client.listResources()
            .flatMap(resources -> 
                client.readResource(new ReadResourceRequest("resource://uri"))
            );
    })
    .flatMap(resource -> {
        return client.listPrompts()
            .flatMap(prompts ->
                client.getPrompt(new GetPromptRequest(
                    "greeting", 
                    Map.of("name", "Spring")
                ))
            );
    })
    .flatMap(prompt -> {
        return client.addRoot(new Root("file:///path", "description"))
            .then(client.removeRoot("file:///path"));            
    })
    .doFinally(signalType -> {
        client.closeGracefully().subscribe();
    })
    .subscribe();
```
  </Tab>
</Tabs>

## Client Transport

The transport layer handles the communication between MCP clients and servers, providing different implementations for various use cases. The client transport manages message serialization, connection establishment, and protocol-specific communication patterns.

<Tabs>
    <Tab title="STDIO">
        Creates transport for in-process based communication
        ```java
        ServerParameters params = ServerParameters.builder("npx")
            .args("-y", "@modelcontextprotocol/server-everything", "dir")
            .build();
        McpTransport transport = new StdioClientTransport(params);
        ```
    </Tab>
    <Tab title="SSE (HttpClient)">
        Creates a framework agnostic (pure Java API) SSE client transport. Included in the core mcp module.
        ```java
        McpTransport transport = new HttpClientSseClientTransport("http://your-mcp-server");
        ```
    </Tab>
    <Tab title="SSE (WebFlux)">
        Creates WebFlux-based SSE client transport. Requires the mcp-webflux-sse-transport dependency.
        ```java
        WebClient.Builder webClientBuilder = WebClient.builder()
            .baseUrl("http://your-mcp-server");
        McpTransport transport = new WebFluxSseClientTransport(webClientBuilder);
        ```
    </Tab>
</Tabs>

## Client Capabilities

The client can be configured with various capabilities:

```java
var capabilities = ClientCapabilities.builder()
    .roots(true)      // Enable filesystem roots support with list changes notifications
    .sampling()       // Enable LLM sampling support
    .build();
```

### Roots Support

Roots define the boundaries of where servers can operate within the filesystem:

```java
// Add a root dynamically
client.addRoot(new Root("file:///path", "description"));

// Remove a root
client.removeRoot("file:///path");

// Notify server of roots changes
client.rootsListChangedNotification();
```

The roots capability allows servers to:

- Request the list of accessible filesystem roots
- Receive notifications when the roots list changes
- Understand which directories and files they have access to

### Sampling Support

Sampling enables servers to request LLM interactions ("completions" or "generations") through the client:

```java
// Configure sampling handler
Function<CreateMessageRequest, CreateMessageResult> samplingHandler = request -> {
    // Sampling implementation that interfaces with LLM
    return new CreateMessageResult(response);
};

// Create client with sampling support
var client = McpClient.sync(transport)
    .capabilities(ClientCapabilities.builder()
        .sampling()
        .build())
    .sampling(samplingHandler)
    .build();
```

This capability allows:
- Servers to leverage AI capabilities without requiring API keys
- Clients to maintain control over model access and permissions
- Support for both text and image-based interactions
- Optional inclusion of MCP server context in prompts


### Logging Support

The client can register a logging consumer to receive log messages from the server and set the minimum logging level to filter messages:

```java	
var mcpClient = McpClient.sync(transport)
        .loggingConsumer(notification -> {
            System.out.println("Received log message: " + notification.data());
        })
        .build();

mcpClient.initialize();

mcpClient.setLoggingLevel(McpSchema.LoggingLevel.INFO);

// Call the tool that can sends logging notifications
CallToolResult result = mcpClient.callTool(new McpSchema.CallToolRequest("logging-test", Map.of()));
```
Clients can control the minimum logging level they receive through the `mcpClient.setLoggingLevel(level)` request. Messages below the set level will be filtered out.
Supported logging levels (in order of increasing severity): DEBUG (0), INFO (1), NOTICE (2), WARNING (3), ERROR (4), CRITICAL (5), ALERT (6), EMERGENCY (7)

## Using MCP Clients

### Tool Execution

Tools are server-side functions that clients can discover and execute. The MCP client provides methods to list available tools and execute them with specific parameters. Each tool has a unique name and accepts a map of parameters.

<Tabs>
  <Tab title="Sync API">
```java
// List available tools and their names
var tools = client.listTools();
tools.forEach(tool -> System.out.println(tool.getName()));

// Execute a tool with parameters
var result = client.callTool("calculator", Map.of(
    "operation", "add",
    "a", 1,
    "b", 2
));
```
  </Tab>

  <Tab title="Async API">
```java
// List available tools asynchronously
client.listTools()
    .doOnNext(tools -> tools.forEach(tool -> 
        System.out.println(tool.getName())))
    .subscribe();

// Execute a tool asynchronously
client.callTool("calculator", Map.of(
        "operation", "add",
        "a", 1,
        "b", 2
    ))
    .subscribe();
```
  </Tab>
</Tabs>

### Resource Access

Resources represent server-side data sources that clients can access using URI templates. The MCP client provides methods to discover available resources and retrieve their contents through a standardized interface.

<Tabs>
  <Tab title="Sync API">
```java
// List available resources and their names
var resources = client.listResources();
resources.forEach(resource -> System.out.println(resource.getName()));

// Retrieve resource content using a URI template
var content = client.getResource("file", Map.of(
    "path", "/path/to/file.txt"
));
```
  </Tab>

  <Tab title="Async API">
```java
// List available resources asynchronously
client.listResources()
    .doOnNext(resources -> resources.forEach(resource -> 
        System.out.println(resource.getName())))
    .subscribe();

// Retrieve resource content asynchronously
client.getResource("file", Map.of(
        "path", "/path/to/file.txt"
    ))
    .subscribe();
```
  </Tab>
</Tabs>

### Prompt System

The prompt system enables interaction with server-side prompt templates. These templates can be discovered and executed with custom parameters, allowing for dynamic text generation based on predefined patterns.

<Tabs>
  <Tab title="Sync API">
```java
// List available prompt templates
var prompts = client.listPrompts();
prompts.forEach(prompt -> System.out.println(prompt.getName()));

// Execute a prompt template with parameters
var response = client.executePrompt("echo", Map.of(
    "text", "Hello, World!"
));
```
  </Tab>

  <Tab title="Async API">
```java
// List available prompt templates asynchronously
client.listPrompts()
    .doOnNext(prompts -> prompts.forEach(prompt -> 
        System.out.println(prompt.getName())))
    .subscribe();

// Execute a prompt template asynchronously
client.executePrompt("echo", Map.of(
        "text", "Hello, World!"
    ))
    .subscribe();
```
  </Tab>
</Tabs>

### Using Completion

As part of the [Completion capabilities](/specification/2025-03-26/server/utilities/completion), MCP provides a provides a standardized way for servers to offer argument autocompletion suggestions for prompts and resource URIs.

Check the [Server Completion capabilities](/sdk/java/mcp-server#completion-specification) to learn how to enable and configure completions on the server side.

On the client side, the MCP client provides methods to request auto-completions:

<Tabs>
  <Tab title="Sync API">

```java

CompleteRequest request = new CompleteRequest(
        new PromptReference("code_review"),
        new CompleteRequest.CompleteArgument("language", "py"));

CompleteResult result = syncMcpClient.completeCompletion(request);

```
  </Tab>

  <Tab title="Async API">

```java

CompleteRequest request = new CompleteRequest(
        new PromptReference("code_review"),
        new CompleteRequest.CompleteArgument("language", "py"));

Mono<CompleteResult> result = mcpClient.completeCompletion(request);

```

  </Tab>
</Tabs>



---
modelcontextprotocol/docs/sdk/java/mcp-overview.mdx
---
---
title: Overview
description: Introduction to the Model Context Protocol (MCP) Java SDK
---

Java SDK for the [Model Context Protocol](https://modelcontextprotocol.org/docs/concepts/architecture)
enables standardized integration between AI models and tools.

<Note>
### Breaking Changes in 0.8.x ⚠️
**Note:** Version 0.8.x introduces several breaking changes including a new session-based architecture. 
If you're upgrading from 0.7.0, please refer to the [Migration Guide](https://github.com/modelcontextprotocol/java-sdk/blob/main/migration-0.8.0.md) for detailed instructions.
</Note>

## Features

- MCP Client and MCP Server implementations supporting:
  - Protocol [version compatibility negotiation](/specification/2024-11-05/basic/lifecycle/#initialization)
  - [Tool](/specification/2024-11-05/server/tools/) discovery, execution, list change notifications
  - [Resource](/specification/2024-11-05/server/resources/) management with URI templates
  - [Roots](/specification/2024-11-05/client/roots/) list management and notifications
  - [Prompt](/specification/2024-11-05/server/prompts/) handling and management
  - [Sampling](/specification/2024-11-05/client/sampling/) support for AI model interactions
- Multiple transport implementations:
  - Default transports (included in core `mcp` module, no external web frameworks required):
    - Stdio-based transport for process-based communication
    - Java HttpClient-based SSE client transport for HTTP SSE Client-side streaming
    - Servlet-based SSE server transport for HTTP SSE Server streaming
  - Optional Spring-based transports (convenience if using Spring Framework):
    - WebFlux SSE client and server transports for reactive HTTP streaming
    - WebMVC SSE transport for servlet-based HTTP streaming
- Supports Synchronous and Asynchronous programming paradigms

<Tip>
The core `io.modelcontextprotocol.sdk:mcp` module provides default STDIO and SSE client and server transport implementations without requiring external web frameworks. 

Spring-specific transports are available as optional dependencies for convenience when using the [Spring Framework](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html).
</Tip>

## Architecture

The SDK follows a layered architecture with clear separation of concerns:

![MCP Stack Architecture](/images/java/mcp-stack.svg)

- **Client/Server Layer (McpClient/McpServer)**: Both use McpSession for sync/async operations,
with McpClient handling client-side protocol operations and McpServer managing server-side protocol operations.
- **Session Layer (McpSession)**: Manages communication patterns and state using DefaultMcpSession implementation.
- **Transport Layer (McpTransport)**: Handles JSON-RPC message serialization/deserialization via:
  - StdioTransport (stdin/stdout) in the core module
  - HTTP SSE transports in dedicated transport modules (Java HttpClient, Spring WebFlux, Spring WebMVC)


The MCP Client is a key component in the Model Context Protocol (MCP) architecture, responsible for establishing and managing connections with MCP servers. 
It implements the client-side of the protocol.

![Java MCP Client Architecture](/images/java/java-mcp-client-architecture.jpg)

The MCP Server is a foundational component in the Model Context Protocol (MCP) architecture that provides tools, resources, and capabilities to clients. 
It implements the server-side of the protocol.

![Java MCP Server Architecture](/images/java/java-mcp-server-architecture.jpg)

Key Interactions:

- **Client/Server Initialization**: Transport setup, protocol compatibility check, capability negotiation, and implementation details exchange.
- **Message Flow**: JSON-RPC message handling with validation, type-safe response processing, and error handling.
- **Resource Management**: Resource discovery, URI template-based access, subscription system, and content retrieval.

## Dependencies

Add the following Maven dependency to your project:

<Tabs>
  <Tab title="Maven">
The core MCP functionality:

```xml
<dependency>
    <groupId>io.modelcontextprotocol.sdk</groupId>
    <artifactId>mcp</artifactId>
</dependency>
```

The core `mcp` module already includes default STDIO and SSE transport implementations and doesn't require external web frameworks.

If you're using the Spring Framework and want to use Spring-specific transport implementations, add one of the following optional dependencies:

```xml
<!-- Optional: Spring WebFlux-based SSE client and server transport -->
<dependency>
    <groupId>io.modelcontextprotocol.sdk</groupId>
    <artifactId>mcp-spring-webflux</artifactId>
</dependency>

<!-- Optional: Spring WebMVC-based SSE server transport -->
<dependency>
    <groupId>io.modelcontextprotocol.sdk</groupId>
    <artifactId>mcp-spring-webmvc</artifactId>
</dependency>
```
  </Tab>
    <Tab title="Gradle">
    The core MCP functionality:

  ```groovy
  dependencies {
    implementation platform("io.modelcontextprotocol.sdk:mcp")
    //...
  }
  ```

    The core `mcp` module already includes default STDIO and SSE transport implementations and doesn't require external web frameworks.

    If you're using the Spring Framework and want to use Spring-specific transport implementations, add one of the following optional dependencies:

    ```groovy
    // Optional: Spring WebFlux-based SSE client and server transport
    dependencies {
      implementation platform("io.modelcontextprotocol.sdk:mcp-spring-webflux")
    }

    // Optional: Spring WebMVC-based SSE server transport
    dependencies {
      implementation platform("io.modelcontextprotocol.sdk:mcp-spring-webmvc")
    }
    ```
  </Tab>
</Tabs>

### Bill of Materials (BOM)

The Bill of Materials (BOM) declares the recommended versions of all the dependencies used by a given release.
Using the BOM from your application's build script avoids the need for you to specify and maintain the dependency versions yourself.
Instead, the version of the BOM you're using determines the utilized dependency versions.
It also ensures that you're using supported and tested versions of the dependencies by default, unless you choose to override them.

Add the BOM to your project:

<Tabs>
  <Tab title="Maven">
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.modelcontextprotocol.sdk</groupId>
            <artifactId>mcp-bom</artifactId>
            <version>0.9.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```
  </Tab>

  <Tab title="Gradle">
```groovy
dependencies {
  implementation platform("io.modelcontextprotocol.sdk:mcp-bom:0.9.0")
  //...
}
```

Gradle users can also use the Spring AI MCP BOM by leveraging Gradle (5.0+) native support for declaring dependency constraints using a Maven BOM.
This is implemented by adding a 'platform' dependency handler method to the dependencies section of your Gradle build script.
As shown in the snippet above this can then be followed by version-less declarations of the Starter Dependencies for the one or more spring-ai modules you wish to use, e.g. spring-ai-openai.
  </Tab>
</Tabs>

Replace the version number with the version of the BOM you want to use.

### Available Dependencies

The following dependencies are available and managed by the BOM:

- Core Dependencies 
  - `io.modelcontextprotocol.sdk:mcp` - Core MCP library providing the base functionality and APIs for Model Context Protocol implementation, including default STDIO and SSE client and server transport implementations. No external web frameworks required.
- Optional Transport Dependencies (convenience if using Spring Framework)
  - `io.modelcontextprotocol.sdk:mcp-spring-webflux` - WebFlux-based Server-Sent Events (SSE) transport implementation for reactive applications.
  - `io.modelcontextprotocol.sdk:mcp-spring-webmvc` - WebMVC-based Server-Sent Events (SSE) transport implementation for servlet-based applications.
- Testing Dependencies
  - `io.modelcontextprotocol.sdk:mcp-test` - Testing utilities and support for MCP-based applications.


---
modelcontextprotocol/docs/sdk/java/mcp-server.mdx
---
---
title: MCP Server
description: Learn how to implement and configure a Model Context Protocol (MCP) server
---

<Note>
### Breaking Changes in 0.8.x ⚠️
**Note:** Version 0.8.x introduces several breaking changes including a new session-based architecture. 
If you're upgrading from 0.7.0, please refer to the [Migration Guide](https://github.com/modelcontextprotocol/java-sdk/blob/main/migration-0.8.0.md) for detailed instructions.
</Note>

## Overview

The MCP Server is a foundational component in the Model Context Protocol (MCP) architecture that provides tools, resources, and capabilities to clients. It implements the server-side of the protocol, responsible for:

- Exposing tools that clients can discover and execute
- Managing resources with URI-based access patterns
- Providing prompt templates and handling prompt requests
- Supporting capability negotiation with clients
- Implementing server-side protocol operations
- Managing concurrent client connections
- Providing structured logging and notifications

<Tip>
The core `io.modelcontextprotocol.sdk:mcp` module provides STDIO and SSE server transport implementations  without requiring external web frameworks. 

Spring-specific transport implementations are available as an **optional** dependencies `io.modelcontextprotocol.sdk:mcp-spring-webflux`, `io.modelcontextprotocol.sdk:mcp-spring-webmvc` for [Spring Framework](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html) users.
</Tip>


The server supports both synchronous and asynchronous APIs, allowing for flexible integration in different application contexts.

<Tabs>
  <Tab title="Sync API">
```java
// Create a server with custom configuration
McpSyncServer syncServer = McpServer.sync(transportProvider)
    .serverInfo("my-server", "1.0.0")
    .capabilities(ServerCapabilities.builder()
        .resources(true)     // Enable resource support
        .tools(true)         // Enable tool support
        .prompts(true)       // Enable prompt support
        .logging()           // Enable logging support
        .completions()      // Enable completions support
        .build())
    .build();

// Register tools, resources, and prompts
syncServer.addTool(syncToolSpecification);
syncServer.addResource(syncResourceSpecification);
syncServer.addPrompt(syncPromptSpecification);

// Close the server when done
syncServer.close();
```
  </Tab>

  <Tab title="Async API">
```java
// Create an async server with custom configuration
McpAsyncServer asyncServer = McpServer.async(transportProvider)
    .serverInfo("my-server", "1.0.0")
    .capabilities(ServerCapabilities.builder()
        .resources(true)     // Enable resource support
        .tools(true)         // Enable tool support
        .prompts(true)       // Enable prompt support
        .logging()           // Enable logging support
        .build())
    .build();

// Register tools, resources, and prompts
asyncServer.addTool(asyncToolSpecification)
    .doOnSuccess(v -> logger.info("Tool registered"))
    .subscribe();

asyncServer.addResource(asyncResourceSpecification)
    .doOnSuccess(v -> logger.info("Resource registered"))
    .subscribe();

asyncServer.addPrompt(asyncPromptSpecification)
    .doOnSuccess(v -> logger.info("Prompt registered"))
    .subscribe();

// Close the server when done
asyncServer.close()
    .doOnSuccess(v -> logger.info("Server closed"))
    .subscribe();
```
  </Tab>
</Tabs>


## Server Transport Providers

The transport layer in the MCP SDK is responsible for handling the communication between clients and servers. 
It provides different implementations to support various communication protocols and patterns. 
The SDK includes several built-in transport provider implementations:

<Tabs>
  
  <Tab title="STDIO">
    <>
      Create in-process based transport:

      ```java
      StdioServerTransportProvider transportProvider = new StdioServerTransportProvider(new ObjectMapper());
      ```

      Provides bidirectional JSON-RPC message handling over standard input/output streams with non-blocking message processing, serialization/deserialization, and graceful shutdown support.

      Key features:
      <ul>
        <li>Bidirectional communication through stdin/stdout</li>
        <li>Process-based integration support</li>
        <li>Simple setup and configuration</li>
        <li>Lightweight implementation</li>
      </ul>
    </>
  </Tab>

<Tab title="SSE (WebFlux)">
  <>
    <p>Creates WebFlux-based SSE server transport.<br />Requires the <code>mcp-spring-webflux</code> dependency.</p>

    ```java
    @Configuration
    class McpConfig {
        @Bean
        WebFluxSseServerTransportProvider webFluxSseServerTransportProvider(ObjectMapper mapper) {
            return new WebFluxSseServerTransportProvider(mapper, "/mcp/message");
        }

        @Bean
        RouterFunction<?> mcpRouterFunction(WebFluxSseServerTransportProvider transportProvider) {
            return transportProvider.getRouterFunction();
        }
    }
    ```

    <p>Implements the MCP HTTP with SSE transport specification, providing:</p>
    <ul>
      <li>Reactive HTTP streaming with WebFlux</li>
      <li>Concurrent client connections through SSE endpoints</li>
      <li>Message routing and session management</li>
      <li>Graceful shutdown capabilities</li>
    </ul>
  </>
</Tab>


<Tab title="SSE (WebMvc)">
  <>
    <p>Creates WebMvc-based SSE server transport.<br />Requires the <code>mcp-spring-webmvc</code> dependency.</p>

    ```java
    @Configuration
    @EnableWebMvc
    class McpConfig {
        @Bean
        WebMvcSseServerTransportProvider webMvcSseServerTransportProvider(ObjectMapper mapper) {
            return new WebMvcSseServerTransportProvider(mapper, "/mcp/message");
        }

        @Bean
        RouterFunction<ServerResponse> mcpRouterFunction(WebMvcSseServerTransportProvider transportProvider) {
            return transportProvider.getRouterFunction();
        }
    }
    ```

    <p>Implements the MCP HTTP with SSE transport specification, providing:</p>
    <ul>
      <li>Server-side event streaming</li>
      <li>Integration with Spring WebMVC</li>
      <li>Support for traditional web applications</li>
      <li>Synchronous operation handling</li>
    </ul>
  </>
</Tab>


<Tab title="SSE (Servlet)">
  <>
    <p>
      Creates a Servlet-based SSE server transport. It is included in the core <code>mcp</code> module.<br />
      The <code>HttpServletSseServerTransport</code> can be used with any Servlet container.<br />
      To use it with a Spring Web application, you can register it as a Servlet bean:
    </p>

    ```java
    @Configuration
    @EnableWebMvc
    public class McpServerConfig implements WebMvcConfigurer {

        @Bean
        public HttpServletSseServerTransportProvider servletSseServerTransportProvider() {
            return new HttpServletSseServerTransportProvider(new ObjectMapper(), "/mcp/message");
        }

        @Bean
        public ServletRegistrationBean customServletBean(HttpServletSseServerTransportProvider transportProvider) {
            return new ServletRegistrationBean(transportProvider);
        }
    }
    ```

    <p>
      Implements the MCP HTTP with SSE transport specification using the traditional Servlet API, providing:
    </p>
    <ul>
      <li>Asynchronous message handling using Servlet 6.0 async support</li>
      <li>Session management for multiple client connections</li>
      <li>
        Two types of endpoints:
        <ul>
          <li>SSE endpoint (<code>/sse</code>) for server-to-client events</li>
          <li>Message endpoint (configurable) for client-to-server requests</li>
        </ul>
      </li>
      <li>Error handling and response formatting</li>
      <li>Graceful shutdown support</li>
    </ul>
  </>
</Tab>

</Tabs>


## Server Capabilities

The server can be configured with various capabilities:

```java
var capabilities = ServerCapabilities.builder()
    .resources(false, true)  // Resource support with list changes notifications
    .tools(true)            // Tool support with list changes notifications
    .prompts(true)          // Prompt support with list changes notifications
    .logging()              // Enable logging support (enabled by default with logging level INFO)
    .build();
```

### Logging Support

The server provides structured logging capabilities that allow sending log messages to clients with different severity levels:

```java
// Send a log message to clients
server.loggingNotification(LoggingMessageNotification.builder()
    .level(LoggingLevel.INFO)
    .logger("custom-logger")
    .data("Custom log message")
    .build());
```

Clients can control the minimum logging level they receive through the `mcpClient.setLoggingLevel(level)` request. Messages below the set level will be filtered out.
Supported logging levels (in order of increasing severity): DEBUG (0), INFO (1), NOTICE (2), WARNING (3), ERROR (4), CRITICAL (5), ALERT (6), EMERGENCY (7)

### Tool Specification

The Model Context Protocol allows servers to [expose tools](/specification/2024-11-05/server/tools/) that can be invoked by language models. 
The Java SDK allows implementing a Tool Specifications with their handler functions. 
Tools enable AI models to perform calculations, access external APIs, query databases, and manipulate files:

<Tabs>
  <Tab title="Sync">
```java
// Sync tool specification
var schema = """
            {
              "type" : "object",
              "id" : "urn:jsonschema:Operation",
              "properties" : {
                "operation" : {
                  "type" : "string"
                },
                "a" : {
                  "type" : "number"
                },
                "b" : {
                  "type" : "number"
                }
              }
            }
            """;
var syncToolSpecification = new McpServerFeatures.SyncToolSpecification(
    new Tool("calculator", "Basic calculator", schema),
    (exchange, arguments) -> {
        // Tool implementation
        return new CallToolResult(result, false);
    }
);
```
  </Tab>

  <Tab title="Async">
```java
// Async tool specification
var schema = """
            {
              "type" : "object",
              "id" : "urn:jsonschema:Operation",
              "properties" : {
                "operation" : {
                  "type" : "string"
                },
                "a" : {
                  "type" : "number"
                },
                "b" : {
                  "type" : "number"
                }
              }
            }
            """;
var asyncToolSpecification = new McpServerFeatures.AsyncToolSpecification(
    new Tool("calculator", "Basic calculator", schema),
    (exchange, arguments) -> {
        // Tool implementation
        return Mono.just(new CallToolResult(result, false));
    }
);
```
  </Tab>
</Tabs>

The Tool specification includes a Tool definition with `name`, `description`, and `parameter schema` followed by a call handler that implements the tool's logic. 
The function's first argument is `McpAsyncServerExchange` for client interaction, and the second is a map of tool arguments.

### Resource Specification

Specification of a resource with its handler function. 
Resources provide context to AI models by exposing data such as: File contents, Database records, API responses, System information, Application state.
Example resource specification:

<Tabs>
  <Tab title="Sync">
```java
// Sync resource specification
var syncResourceSpecification = new McpServerFeatures.SyncResourceSpecification(
    new Resource("custom://resource", "name", "description", "mime-type", null),
    (exchange, request) -> {
        // Resource read implementation
        return new ReadResourceResult(contents);
    }
);
```
  </Tab>

  <Tab title="Async">
```java
// Async resource specification
var asyncResourceSpecification = new McpServerFeatures.AsyncResourceSpecification(
    new Resource("custom://resource", "name", "description", "mime-type", null),
    (exchange, request) -> {
        // Resource read implementation
        return Mono.just(new ReadResourceResult(contents));
    }
);
```
  </Tab>
</Tabs>

The resource specification comprised of resource definitions and resource read handler.
The resource definition including `name`, `description`, and `MIME type`.
The first argument of the function that handles resource read requests is an `McpAsyncServerExchange` upon which the server can
interact with the connected client. 
The second arguments is a `McpSchema.ReadResourceRequest`.

### Prompt Specification

As part of the [Prompting capabilities](/specification/2024-11-05/server/prompts/), MCP provides a standardized way for servers to expose prompt templates to clients. 
The Prompt Specification is a structured template for AI model interactions that enables consistent message formatting, parameter substitution, context injection, response formatting, and instruction templating.

<Tabs>
  <Tab title="Sync">
```java
// Sync prompt specification
var syncPromptSpecification = new McpServerFeatures.SyncPromptSpecification(
    new Prompt("greeting", "description", List.of(
        new PromptArgument("name", "description", true)
    )),
    (exchange, request) -> {
        // Prompt implementation
        return new GetPromptResult(description, messages);
    }
);
```
  </Tab>

  <Tab title="Async">
```java
// Async prompt specification
var asyncPromptSpecification = new McpServerFeatures.AsyncPromptSpecification(
    new Prompt("greeting", "description", List.of(
        new PromptArgument("name", "description", true)
    )),
    (exchange, request) -> {
        // Prompt implementation
        return Mono.just(new GetPromptResult(description, messages));
    }
);
```
  </Tab>
</Tabs>

The prompt definition includes name (identifier for the prompt), description (purpose of the prompt), and list of arguments (parameters for templating).
The handler function processes requests and returns formatted templates. 
The first argument is `McpAsyncServerExchange` for client interaction, and the second argument is a `GetPromptRequest` instance.

### Completion Specification

As part of the [Completion capabilities](/specification/2025-03-26/server/utilities/completion), MCP provides a provides a standardized way for servers to offer argument autocompletion suggestions for prompts and resource URIs.

<Tabs>
  <Tab title="Sync">
```java
// Sync completion specification
var syncCompletionSpecification = new McpServerFeatures.SyncCompletionSpecification(
			new McpSchema.PromptReference("code_review"), (exchange, request) -> {
        
        // completion implementation ...
        
        return new McpSchema.CompleteResult(
            new CompleteResult.CompleteCompletion(
              List.of("python", "pytorch", "pyside"), 
              10, // total
              false // hasMore
            ));
      }
);

// Create a sync server with completion capabilities
var mcpServer = McpServer.sync(mcpServerTransportProvider)
  .capabilities(ServerCapabilities.builder()
    .completions() // enable completions support
      // ...
    .build())
  // ...
  .completions(new McpServerFeatures.SyncCompletionSpecification( // register completion specification
      new McpSchema.PromptReference("code_review"), syncCompletionSpecification))
  .build();

```
  </Tab>

  <Tab title="Async">
```java
// Async prompt specification
var asyncCompletionSpecification = new McpServerFeatures.AsyncCompletionSpecification(
			new McpSchema.PromptReference("code_review"), (exchange, request) -> {

        // completion implementation ...

        return Mono.just(new McpSchema.CompleteResult(
            new CompleteResult.CompleteCompletion(
              List.of("python", "pytorch", "pyside"), 
              10, // total
              false // hasMore
            )));
      }
);

// Create a async server with completion capabilities
var mcpServer = McpServer.async(mcpServerTransportProvider)
  .capabilities(ServerCapabilities.builder()
    .completions() // enable completions support
      // ...
    .build())
  // ...
  .completions(new McpServerFeatures.AsyncCompletionSpecification( // register completion specification
      new McpSchema.PromptReference("code_review"), asyncCompletionSpecification))
  .build();

```
  </Tab>
</Tabs>

The `McpSchema.CompletionReference` definition defines the type (`PromptRefernce` or `ResourceRefernce`) and the identifier for the completion specification (e.g handler).
The handler function processes requests and returns the complition response. 
The first argument is `McpAsyncServerExchange` for client interaction, and the second argument is a `CompleteRequest` instance.


Check the [using completion](/sdk/java/mcp-client#using-completion) to learn how to use the completion capabilities on the client side.


### Using Sampling from a Server

To use [Sampling capabilities](/specification/2024-11-05/client/sampling/), connect to a client that supports sampling. 
No special server configuration is needed, but verify client sampling support before making requests.
Learn about [client sampling support](./mcp-client#sampling-support).

Once connected to a compatible client, the server can request language model generations:

<Tabs>
  <Tab title="Sync API">
```java
// Create a server
McpSyncServer server = McpServer.sync(transportProvider)
    .serverInfo("my-server", "1.0.0")
    .build();

// Define a tool that uses sampling
var calculatorTool = new McpServerFeatures.SyncToolSpecification(
    new Tool("ai-calculator", "Performs calculations using AI", schema),
    (exchange, arguments) -> {
        // Check if client supports sampling
        if (exchange.getClientCapabilities().sampling() == null) {
            return new CallToolResult("Client does not support AI capabilities", false);
        }
        
        // Create a sampling request
        McpSchema.CreateMessageRequest request = McpSchema.CreateMessageRequest.builder()
            .messages(List.of(new McpSchema.SamplingMessage(McpSchema.Role.USER,
                new McpSchema.TextContent("Calculate: " + arguments.get("expression")))
            .modelPreferences(McpSchema.ModelPreferences.builder()
                .hints(List.of(
                    McpSchema.ModelHint.of("claude-3-sonnet"),
                    McpSchema.ModelHint.of("claude")
                ))
                .intelligencePriority(0.8)  // Prioritize intelligence
                .speedPriority(0.5)         // Moderate speed importance
                .build())
            .systemPrompt("You are a helpful calculator assistant. Provide only the numerical answer.")
            .maxTokens(100)
            .build();
        
        // Request sampling from the client
        McpSchema.CreateMessageResult result = exchange.createMessage(request);
        
        // Process the result
        String answer = result.content().text();
        return new CallToolResult(answer, false);
    }
);

// Add the tool to the server
server.addTool(calculatorTool);
```
  </Tab>

  <Tab title="Async API">
```java
// Create a server
McpAsyncServer server = McpServer.async(transportProvider)
    .serverInfo("my-server", "1.0.0")
    .build();

// Define a tool that uses sampling
var calculatorTool = new McpServerFeatures.AsyncToolSpecification(
    new Tool("ai-calculator", "Performs calculations using AI", schema),
    (exchange, arguments) -> {
        // Check if client supports sampling
        if (exchange.getClientCapabilities().sampling() == null) {
            return Mono.just(new CallToolResult("Client does not support AI capabilities", false));
        }
        
        // Create a sampling request
        McpSchema.CreateMessageRequest request = McpSchema.CreateMessageRequest.builder()
            .content(new McpSchema.TextContent("Calculate: " + arguments.get("expression")))
            .modelPreferences(McpSchema.ModelPreferences.builder()
                .hints(List.of(
                    McpSchema.ModelHint.of("claude-3-sonnet"),
                    McpSchema.ModelHint.of("claude")
                ))
                .intelligencePriority(0.8)  // Prioritize intelligence
                .speedPriority(0.5)         // Moderate speed importance
                .build())
            .systemPrompt("You are a helpful calculator assistant. Provide only the numerical answer.")
            .maxTokens(100)
            .build();
        
        // Request sampling from the client
        return exchange.createMessage(request)
            .map(result -> {
                // Process the result
                String answer = result.content().text();
                return new CallToolResult(answer, false);
            });
    }
);

// Add the tool to the server
server.addTool(calculatorTool)
    .subscribe();
```
  </Tab>
</Tabs>

The `CreateMessageRequest` object allows you to specify: `Content` - the input text or image for the model, 
`Model Preferences` - hints and priorities for model selection, `System Prompt` - instructions for the model's behavior and 
`Max Tokens` - maximum length of the generated response.

### Logging Support

The server provides structured logging capabilities that allow sending log messages to clients with different severity levels. The
 log notifications can only be sent from within an existing client session, such as tools, resources, and prompts calls.

For example, we can send a log message from within a tool handler function. 
On the client side, you can register a logging consumer to receive log messages from the server and set the minimum logging level to filter messages.

```java	
var mcpClient = McpClient.sync(transport)
        .loggingConsumer(notification -> {
            System.out.println("Received log message: " + notification.data());
        })
        .build();

mcpClient.initialize();

mcpClient.setLoggingLevel(McpSchema.LoggingLevel.INFO);

// Call the tool that sends logging notifications
CallToolResult result = mcpClient.callTool(new McpSchema.CallToolRequest("logging-test", Map.of()));
```

The server can send log messages using the `McpAsyncServerExchange`/`McpSyncServerExchange` object in the tool/resource/prompt handler function:

```java
var tool = new McpServerFeatures.AsyncToolSpecification(
    new McpSchema.Tool("logging-test", "Test logging notifications", emptyJsonSchema),
    (exchange, request) -> {  

      exchange.loggingNotification( // Use the exchange to send log messages
          McpSchema.LoggingMessageNotification.builder()
            .level(McpSchema.LoggingLevel.DEBUG)
            .logger("test-logger")
            .data("Debug message")
            .build())
        .block();

      return Mono.just(new CallToolResult("Logging test completed", false));
    });

var mcpServer = McpServer.async(mcpServerTransportProvider)
  .serverInfo("test-server", "1.0.0")
  .capabilities(
    ServerCapabilities.builder()
      .logging() // Enable logging support
      .tools(true)
      .build())
  .tools(tool)
  .build();
```

Clients can control the minimum logging level they receive through the `mcpClient.setLoggingLevel(level)` request. Messages below the set level will be filtered out.
Supported logging levels (in order of increasing severity): DEBUG (0), INFO (1), NOTICE (2), WARNING (3), ERROR (4), CRITICAL (5), ALERT (6), EMERGENCY (7)

## Error Handling

The SDK provides comprehensive error handling through the McpError class, covering protocol compatibility, transport communication, JSON-RPC messaging, tool execution, resource management, prompt handling, timeouts, and connection issues. This unified error handling approach ensures consistent and reliable error management across both synchronous and asynchronous operations.


---
modelcontextprotocol/docs/snippets/snippet-intro.mdx
---
One of the core principles of software development is DRY (Don't Repeat
Yourself). This is a principle that apply to documentation as
well. If you find yourself repeating the same content in multiple places, you
should consider creating a custom snippet to keep your content in sync.


---
modelcontextprotocol/docs/specification/contributing.mdx
---
---
title: "Contributions"
weight: 20
cascade:
  type: docs
breadcrumbs: false
---

We welcome contributions from the community! Please review our
[contributing guidelines](https://github.com/modelcontextprotocol/specification/blob/main/CONTRIBUTING.md)
for details on how to submit changes.

All contributors must adhere to our
[Code of Conduct](https://github.com/modelcontextprotocol/specification/blob/main/CODE_OF_CONDUCT.md).

For questions and discussions, please use
[GitHub Discussions](https://github.com/modelcontextprotocol/specification/discussions).


---
modelcontextprotocol/docs/specification/versioning.mdx
---
---
title: Versioning
type: docs
weight: 10
---

The Model Context Protocol uses string-based version identifiers following the format
`YYYY-MM-DD`, to indicate the last date backwards incompatible changes were made.

<Info>The protocol version will _not_ be incremented when the
protocol is updated, as long as the changes maintain backwards compatibility. This allows
for incremental improvements while preserving interoperability.</Info>

## Revisions

Revisions may be marked as:

- **Draft**: in-progress specifications, not yet ready for consumption.
- **Current**: the current protocol version, which is ready for use and may continue to
  receive backwards compatible changes.
- **Final**: past, complete specifications that will not be changed.

The **current** protocol version is [**2025-03-26**](/specification/2025-03-26/).

## Negotiation

Version negotiation happens during
[initialization](/specification/2025-03-26/basic/lifecycle#initialization). Clients and
servers **MAY** support multiple protocol versions simultaneously, but they **MUST**
agree on a single version to use for the session.

The protocol provides appropriate error handling if version negotiation fails, allowing
clients to gracefully terminate connections when they cannot find a version compatible
with the server.


---
modelcontextprotocol/docs/specification/2024-11-05/index.mdx
---
---
title: Specification
---

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open protocol that
enables seamless integration between LLM applications and external data sources and
tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating
custom AI workflows, MCP provides a standardized way to connect LLMs with the context
they need.

This specification defines the authoritative protocol requirements, based on the
TypeScript schema in
[schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/2024-11-05/schema.ts).

For implementation guides and examples, visit
[modelcontextprotocol.io](https://modelcontextprotocol.io).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD
NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14)
[[RFC2119](https://datatracker.ietf.org/doc/html/rfc2119)]
[[RFC8174](https://datatracker.ietf.org/doc/html/rfc8174)] when, and only when, they
appear in all capitals, as shown here.

## Overview

MCP provides a standardized way for applications to:

- Share contextual information with language models
- Expose tools and capabilities to AI systems
- Build composable integrations and workflows

The protocol uses [JSON-RPC](https://www.jsonrpc.org/) 2.0 messages to establish
communication between:

- **Hosts**: LLM applications that initiate connections
- **Clients**: Connectors within the host application
- **Servers**: Services that provide context and capabilities

MCP takes some inspiration from the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/), which
standardizes how to add support for programming languages across a whole ecosystem of
development tools. In a similar way, MCP standardizes how to integrate additional context
and tools into the ecosystem of AI applications.

## Key Details

### Base Protocol

- [JSON-RPC](https://www.jsonrpc.org/) message format
- Stateful connections
- Server and client capability negotiation

### Features

Servers offer any of the following features to clients:

- **Resources**: Context and data, for the user or the AI model to use
- **Prompts**: Templated messages and workflows for users
- **Tools**: Functions for the AI model to execute

Clients may offer the following feature to servers:

- **Sampling**: Server-initiated agentic behaviors and recursive LLM interactions

### Additional Utilities

- Configuration
- Progress tracking
- Cancellation
- Error reporting
- Logging

## Security and Trust & Safety

The Model Context Protocol enables powerful capabilities through arbitrary data access
and code execution paths. With this power comes important security and trust
considerations that all implementors must carefully address.

### Key Principles

1. **User Consent and Control**

   - Users must explicitly consent to and understand all data access and operations
   - Users must retain control over what data is shared and what actions are taken
   - Implementors should provide clear UIs for reviewing and authorizing activities

2. **Data Privacy**

   - Hosts must obtain explicit user consent before exposing user data to servers
   - Hosts must not transmit resource data elsewhere without user consent
   - User data should be protected with appropriate access controls

3. **Tool Safety**

   - Tools represent arbitrary code execution and must be treated with appropriate
     caution
   - Hosts must obtain explicit user consent before invoking any tool
   - Users should understand what each tool does before authorizing its use

4. **LLM Sampling Controls**
   - Users must explicitly approve any LLM sampling requests
   - Users should control:
     - Whether sampling occurs at all
     - The actual prompt that will be sent
     - What results the server can see
   - The protocol intentionally limits server visibility into prompts

### Implementation Guidelines

While MCP itself cannot enforce these security principles at the protocol level,
implementors **SHOULD**:

1. Build robust consent and authorization flows into their applications
2. Provide clear documentation of security implications
3. Implement appropriate access controls and data protections
4. Follow security best practices in their integrations
5. Consider privacy implications in their feature designs

## Learn More

Explore the detailed specification for each protocol component:

<CardGroup cols={5}>
  <Card title="Architecture" icon="sitemap" href="architecture" />
  <Card title="Base Protocol" icon="code" href="basic" />
  <Card title="Server Features" icon="server" href="server" />
  <Card title="Client Features" icon="user" href="client" />
  <Card title="Contributing" icon="pencil" href="contributing" />
</CardGroup>


---
modelcontextprotocol/docs/specification/2024-11-05/architecture/index.mdx
---
---
title: Architecture
---

The Model Context Protocol (MCP) follows a client-host-server architecture where each
host can run multiple client instances. This architecture enables users to integrate AI
capabilities across applications while maintaining clear security boundaries and
isolating concerns. Built on JSON-RPC, MCP provides a stateful session protocol focused
on context exchange and sampling coordination between clients and servers.

## Core Components

```mermaid
graph LR
    subgraph "Application Host Process"
        H[Host]
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
        H --> C1
        H --> C2
        H --> C3
    end

    subgraph "Local machine"
        S1[Server 1<br>Files & Git]
        S2[Server 2<br>Database]
        R1[("Local<br>Resource A")]
        R2[("Local<br>Resource B")]

        C1 --> S1
        C2 --> S2
        S1 <--> R1
        S2 <--> R2
    end

    subgraph "Internet"
        S3[Server 3<br>External APIs]
        R3[("Remote<br>Resource C")]

        C3 --> S3
        S3 <--> R3
    end
```

### Host

The host process acts as the container and coordinator:

- Creates and manages multiple client instances
- Controls client connection permissions and lifecycle
- Enforces security policies and consent requirements
- Handles user authorization decisions
- Coordinates AI/LLM integration and sampling
- Manages context aggregation across clients

### Clients

Each client is created by the host and maintains an isolated server connection:

- Establishes one stateful session per server
- Handles protocol negotiation and capability exchange
- Routes protocol messages bidirectionally
- Manages subscriptions and notifications
- Maintains security boundaries between servers

A host application creates and manages multiple clients, with each client having a 1:1
relationship with a particular server.

### Servers

Servers provide specialized context and capabilities:

- Expose resources, tools and prompts via MCP primitives
- Operate independently with focused responsibilities
- Request sampling through client interfaces
- Must respect security constraints
- Can be local processes or remote services

## Design Principles

MCP is built on several key design principles that inform its architecture and
implementation:

1. **Servers should be extremely easy to build**

   - Host applications handle complex orchestration responsibilities
   - Servers focus on specific, well-defined capabilities
   - Simple interfaces minimize implementation overhead
   - Clear separation enables maintainable code

2. **Servers should be highly composable**

   - Each server provides focused functionality in isolation
   - Multiple servers can be combined seamlessly
   - Shared protocol enables interoperability
   - Modular design supports extensibility

3. **Servers should not be able to read the whole conversation, nor "see into" other
   servers**

   - Servers receive only necessary contextual information
   - Full conversation history stays with the host
   - Each server connection maintains isolation
   - Cross-server interactions are controlled by the host
   - Host process enforces security boundaries

4. **Features can be added to servers and clients progressively**
   - Core protocol provides minimal required functionality
   - Additional capabilities can be negotiated as needed
   - Servers and clients evolve independently
   - Protocol designed for future extensibility
   - Backwards compatibility is maintained

## Message Types

MCP defines three core message types based on
[JSON-RPC 2.0](https://www.jsonrpc.org/specification):

- **Requests**: Bidirectional messages with method and parameters expecting a response
- **Responses**: Successful results or errors matching specific request IDs
- **Notifications**: One-way messages requiring no response

Each message type follows the JSON-RPC 2.0 specification for structure and delivery
semantics.

## Capability Negotiation

The Model Context Protocol uses a capability-based negotiation system where clients and
servers explicitly declare their supported features during initialization. Capabilities
determine which protocol features and primitives are available during a session.

- Servers declare capabilities like resource subscriptions, tool support, and prompt
  templates
- Clients declare capabilities like sampling support and notification handling
- Both parties must respect declared capabilities throughout the session
- Additional capabilities can be negotiated through extensions to the protocol

```mermaid
sequenceDiagram
    participant Host
    participant Client
    participant Server

    Host->>+Client: Initialize client
    Client->>+Server: Initialize session with capabilities
    Server-->>Client: Respond with supported capabilities

    Note over Host,Server: Active Session with Negotiated Features

    loop Client Requests
        Host->>Client: User- or model-initiated action
        Client->>Server: Request (tools/resources)
        Server-->>Client: Response
        Client-->>Host: Update UI or respond to model
    end

    loop Server Requests
        Server->>Client: Request (sampling)
        Client->>Host: Forward to AI
        Host-->>Client: AI response
        Client-->>Server: Response
    end

    loop Notifications
        Server--)Client: Resource updates
        Client--)Server: Status changes
    end

    Host->>Client: Terminate
    Client->>-Server: End session
    deactivate Server
```

Each capability unlocks specific protocol features for use during the session. For
example:

- Implemented [server features](/specification/2024-11-05/server) must be
  advertised in the server's capabilities
- Emitting resource subscription notifications requires the server to declare
  subscription support
- Tool invocation requires the server to declare tool capabilities
- [Sampling](/specification/2024-11-05/client) requires the client to
  declare support in its capabilities

This capability negotiation ensures clients and servers have a clear understanding of
supported functionality while maintaining protocol extensibility.


---
modelcontextprotocol/docs/specification/2024-11-05/basic/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: 2024-11-05</Info>

All messages between MCP clients and servers **MUST** follow the
[JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification. The protocol defines
three fundamental types of messages:

| Type            | Description                            | Requirements                           |
| --------------- | -------------------------------------- | -------------------------------------- |
| `Requests`      | Messages sent to initiate an operation | Must include unique ID and method name |
| `Responses`     | Messages sent in reply to requests     | Must include same ID as request        |
| `Notifications` | One-way messages with no reply         | Must not include an ID                 |

**Responses** are further sub-categorized as either **successful results** or **errors**.
Results can follow any JSON object structure, while errors must include an error code and
message at minimum.

## Protocol Layers

The Model Context Protocol consists of several key components that work together:

- **Base Protocol**: Core JSON-RPC message types
- **Lifecycle Management**: Connection initialization, capability negotiation, and
  session control
- **Server Features**: Resources, prompts, and tools exposed by servers
- **Client Features**: Sampling and root directory lists provided by clients
- **Utilities**: Cross-cutting concerns like logging and argument completion

All implementations **MUST** support the base protocol and lifecycle management
components. Other components **MAY** be implemented based on the specific needs of the
application.

These protocol layers establish clear separation of concerns while enabling rich
interactions between clients and servers. The modular design allows implementations to
support exactly the features they need.

See the following pages for more details on the different components:

<CardGroup cols={3}>
  <Card title="Lifecycle" icon="arrows-rotate" href="/specification/2024-11-05/basic/lifecycle" />
  <Card title="Resources" icon="file-lines" href="/specification/2024-11-05/server/resources" />
  <Card title="Prompts" icon="message" href="/specification/2024-11-05/server/prompts" />
  <Card title="Tools" icon="wrench" href="/specification/2024-11-05/server/tools" />
  <Card title="Logging" icon="rectangle-list" href="/specification/2024-11-05/server/utilities/logging" />
  <Card title="Sampling" icon="code" href="/specification/2024-11-05/client/sampling" />
</CardGroup>

## Auth

Authentication and authorization are not currently part of the core MCP specification,
but we are considering ways to introduce them in future. Join us in
[GitHub Discussions](https://github.com/modelcontextprotocol/specification/discussions)
to help shape the future of the protocol!

Clients and servers **MAY** negotiate their own custom authentication and authorization
strategies.

## Schema

The full specification of the protocol is defined as a
[TypeScript schema](http://github.com/modelcontextprotocol/specification/tree/main/schema/2024-11-05/schema.ts).
This is the source of truth for all protocol messages and structures.

There is also a
[JSON Schema](http://github.com/modelcontextprotocol/specification/tree/main/schema/2024-11-05/schema.json),
which is automatically generated from the TypeScript source of truth, for use with
various automated tooling.


---
modelcontextprotocol/docs/specification/2024-11-05/basic/lifecycle.mdx
---
---
title: Lifecycle
type: docs
weight: 30
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) defines a rigorous lifecycle for client-server
connections that ensures proper capability negotiation and state management.

1. **Initialization**: Capability negotiation and protocol version agreement
2. **Operation**: Normal protocol communication
3. **Shutdown**: Graceful termination of the connection

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Initialization Phase
    activate Client
    Client->>+Server: initialize request
    Server-->>Client: initialize response
    Client--)Server: initialized notification

    Note over Client,Server: Operation Phase
    rect rgb(200, 220, 250)
        note over Client,Server: Normal protocol operations
    end

    Note over Client,Server: Shutdown
    Client--)-Server: Disconnect
    deactivate Server
    Note over Client,Server: Connection closed
```

## Lifecycle Phases

### Initialization

The initialization phase **MUST** be the first interaction between client and server.
During this phase, the client and server:

- Establish protocol version compatibility
- Exchange and negotiate capabilities
- Share implementation details

The client **MUST** initiate this phase by sending an `initialize` request containing:

- Protocol version supported
- Client capabilities
- Client implementation information

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  }
}
```

The server **MUST** respond with its own capabilities and information:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    }
  }
}
```

After successful initialization, the client **MUST** send an `initialized` notification
to indicate it is ready to begin normal operations:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

- The client **SHOULD NOT** send requests other than
  [pings](/specification/2024-11-05/basic/utilities/ping) before the server
  has responded to the `initialize` request.
- The server **SHOULD NOT** send requests other than
  [pings](/specification/2024-11-05/basic/utilities/ping) and
  [logging](/specification/2024-11-05/server/utilities/logging) before
  receiving the `initialized` notification.

#### Version Negotiation

In the `initialize` request, the client **MUST** send a protocol version it supports.
This **SHOULD** be the _latest_ version supported by the client.

If the server supports the requested protocol version, it **MUST** respond with the same
version. Otherwise, the server **MUST** respond with another protocol version it
supports. This **SHOULD** be the _latest_ version supported by the server.

If the client does not support the version in the server's response, it **SHOULD**
disconnect.

#### Capability Negotiation

Client and server capabilities establish which optional protocol features will be
available during the session.

Key capabilities include:

| Category | Capability     | Description                                                                                       |
| -------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Client   | `roots`        | Ability to provide filesystem [roots](/specification/2024-11-05/client/roots)       |
| Client   | `sampling`     | Support for LLM [sampling](/specification/2024-11-05/client/sampling) requests      |
| Client   | `experimental` | Describes support for non-standard experimental features                                          |
| Server   | `prompts`      | Offers [prompt templates](/specification/2024-11-05/server/prompts)                 |
| Server   | `resources`    | Provides readable [resources](/specification/2024-11-05/server/resources)           |
| Server   | `tools`        | Exposes callable [tools](/specification/2024-11-05/server/tools)                    |
| Server   | `logging`      | Emits structured [log messages](/specification/2024-11-05/server/utilities/logging) |
| Server   | `experimental` | Describes support for non-standard experimental features                                          |

Capability objects can describe sub-capabilities like:

- `listChanged`: Support for list change notifications (for prompts, resources, and
  tools)
- `subscribe`: Support for subscribing to individual items' changes (resources only)

### Operation

During the operation phase, the client and server exchange messages according to the
negotiated capabilities.

Both parties **SHOULD**:

- Respect the negotiated protocol version
- Only use capabilities that were successfully negotiated

### Shutdown

During the shutdown phase, one side (usually the client) cleanly terminates the protocol
connection. No specific shutdown messages are defined—instead, the underlying transport
mechanism should be used to signal connection termination:

#### stdio

For the stdio [transport](/specification/2024-11-05/basic/transports), the
client **SHOULD** initiate shutdown by:

1. First, closing the input stream to the child process (the server)
2. Waiting for the server to exit, or sending `SIGTERM` if the server does not exit
   within a reasonable time
3. Sending `SIGKILL` if the server does not exit within a reasonable time after `SIGTERM`

The server **MAY** initiate shutdown by closing its output stream to the client and
exiting.

#### HTTP

For HTTP [transports](/specification/2024-11-05/basic/transports), shutdown
is indicated by closing the associated HTTP connection(s).

## Error Handling

Implementations **SHOULD** be prepared to handle these error cases:

- Protocol version mismatch
- Failure to negotiate required capabilities
- Initialize request timeout
- Shutdown timeout

Implementations **SHOULD** implement appropriate timeouts for all requests, to prevent
hung connections and resource exhaustion.

Example initialization error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2024-11-05"],
      "requested": "1.0.0"
    }
  }
}
```


---
modelcontextprotocol/docs/specification/2024-11-05/basic/messages.mdx
---
---
title: Messages
type: docs
weight: 20
---

<Info>**Protocol Revision**: 2024-11-05</Info>

All messages in MCP **MUST** follow the
[JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification. The protocol defines
three types of messages:

## Requests

Requests are sent from the client to the server or vice versa.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Requests **MUST** include a string or integer ID.
- Unlike base JSON-RPC, the ID **MUST NOT** be `null`.
- The request ID **MUST NOT** have been previously used by the requestor within the same
  session.

## Responses

Responses are sent in reply to requests.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  result?: {
    [key: string]: unknown;
  }
  error?: {
    code: number;
    message: string;
    data?: unknown;
  }
}
```

- Responses **MUST** include the same ID as the request they correspond to.
- Either a `result` or an `error` **MUST** be set. A response **MUST NOT** set both.
- Error codes **MUST** be integers.

## Notifications

Notifications are sent from the client to the server or vice versa. They do not expect a
response.

```typescript
{
  jsonrpc: "2.0";
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Notifications **MUST NOT** include an ID.


---
modelcontextprotocol/docs/specification/2024-11-05/basic/transports.mdx
---
---
title: Transports
type: docs
weight: 40
---

<Info>**Protocol Revision**: 2024-11-05</Info>

MCP currently defines two standard transport mechanisms for client-server communication:

1. [stdio](#stdio), communication over standard in and standard out
2. [HTTP with Server-Sent Events](#http-with-sse) (SSE)

Clients **SHOULD** support stdio whenever possible.

It is also possible for clients and servers to implement
[custom transports](#custom-transports) in a pluggable fashion.

## stdio

In the **stdio** transport:

- The client launches the MCP server as a subprocess.
- The server receives JSON-RPC messages on its standard input (`stdin`) and writes
  responses to its standard output (`stdout`).
- Messages are delimited by newlines, and **MUST NOT** contain embedded newlines.
- The server **MAY** write UTF-8 strings to its standard error (`stderr`) for logging
  purposes. Clients **MAY** capture, forward, or ignore this logging.
- The server **MUST NOT** write anything to its `stdout` that is not a valid MCP message.
- The client **MUST NOT** write anything to the server's `stdin` that is not a valid MCP
  message.

```mermaid
sequenceDiagram
    participant Client
    participant Server Process

    Client->>+Server Process: Launch subprocess
    loop Message Exchange
        Client->>Server Process: Write to stdin
        Server Process->>Client: Write to stdout
        Server Process--)Client: Optional logs on stderr
    end
    Client->>Server Process: Close stdin, terminate subprocess
    deactivate Server Process
```

## HTTP with SSE

In the **SSE** transport, the server operates as an independent process that can handle
multiple client connections.

#### Security Warning

When implementing HTTP with SSE transport:

1. Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks
2. When running locally, servers **SHOULD** bind only to localhost (127.0.0.1) rather than all network interfaces (0.0.0.0)
3. Servers **SHOULD** implement proper authentication for all connections

Without these protections, attackers could use DNS rebinding to interact with local MCP servers from remote websites.

The server **MUST** provide two endpoints:

1. An SSE endpoint, for clients to establish a connection and receive messages from the
   server
2. A regular HTTP POST endpoint for clients to send messages to the server

When a client connects, the server **MUST** send an `endpoint` event containing a URI for
the client to use for sending messages. All subsequent client messages **MUST** be sent
as HTTP POST requests to this endpoint.

Server messages are sent as SSE `message` events, with the message content encoded as
JSON in the event data.

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: Open SSE connection
    Server->>Client: endpoint event
    loop Message Exchange
        Client->>Server: HTTP POST messages
        Server->>Client: SSE message events
    end
    Client->>Server: Close SSE connection
```

## Custom Transports

Clients and servers **MAY** implement additional custom transport mechanisms to suit
their specific needs. The protocol is transport-agnostic and can be implemented over any
communication channel that supports bidirectional message exchange.

Implementers who choose to support custom transports **MUST** ensure they preserve the
JSON-RPC message format and lifecycle requirements defined by MCP. Custom transports
**SHOULD** document their specific connection establishment and message exchange patterns
to aid interoperability.


---
modelcontextprotocol/docs/specification/2024-11-05/basic/utilities/cancellation.mdx
---
---
title: Cancellation
weight: 10
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) supports optional cancellation of in-progress requests
through notification messages. Either side can send a cancellation notification to
indicate that a previously-issued request should be terminated.

## Cancellation Flow

When a party wants to cancel an in-progress request, it sends a `notifications/cancelled`
notification containing:

- The ID of the request to cancel
- An optional reason string that can be logged or displayed

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "123",
    "reason": "User requested cancellation"
  }
}
```

## Behavior Requirements

1. Cancellation notifications **MUST** only reference requests that:
   - Were previously issued in the same direction
   - Are believed to still be in-progress
2. The `initialize` request **MUST NOT** be cancelled by clients
3. Receivers of cancellation notifications **SHOULD**:
   - Stop processing the cancelled request
   - Free associated resources
   - Not send a response for the cancelled request
4. Receivers **MAY** ignore cancellation notifications if:
   - The referenced request is unknown
   - Processing has already completed
   - The request cannot be cancelled
5. The sender of the cancellation notification **SHOULD** ignore any response to the
   request that arrives afterward

## Timing Considerations

Due to network latency, cancellation notifications may arrive after request processing
has completed, and potentially after a response has already been sent.

Both parties **MUST** handle these race conditions gracefully:

```mermaid
sequenceDiagram
   participant Client
   participant Server

   Client->>Server: Request (ID: 123)
   Note over Server: Processing starts
   Client--)Server: notifications/cancelled (ID: 123)
   alt
      Note over Server: Processing may have<br/>completed before<br/>cancellation arrives
   else If not completed
      Note over Server: Stop processing
   end
```

## Implementation Notes

- Both parties **SHOULD** log cancellation reasons for debugging
- Application UIs **SHOULD** indicate when cancellation is requested

## Error Handling

Invalid cancellation notifications **SHOULD** be ignored:

- Unknown request IDs
- Already completed requests
- Malformed notifications

This maintains the "fire and forget" nature of notifications while allowing for race
conditions in asynchronous communication.


---
modelcontextprotocol/docs/specification/2024-11-05/basic/utilities/ping.mdx
---
---
title: Ping
weight: 5
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol includes an optional ping mechanism that allows either party
to verify that their counterpart is still responsive and the connection is alive.

## Overview

The ping functionality is implemented through a simple request/response pattern. Either
the client or server can initiate a ping by sending a `ping` request.

## Message Format

A ping request is a standard JSON-RPC request with no parameters:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "ping"
}
```

## Behavior Requirements

1. The receiver **MUST** respond promptly with an empty response:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {}
}
```

2. If no response is received within a reasonable timeout period, the sender **MAY**:
   - Consider the connection stale
   - Terminate the connection
   - Attempt reconnection procedures

## Usage Patterns

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Sender->>Receiver: ping request
    Receiver->>Sender: empty response
```

## Implementation Considerations

- Implementations **SHOULD** periodically issue pings to detect connection health
- The frequency of pings **SHOULD** be configurable
- Timeouts **SHOULD** be appropriate for the network environment
- Excessive pinging **SHOULD** be avoided to reduce network overhead

## Error Handling

- Timeouts **SHOULD** be treated as connection failures
- Multiple failed pings **MAY** trigger connection reset
- Implementations **SHOULD** log ping failures for diagnostics


---
modelcontextprotocol/docs/specification/2024-11-05/basic/utilities/progress.mdx
---
---
title: Progress
weight: 30
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) supports optional progress tracking for long-running
operations through notification messages. Either side can send progress notifications to
provide updates about operation status.

## Progress Flow

When a party wants to _receive_ progress updates for a request, it includes a
`progressToken` in the request metadata.

- Progress tokens **MUST** be a string or integer value
- Progress tokens can be chosen by the sender using any means, but **MUST** be unique
  across all active requests.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "some_method",
  "params": {
    "_meta": {
      "progressToken": "abc123"
    }
  }
}
```

The receiver **MAY** then send progress notifications containing:

- The original progress token
- The current progress value so far
- An optional "total" value

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100
  }
}
```

- The `progress` value **MUST** increase with each notification, even if the total is
  unknown.
- The `progress` and the `total` values **MAY** be floating point.

## Behavior Requirements

1. Progress notifications **MUST** only reference tokens that:

   - Were provided in an active request
   - Are associated with an in-progress operation

2. Receivers of progress requests **MAY**:
   - Choose not to send any progress notifications
   - Send notifications at whatever frequency they deem appropriate
   - Omit the total value if unknown

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Note over Sender,Receiver: Request with progress token
    Sender->>Receiver: Method request with progressToken

    Note over Sender,Receiver: Progress updates
    loop Progress Updates
        Receiver-->>Sender: Progress notification (0.2/1.0)
        Receiver-->>Sender: Progress notification (0.6/1.0)
        Receiver-->>Sender: Progress notification (1.0/1.0)
    end

    Note over Sender,Receiver: Operation complete
    Receiver->>Sender: Method response
```

## Implementation Notes

- Senders and receivers **SHOULD** track active progress tokens
- Both parties **SHOULD** implement rate limiting to prevent flooding
- Progress notifications **MUST** stop after completion


---
modelcontextprotocol/docs/specification/2024-11-05/client/roots.mdx
---
---
title: Roots
type: docs
weight: 40
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for clients to expose
filesystem "roots" to servers. Roots define the boundaries of where servers can operate
within the filesystem, allowing them to understand which directories and files they have
access to. Servers can request the list of roots from supporting clients and receive
notifications when that list changes.

## User Interaction Model

Roots in MCP are typically exposed through workspace or project configuration interfaces.

For example, implementations could offer a workspace/project picker that allows users to
select directories and files the server should have access to. This can be combined with
automatic workspace detection from version control systems or project files.

However, implementations are free to expose roots through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Clients that support roots **MUST** declare the `roots` capability during
[initialization](/specification/2024-11-05/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "roots": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the client will emit notifications when the list of roots
changes.

## Protocol Messages

### Listing Roots

To retrieve roots, servers send a `roots/list` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "roots/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "roots": [
      {
        "uri": "file:///home/user/projects/myproject",
        "name": "My Project"
      }
    ]
  }
}
```

### Root List Changes

When roots change, clients that support `listChanged` **MUST** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/roots/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client

    Note over Server,Client: Discovery
    Server->>Client: roots/list
    Client-->>Server: Available roots

    Note over Server,Client: Changes
    Client--)Server: notifications/roots/list_changed
    Server->>Client: roots/list
    Client-->>Server: Updated roots
```

## Data Types

### Root

A root definition includes:

- `uri`: Unique identifier for the root. This **MUST** be a `file://` URI in the current
  specification.
- `name`: Optional human-readable name for display purposes.

Example roots for different use cases:

#### Project Directory

```json
{
  "uri": "file:///home/user/projects/myproject",
  "name": "My Project"
}
```

#### Multiple Repositories

```json
[
  {
    "uri": "file:///home/user/repos/frontend",
    "name": "Frontend Repository"
  },
  {
    "uri": "file:///home/user/repos/backend",
    "name": "Backend Repository"
  }
]
```

## Error Handling

Clients **SHOULD** return standard JSON-RPC errors for common failure cases:

- Client does not support roots: `-32601` (Method not found)
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Roots not supported",
    "data": {
      "reason": "Client does not have roots capability"
    }
  }
}
```

## Security Considerations

1. Clients **MUST**:

   - Only expose roots with appropriate permissions
   - Validate all root URIs to prevent path traversal
   - Implement proper access controls
   - Monitor root accessibility

2. Servers **SHOULD**:
   - Handle cases where roots become unavailable
   - Respect root boundaries during operations
   - Validate all paths against provided roots

## Implementation Guidelines

1. Clients **SHOULD**:

   - Prompt users for consent before exposing roots to servers
   - Provide clear user interfaces for root management
   - Validate root accessibility before exposing
   - Monitor for root changes

2. Servers **SHOULD**:
   - Check for roots capability before usage
   - Handle root list changes gracefully
   - Respect root boundaries in operations
   - Cache root information appropriately


---
modelcontextprotocol/docs/specification/2024-11-05/client/sampling.mdx
---
---
title: Sampling
type: docs
weight: 40
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to request LLM
sampling ("completions" or "generations") from language models via clients. This flow
allows clients to maintain control over model access, selection, and permissions while
enabling servers to leverage AI capabilities&mdash;with no server API keys necessary.
Servers can request text or image-based interactions and optionally include context from
MCP servers in their prompts.

## User Interaction Model

Sampling in MCP allows servers to implement agentic behaviors, by enabling LLM calls to
occur _nested_ inside other MCP server features.

Implementations are free to expose sampling through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny sampling requests.

Applications **SHOULD**:

- Provide UI that makes it easy and intuitive to review sampling requests
- Allow users to view and edit prompts before sending
- Present generated responses for review before delivery
</Warning>

## Capabilities

Clients that support sampling **MUST** declare the `sampling` capability during
[initialization](/specification/2024-11-05/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "sampling": {}
  }
}
```

## Protocol Messages

### Creating Messages

To request a language model generation, servers send a `sampling/createMessage` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "What is the capital of France?"
        }
      }
    ],
    "modelPreferences": {
      "hints": [
        {
          "name": "claude-3-sonnet"
        }
      ],
      "intelligencePriority": 0.8,
      "speedPriority": 0.5
    },
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 100
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "content": {
      "type": "text",
      "text": "The capital of France is Paris."
    },
    "model": "claude-3-sonnet-20240307",
    "stopReason": "endTurn"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client
    participant User
    participant LLM

    Note over Server,Client: Server initiates sampling
    Server->>Client: sampling/createMessage

    Note over Client,User: Human-in-the-loop review
    Client->>User: Present request for approval
    User-->>Client: Review and approve/modify

    Note over Client,LLM: Model interaction
    Client->>LLM: Forward approved request
    LLM-->>Client: Return generation

    Note over Client,User: Response review
    Client->>User: Present response for approval
    User-->>Client: Review and approve/modify

    Note over Server,Client: Complete request
    Client-->>Server: Return approved response
```

## Data Types

### Messages

Sampling messages can contain:

#### Text Content

```json
{
  "type": "text",
  "text": "The message content"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/jpeg"
}
```

### Model Preferences

Model selection in MCP requires careful abstraction since servers and clients may use
different AI providers with distinct model offerings. A server cannot simply request a
specific model by name since the client may not have access to that exact model or may
prefer to use a different provider's equivalent model.

To solve this, MCP implements a preference system that combines abstract capability
priorities with optional model hints:

#### Capability Priorities

Servers express their needs through three normalized priority values (0-1):

- `costPriority`: How important is minimizing costs? Higher values prefer cheaper models.
- `speedPriority`: How important is low latency? Higher values prefer faster models.
- `intelligencePriority`: How important are advanced capabilities? Higher values prefer
  more capable models.

#### Model Hints

While priorities help select models based on characteristics, `hints` allow servers to
suggest specific models or model families:

- Hints are treated as substrings that can match model names flexibly
- Multiple hints are evaluated in order of preference
- Clients **MAY** map hints to equivalent models from different providers
- Hints are advisory&mdash;clients make final model selection

For example:

```json
{
  "hints": [
    { "name": "claude-3-sonnet" }, // Prefer Sonnet-class models
    { "name": "claude" } // Fall back to any Claude model
  ],
  "costPriority": 0.3, // Cost is less important
  "speedPriority": 0.8, // Speed is very important
  "intelligencePriority": 0.5 // Moderate capability needs
}
```

The client processes these preferences to select an appropriate model from its available
options. For instance, if the client doesn't have access to Claude models but has Gemini,
it might map the sonnet hint to `gemini-1.5-pro` based on similar capabilities.

## Error Handling

Clients **SHOULD** return errors for common failure cases:

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -1,
    "message": "User rejected sampling request"
  }
}
```

## Security Considerations

1. Clients **SHOULD** implement user approval controls
2. Both parties **SHOULD** validate message content
3. Clients **SHOULD** respect model preference hints
4. Clients **SHOULD** implement rate limiting
5. Both parties **MUST** handle sensitive data appropriately


---
modelcontextprotocol/docs/specification/2024-11-05/server/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: 2024-11-05</Info>

Servers provide the fundamental building blocks for adding context to language models via
MCP. These primitives enable rich interactions between clients, servers, and language
models:

- **Prompts**: Pre-defined templates or instructions that guide language model
  interactions
- **Resources**: Structured data or content that provides additional context to the model
- **Tools**: Executable functions that allow models to perform actions or retrieve
  information

Each primitive can be summarized in the following control hierarchy:

| Primitive | Control                | Description                                        | Example                         |
| --------- | ---------------------- | -------------------------------------------------- | ------------------------------- |
| Prompts   | User-controlled        | Interactive templates invoked by user choice       | Slash commands, menu options    |
| Resources | Application-controlled | Contextual data attached and managed by the client | File contents, git history      |
| Tools     | Model-controlled       | Functions exposed to the LLM to take actions       | API POST requests, file writing |

Explore these key primitives in more detail below:

<CardGroup cols={3}>
  <Card title="Prompts" icon="message" href="prompts" />
  <Card title="Resources" icon="file-lines" href="resources" />
  <Card title="Tools" icon="wrench" href="tools" />
</CardGroup>


---
modelcontextprotocol/docs/specification/2024-11-05/server/prompts.mdx
---
---
title: Prompts
weight: 10
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose prompt
templates to clients. Prompts allow servers to provide structured messages and
instructions for interacting with language models. Clients can discover available
prompts, retrieve their contents, and provide arguments to customize them.

## User Interaction Model

Prompts are designed to be **user-controlled**, meaning they are exposed from servers to
clients with the intention of the user being able to explicitly select them for use.

Typically, prompts would be triggered through user-initiated commands in the user
interface, which allows users to naturally discover and invoke available prompts.

For example, as slash commands:

![Example of prompt exposed as slash command](slash-command.png)

However, implementors are free to expose prompts through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

## Capabilities

Servers that support prompts **MUST** declare the `prompts` capability during
[initialization](/specification/2024-11-05/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available prompts changes.

## Protocol Messages

### Listing Prompts

To retrieve available prompts, clients send a `prompts/list` request. This operation
supports
[pagination](/specification/2024-11-05/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "description": "Asks the LLM to analyze code quality and suggest improvements",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Getting a Prompt

To retrieve a specific prompt, clients send a `prompts/get` request. Arguments may be
auto-completed through [the completion API](/specification/2024-11-05/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n    print('world')"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n    print('world')"
        }
      }
    ]
  }
}
```

### List Changed Notification

When the list of available prompts changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: prompts/list
    Server-->>Client: List of prompts

    Note over Client,Server: Usage
    Client->>Server: prompts/get
    Server-->>Client: Prompt content

    opt listChanged
      Note over Client,Server: Changes
      Server--)Client: prompts/list_changed
      Client->>Server: prompts/list
      Server-->>Client: Updated prompts
    end
```

## Data Types

### Prompt

A prompt definition includes:

- `name`: Unique identifier for the prompt
- `description`: Optional human-readable description
- `arguments`: Optional list of arguments for customization

### PromptMessage

Messages in a prompt can contain:

- `role`: Either "user" or "assistant" to indicate the speaker
- `content`: One of the following content types:

#### Text Content

Text content represents plain text messages:

```json
{
  "type": "text",
  "text": "The text content of the message"
}
```

This is the most common content type used for natural language interactions.

#### Image Content

Image content allows including visual information in messages:

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/png"
}
```

The image data **MUST** be base64-encoded and include a valid MIME type. This enables
multi-modal interactions where visual context is important.

#### Embedded Resources

Embedded resources allow referencing server-side resources directly in messages:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

Resources can contain either text or binary (blob) data and **MUST** include:

- A valid resource URI
- The appropriate MIME type
- Either text content or base64-encoded blob data

Embedded resources enable prompts to seamlessly incorporate server-managed content like
documentation, code samples, or other reference materials directly into the conversation
flow.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid prompt name: `-32602` (Invalid params)
- Missing required arguments: `-32602` (Invalid params)
- Internal errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD** validate prompt arguments before processing
2. Clients **SHOULD** handle pagination for large prompt lists
3. Both parties **SHOULD** respect capability negotiation

## Security

Implementations **MUST** carefully validate all prompt inputs and outputs to prevent
injection attacks or unauthorized access to resources.


---
modelcontextprotocol/docs/specification/2024-11-05/server/resources.mdx
---
---
title: Resources
type: docs
weight: 20
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose
resources to clients. Resources allow servers to share data that provides context to
language models, such as files, database schemas, or application-specific information.
Each resource is uniquely identified by a
[URI](https://datatracker.ietf.org/doc/html/rfc3986).

## User Interaction Model

Resources in MCP are designed to be **application-driven**, with host applications
determining how to incorporate context based on their needs.

For example, applications could:

- Expose resources through UI elements for explicit selection, in a tree or list view
- Allow the user to search through and filter available resources
- Implement automatic context inclusion, based on heuristics or the AI model's selection

![Example of resource context picker](resource-picker.png)

However, implementations are free to expose resources through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Servers that support resources **MUST** declare the `resources` capability:

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

The capability supports two optional features:

- `subscribe`: whether the client can subscribe to be notified of changes to individual
  resources.
- `listChanged`: whether the server will emit notifications when the list of available
  resources changes.

Both `subscribe` and `listChanged` are optional&mdash;servers can support neither,
either, or both:

```json
{
  "capabilities": {
    "resources": {} // Neither feature supported
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true // Only subscriptions supported
    }
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "listChanged": true // Only list change notifications supported
    }
  }
}
```

## Protocol Messages

### Listing Resources

To discover available resources, clients send a `resources/list` request. This operation
supports
[pagination](/specification/2024-11-05/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///project/src/main.rs",
        "name": "main.rs",
        "description": "Primary application entry point",
        "mimeType": "text/x-rust"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Reading Resources

To retrieve resource contents, clients send a `resources/read` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///project/src/main.rs",
        "mimeType": "text/x-rust",
        "text": "fn main() {\n    println!(\"Hello world!\");\n}"
      }
    ]
  }
}
```

### Resource Templates

Resource templates allow servers to expose parameterized resources using
[URI templates](https://datatracker.ietf.org/doc/html/rfc6570). Arguments may be
auto-completed through [the completion API](/specification/2024-11-05/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/templates/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "Project Files",
        "description": "Access files in the project directory",
        "mimeType": "application/octet-stream"
      }
    ]
  }
}
```

### List Changed Notification

When the list of available resources changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

### Subscriptions

The protocol supports optional subscriptions to resource changes. Clients can subscribe
to specific resources and receive notifications when they change:

**Subscribe Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Update Notification:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Resource Discovery
    Client->>Server: resources/list
    Server-->>Client: List of resources

    Note over Client,Server: Resource Access
    Client->>Server: resources/read
    Server-->>Client: Resource contents

    Note over Client,Server: Subscriptions
    Client->>Server: resources/subscribe
    Server-->>Client: Subscription confirmed

    Note over Client,Server: Updates
    Server--)Client: notifications/resources/updated
    Client->>Server: resources/read
    Server-->>Client: Updated contents
```

## Data Types

### Resource

A resource definition includes:

- `uri`: Unique identifier for the resource
- `name`: Human-readable name
- `description`: Optional description
- `mimeType`: Optional MIME type

### Resource Contents

Resources can contain either text or binary data:

#### Text Content

```json
{
  "uri": "file:///example.txt",
  "mimeType": "text/plain",
  "text": "Resource content"
}
```

#### Binary Content

```json
{
  "uri": "file:///example.png",
  "mimeType": "image/png",
  "blob": "base64-encoded-data"
}
```

## Common URI Schemes

The protocol defines several standard URI schemes. This list not
exhaustive&mdash;implementations are always free to use additional, custom URI schemes.

### https://

Used to represent a resource available on the web.

Servers **SHOULD** use this scheme only when the client is able to fetch and load the
resource directly from the web on its own—that is, it doesn’t need to read the resource
via the MCP server.

For other use cases, servers **SHOULD** prefer to use another URI scheme, or define a
custom one, even if the server will itself be downloading resource contents over the
internet.

### file://

Used to identify resources that behave like a filesystem. However, the resources do not
need to map to an actual physical filesystem.

MCP servers **MAY** identify file:// resources with an
[XDG MIME type](https://specifications.freedesktop.org/shared-mime-info-spec/0.14/ar01s02.html#id-1.3.14),
like `inode/directory`, to represent non-regular files (such as directories) that don’t
otherwise have a standard MIME type.

### git://

Git version control integration.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Resource not found: `-32002`
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32002,
    "message": "Resource not found",
    "data": {
      "uri": "file:///nonexistent.txt"
    }
  }
}
```

## Security Considerations

1. Servers **MUST** validate all resource URIs
2. Access controls **SHOULD** be implemented for sensitive resources
3. Binary data **MUST** be properly encoded
4. Resource permissions **SHOULD** be checked before operations


---
modelcontextprotocol/docs/specification/2024-11-05/server/tools.mdx
---
---
title: Tools
type: docs
weight: 40
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) allows servers to expose tools that can be invoked by
language models. Tools enable models to interact with external systems, such as querying
databases, calling APIs, or performing computations. Each tool is uniquely identified by
a name and includes metadata describing its schema.

## User Interaction Model

Tools in MCP are designed to be **model-controlled**, meaning that the language model can
discover and invoke tools automatically based on its contextual understanding and the
user's prompts.

However, implementations are free to expose tools through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny tool invocations.

Applications **SHOULD**:

- Provide UI that makes clear which tools are being exposed to the AI model
- Insert clear visual indicators when tools are invoked
- Present confirmation prompts to the user for operations, to ensure a human is in the
  loop
</Warning>

## Capabilities

Servers that support tools **MUST** declare the `tools` capability:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available tools changes.

## Protocol Messages

### Listing Tools

To discover available tools, clients send a `tools/list` request. This operation supports
[pagination](/specification/2024-11-05/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather information for a location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or zip code"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Calling Tools

To invoke a tool, clients send a `tools/call` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "New York"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in New York:\nTemperature: 72°F\nConditions: Partly cloudy"
      }
    ],
    "isError": false
  }
}
```

### List Changed Notification

When the list of available tools changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant LLM
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: tools/list
    Server-->>Client: List of tools

    Note over Client,LLM: Tool Selection
    LLM->>Client: Select tool to use

    Note over Client,Server: Invocation
    Client->>Server: tools/call
    Server-->>Client: Tool result
    Client->>LLM: Process result

    Note over Client,Server: Updates
    Server--)Client: tools/list_changed
    Client->>Server: tools/list
    Server-->>Client: Updated tools
```

## Data Types

### Tool

A tool definition includes:

- `name`: Unique identifier for the tool
- `description`: Human-readable description of functionality
- `inputSchema`: JSON Schema defining expected parameters

### Tool Result

Tool results can contain multiple content items of different types:

#### Text Content

```json
{
  "type": "text",
  "text": "Tool result text"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-data",
  "mimeType": "image/png"
}
```

#### Embedded Resources

[Resources](/specification/2024-11-05/server/resources) **MAY** be
embedded, to provide additional context or data, behind a URI that can be subscribed to
or fetched again by the client later:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

## Error Handling

Tools use two error reporting mechanisms:

1. **Protocol Errors**: Standard JSON-RPC errors for issues like:

   - Unknown tools
   - Invalid arguments
   - Server errors

2. **Tool Execution Errors**: Reported in tool results with `isError: true`:
   - API failures
   - Invalid input data
   - Business logic errors

Example protocol error:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32602,
    "message": "Unknown tool: invalid_tool_name"
  }
}
```

Example tool execution error:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Failed to fetch weather data: API rate limit exceeded"
      }
    ],
    "isError": true
  }
}
```

## Security Considerations

1. Servers **MUST**:

   - Validate all tool inputs
   - Implement proper access controls
   - Rate limit tool invocations
   - Sanitize tool outputs

2. Clients **SHOULD**:
   - Prompt for user confirmation on sensitive operations
   - Show tool inputs to the user before calling the server, to avoid malicious or
     accidental data exfiltration
   - Validate tool results before passing to LLM
   - Implement timeouts for tool calls
   - Log tool usage for audit purposes


---
modelcontextprotocol/docs/specification/2024-11-05/server/utilities/completion.mdx
---
---
title: Completion
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to offer
argument autocompletion suggestions for prompts and resource URIs. This enables rich,
IDE-like experiences where users receive contextual suggestions while entering argument
values.

## User Interaction Model

Completion in MCP is designed to support interactive user experiences similar to IDE code
completion.

For example, applications may show completion suggestions in a dropdown or popup menu as
users type, with the ability to filter and select from available options.

However, implementations are free to expose completion through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Protocol Messages

### Requesting Completions

To get completion suggestions, clients send a `completion/complete` request specifying
what is being completed through a reference type:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "code_review"
    },
    "argument": {
      "name": "language",
      "value": "py"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "completion": {
      "values": ["python", "pytorch", "pyside"],
      "total": 10,
      "hasMore": true
    }
  }
}
```

### Reference Types

The protocol supports two types of completion references:

| Type           | Description                 | Example                                             |
| -------------- | --------------------------- | --------------------------------------------------- |
| `ref/prompt`   | References a prompt by name | `{"type": "ref/prompt", "name": "code_review"}`     |
| `ref/resource` | References a resource URI   | `{"type": "ref/resource", "uri": "file:///{path}"}` |

### Completion Results

Servers return an array of completion values ranked by relevance, with:

- Maximum 100 items per response
- Optional total number of available matches
- Boolean indicating if additional results exist

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client: User types argument
    Client->>Server: completion/complete
    Server-->>Client: Completion suggestions

    Note over Client: User continues typing
    Client->>Server: completion/complete
    Server-->>Client: Refined suggestions
```

## Data Types

### CompleteRequest

- `ref`: A `PromptReference` or `ResourceReference`
- `argument`: Object containing:
  - `name`: Argument name
  - `value`: Current value

### CompleteResult

- `completion`: Object containing:
  - `values`: Array of suggestions (max 100)
  - `total`: Optional total matches
  - `hasMore`: Additional results flag

## Implementation Considerations

1. Servers **SHOULD**:

   - Return suggestions sorted by relevance
   - Implement fuzzy matching where appropriate
   - Rate limit completion requests
   - Validate all inputs

2. Clients **SHOULD**:
   - Debounce rapid completion requests
   - Cache completion results where appropriate
   - Handle missing or partial results gracefully

## Security

Implementations **MUST**:

- Validate all completion inputs
- Implement appropriate rate limiting
- Control access to sensitive suggestions
- Prevent completion-based information disclosure


---
modelcontextprotocol/docs/specification/2024-11-05/server/utilities/logging.mdx
---
---
title: Logging
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to send
structured log messages to clients. Clients can control logging verbosity by setting
minimum log levels, with servers sending notifications containing severity levels,
optional logger names, and arbitrary JSON-serializable data.

## User Interaction Model

Implementations are free to expose logging through any interface pattern that suits their
needs&mdash;the protocol itself does not mandate any specific user interaction model.

## Capabilities

Servers that emit log message notifications **MUST** declare the `logging` capability:

```json
{
  "capabilities": {
    "logging": {}
  }
}
```

## Log Levels

The protocol follows the standard syslog severity levels specified in
[RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1):

| Level     | Description                      | Example Use Case           |
| --------- | -------------------------------- | -------------------------- |
| debug     | Detailed debugging information   | Function entry/exit points |
| info      | General informational messages   | Operation progress updates |
| notice    | Normal but significant events    | Configuration changes      |
| warning   | Warning conditions               | Deprecated feature usage   |
| error     | Error conditions                 | Operation failures         |
| critical  | Critical conditions              | System component failures  |
| alert     | Action must be taken immediately | Data corruption detected   |
| emergency | System is unusable               | Complete system failure    |

## Protocol Messages

### Setting Log Level

To configure the minimum log level, clients **MAY** send a `logging/setLevel` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "logging/setLevel",
  "params": {
    "level": "info"
  }
}
```

### Log Message Notifications

Servers send log messages using `notifications/message` notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "error",
    "logger": "database",
    "data": {
      "error": "Connection failed",
      "details": {
        "host": "localhost",
        "port": 5432
      }
    }
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Configure Logging
    Client->>Server: logging/setLevel (info)
    Server-->>Client: Empty Result

    Note over Client,Server: Server Activity
    Server--)Client: notifications/message (info)
    Server--)Client: notifications/message (warning)
    Server--)Client: notifications/message (error)

    Note over Client,Server: Level Change
    Client->>Server: logging/setLevel (error)
    Server-->>Client: Empty Result
    Note over Server: Only sends error level<br/>and above
```

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid log level: `-32602` (Invalid params)
- Configuration errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD**:

   - Rate limit log messages
   - Include relevant context in data field
   - Use consistent logger names
   - Remove sensitive information

2. Clients **MAY**:
   - Present log messages in the UI
   - Implement log filtering/search
   - Display severity visually
   - Persist log messages

## Security

1. Log messages **MUST NOT** contain:

   - Credentials or secrets
   - Personal identifying information
   - Internal system details that could aid attacks

2. Implementations **SHOULD**:
   - Rate limit messages
   - Validate all data fields
   - Control log access
   - Monitor for sensitive content


---
modelcontextprotocol/docs/specification/2024-11-05/server/utilities/pagination.mdx
---
---
title: Pagination
---

<Info>**Protocol Revision**: 2024-11-05</Info>

The Model Context Protocol (MCP) supports paginating list operations that may return
large result sets. Pagination allows servers to yield results in smaller chunks rather
than all at once.

Pagination is especially important when connecting to external services over the
internet, but also useful for local integrations to avoid performance issues with large
data sets.

## Pagination Model

Pagination in MCP uses an opaque cursor-based approach, instead of numbered pages.

- The **cursor** is an opaque string token, representing a position in the result set
- **Page size** is determined by the server, and clients **MUST NOT** assume a fixed page
  size

## Response Format

Pagination starts when the server sends a **response** that includes:

- The current page of results
- An optional `nextCursor` field if more results exist

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "resources": [...],
    "nextCursor": "eyJwYWdlIjogM30="
  }
}
```

## Request Format

After receiving a cursor, the client can _continue_ paginating by issuing a request
including that cursor:

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {
    "cursor": "eyJwYWdlIjogMn0="
  }
}
```

## Pagination Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: List Request (no cursor)
    loop Pagination Loop
      Server-->>Client: Page of results + nextCursor
      Client->>Server: List Request (with cursor)
    end
```

## Operations Supporting Pagination

The following MCP operations support pagination:

- `resources/list` - List available resources
- `resources/templates/list` - List resource templates
- `prompts/list` - List available prompts
- `tools/list` - List available tools

## Implementation Guidelines

1. Servers **SHOULD**:

   - Provide stable cursors
   - Handle invalid cursors gracefully

2. Clients **SHOULD**:

   - Treat a missing `nextCursor` as the end of results
   - Support both paginated and non-paginated flows

3. Clients **MUST** treat cursors as opaque tokens:
   - Don't make assumptions about cursor format
   - Don't attempt to parse or modify cursors
   - Don't persist cursors across sessions

## Error Handling

Invalid cursors **SHOULD** result in an error with code -32602 (Invalid params).


---
modelcontextprotocol/docs/specification/2025-03-26/changelog.mdx
---
---
title: Key Changes
---

This document lists changes made to the Model Context Protocol (MCP) specification since
the previous revision, [2024-11-05](/specification/2024-11-05).

## Major changes

1. Added a comprehensive **[authorization framework](/specification/2025-03-26/basic/authorization)**
   based on OAuth 2.1 (PR
   [#133](https://github.com/modelcontextprotocol/specification/pull/133))
1. Replaced the previous HTTP+SSE transport with a more flexible **[Streamable HTTP
   transport](/specification/2025-03-26/basic/transports#streamable-http)** (PR
   [#206](https://github.com/modelcontextprotocol/specification/pull/206))
1. Added support for JSON-RPC **[batching](https://www.jsonrpc.org/specification#batch)**
   (PR [#228](https://github.com/modelcontextprotocol/specification/pull/228))
1. Added comprehensive **tool annotations** for better describing tool behavior, like
   whether it is read-only or destructive (PR
   [#185](https://github.com/modelcontextprotocol/specification/pull/185))

## Other schema changes

- Added `message` field to `ProgressNotification` to provide descriptive status updates
- Added support for audio data, joining the existing text and image content types
- Added `completions` capability to explicitly indicate support for argument
  autocompletion suggestions

See
[the updated schema](http://github.com/modelcontextprotocol/specification/tree/main/schema/2025-03-26/schema.ts)
for more details.

## Full changelog

For a complete list of all changes that have been made since the last protocol revision,
[see GitHub](https://github.com/modelcontextprotocol/specification/compare/2024-11-05...2025-03-26).


---
modelcontextprotocol/docs/specification/2025-03-26/index.mdx
---
---
title: Specification
---

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open protocol that
enables seamless integration between LLM applications and external data sources and
tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating
custom AI workflows, MCP provides a standardized way to connect LLMs with the context
they need.

This specification defines the authoritative protocol requirements, based on the
TypeScript schema in
[schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-03-26/schema.ts).

For implementation guides and examples, visit
[modelcontextprotocol.io](https://modelcontextprotocol.io).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD
NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14)
[[RFC2119](https://datatracker.ietf.org/doc/html/rfc2119)]
[[RFC8174](https://datatracker.ietf.org/doc/html/rfc8174)] when, and only when, they
appear in all capitals, as shown here.

## Overview

MCP provides a standardized way for applications to:

- Share contextual information with language models
- Expose tools and capabilities to AI systems
- Build composable integrations and workflows

The protocol uses [JSON-RPC](https://www.jsonrpc.org/) 2.0 messages to establish
communication between:

- **Hosts**: LLM applications that initiate connections
- **Clients**: Connectors within the host application
- **Servers**: Services that provide context and capabilities

MCP takes some inspiration from the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/), which
standardizes how to add support for programming languages across a whole ecosystem of
development tools. In a similar way, MCP standardizes how to integrate additional context
and tools into the ecosystem of AI applications.

## Key Details

### Base Protocol

- [JSON-RPC](https://www.jsonrpc.org/) message format
- Stateful connections
- Server and client capability negotiation

### Features

Servers offer any of the following features to clients:

- **Resources**: Context and data, for the user or the AI model to use
- **Prompts**: Templated messages and workflows for users
- **Tools**: Functions for the AI model to execute

Clients may offer the following feature to servers:

- **Sampling**: Server-initiated agentic behaviors and recursive LLM interactions

### Additional Utilities

- Configuration
- Progress tracking
- Cancellation
- Error reporting
- Logging

## Security and Trust & Safety

The Model Context Protocol enables powerful capabilities through arbitrary data access
and code execution paths. With this power comes important security and trust
considerations that all implementors must carefully address.

### Key Principles

1. **User Consent and Control**

   - Users must explicitly consent to and understand all data access and operations
   - Users must retain control over what data is shared and what actions are taken
   - Implementors should provide clear UIs for reviewing and authorizing activities

2. **Data Privacy**

   - Hosts must obtain explicit user consent before exposing user data to servers
   - Hosts must not transmit resource data elsewhere without user consent
   - User data should be protected with appropriate access controls

3. **Tool Safety**

   - Tools represent arbitrary code execution and must be treated with appropriate
     caution.
     - In particular, descriptions of tool behavior such as annotations should be
       considered untrusted, unless obtained from a trusted server.
   - Hosts must obtain explicit user consent before invoking any tool
   - Users should understand what each tool does before authorizing its use

4. **LLM Sampling Controls**
   - Users must explicitly approve any LLM sampling requests
   - Users should control:
     - Whether sampling occurs at all
     - The actual prompt that will be sent
     - What results the server can see
   - The protocol intentionally limits server visibility into prompts

### Implementation Guidelines

While MCP itself cannot enforce these security principles at the protocol level,
implementors **SHOULD**:

1. Build robust consent and authorization flows into their applications
2. Provide clear documentation of security implications
3. Implement appropriate access controls and data protections
4. Follow security best practices in their integrations
5. Consider privacy implications in their feature designs

## Learn More

Explore the detailed specification for each protocol component:

<CardGroup cols={5}>
  <Card title="Architecture" icon="sitemap" href="architecture" />
  <Card title="Base Protocol" icon="code" href="basic" />
  <Card title="Server Features" icon="server" href="server" />
  <Card title="Client Features" icon="user" href="client" />
  <Card title="Contributing" icon="pencil" href="contributing" />
</CardGroup>


---
modelcontextprotocol/docs/specification/2025-03-26/architecture/index.mdx
---
---
title: Architecture
---

The Model Context Protocol (MCP) follows a client-host-server architecture where each
host can run multiple client instances. This architecture enables users to integrate AI
capabilities across applications while maintaining clear security boundaries and
isolating concerns. Built on JSON-RPC, MCP provides a stateful session protocol focused
on context exchange and sampling coordination between clients and servers.

## Core Components

```mermaid
graph LR
    subgraph "Application Host Process"
        H[Host]
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
        H --> C1
        H --> C2
        H --> C3
    end

    subgraph "Local machine"
        S1[Server 1<br>Files & Git]
        S2[Server 2<br>Database]
        R1[("Local<br>Resource A")]
        R2[("Local<br>Resource B")]

        C1 --> S1
        C2 --> S2
        S1 <--> R1
        S2 <--> R2
    end

    subgraph "Internet"
        S3[Server 3<br>External APIs]
        R3[("Remote<br>Resource C")]

        C3 --> S3
        S3 <--> R3
    end
```

### Host

The host process acts as the container and coordinator:

- Creates and manages multiple client instances
- Controls client connection permissions and lifecycle
- Enforces security policies and consent requirements
- Handles user authorization decisions
- Coordinates AI/LLM integration and sampling
- Manages context aggregation across clients

### Clients

Each client is created by the host and maintains an isolated server connection:

- Establishes one stateful session per server
- Handles protocol negotiation and capability exchange
- Routes protocol messages bidirectionally
- Manages subscriptions and notifications
- Maintains security boundaries between servers

A host application creates and manages multiple clients, with each client having a 1:1
relationship with a particular server.

### Servers

Servers provide specialized context and capabilities:

- Expose resources, tools and prompts via MCP primitives
- Operate independently with focused responsibilities
- Request sampling through client interfaces
- Must respect security constraints
- Can be local processes or remote services

## Design Principles

MCP is built on several key design principles that inform its architecture and
implementation:

1. **Servers should be extremely easy to build**

   - Host applications handle complex orchestration responsibilities
   - Servers focus on specific, well-defined capabilities
   - Simple interfaces minimize implementation overhead
   - Clear separation enables maintainable code

2. **Servers should be highly composable**

   - Each server provides focused functionality in isolation
   - Multiple servers can be combined seamlessly
   - Shared protocol enables interoperability
   - Modular design supports extensibility

3. **Servers should not be able to read the whole conversation, nor "see into" other
   servers**

   - Servers receive only necessary contextual information
   - Full conversation history stays with the host
   - Each server connection maintains isolation
   - Cross-server interactions are controlled by the host
   - Host process enforces security boundaries

4. **Features can be added to servers and clients progressively**
   - Core protocol provides minimal required functionality
   - Additional capabilities can be negotiated as needed
   - Servers and clients evolve independently
   - Protocol designed for future extensibility
   - Backwards compatibility is maintained

## Capability Negotiation

The Model Context Protocol uses a capability-based negotiation system where clients and
servers explicitly declare their supported features during initialization. Capabilities
determine which protocol features and primitives are available during a session.

- Servers declare capabilities like resource subscriptions, tool support, and prompt
  templates
- Clients declare capabilities like sampling support and notification handling
- Both parties must respect declared capabilities throughout the session
- Additional capabilities can be negotiated through extensions to the protocol

```mermaid
sequenceDiagram
    participant Host
    participant Client
    participant Server

    Host->>+Client: Initialize client
    Client->>+Server: Initialize session with capabilities
    Server-->>Client: Respond with supported capabilities

    Note over Host,Server: Active Session with Negotiated Features

    loop Client Requests
        Host->>Client: User- or model-initiated action
        Client->>Server: Request (tools/resources)
        Server-->>Client: Response
        Client-->>Host: Update UI or respond to model
    end

    loop Server Requests
        Server->>Client: Request (sampling)
        Client->>Host: Forward to AI
        Host-->>Client: AI response
        Client-->>Server: Response
    end

    loop Notifications
        Server--)Client: Resource updates
        Client--)Server: Status changes
    end

    Host->>Client: Terminate
    Client->>-Server: End session
    deactivate Server
```

Each capability unlocks specific protocol features for use during the session. For
example:

- Implemented [server features](/specification/2025-03-26/server) must be advertised in the
  server's capabilities
- Emitting resource subscription notifications requires the server to declare
  subscription support
- Tool invocation requires the server to declare tool capabilities
- [Sampling](/specification/2025-03-26/client) requires the client to declare support in its
  capabilities

This capability negotiation ensures clients and servers have a clear understanding of
supported functionality while maintaining protocol extensibility.


---
modelcontextprotocol/docs/specification/2025-03-26/basic/authorization.mdx
---
---
title: Authorization
---

<Info>**Protocol Revision**: 2025-03-26</Info>

## 1. Introduction

### 1.1 Purpose and Scope

The Model Context Protocol provides authorization capabilities at the transport level,
enabling MCP clients to make requests to restricted MCP servers on behalf of resource
owners. This specification defines the authorization flow for HTTP-based transports.

### 1.2 Protocol Requirements

Authorization is **OPTIONAL** for MCP implementations. When supported:

- Implementations using an HTTP-based transport **SHOULD** conform to this specification.
- Implementations using an STDIO transport **SHOULD NOT** follow this specification, and
  instead retrieve credentials from the environment.
- Implementations using alternative transports **MUST** follow established security best
  practices for their protocol.

### 1.3 Standards Compliance

This authorization mechanism is based on established specifications listed below, but
implements a selected subset of their features to ensure security and interoperability
while maintaining simplicity:

- [OAuth 2.1 IETF DRAFT](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- OAuth 2.0 Authorization Server Metadata
  ([RFC8414](https://datatracker.ietf.org/doc/html/rfc8414))
- OAuth 2.0 Dynamic Client Registration Protocol
  ([RFC7591](https://datatracker.ietf.org/doc/html/rfc7591))

## 2. Authorization Flow

### 2.1 Overview

1. MCP auth implementations **MUST** implement OAuth 2.1 with appropriate security
   measures for both confidential and public clients.

2. MCP auth implementations **SHOULD** support the OAuth 2.0 Dynamic Client Registration
   Protocol ([RFC7591](https://datatracker.ietf.org/doc/html/rfc7591)).

3. MCP servers **SHOULD** and MCP clients **MUST** implement OAuth 2.0 Authorization
   Server Metadata ([RFC8414](https://datatracker.ietf.org/doc/html/rfc8414)). Servers
   that do not support Authorization Server Metadata **MUST** follow the default URI
   schema.

### 2.1.1 OAuth Grant Types

OAuth specifies different flows or grant types, which are different ways of obtaining an
access token. Each of these targets different use cases and scenarios.

MCP servers **SHOULD** support the OAuth grant types that best align with the intended
audience. For instance:

1. Authorization Code: useful when the client is acting on behalf of a (human) end user.
   - For instance, an agent calls an MCP tool implemented by a SaaS system.
2. Client Credentials: the client is another application (not a human)
   - For instance, an agent calls a secure MCP tool to check inventory at a specific
     store. No need to impersonate the end user.

### 2.2 Example: authorization code grant

This demonstrates the OAuth 2.1 flow for the authorization code grant type, used for user
auth.

**NOTE**: The following example assumes the MCP server is also functioning as the
authorization server. However, the authorization server may be deployed as its own
distinct service.

A human user completes the OAuth flow through a web browser, obtaining an access token
that identifies them personally and allows the client to act on their behalf.

When authorization is required and not yet proven by the client, servers **MUST** respond
with _HTTP 401 Unauthorized_.

Clients initiate the
[OAuth 2.1 IETF DRAFT](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#name-authorization-code-grant)
authorization flow after receiving the _HTTP 401 Unauthorized_.

The following demonstrates the basic OAuth 2.1 for public clients using PKCE.

```mermaid
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as Client
    participant M as MCP Server

    C->>M: MCP Request
    M->>C: HTTP 401 Unauthorized
    Note over C: Generate code_verifier and code_challenge
    C->>B: Open browser with authorization URL + code_challenge
    B->>M: GET /authorize
    Note over M: User logs in and authorizes
    M->>B: Redirect to callback URL with auth code
    B->>C: Callback with authorization code
    C->>M: Token Request with code + code_verifier
    M->>C: Access Token (+ Refresh Token)
    C->>M: MCP Request with Access Token
    Note over C,M: Begin standard MCP message exchange
```

### 2.3 Server Metadata Discovery

For server capability discovery:

- MCP clients _MUST_ follow the OAuth 2.0 Authorization Server Metadata protocol defined
  in [RFC8414](https://datatracker.ietf.org/doc/html/rfc8414).
- MCP server _SHOULD_ follow the OAuth 2.0 Authorization Server Metadata protocol.
- MCP servers that do not support the OAuth 2.0 Authorization Server Metadata protocol,
  _MUST_ support fallback URLs.

The discovery flow is illustrated below:

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: GET /.well-known/oauth-authorization-server
    alt Discovery Success
        S->>C: 200 OK + Metadata Document
        Note over C: Use endpoints from metadata
    else Discovery Failed
        S->>C: 404 Not Found
        Note over C: Fall back to default endpoints
    end
    Note over C: Continue with authorization flow
```

#### 2.3.1 Server Metadata Discovery Headers

MCP clients _SHOULD_ include the header `MCP-Protocol-Version: <protocol-version>` during
Server Metadata Discovery to allow the MCP server to respond based on the MCP protocol
version.

For example: `MCP-Protocol-Version: 2024-11-05`

#### 2.3.2 Authorization Base URL

The authorization base URL **MUST** be determined from the MCP server URL by discarding
any existing `path` component. For example:

If the MCP server URL is `https://api.example.com/v1/mcp`, then:

- The authorization base URL is `https://api.example.com`
- The metadata endpoint **MUST** be at
  `https://api.example.com/.well-known/oauth-authorization-server`

This ensures authorization endpoints are consistently located at the root level of the
domain hosting the MCP server, regardless of any path components in the MCP server URL.

#### 2.3.3 Fallbacks for Servers without Metadata Discovery

For servers that do not implement OAuth 2.0 Authorization Server Metadata, clients
**MUST** use the following default endpoint paths relative to the authorization base URL
(as defined in [Section 2.3.2](#232-authorization-base-url)):

| Endpoint               | Default Path | Description                          |
| ---------------------- | ------------ | ------------------------------------ |
| Authorization Endpoint | /authorize   | Used for authorization requests      |
| Token Endpoint         | /token       | Used for token exchange & refresh    |
| Registration Endpoint  | /register    | Used for dynamic client registration |

For example, with an MCP server hosted at `https://api.example.com/v1/mcp`, the default
endpoints would be:

- `https://api.example.com/authorize`
- `https://api.example.com/token`
- `https://api.example.com/register`

Clients **MUST** first attempt to discover endpoints via the metadata document before
falling back to default paths. When using default paths, all other protocol requirements
remain unchanged.

### 2.4 Dynamic Client Registration

MCP clients and servers **SHOULD** support the
[OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)
to allow MCP clients to obtain OAuth client IDs without user interaction. This provides a
standardized way for clients to automatically register with new servers, which is crucial
for MCP because:

- Clients cannot know all possible servers in advance
- Manual registration would create friction for users
- It enables seamless connection to new servers
- Servers can implement their own registration policies

Any MCP servers that _do not_ support Dynamic Client Registration need to provide
alternative ways to obtain a client ID (and, if applicable, client secret). For one of
these servers, MCP clients will have to either:

1. Hardcode a client ID (and, if applicable, client secret) specifically for that MCP
   server, or
2. Present a UI to users that allows them to enter these details, after registering an
   OAuth client themselves (e.g., through a configuration interface hosted by the
   server).

### 2.5 Authorization Flow Steps

The complete Authorization flow proceeds as follows:

```mermaid
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as Client
    participant M as MCP Server

    C->>M: GET /.well-known/oauth-authorization-server
    alt Server Supports Discovery
        M->>C: Authorization Server Metadata
    else No Discovery
        M->>C: 404 (Use default endpoints)
    end

    alt Dynamic Client Registration
        C->>M: POST /register
        M->>C: Client Credentials
    end

    Note over C: Generate PKCE Parameters
    C->>B: Open browser with authorization URL + code_challenge
    B->>M: Authorization Request
    Note over M: User /authorizes
    M->>B: Redirect to callback with authorization code
    B->>C: Authorization code callback
    C->>M: Token Request + code_verifier
    M->>C: Access Token (+ Refresh Token)
    C->>M: API Requests with Access Token
```

#### 2.5.1 Decision Flow Overview

```mermaid
flowchart TD
    A[Start Auth Flow] --> B{Check Metadata Discovery}
    B -->|Available| C[Use Metadata Endpoints]
    B -->|Not Available| D[Use Default Endpoints]

    C --> G{Check Registration Endpoint}
    D --> G

    G -->|Available| H[Perform Dynamic Registration]
    G -->|Not Available| I[Alternative Registration Required]

    H --> J[Start OAuth Flow]
    I --> J

    J --> K[Generate PKCE Parameters]
    K --> L[Request Authorization]
    L --> M[User Authorization]
    M --> N[Exchange Code for Tokens]
    N --> O[Use Access Token]
```

### 2.6 Access Token Usage

#### 2.6.1 Token Requirements

Access token handling **MUST** conform to
[OAuth 2.1 Section 5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5)
requirements for resource requests. Specifically:

1. MCP client **MUST** use the Authorization request header field
   [Section 5.1.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.1.1):

```
Authorization: Bearer <access-token>
```

Note that authorization **MUST** be included in every HTTP request from client to server,
even if they are part of the same logical session.

2. Access tokens **MUST NOT** be included in the URI query string

Example request:

```http
GET /v1/contexts HTTP/1.1
Host: mcp.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2.6.2 Token Handling

Resource servers **MUST** validate access tokens as described in
[Section 5.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.2).
If validation fails, servers **MUST** respond according to
[Section 5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.3)
error handling requirements. Invalid or expired tokens **MUST** receive a HTTP 401
response.

### 2.7 Security Considerations

The following security requirements **MUST** be implemented:

1. Clients **MUST** securely store tokens following OAuth 2.0 best practices
2. Servers **SHOULD** enforce token expiration and rotation
3. All authorization endpoints **MUST** be served over HTTPS
4. Servers **MUST** validate redirect URIs to prevent open redirect vulnerabilities
5. Redirect URIs **MUST** be either localhost URLs or HTTPS URLs

### 2.8 Error Handling

Servers **MUST** return appropriate HTTP status codes for authorization errors:

| Status Code | Description  | Usage                                      |
| ----------- | ------------ | ------------------------------------------ |
| 401         | Unauthorized | Authorization required or token invalid    |
| 403         | Forbidden    | Invalid scopes or insufficient permissions |
| 400         | Bad Request  | Malformed authorization request            |

### 2.9 Implementation Requirements

1. Implementations **MUST** follow OAuth 2.1 security best practices
2. PKCE is **REQUIRED** for all clients
3. Token rotation **SHOULD** be implemented for enhanced security
4. Token lifetimes **SHOULD** be limited based on security requirements

### 2.10 Third-Party Authorization Flow

#### 2.10.1 Overview

MCP servers **MAY** support delegated authorization through third-party authorization
servers. In this flow, the MCP server acts as both an OAuth client (to the third-party
auth server) and an OAuth authorization server (to the MCP client).

#### 2.10.2 Flow Description

The third-party authorization flow comprises these steps:

1. MCP client initiates standard OAuth flow with MCP server
2. MCP server redirects user to third-party authorization server
3. User authorizes with third-party server
4. Third-party server redirects back to MCP server with authorization code
5. MCP server exchanges code for third-party access token
6. MCP server generates its own access token bound to the third-party session
7. MCP server completes original OAuth flow with MCP client

```mermaid
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as MCP Client
    participant M as MCP Server
    participant T as Third-Party Auth Server

    C->>M: Initial OAuth Request
    M->>B: Redirect to Third-Party /authorize
    B->>T: Authorization Request
    Note over T: User authorizes
    T->>B: Redirect to MCP Server callback
    B->>M: Authorization code
    M->>T: Exchange code for token
    T->>M: Third-party access token
    Note over M: Generate bound MCP token
    M->>B: Redirect to MCP Client callback
    B->>C: MCP authorization code
    C->>M: Exchange code for token
    M->>C: MCP access token
```

#### 2.10.3 Session Binding Requirements

MCP servers implementing third-party authorization **MUST**:

1. Maintain secure mapping between third-party tokens and issued MCP tokens
2. Validate third-party token status before honoring MCP tokens
3. Implement appropriate token lifecycle management
4. Handle third-party token expiration and renewal

#### 2.10.4 Security Considerations

When implementing third-party authorization, servers **MUST**:

1. Validate all redirect URIs
2. Securely store third-party credentials
3. Implement appropriate session timeout handling
4. Consider security implications of token chaining
5. Implement proper error handling for third-party auth failures

## 3. Best Practices

#### 3.1 Local clients as Public OAuth 2.1 Clients

We strongly recommend that local clients implement OAuth 2.1 as a public client:

1. Utilizing code challenges (PKCE) for authorization requests to prevent interception
   attacks
2. Implementing secure token storage appropriate for the local system
3. Following token refresh best practices to maintain sessions
4. Properly handling token expiration and renewal

#### 3.2 Authorization Metadata Discovery

We strongly recommend that all clients implement metadata discovery. This reduces the
need for users to provide endpoints manually or clients to fallback to the defined
defaults.

#### 3.3 Dynamic Client Registration

Since clients do not know the set of MCP servers in advance, we strongly recommend the
implementation of dynamic client registration. This allows applications to automatically
register with the MCP server, and removes the need for users to obtain client ids
manually.


---
modelcontextprotocol/docs/specification/2025-03-26/basic/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol consists of several key components that work together:

- **Base Protocol**: Core JSON-RPC message types
- **Lifecycle Management**: Connection initialization, capability negotiation, and
  session control
- **Server Features**: Resources, prompts, and tools exposed by servers
- **Client Features**: Sampling and root directory lists provided by clients
- **Utilities**: Cross-cutting concerns like logging and argument completion

All implementations **MUST** support the base protocol and lifecycle management
components. Other components **MAY** be implemented based on the specific needs of the
application.

These protocol layers establish clear separation of concerns while enabling rich
interactions between clients and servers. The modular design allows implementations to
support exactly the features they need.

## Messages

All messages between MCP clients and servers **MUST** follow the
[JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification. The protocol defines
these types of messages:

### Requests

Requests are sent from the client to the server or vice versa, to initiate an operation.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Requests **MUST** include a string or integer ID.
- Unlike base JSON-RPC, the ID **MUST NOT** be `null`.
- The request ID **MUST NOT** have been previously used by the requestor within the same
  session.

### Responses

Responses are sent in reply to requests, containing the result or error of the operation.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  result?: {
    [key: string]: unknown;
  }
  error?: {
    code: number;
    message: string;
    data?: unknown;
  }
}
```

- Responses **MUST** include the same ID as the request they correspond to.
- **Responses** are further sub-categorized as either **successful results** or
  **errors**. Either a `result` or an `error` **MUST** be set. A response **MUST NOT**
  set both.
- Results **MAY** follow any JSON object structure, while errors **MUST** include an
  error code and message at minimum.
- Error codes **MUST** be integers.

### Notifications

Notifications are sent from the client to the server or vice versa, as a one-way message.
The receiver **MUST NOT** send a response.

```typescript
{
  jsonrpc: "2.0";
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Notifications **MUST NOT** include an ID.

### Batching

JSON-RPC also defines a means to
[batch multiple requests and notifications](https://www.jsonrpc.org/specification#batch),
by sending them in an array. MCP implementations **MAY** support sending JSON-RPC
batches, but **MUST** support receiving JSON-RPC batches.

## Auth

MCP provides an [Authorization](/specification/2025-03-26/basic/authorization) framework for use with HTTP.
Implementations using an HTTP-based transport **SHOULD** conform to this specification,
whereas implementations using STDIO transport **SHOULD NOT** follow this specification,
and instead retrieve credentials from the environment.

Additionally, clients and servers **MAY** negotiate their own custom authentication and
authorization strategies.

For further discussions and contributions to the evolution of MCP’s auth mechanisms, join
us in
[GitHub Discussions](https://github.com/modelcontextprotocol/specification/discussions)
to help shape the future of the protocol!

## Schema

The full specification of the protocol is defined as a
[TypeScript schema](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-03-26/schema.ts).
This is the source of truth for all protocol messages and structures.

There is also a
[JSON Schema](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-03-26/schema.json),
which is automatically generated from the TypeScript source of truth, for use with
various automated tooling.


---
modelcontextprotocol/docs/specification/2025-03-26/basic/lifecycle.mdx
---
---
title: Lifecycle
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) defines a rigorous lifecycle for client-server
connections that ensures proper capability negotiation and state management.

1. **Initialization**: Capability negotiation and protocol version agreement
2. **Operation**: Normal protocol communication
3. **Shutdown**: Graceful termination of the connection

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Initialization Phase
    activate Client
    Client->>+Server: initialize request
    Server-->>Client: initialize response
    Client--)Server: initialized notification

    Note over Client,Server: Operation Phase
    rect rgb(200, 220, 250)
        note over Client,Server: Normal protocol operations
    end

    Note over Client,Server: Shutdown
    Client--)-Server: Disconnect
    deactivate Server
    Note over Client,Server: Connection closed
```

## Lifecycle Phases

### Initialization

The initialization phase **MUST** be the first interaction between client and server.
During this phase, the client and server:

- Establish protocol version compatibility
- Exchange and negotiate capabilities
- Share implementation details

The client **MUST** initiate this phase by sending an `initialize` request containing:

- Protocol version supported
- Client capabilities
- Client implementation information

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  }
}
```

The initialize request **MUST NOT** be part of a JSON-RPC
[batch](https://www.jsonrpc.org/specification#batch), as other requests and notifications
are not possible until initialization has completed. This also permits backwards
compatibility with prior protocol versions that do not explicitly support JSON-RPC
batches.

The server **MUST** respond with its own capabilities and information:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    },
    "instructions": "Optional instructions for the client"
  }
}
```

After successful initialization, the client **MUST** send an `initialized` notification
to indicate it is ready to begin normal operations:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

- The client **SHOULD NOT** send requests other than
  [pings](/specification/2025-03-26/basic/utilities/ping) before the server has responded to the
  `initialize` request.
- The server **SHOULD NOT** send requests other than
  [pings](/specification/2025-03-26/basic/utilities/ping) and
  [logging](/specification/2025-03-26/server/utilities/logging) before receiving the `initialized`
  notification.

#### Version Negotiation

In the `initialize` request, the client **MUST** send a protocol version it supports.
This **SHOULD** be the _latest_ version supported by the client.

If the server supports the requested protocol version, it **MUST** respond with the same
version. Otherwise, the server **MUST** respond with another protocol version it
supports. This **SHOULD** be the _latest_ version supported by the server.

If the client does not support the version in the server's response, it **SHOULD**
disconnect.

#### Capability Negotiation

Client and server capabilities establish which optional protocol features will be
available during the session.

Key capabilities include:

| Category | Capability     | Description                                                                |
| -------- | -------------- | -------------------------------------------------------------------------- |
| Client   | `roots`        | Ability to provide filesystem [roots](/specification/2025-03-26/client/roots)       |
| Client   | `sampling`     | Support for LLM [sampling](/specification/2025-03-26/client/sampling) requests      |
| Client   | `experimental` | Describes support for non-standard experimental features                   |
| Server   | `prompts`      | Offers [prompt templates](/specification/2025-03-26/server/prompts)                 |
| Server   | `resources`    | Provides readable [resources](/specification/2025-03-26/server/resources)           |
| Server   | `tools`        | Exposes callable [tools](/specification/2025-03-26/server/tools)                    |
| Server   | `logging`      | Emits structured [log messages](/specification/2025-03-26/server/utilities/logging) |
| Server   | `experimental` | Describes support for non-standard experimental features                   |

Capability objects can describe sub-capabilities like:

- `listChanged`: Support for list change notifications (for prompts, resources, and
  tools)
- `subscribe`: Support for subscribing to individual items' changes (resources only)

### Operation

During the operation phase, the client and server exchange messages according to the
negotiated capabilities.

Both parties **SHOULD**:

- Respect the negotiated protocol version
- Only use capabilities that were successfully negotiated

### Shutdown

During the shutdown phase, one side (usually the client) cleanly terminates the protocol
connection. No specific shutdown messages are defined—instead, the underlying transport
mechanism should be used to signal connection termination:

#### stdio

For the stdio [transport](/specification/2025-03-26/basic/transports), the client **SHOULD** initiate
shutdown by:

1. First, closing the input stream to the child process (the server)
2. Waiting for the server to exit, or sending `SIGTERM` if the server does not exit
   within a reasonable time
3. Sending `SIGKILL` if the server does not exit within a reasonable time after `SIGTERM`

The server **MAY** initiate shutdown by closing its output stream to the client and
exiting.

#### HTTP

For HTTP [transports](/specification/2025-03-26/basic/transports), shutdown is indicated by closing the
associated HTTP connection(s).

## Timeouts

Implementations **SHOULD** establish timeouts for all sent requests, to prevent hung
connections and resource exhaustion. When the request has not received a success or error
response within the timeout period, the sender **SHOULD** issue a [cancellation
notification](/specification/2025-03-26/basic/utilities/cancellation) for that request and stop waiting for
a response.

SDKs and other middleware **SHOULD** allow these timeouts to be configured on a
per-request basis.

Implementations **MAY** choose to reset the timeout clock when receiving a [progress
notification](/specification/2025-03-26/basic/utilities/progress) corresponding to the request, as this
implies that work is actually happening. However, implementations **SHOULD** always
enforce a maximum timeout, regardless of progress notifications, to limit the impact of a
misbehaving client or server.

## Error Handling

Implementations **SHOULD** be prepared to handle these error cases:

- Protocol version mismatch
- Failure to negotiate required capabilities
- Request [timeouts](#timeouts)

Example initialization error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2024-11-05"],
      "requested": "1.0.0"
    }
  }
}
```


---
modelcontextprotocol/docs/specification/2025-03-26/basic/transports.mdx
---
---
title: Transports
---

<Info>**Protocol Revision**: 2025-03-26</Info>

MCP uses JSON-RPC to encode messages. JSON-RPC messages **MUST** be UTF-8 encoded.

The protocol currently defines two standard transport mechanisms for client-server
communication:

1. [stdio](#stdio), communication over standard in and standard out
2. [Streamable HTTP](#streamable-http)

Clients **SHOULD** support stdio whenever possible.

It is also possible for clients and servers to implement
[custom transports](#custom-transports) in a pluggable fashion.

## stdio

In the **stdio** transport:

- The client launches the MCP server as a subprocess.
- The server reads JSON-RPC messages from its standard input (`stdin`) and sends messages
  to its standard output (`stdout`).
- Messages may be JSON-RPC requests, notifications, responses—or a JSON-RPC
  [batch](https://www.jsonrpc.org/specification#batch) containing one or more requests
  and/or notifications.
- Messages are delimited by newlines, and **MUST NOT** contain embedded newlines.
- The server **MAY** write UTF-8 strings to its standard error (`stderr`) for logging
  purposes. Clients **MAY** capture, forward, or ignore this logging.
- The server **MUST NOT** write anything to its `stdout` that is not a valid MCP message.
- The client **MUST NOT** write anything to the server's `stdin` that is not a valid MCP
  message.

```mermaid
sequenceDiagram
    participant Client
    participant Server Process

    Client->>+Server Process: Launch subprocess
    loop Message Exchange
        Client->>Server Process: Write to stdin
        Server Process->>Client: Write to stdout
        Server Process--)Client: Optional logs on stderr
    end
    Client->>Server Process: Close stdin, terminate subprocess
    deactivate Server Process
```

## Streamable HTTP

<Info>This replaces the [HTTP+SSE
transport](/specification/2024-11-05/basic/transports#http-with-sse) from
protocol version 2024-11-05. See the [backwards compatibility](#backwards-compatibility)
guide below.</Info>

In the **Streamable HTTP** transport, the server operates as an independent process that
can handle multiple client connections. This transport uses HTTP POST and GET requests.
Server can optionally make use of
[Server-Sent Events](https://en.wikipedia.org/wiki/Server-sent_events) (SSE) to stream
multiple server messages. This permits basic MCP servers, as well as more feature-rich
servers supporting streaming and server-to-client notifications and requests.

The server **MUST** provide a single HTTP endpoint path (hereafter referred to as the
**MCP endpoint**) that supports both POST and GET methods. For example, this could be a
URL like `https://example.com/mcp`.

#### Security Warning

When implementing Streamable HTTP transport:

1. Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks
2. When running locally, servers **SHOULD** bind only to localhost (127.0.0.1) rather than all network interfaces (0.0.0.0)
3. Servers **SHOULD** implement proper authentication for all connections

Without these protections, attackers could use DNS rebinding to interact with local MCP servers from remote websites.

### Sending Messages to the Server

Every JSON-RPC message sent from the client **MUST** be a new HTTP POST request to the
MCP endpoint.

1. The client **MUST** use HTTP POST to send JSON-RPC messages to the MCP endpoint.
2. The client **MUST** include an `Accept` header, listing both `application/json` and
   `text/event-stream` as supported content types.
3. The body of the POST request **MUST** be one of the following:
   - A single JSON-RPC _request_, _notification_, or _response_
   - An array [batching](https://www.jsonrpc.org/specification#batch) one or more
     _requests and/or notifications_
   - An array [batching](https://www.jsonrpc.org/specification#batch) one or more
     _responses_
4. If the input consists solely of (any number of) JSON-RPC _responses_ or
   _notifications_:
   - If the server accepts the input, the server **MUST** return HTTP status code 202
     Accepted with no body.
   - If the server cannot accept the input, it **MUST** return an HTTP error status code
     (e.g., 400 Bad Request). The HTTP response body **MAY** comprise a JSON-RPC _error
     response_ that has no `id`.
5. If the input contains any number of JSON-RPC _requests_, the server **MUST** either
   return `Content-Type: text/event-stream`, to initiate an SSE stream, or
   `Content-Type: application/json`, to return one JSON object. The client **MUST**
   support both these cases.
6. If the server initiates an SSE stream:
   - The SSE stream **SHOULD** eventually include one JSON-RPC _response_ per each
     JSON-RPC _request_ sent in the POST body. These _responses_ **MAY** be
     [batched](https://www.jsonrpc.org/specification#batch).
   - The server **MAY** send JSON-RPC _requests_ and _notifications_ before sending a
     JSON-RPC _response_. These messages **SHOULD** relate to the originating client
     _request_. These _requests_ and _notifications_ **MAY** be
     [batched](https://www.jsonrpc.org/specification#batch).
   - The server **SHOULD NOT** close the SSE stream before sending a JSON-RPC _response_
     per each received JSON-RPC _request_, unless the [session](#session-management)
     expires.
   - After all JSON-RPC _responses_ have been sent, the server **SHOULD** close the SSE
     stream.
   - Disconnection **MAY** occur at any time (e.g., due to network conditions).
     Therefore:
     - Disconnection **SHOULD NOT** be interpreted as the client cancelling its request.
     - To cancel, the client **SHOULD** explicitly send an MCP `CancelledNotification`.
     - To avoid message loss due to disconnection, the server **MAY** make the stream
       [resumable](#resumability-and-redelivery).

### Listening for Messages from the Server

1. The client **MAY** issue an HTTP GET to the MCP endpoint. This can be used to open an
   SSE stream, allowing the server to communicate to the client, without the client first
   sending data via HTTP POST.
2. The client **MUST** include an `Accept` header, listing `text/event-stream` as a
   supported content type.
3. The server **MUST** either return `Content-Type: text/event-stream` in response to
   this HTTP GET, or else return HTTP 405 Method Not Allowed, indicating that the server
   does not offer an SSE stream at this endpoint.
4. If the server initiates an SSE stream:
   - The server **MAY** send JSON-RPC _requests_ and _notifications_ on the stream. These
     _requests_ and _notifications_ **MAY** be
     [batched](https://www.jsonrpc.org/specification#batch).
   - These messages **SHOULD** be unrelated to any concurrently-running JSON-RPC
     _request_ from the client.
   - The server **MUST NOT** send a JSON-RPC _response_ on the stream **unless**
     [resuming](#resumability-and-redelivery) a stream associated with a previous client
     request.
   - The server **MAY** close the SSE stream at any time.
   - The client **MAY** close the SSE stream at any time.

### Multiple Connections

1. The client **MAY** remain connected to multiple SSE streams simultaneously.
2. The server **MUST** send each of its JSON-RPC messages on only one of the connected
   streams; that is, it **MUST NOT** broadcast the same message across multiple streams.
   - The risk of message loss **MAY** be mitigated by making the stream
     [resumable](#resumability-and-redelivery).

### Resumability and Redelivery

To support resuming broken connections, and redelivering messages that might otherwise be
lost:

1. Servers **MAY** attach an `id` field to their SSE events, as described in the
   [SSE standard](https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation).
   - If present, the ID **MUST** be globally unique across all streams within that
     [session](#session-management)—or all streams with that specific client, if session
     management is not in use.
2. If the client wishes to resume after a broken connection, it **SHOULD** issue an HTTP
   GET to the MCP endpoint, and include the
   [`Last-Event-ID`](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-last-event-id-header)
   header to indicate the last event ID it received.
   - The server **MAY** use this header to replay messages that would have been sent
     after the last event ID, _on the stream that was disconnected_, and to resume the
     stream from that point.
   - The server **MUST NOT** replay messages that would have been delivered on a
     different stream.

In other words, these event IDs should be assigned by servers on a _per-stream_ basis, to
act as a cursor within that particular stream.

### Session Management

An MCP "session" consists of logically related interactions between a client and a
server, beginning with the [initialization phase](/specification/2025-03-26/basic/lifecycle). To support
servers which want to establish stateful sessions:

1. A server using the Streamable HTTP transport **MAY** assign a session ID at
   initialization time, by including it in an `Mcp-Session-Id` header on the HTTP
   response containing the `InitializeResult`.
   - The session ID **SHOULD** be globally unique and cryptographically secure (e.g., a
     securely generated UUID, a JWT, or a cryptographic hash).
   - The session ID **MUST** only contain visible ASCII characters (ranging from 0x21 to
     0x7E).
2. If an `Mcp-Session-Id` is returned by the server during initialization, clients using
   the Streamable HTTP transport **MUST** include it in the `Mcp-Session-Id` header on
   all of their subsequent HTTP requests.
   - Servers that require a session ID **SHOULD** respond to requests without an
     `Mcp-Session-Id` header (other than initialization) with HTTP 400 Bad Request.
3. The server **MAY** terminate the session at any time, after which it **MUST** respond
   to requests containing that session ID with HTTP 404 Not Found.
4. When a client receives HTTP 404 in response to a request containing an
   `Mcp-Session-Id`, it **MUST** start a new session by sending a new `InitializeRequest`
   without a session ID attached.
5. Clients that no longer need a particular session (e.g., because the user is leaving
   the client application) **SHOULD** send an HTTP DELETE to the MCP endpoint with the
   `Mcp-Session-Id` header, to explicitly terminate the session.
   - The server **MAY** respond to this request with HTTP 405 Method Not Allowed,
     indicating that the server does not allow clients to terminate sessions.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Server

    note over Client, Server: initialization

    Client->>+Server: POST InitializeRequest
    Server->>-Client: InitializeResponse<br>Mcp-Session-Id: 1868a90c...

    Client->>+Server: POST InitializedNotification<br>Mcp-Session-Id: 1868a90c...
    Server->>-Client: 202 Accepted

    note over Client, Server: client requests
    Client->>+Server: POST ... request ...<br>Mcp-Session-Id: 1868a90c...

    alt single HTTP response
      Server->>Client: ... response ...
    else server opens SSE stream
      loop while connection remains open
          Server-)Client: ... SSE messages from server ...
      end
      Server-)Client: SSE event: ... response ...
    end
    deactivate Server

    note over Client, Server: client notifications/responses
    Client->>+Server: POST ... notification/response ...<br>Mcp-Session-Id: 1868a90c...
    Server->>-Client: 202 Accepted

    note over Client, Server: server requests
    Client->>+Server: GET<br>Mcp-Session-Id: 1868a90c...
    loop while connection remains open
        Server-)Client: ... SSE messages from server ...
    end
    deactivate Server

```

### Backwards Compatibility

Clients and servers can maintain backwards compatibility with the deprecated [HTTP+SSE
transport](/specification/2024-11-05/basic/transports#http-with-sse) (from
protocol version 2024-11-05) as follows:

**Servers** wanting to support older clients should:

- Continue to host both the SSE and POST endpoints of the old transport, alongside the
  new "MCP endpoint" defined for the Streamable HTTP transport.
  - It is also possible to combine the old POST endpoint and the new MCP endpoint, but
    this may introduce unneeded complexity.

**Clients** wanting to support older servers should:

1. Accept an MCP server URL from the user, which may point to either a server using the
   old transport or the new transport.
2. Attempt to POST an `InitializeRequest` to the server URL, with an `Accept` header as
   defined above:
   - If it succeeds, the client can assume this is a server supporting the new Streamable
     HTTP transport.
   - If it fails with an HTTP 4xx status code (e.g., 405 Method Not Allowed or 404 Not
     Found):
     - Issue a GET request to the server URL, expecting that this will open an SSE stream
       and return an `endpoint` event as the first event.
     - When the `endpoint` event arrives, the client can assume this is a server running
       the old HTTP+SSE transport, and should use that transport for all subsequent
       communication.

## Custom Transports

Clients and servers **MAY** implement additional custom transport mechanisms to suit
their specific needs. The protocol is transport-agnostic and can be implemented over any
communication channel that supports bidirectional message exchange.

Implementers who choose to support custom transports **MUST** ensure they preserve the
JSON-RPC message format and lifecycle requirements defined by MCP. Custom transports
**SHOULD** document their specific connection establishment and message exchange patterns
to aid interoperability.


---
modelcontextprotocol/docs/specification/2025-03-26/basic/utilities/cancellation.mdx
---
---
title: Cancellation
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) supports optional cancellation of in-progress requests
through notification messages. Either side can send a cancellation notification to
indicate that a previously-issued request should be terminated.

## Cancellation Flow

When a party wants to cancel an in-progress request, it sends a `notifications/cancelled`
notification containing:

- The ID of the request to cancel
- An optional reason string that can be logged or displayed

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "123",
    "reason": "User requested cancellation"
  }
}
```

## Behavior Requirements

1. Cancellation notifications **MUST** only reference requests that:
   - Were previously issued in the same direction
   - Are believed to still be in-progress
2. The `initialize` request **MUST NOT** be cancelled by clients
3. Receivers of cancellation notifications **SHOULD**:
   - Stop processing the cancelled request
   - Free associated resources
   - Not send a response for the cancelled request
4. Receivers **MAY** ignore cancellation notifications if:
   - The referenced request is unknown
   - Processing has already completed
   - The request cannot be cancelled
5. The sender of the cancellation notification **SHOULD** ignore any response to the
   request that arrives afterward

## Timing Considerations

Due to network latency, cancellation notifications may arrive after request processing
has completed, and potentially after a response has already been sent.

Both parties **MUST** handle these race conditions gracefully:

```mermaid
sequenceDiagram
   participant Client
   participant Server

   Client->>Server: Request (ID: 123)
   Note over Server: Processing starts
   Client--)Server: notifications/cancelled (ID: 123)
   alt
      Note over Server: Processing may have<br/>completed before<br/>cancellation arrives
   else If not completed
      Note over Server: Stop processing
   end
```

## Implementation Notes

- Both parties **SHOULD** log cancellation reasons for debugging
- Application UIs **SHOULD** indicate when cancellation is requested

## Error Handling

Invalid cancellation notifications **SHOULD** be ignored:

- Unknown request IDs
- Already completed requests
- Malformed notifications

This maintains the "fire and forget" nature of notifications while allowing for race
conditions in asynchronous communication.


---
modelcontextprotocol/docs/specification/2025-03-26/basic/utilities/ping.mdx
---
---
title: Ping
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol includes an optional ping mechanism that allows either party
to verify that their counterpart is still responsive and the connection is alive.

## Overview

The ping functionality is implemented through a simple request/response pattern. Either
the client or server can initiate a ping by sending a `ping` request.

## Message Format

A ping request is a standard JSON-RPC request with no parameters:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "ping"
}
```

## Behavior Requirements

1. The receiver **MUST** respond promptly with an empty response:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {}
}
```

2. If no response is received within a reasonable timeout period, the sender **MAY**:
   - Consider the connection stale
   - Terminate the connection
   - Attempt reconnection procedures

## Usage Patterns

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Sender->>Receiver: ping request
    Receiver->>Sender: empty response
```

## Implementation Considerations

- Implementations **SHOULD** periodically issue pings to detect connection health
- The frequency of pings **SHOULD** be configurable
- Timeouts **SHOULD** be appropriate for the network environment
- Excessive pinging **SHOULD** be avoided to reduce network overhead

## Error Handling

- Timeouts **SHOULD** be treated as connection failures
- Multiple failed pings **MAY** trigger connection reset
- Implementations **SHOULD** log ping failures for diagnostics


---
modelcontextprotocol/docs/specification/2025-03-26/basic/utilities/progress.mdx
---
---
title: Progress
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) supports optional progress tracking for long-running
operations through notification messages. Either side can send progress notifications to
provide updates about operation status.

## Progress Flow

When a party wants to _receive_ progress updates for a request, it includes a
`progressToken` in the request metadata.

- Progress tokens **MUST** be a string or integer value
- Progress tokens can be chosen by the sender using any means, but **MUST** be unique
  across all active requests.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "some_method",
  "params": {
    "_meta": {
      "progressToken": "abc123"
    }
  }
}
```

The receiver **MAY** then send progress notifications containing:

- The original progress token
- The current progress value so far
- An optional "total" value
- An optional "message" value

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100,
    "message": "Reticulating splines..."
  }
}
```

- The `progress` value **MUST** increase with each notification, even if the total is
  unknown.
- The `progress` and the `total` values **MAY** be floating point.
- The `message` field **SHOULD** provide relevant human readable progress information.

## Behavior Requirements

1. Progress notifications **MUST** only reference tokens that:

   - Were provided in an active request
   - Are associated with an in-progress operation

2. Receivers of progress requests **MAY**:
   - Choose not to send any progress notifications
   - Send notifications at whatever frequency they deem appropriate
   - Omit the total value if unknown

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Note over Sender,Receiver: Request with progress token
    Sender->>Receiver: Method request with progressToken

    Note over Sender,Receiver: Progress updates
    loop Progress Updates
        Receiver-->>Sender: Progress notification (0.2/1.0)
        Receiver-->>Sender: Progress notification (0.6/1.0)
        Receiver-->>Sender: Progress notification (1.0/1.0)
    end

    Note over Sender,Receiver: Operation complete
    Receiver->>Sender: Method response
```

## Implementation Notes

- Senders and receivers **SHOULD** track active progress tokens
- Both parties **SHOULD** implement rate limiting to prevent flooding
- Progress notifications **MUST** stop after completion


---
modelcontextprotocol/docs/specification/2025-03-26/client/roots.mdx
---
---
title: Roots
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for clients to expose
filesystem "roots" to servers. Roots define the boundaries of where servers can operate
within the filesystem, allowing them to understand which directories and files they have
access to. Servers can request the list of roots from supporting clients and receive
notifications when that list changes.

## User Interaction Model

Roots in MCP are typically exposed through workspace or project configuration interfaces.

For example, implementations could offer a workspace/project picker that allows users to
select directories and files the server should have access to. This can be combined with
automatic workspace detection from version control systems or project files.

However, implementations are free to expose roots through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Clients that support roots **MUST** declare the `roots` capability during
[initialization](/specification/2025-03-26/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "roots": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the client will emit notifications when the list of roots
changes.

## Protocol Messages

### Listing Roots

To retrieve roots, servers send a `roots/list` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "roots/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "roots": [
      {
        "uri": "file:///home/user/projects/myproject",
        "name": "My Project"
      }
    ]
  }
}
```

### Root List Changes

When roots change, clients that support `listChanged` **MUST** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/roots/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client

    Note over Server,Client: Discovery
    Server->>Client: roots/list
    Client-->>Server: Available roots

    Note over Server,Client: Changes
    Client--)Server: notifications/roots/list_changed
    Server->>Client: roots/list
    Client-->>Server: Updated roots
```

## Data Types

### Root

A root definition includes:

- `uri`: Unique identifier for the root. This **MUST** be a `file://` URI in the current
  specification.
- `name`: Optional human-readable name for display purposes.

Example roots for different use cases:

#### Project Directory

```json
{
  "uri": "file:///home/user/projects/myproject",
  "name": "My Project"
}
```

#### Multiple Repositories

```json
[
  {
    "uri": "file:///home/user/repos/frontend",
    "name": "Frontend Repository"
  },
  {
    "uri": "file:///home/user/repos/backend",
    "name": "Backend Repository"
  }
]
```

## Error Handling

Clients **SHOULD** return standard JSON-RPC errors for common failure cases:

- Client does not support roots: `-32601` (Method not found)
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Roots not supported",
    "data": {
      "reason": "Client does not have roots capability"
    }
  }
}
```

## Security Considerations

1. Clients **MUST**:

   - Only expose roots with appropriate permissions
   - Validate all root URIs to prevent path traversal
   - Implement proper access controls
   - Monitor root accessibility

2. Servers **SHOULD**:
   - Handle cases where roots become unavailable
   - Respect root boundaries during operations
   - Validate all paths against provided roots

## Implementation Guidelines

1. Clients **SHOULD**:

   - Prompt users for consent before exposing roots to servers
   - Provide clear user interfaces for root management
   - Validate root accessibility before exposing
   - Monitor for root changes

2. Servers **SHOULD**:
   - Check for roots capability before usage
   - Handle root list changes gracefully
   - Respect root boundaries in operations
   - Cache root information appropriately


---
modelcontextprotocol/docs/specification/2025-03-26/client/sampling.mdx
---
---
title: Sampling
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to request LLM
sampling ("completions" or "generations") from language models via clients. This flow
allows clients to maintain control over model access, selection, and permissions while
enabling servers to leverage AI capabilities&mdash;with no server API keys necessary.
Servers can request text, audio, or image-based interactions and optionally include
context from MCP servers in their prompts.

## User Interaction Model

Sampling in MCP allows servers to implement agentic behaviors, by enabling LLM calls to
occur _nested_ inside other MCP server features.

Implementations are free to expose sampling through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny sampling requests.

Applications **SHOULD**:

- Provide UI that makes it easy and intuitive to review sampling requests
- Allow users to view and edit prompts before sending
- Present generated responses for review before delivery
</Warning>

## Capabilities

Clients that support sampling **MUST** declare the `sampling` capability during
[initialization](/specification/2025-03-26/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "sampling": {}
  }
}
```

## Protocol Messages

### Creating Messages

To request a language model generation, servers send a `sampling/createMessage` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "What is the capital of France?"
        }
      }
    ],
    "modelPreferences": {
      "hints": [
        {
          "name": "claude-3-sonnet"
        }
      ],
      "intelligencePriority": 0.8,
      "speedPriority": 0.5
    },
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 100
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "content": {
      "type": "text",
      "text": "The capital of France is Paris."
    },
    "model": "claude-3-sonnet-20240307",
    "stopReason": "endTurn"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client
    participant User
    participant LLM

    Note over Server,Client: Server initiates sampling
    Server->>Client: sampling/createMessage

    Note over Client,User: Human-in-the-loop review
    Client->>User: Present request for approval
    User-->>Client: Review and approve/modify

    Note over Client,LLM: Model interaction
    Client->>LLM: Forward approved request
    LLM-->>Client: Return generation

    Note over Client,User: Response review
    Client->>User: Present response for approval
    User-->>Client: Review and approve/modify

    Note over Server,Client: Complete request
    Client-->>Server: Return approved response
```

## Data Types

### Messages

Sampling messages can contain:

#### Text Content

```json
{
  "type": "text",
  "text": "The message content"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/jpeg"
}
```

#### Audio Content

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

### Model Preferences

Model selection in MCP requires careful abstraction since servers and clients may use
different AI providers with distinct model offerings. A server cannot simply request a
specific model by name since the client may not have access to that exact model or may
prefer to use a different provider's equivalent model.

To solve this, MCP implements a preference system that combines abstract capability
priorities with optional model hints:

#### Capability Priorities

Servers express their needs through three normalized priority values (0-1):

- `costPriority`: How important is minimizing costs? Higher values prefer cheaper models.
- `speedPriority`: How important is low latency? Higher values prefer faster models.
- `intelligencePriority`: How important are advanced capabilities? Higher values prefer
  more capable models.

#### Model Hints

While priorities help select models based on characteristics, `hints` allow servers to
suggest specific models or model families:

- Hints are treated as substrings that can match model names flexibly
- Multiple hints are evaluated in order of preference
- Clients **MAY** map hints to equivalent models from different providers
- Hints are advisory&mdash;clients make final model selection

For example:

```json
{
  "hints": [
    { "name": "claude-3-sonnet" }, // Prefer Sonnet-class models
    { "name": "claude" } // Fall back to any Claude model
  ],
  "costPriority": 0.3, // Cost is less important
  "speedPriority": 0.8, // Speed is very important
  "intelligencePriority": 0.5 // Moderate capability needs
}
```

The client processes these preferences to select an appropriate model from its available
options. For instance, if the client doesn't have access to Claude models but has Gemini,
it might map the sonnet hint to `gemini-1.5-pro` based on similar capabilities.

## Error Handling

Clients **SHOULD** return errors for common failure cases:

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -1,
    "message": "User rejected sampling request"
  }
}
```

## Security Considerations

1. Clients **SHOULD** implement user approval controls
2. Both parties **SHOULD** validate message content
3. Clients **SHOULD** respect model preference hints
4. Clients **SHOULD** implement rate limiting
5. Both parties **MUST** handle sensitive data appropriately


---
modelcontextprotocol/docs/specification/2025-03-26/server/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: 2025-03-26</Info>

Servers provide the fundamental building blocks for adding context to language models via
MCP. These primitives enable rich interactions between clients, servers, and language
models:

- **Prompts**: Pre-defined templates or instructions that guide language model
  interactions
- **Resources**: Structured data or content that provides additional context to the model
- **Tools**: Executable functions that allow models to perform actions or retrieve
  information

Each primitive can be summarized in the following control hierarchy:

| Primitive | Control                | Description                                        | Example                         |
| --------- | ---------------------- | -------------------------------------------------- | ------------------------------- |
| Prompts   | User-controlled        | Interactive templates invoked by user choice       | Slash commands, menu options    |
| Resources | Application-controlled | Contextual data attached and managed by the client | File contents, git history      |
| Tools     | Model-controlled       | Functions exposed to the LLM to take actions       | API POST requests, file writing |

Explore these key primitives in more detail below:

<CardGroup cols={3}>
  <Card title="Prompts" icon="message" href="prompts" />
  <Card title="Resources" icon="file-lines" href="resources" />
  <Card title="Tools" icon="wrench" href="tools" />
</CardGroup>


---
modelcontextprotocol/docs/specification/2025-03-26/server/prompts.mdx
---
---
title: Prompts
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose prompt
templates to clients. Prompts allow servers to provide structured messages and
instructions for interacting with language models. Clients can discover available
prompts, retrieve their contents, and provide arguments to customize them.

## User Interaction Model

Prompts are designed to be **user-controlled**, meaning they are exposed from servers to
clients with the intention of the user being able to explicitly select them for use.

Typically, prompts would be triggered through user-initiated commands in the user
interface, which allows users to naturally discover and invoke available prompts.

For example, as slash commands:

![Example of prompt exposed as slash command](slash-command.png)

However, implementors are free to expose prompts through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

## Capabilities

Servers that support prompts **MUST** declare the `prompts` capability during
[initialization](/specification/2025-03-26/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available prompts changes.

## Protocol Messages

### Listing Prompts

To retrieve available prompts, clients send a `prompts/list` request. This operation
supports [pagination](/specification/2025-03-26/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "description": "Asks the LLM to analyze code quality and suggest improvements",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Getting a Prompt

To retrieve a specific prompt, clients send a `prompts/get` request. Arguments may be
auto-completed through [the completion API](/specification/2025-03-26/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n    print('world')"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n    print('world')"
        }
      }
    ]
  }
}
```

### List Changed Notification

When the list of available prompts changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: prompts/list
    Server-->>Client: List of prompts

    Note over Client,Server: Usage
    Client->>Server: prompts/get
    Server-->>Client: Prompt content

    opt listChanged
      Note over Client,Server: Changes
      Server--)Client: prompts/list_changed
      Client->>Server: prompts/list
      Server-->>Client: Updated prompts
    end
```

## Data Types

### Prompt

A prompt definition includes:

- `name`: Unique identifier for the prompt
- `description`: Optional human-readable description
- `arguments`: Optional list of arguments for customization

### PromptMessage

Messages in a prompt can contain:

- `role`: Either "user" or "assistant" to indicate the speaker
- `content`: One of the following content types:

#### Text Content

Text content represents plain text messages:

```json
{
  "type": "text",
  "text": "The text content of the message"
}
```

This is the most common content type used for natural language interactions.

#### Image Content

Image content allows including visual information in messages:

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/png"
}
```

The image data **MUST** be base64-encoded and include a valid MIME type. This enables
multi-modal interactions where visual context is important.

#### Audio Content

Audio content allows including audio information in messages:

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

The audio data MUST be base64-encoded and include a valid MIME type. This enables
multi-modal interactions where audio context is important.

#### Embedded Resources

Embedded resources allow referencing server-side resources directly in messages:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

Resources can contain either text or binary (blob) data and **MUST** include:

- A valid resource URI
- The appropriate MIME type
- Either text content or base64-encoded blob data

Embedded resources enable prompts to seamlessly incorporate server-managed content like
documentation, code samples, or other reference materials directly into the conversation
flow.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid prompt name: `-32602` (Invalid params)
- Missing required arguments: `-32602` (Invalid params)
- Internal errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD** validate prompt arguments before processing
2. Clients **SHOULD** handle pagination for large prompt lists
3. Both parties **SHOULD** respect capability negotiation

## Security

Implementations **MUST** carefully validate all prompt inputs and outputs to prevent
injection attacks or unauthorized access to resources.


---
modelcontextprotocol/docs/specification/2025-03-26/server/resources.mdx
---
---
title: Resources
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose
resources to clients. Resources allow servers to share data that provides context to
language models, such as files, database schemas, or application-specific information.
Each resource is uniquely identified by a
[URI](https://datatracker.ietf.org/doc/html/rfc3986).

## User Interaction Model

Resources in MCP are designed to be **application-driven**, with host applications
determining how to incorporate context based on their needs.

For example, applications could:

- Expose resources through UI elements for explicit selection, in a tree or list view
- Allow the user to search through and filter available resources
- Implement automatic context inclusion, based on heuristics or the AI model's selection

![Example of resource context picker](resource-picker.png)

However, implementations are free to expose resources through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Servers that support resources **MUST** declare the `resources` capability:

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

The capability supports two optional features:

- `subscribe`: whether the client can subscribe to be notified of changes to individual
  resources.
- `listChanged`: whether the server will emit notifications when the list of available
  resources changes.

Both `subscribe` and `listChanged` are optional&mdash;servers can support neither,
either, or both:

```json
{
  "capabilities": {
    "resources": {} // Neither feature supported
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true // Only subscriptions supported
    }
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "listChanged": true // Only list change notifications supported
    }
  }
}
```

## Protocol Messages

### Listing Resources

To discover available resources, clients send a `resources/list` request. This operation
supports [pagination](/specification/2025-03-26/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///project/src/main.rs",
        "name": "main.rs",
        "description": "Primary application entry point",
        "mimeType": "text/x-rust"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Reading Resources

To retrieve resource contents, clients send a `resources/read` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///project/src/main.rs",
        "mimeType": "text/x-rust",
        "text": "fn main() {\n    println!(\"Hello world!\");\n}"
      }
    ]
  }
}
```

### Resource Templates

Resource templates allow servers to expose parameterized resources using
[URI templates](https://datatracker.ietf.org/doc/html/rfc6570). Arguments may be
auto-completed through [the completion API](/specification/2025-03-26/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/templates/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "Project Files",
        "description": "Access files in the project directory",
        "mimeType": "application/octet-stream"
      }
    ]
  }
}
```

### List Changed Notification

When the list of available resources changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

### Subscriptions

The protocol supports optional subscriptions to resource changes. Clients can subscribe
to specific resources and receive notifications when they change:

**Subscribe Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Update Notification:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Resource Discovery
    Client->>Server: resources/list
    Server-->>Client: List of resources

    Note over Client,Server: Resource Access
    Client->>Server: resources/read
    Server-->>Client: Resource contents

    Note over Client,Server: Subscriptions
    Client->>Server: resources/subscribe
    Server-->>Client: Subscription confirmed

    Note over Client,Server: Updates
    Server--)Client: notifications/resources/updated
    Client->>Server: resources/read
    Server-->>Client: Updated contents
```

## Data Types

### Resource

A resource definition includes:

- `uri`: Unique identifier for the resource
- `name`: Human-readable name
- `description`: Optional description
- `mimeType`: Optional MIME type
- `size`: Optional size in bytes

### Resource Contents

Resources can contain either text or binary data:

#### Text Content

```json
{
  "uri": "file:///example.txt",
  "mimeType": "text/plain",
  "text": "Resource content"
}
```

#### Binary Content

```json
{
  "uri": "file:///example.png",
  "mimeType": "image/png",
  "blob": "base64-encoded-data"
}
```

## Common URI Schemes

The protocol defines several standard URI schemes. This list not
exhaustive&mdash;implementations are always free to use additional, custom URI schemes.

### https://

Used to represent a resource available on the web.

Servers **SHOULD** use this scheme only when the client is able to fetch and load the
resource directly from the web on its own—that is, it doesn’t need to read the resource
via the MCP server.

For other use cases, servers **SHOULD** prefer to use another URI scheme, or define a
custom one, even if the server will itself be downloading resource contents over the
internet.

### file://

Used to identify resources that behave like a filesystem. However, the resources do not
need to map to an actual physical filesystem.

MCP servers **MAY** identify file:// resources with an
[XDG MIME type](https://specifications.freedesktop.org/shared-mime-info-spec/0.14/ar01s02.html#id-1.3.14),
like `inode/directory`, to represent non-regular files (such as directories) that don’t
otherwise have a standard MIME type.

### git://

Git version control integration.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Resource not found: `-32002`
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32002,
    "message": "Resource not found",
    "data": {
      "uri": "file:///nonexistent.txt"
    }
  }
}
```

## Security Considerations

1. Servers **MUST** validate all resource URIs
2. Access controls **SHOULD** be implemented for sensitive resources
3. Binary data **MUST** be properly encoded
4. Resource permissions **SHOULD** be checked before operations


---
modelcontextprotocol/docs/specification/2025-03-26/server/tools.mdx
---
---
title: Tools
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) allows servers to expose tools that can be invoked by
language models. Tools enable models to interact with external systems, such as querying
databases, calling APIs, or performing computations. Each tool is uniquely identified by
a name and includes metadata describing its schema.

## User Interaction Model

Tools in MCP are designed to be **model-controlled**, meaning that the language model can
discover and invoke tools automatically based on its contextual understanding and the
user's prompts.

However, implementations are free to expose tools through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny tool invocations.

Applications **SHOULD**:

- Provide UI that makes clear which tools are being exposed to the AI model
- Insert clear visual indicators when tools are invoked
- Present confirmation prompts to the user for operations, to ensure a human is in the
  loop
</Warning>

## Capabilities

Servers that support tools **MUST** declare the `tools` capability:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available tools changes.

## Protocol Messages

### Listing Tools

To discover available tools, clients send a `tools/list` request. This operation supports
[pagination](/specification/2025-03-26/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather information for a location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or zip code"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Calling Tools

To invoke a tool, clients send a `tools/call` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "New York"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in New York:\nTemperature: 72°F\nConditions: Partly cloudy"
      }
    ],
    "isError": false
  }
}
```

### List Changed Notification

When the list of available tools changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant LLM
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: tools/list
    Server-->>Client: List of tools

    Note over Client,LLM: Tool Selection
    LLM->>Client: Select tool to use

    Note over Client,Server: Invocation
    Client->>Server: tools/call
    Server-->>Client: Tool result
    Client->>LLM: Process result

    Note over Client,Server: Updates
    Server--)Client: tools/list_changed
    Client->>Server: tools/list
    Server-->>Client: Updated tools
```

## Data Types

### Tool

A tool definition includes:

- `name`: Unique identifier for the tool
- `description`: Human-readable description of functionality
- `inputSchema`: JSON Schema defining expected parameters
- `annotations`: optional properties describing tool behavior

<Warning>For trust & safety and security, clients **MUST** consider
tool annotations to be untrusted unless they come from trusted servers.</Warning>

### Tool Result

Tool results can contain multiple content items of different types:

#### Text Content

```json
{
  "type": "text",
  "text": "Tool result text"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-data",
  "mimeType": "image/png"
}
```

#### Audio Content

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

#### Embedded Resources

[Resources](/specification/2025-03-26/server/resources) **MAY** be embedded, to provide additional context
or data, behind a URI that can be subscribed to or fetched again by the client later:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

## Error Handling

Tools use two error reporting mechanisms:

1. **Protocol Errors**: Standard JSON-RPC errors for issues like:

   - Unknown tools
   - Invalid arguments
   - Server errors

2. **Tool Execution Errors**: Reported in tool results with `isError: true`:
   - API failures
   - Invalid input data
   - Business logic errors

Example protocol error:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32602,
    "message": "Unknown tool: invalid_tool_name"
  }
}
```

Example tool execution error:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Failed to fetch weather data: API rate limit exceeded"
      }
    ],
    "isError": true
  }
}
```

## Security Considerations

1. Servers **MUST**:

   - Validate all tool inputs
   - Implement proper access controls
   - Rate limit tool invocations
   - Sanitize tool outputs

2. Clients **SHOULD**:
   - Prompt for user confirmation on sensitive operations
   - Show tool inputs to the user before calling the server, to avoid malicious or
     accidental data exfiltration
   - Validate tool results before passing to LLM
   - Implement timeouts for tool calls
   - Log tool usage for audit purposes


---
modelcontextprotocol/docs/specification/2025-03-26/server/utilities/completion.mdx
---
---
title: Completion
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to offer
argument autocompletion suggestions for prompts and resource URIs. This enables rich,
IDE-like experiences where users receive contextual suggestions while entering argument
values.

## User Interaction Model

Completion in MCP is designed to support interactive user experiences similar to IDE code
completion.

For example, applications may show completion suggestions in a dropdown or popup menu as
users type, with the ability to filter and select from available options.

However, implementations are free to expose completion through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Servers that support completions **MUST** declare the `completions` capability:

```json
{
  "capabilities": {
    "completions": {}
  }
}
```

## Protocol Messages

### Requesting Completions

To get completion suggestions, clients send a `completion/complete` request specifying
what is being completed through a reference type:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "code_review"
    },
    "argument": {
      "name": "language",
      "value": "py"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "completion": {
      "values": ["python", "pytorch", "pyside"],
      "total": 10,
      "hasMore": true
    }
  }
}
```

### Reference Types

The protocol supports two types of completion references:

| Type           | Description                 | Example                                             |
| -------------- | --------------------------- | --------------------------------------------------- |
| `ref/prompt`   | References a prompt by name | `{"type": "ref/prompt", "name": "code_review"}`     |
| `ref/resource` | References a resource URI   | `{"type": "ref/resource", "uri": "file:///{path}"}` |

### Completion Results

Servers return an array of completion values ranked by relevance, with:

- Maximum 100 items per response
- Optional total number of available matches
- Boolean indicating if additional results exist

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client: User types argument
    Client->>Server: completion/complete
    Server-->>Client: Completion suggestions

    Note over Client: User continues typing
    Client->>Server: completion/complete
    Server-->>Client: Refined suggestions
```

## Data Types

### CompleteRequest

- `ref`: A `PromptReference` or `ResourceReference`
- `argument`: Object containing:
  - `name`: Argument name
  - `value`: Current value

### CompleteResult

- `completion`: Object containing:
  - `values`: Array of suggestions (max 100)
  - `total`: Optional total matches
  - `hasMore`: Additional results flag

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Method not found: `-32601` (Capability not supported)
- Invalid prompt name: `-32602` (Invalid params)
- Missing required arguments: `-32602` (Invalid params)
- Internal errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD**:

   - Return suggestions sorted by relevance
   - Implement fuzzy matching where appropriate
   - Rate limit completion requests
   - Validate all inputs

2. Clients **SHOULD**:
   - Debounce rapid completion requests
   - Cache completion results where appropriate
   - Handle missing or partial results gracefully

## Security

Implementations **MUST**:

- Validate all completion inputs
- Implement appropriate rate limiting
- Control access to sensitive suggestions
- Prevent completion-based information disclosure


---
modelcontextprotocol/docs/specification/2025-03-26/server/utilities/logging.mdx
---
---
title: Logging
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to send
structured log messages to clients. Clients can control logging verbosity by setting
minimum log levels, with servers sending notifications containing severity levels,
optional logger names, and arbitrary JSON-serializable data.

## User Interaction Model

Implementations are free to expose logging through any interface pattern that suits their
needs&mdash;the protocol itself does not mandate any specific user interaction model.

## Capabilities

Servers that emit log message notifications **MUST** declare the `logging` capability:

```json
{
  "capabilities": {
    "logging": {}
  }
}
```

## Log Levels

The protocol follows the standard syslog severity levels specified in
[RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1):

| Level     | Description                      | Example Use Case           |
| --------- | -------------------------------- | -------------------------- |
| debug     | Detailed debugging information   | Function entry/exit points |
| info      | General informational messages   | Operation progress updates |
| notice    | Normal but significant events    | Configuration changes      |
| warning   | Warning conditions               | Deprecated feature usage   |
| error     | Error conditions                 | Operation failures         |
| critical  | Critical conditions              | System component failures  |
| alert     | Action must be taken immediately | Data corruption detected   |
| emergency | System is unusable               | Complete system failure    |

## Protocol Messages

### Setting Log Level

To configure the minimum log level, clients **MAY** send a `logging/setLevel` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "logging/setLevel",
  "params": {
    "level": "info"
  }
}
```

### Log Message Notifications

Servers send log messages using `notifications/message` notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "error",
    "logger": "database",
    "data": {
      "error": "Connection failed",
      "details": {
        "host": "localhost",
        "port": 5432
      }
    }
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Configure Logging
    Client->>Server: logging/setLevel (info)
    Server-->>Client: Empty Result

    Note over Client,Server: Server Activity
    Server--)Client: notifications/message (info)
    Server--)Client: notifications/message (warning)
    Server--)Client: notifications/message (error)

    Note over Client,Server: Level Change
    Client->>Server: logging/setLevel (error)
    Server-->>Client: Empty Result
    Note over Server: Only sends error level<br/>and above
```

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid log level: `-32602` (Invalid params)
- Configuration errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD**:

   - Rate limit log messages
   - Include relevant context in data field
   - Use consistent logger names
   - Remove sensitive information

2. Clients **MAY**:
   - Present log messages in the UI
   - Implement log filtering/search
   - Display severity visually
   - Persist log messages

## Security

1. Log messages **MUST NOT** contain:

   - Credentials or secrets
   - Personal identifying information
   - Internal system details that could aid attacks

2. Implementations **SHOULD**:
   - Rate limit messages
   - Validate all data fields
   - Control log access
   - Monitor for sensitive content


---
modelcontextprotocol/docs/specification/2025-03-26/server/utilities/pagination.mdx
---
---
title: Pagination
---

<Info>**Protocol Revision**: 2025-03-26</Info>

The Model Context Protocol (MCP) supports paginating list operations that may return
large result sets. Pagination allows servers to yield results in smaller chunks rather
than all at once.

Pagination is especially important when connecting to external services over the
internet, but also useful for local integrations to avoid performance issues with large
data sets.

## Pagination Model

Pagination in MCP uses an opaque cursor-based approach, instead of numbered pages.

- The **cursor** is an opaque string token, representing a position in the result set
- **Page size** is determined by the server, and clients **MUST NOT** assume a fixed page
  size

## Response Format

Pagination starts when the server sends a **response** that includes:

- The current page of results
- An optional `nextCursor` field if more results exist

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "resources": [...],
    "nextCursor": "eyJwYWdlIjogM30="
  }
}
```

## Request Format

After receiving a cursor, the client can _continue_ paginating by issuing a request
including that cursor:

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {
    "cursor": "eyJwYWdlIjogMn0="
  }
}
```

## Pagination Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: List Request (no cursor)
    loop Pagination Loop
      Server-->>Client: Page of results + nextCursor
      Client->>Server: List Request (with cursor)
    end
```

## Operations Supporting Pagination

The following MCP operations support pagination:

- `resources/list` - List available resources
- `resources/templates/list` - List resource templates
- `prompts/list` - List available prompts
- `tools/list` - List available tools

## Implementation Guidelines

1. Servers **SHOULD**:

   - Provide stable cursors
   - Handle invalid cursors gracefully

2. Clients **SHOULD**:

   - Treat a missing `nextCursor` as the end of results
   - Support both paginated and non-paginated flows

3. Clients **MUST** treat cursors as opaque tokens:
   - Don't make assumptions about cursor format
   - Don't attempt to parse or modify cursors
   - Don't persist cursors across sessions

## Error Handling

Invalid cursors **SHOULD** result in an error with code -32602 (Invalid params).


---
modelcontextprotocol/docs/specification/draft/changelog.mdx
---
---
title: Key Changes
---

This document lists changes made to the Model Context Protocol (MCP) specification since
the previous revision, [2025-03-26](/specification/2025-03-26).

## Major changes

1. Removed support for JSON-RPC **[batching](https://www.jsonrpc.org/specification#batch)**
   (PR [#416](https://github.com/modelcontextprotocol/specification/pull/416)) 
2. TODO

## Other schema changes

- TODO

## Full changelog

For a complete list of all changes that have been made since the last protocol revision,
[see GitHub](https://github.com/modelcontextprotocol/specification/compare/2025-03-26...draft).


---
modelcontextprotocol/docs/specification/draft/index.mdx
---
---
title: Specification
---

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open protocol that
enables seamless integration between LLM applications and external data sources and
tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating
custom AI workflows, MCP provides a standardized way to connect LLMs with the context
they need.

This specification defines the authoritative protocol requirements, based on the
TypeScript schema in
[schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/draft/schema.ts).

For implementation guides and examples, visit
[modelcontextprotocol.io](https://modelcontextprotocol.io).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD
NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14)
[[RFC2119](https://datatracker.ietf.org/doc/html/rfc2119)]
[[RFC8174](https://datatracker.ietf.org/doc/html/rfc8174)] when, and only when, they
appear in all capitals, as shown here.

## Overview

MCP provides a standardized way for applications to:

- Share contextual information with language models
- Expose tools and capabilities to AI systems
- Build composable integrations and workflows

The protocol uses [JSON-RPC](https://www.jsonrpc.org/) 2.0 messages to establish
communication between:

- **Hosts**: LLM applications that initiate connections
- **Clients**: Connectors within the host application
- **Servers**: Services that provide context and capabilities

MCP takes some inspiration from the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/), which
standardizes how to add support for programming languages across a whole ecosystem of
development tools. In a similar way, MCP standardizes how to integrate additional context
and tools into the ecosystem of AI applications.

## Key Details

### Base Protocol

- [JSON-RPC](https://www.jsonrpc.org/) message format
- Stateful connections
- Server and client capability negotiation

### Features

Servers offer any of the following features to clients:

- **Resources**: Context and data, for the user or the AI model to use
- **Prompts**: Templated messages and workflows for users
- **Tools**: Functions for the AI model to execute

Clients may offer the following feature to servers:

- **Sampling**: Server-initiated agentic behaviors and recursive LLM interactions

### Additional Utilities

- Configuration
- Progress tracking
- Cancellation
- Error reporting
- Logging

## Security and Trust & Safety

The Model Context Protocol enables powerful capabilities through arbitrary data access
and code execution paths. With this power comes important security and trust
considerations that all implementors must carefully address.

### Key Principles

1. **User Consent and Control**

   - Users must explicitly consent to and understand all data access and operations
   - Users must retain control over what data is shared and what actions are taken
   - Implementors should provide clear UIs for reviewing and authorizing activities

2. **Data Privacy**

   - Hosts must obtain explicit user consent before exposing user data to servers
   - Hosts must not transmit resource data elsewhere without user consent
   - User data should be protected with appropriate access controls

3. **Tool Safety**

   - Tools represent arbitrary code execution and must be treated with appropriate
     caution.
     - In particular, descriptions of tool behavior such as annotations should be
       considered untrusted, unless obtained from a trusted server.
   - Hosts must obtain explicit user consent before invoking any tool
   - Users should understand what each tool does before authorizing its use

4. **LLM Sampling Controls**
   - Users must explicitly approve any LLM sampling requests
   - Users should control:
     - Whether sampling occurs at all
     - The actual prompt that will be sent
     - What results the server can see
   - The protocol intentionally limits server visibility into prompts

### Implementation Guidelines

While MCP itself cannot enforce these security principles at the protocol level,
implementors **SHOULD**:

1. Build robust consent and authorization flows into their applications
2. Provide clear documentation of security implications
3. Implement appropriate access controls and data protections
4. Follow security best practices in their integrations
5. Consider privacy implications in their feature designs

## Learn More

Explore the detailed specification for each protocol component:

<CardGroup cols={5}>
  <Card title="Architecture" icon="sitemap" href="architecture" />
  <Card title="Base Protocol" icon="code" href="basic" />
  <Card title="Server Features" icon="server" href="server" />
  <Card title="Client Features" icon="user" href="client" />
  <Card title="Contributing" icon="pencil" href="contributing" />
</CardGroup>


---
modelcontextprotocol/docs/specification/draft/architecture/index.mdx
---
---
title: Architecture
---

The Model Context Protocol (MCP) follows a client-host-server architecture where each
host can run multiple client instances. This architecture enables users to integrate AI
capabilities across applications while maintaining clear security boundaries and
isolating concerns. Built on JSON-RPC, MCP provides a stateful session protocol focused
on context exchange and sampling coordination between clients and servers.

## Core Components

```mermaid
graph LR
    subgraph "Application Host Process"
        H[Host]
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
        H --> C1
        H --> C2
        H --> C3
    end

    subgraph "Local machine"
        S1[Server 1<br>Files & Git]
        S2[Server 2<br>Database]
        R1[("Local<br>Resource A")]
        R2[("Local<br>Resource B")]

        C1 --> S1
        C2 --> S2
        S1 <--> R1
        S2 <--> R2
    end

    subgraph "Internet"
        S3[Server 3<br>External APIs]
        R3[("Remote<br>Resource C")]

        C3 --> S3
        S3 <--> R3
    end
```

### Host

The host process acts as the container and coordinator:

- Creates and manages multiple client instances
- Controls client connection permissions and lifecycle
- Enforces security policies and consent requirements
- Handles user authorization decisions
- Coordinates AI/LLM integration and sampling
- Manages context aggregation across clients

### Clients

Each client is created by the host and maintains an isolated server connection:

- Establishes one stateful session per server
- Handles protocol negotiation and capability exchange
- Routes protocol messages bidirectionally
- Manages subscriptions and notifications
- Maintains security boundaries between servers

A host application creates and manages multiple clients, with each client having a 1:1
relationship with a particular server.

### Servers

Servers provide specialized context and capabilities:

- Expose resources, tools and prompts via MCP primitives
- Operate independently with focused responsibilities
- Request sampling through client interfaces
- Must respect security constraints
- Can be local processes or remote services

## Design Principles

MCP is built on several key design principles that inform its architecture and
implementation:

1. **Servers should be extremely easy to build**

   - Host applications handle complex orchestration responsibilities
   - Servers focus on specific, well-defined capabilities
   - Simple interfaces minimize implementation overhead
   - Clear separation enables maintainable code

2. **Servers should be highly composable**

   - Each server provides focused functionality in isolation
   - Multiple servers can be combined seamlessly
   - Shared protocol enables interoperability
   - Modular design supports extensibility

3. **Servers should not be able to read the whole conversation, nor "see into" other
   servers**

   - Servers receive only necessary contextual information
   - Full conversation history stays with the host
   - Each server connection maintains isolation
   - Cross-server interactions are controlled by the host
   - Host process enforces security boundaries

4. **Features can be added to servers and clients progressively**
   - Core protocol provides minimal required functionality
   - Additional capabilities can be negotiated as needed
   - Servers and clients evolve independently
   - Protocol designed for future extensibility
   - Backwards compatibility is maintained

## Capability Negotiation

The Model Context Protocol uses a capability-based negotiation system where clients and
servers explicitly declare their supported features during initialization. Capabilities
determine which protocol features and primitives are available during a session.

- Servers declare capabilities like resource subscriptions, tool support, and prompt
  templates
- Clients declare capabilities like sampling support and notification handling
- Both parties must respect declared capabilities throughout the session
- Additional capabilities can be negotiated through extensions to the protocol

```mermaid
sequenceDiagram
    participant Host
    participant Client
    participant Server

    Host->>+Client: Initialize client
    Client->>+Server: Initialize session with capabilities
    Server-->>Client: Respond with supported capabilities

    Note over Host,Server: Active Session with Negotiated Features

    loop Client Requests
        Host->>Client: User- or model-initiated action
        Client->>Server: Request (tools/resources)
        Server-->>Client: Response
        Client-->>Host: Update UI or respond to model
    end

    loop Server Requests
        Server->>Client: Request (sampling)
        Client->>Host: Forward to AI
        Host-->>Client: AI response
        Client-->>Server: Response
    end

    loop Notifications
        Server--)Client: Resource updates
        Client--)Server: Status changes
    end

    Host->>Client: Terminate
    Client->>-Server: End session
    deactivate Server
```

Each capability unlocks specific protocol features for use during the session. For
example:

- Implemented [server features](/specification/draft/server) must be advertised in the
  server's capabilities
- Emitting resource subscription notifications requires the server to declare
  subscription support
- Tool invocation requires the server to declare tool capabilities
- [Sampling](/specification/draft/client) requires the client to declare support in its
  capabilities

This capability negotiation ensures clients and servers have a clear understanding of
supported functionality while maintaining protocol extensibility.


---
modelcontextprotocol/docs/specification/draft/basic/authorization.mdx
---
---
title: Authorization
---

<Info>**Protocol Revision**: draft</Info>

## 1. Introduction

### 1.1 Purpose and Scope

The Model Context Protocol provides authorization capabilities at the transport level,
enabling MCP clients to make requests to restricted MCP servers on behalf of resource
owners. This specification defines the authorization flow for HTTP-based transports.

### 1.2 Protocol Requirements

Authorization is **OPTIONAL** for MCP implementations. When supported:

- Implementations using an HTTP-based transport **SHOULD** conform to this specification.
- Implementations using an STDIO transport **SHOULD NOT** follow this specification, and
  instead retrieve credentials from the environment.
- Implementations using alternative transports **MUST** follow established security best
  practices for their protocol.

### 1.3 Standards Compliance

This authorization mechanism is based on established specifications listed below, but
implements a selected subset of their features to ensure security and interoperability
while maintaining simplicity:

- OAuth 2.1 IETF DRAFT ([draft-ietf-oauth-v2-1-12](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12))
- OAuth 2.0 Authorization Server Metadata
  ([RFC8414](https://datatracker.ietf.org/doc/html/rfc8414))
- OAuth 2.0 Dynamic Client Registration Protocol
  ([RFC7591](https://datatracker.ietf.org/doc/html/rfc7591))
- OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728))

## 2. Authorization Flow

### 2.1 Overview

1. MCP authorization servers **MUST** implement OAuth 2.1 with appropriate security
   measures for both confidential and public clients.

1. MCP authorization servers and MCP clients **SHOULD** support the OAuth 2.0 Dynamic Client Registration
   Protocol ([RFC7591](https://datatracker.ietf.org/doc/html/rfc7591)).

1. MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728)).
   MCP clients **MUST** use OAuth 2.0 Protected Resource Metadata for authorization server discovery.

1. MCP authorization servers and MCP clients **MUST** implement OAuth 2.0 Authorization
   Server Metadata ([RFC8414](https://datatracker.ietf.org/doc/html/rfc8414)).

### 2.1.1 OAuth Grant Types

OAuth specifies different flows or grant types, which are different ways of obtaining an
access token. Each of these targets different use cases and scenarios.

MCP servers **SHOULD** support the OAuth grant types that best align with the intended
audience. For instance:

1. Authorization Code: useful when the client is acting on behalf of a (human) end user.
   - For instance, an agent calls an MCP tool implemented by a SaaS system.
2. Client Credentials: the client is another application (not a human)
   - For instance, an agent calls a secure MCP tool to check inventory at a specific
     store. No need to impersonate the end user.

### 2.2 Roles
A protected MCP server acts as a [OAuth 2.1 resource server](https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-12.html#name-roles),
capable of accepting and responding to protected resource requests using access tokens.

An MCP client acts as an [OAuth 2.1 client](https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-12.html#name-roles),
making protected resource requests on behalf of a resource owner.

The authorization server is responsible for interacting with the user and issuing access tokens for use at the MCP server. The implementation details of the authorization server are beyond the scope of this specification. It may be the same server as the
resource server or a separate entity. Section [2.3 Authorization Server Discovery](#2-3-authorizaton-server-discovery)
specifies how an MCP server indicates the location of its corresponding authorization server to a client.

### 2.3 Authorization Server Discovery
This section describes the mechanisms by which MCP servers advertise their associated
authorization servers to MCP clients, as well as the discovery process through which MCP
clients can determine authorization server endpoints and supported capabilities.

### 2.3.1 Authorization Server Location

MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728))
specification to indicate the locations of authorization servers. The Protected Resource Metadata document returned by the MCP server **MUST** include
the `authorization_servers` field containing at least one authorization server.

The specific use of `authorization_servers` is beyond the scope of this specification; implementers should consult
OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728)) for
guidance on implementation details.

Implementors should note that Protected Resource Metadata documents can define multiple authorization servers. The responsibility for selecting which authorization server to use lies with the MCP client, following the guidelines specified in
[RFC9728 Section 7.6 "Authorization Servers"](https://datatracker.ietf.org/doc/html/rfc9728#name-authorization-servers).

MCP servers **MUST** use the HTTP header `WWW-Authenticate` when returning a _401 Unauthorized_ to indicate the location of the resource server metadata URL
as described in OAuth 2.0 Protected Resource Metadata ([RFC9728](https://datatracker.ietf.org/doc/html/rfc9728)).

MCP clients **MUST** be able to parse `WWW-Authenticate` headers and respond appropriately to `HTTP 401 Unauthorized` responses from the MCP server.

#### 2.3.2 Server Metadata Discovery

MCP clients **MUST** follow the OAuth 2.0 Authorization Server Metadata protocol defined
in [RFC8414](https://datatracker.ietf.org/doc/html/rfc8414) to obtain the information
required to interact with the authorization server.

#### 2.3.4 Sequence Diagram
The following diagram outlines an example flow:

```mermaid
sequenceDiagram
    participant C as Client
    participant M as MCP Server (Resource Server)
    participant A as Authorization Server

    C->>M: MCP request without token
    M-->>C: HTTP 401 Unauthorized with WWW-Authenticate header
    Note over C: Extract resource_metadata<br />from WWW-Authenticate

    C->>M: GET /.well-known/oauth-protected-resource
    M-->>C: Resource metadata with authorization server URL
    Note over C: Validate RS metadata,<br />build AS metadata URL

    C->>A: GET /.well-known/oauth-authorization-server
    A-->>C: Authorization server metadata

    Note over C,A: OAuth 2.1 authorization flow happens here

    C->>A: Token request
    A-->>C: Access token

    C->>M: MCP request with access token
    M-->>C: MCP response
    Note over C,M: MCP communication continues with valid token
```

#### 2.4 MCP specific headers for discovery

MCP clients **SHOULD** include the `MCP-Protocol-Version: <protocol-version>` HTTP header during
any request to the MCP server allowing the MCP server to respond based on the MCP protocol version.

MCP servers **SHOULD** use the `MCP-Protocol-Version` header to determine compatibility with the MCP client.

For example: `MCP-Protocol-Version: 2024-11-05`

### 2.5 Dynamic Client Registration

MCP clients and authorization servers **SHOULD** support the
[OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)
to allow MCP clients to obtain OAuth client IDs without user interaction. This provides a
standardized way for clients to automatically register with new authorization servers, which is crucial
for MCP because:

- Clients may not know all possible MCP servers and their authorization servers in advance.
- Manual registration would create friction for users.
- It enables seamless connection to new MCP servers and their authorization servers.
- Authorization servers can implement their own registration policies.

Any MCP authorization servers that _do not_ support Dynamic Client Registration need to provide
alternative ways to obtain a client ID (and, if applicable, client credentials). For one of
these authorization servers, MCP clients will have to either:

1. Hardcode a client ID (and, if applicable, client credentials) specifically for that MCP
   server, or
2. Present a UI to users that allows them to enter these details, after registering an
   OAuth client themselves (e.g., through a configuration interface hosted by the
   server).

### 2.6 Authorization Flow Steps

The complete Authorization flow proceeds as follows:

```mermaid
sequenceDiagram
    participant B as User-Agent (Browser)
    participant C as Client
    participant M as MCP Server (Resource Server)
    participant A as Authorization Server

    C->>M: MCP request without token
    M->>C: HTTP 401 Unauthorized with WWW-Authenticate header
    Note over C: Extract resource_metadata URL from WWW-Authenticate

    C->>A: GET /.well-known/oauth-authorization-server
    A->>C: Authorization server metadata response

    alt Dynamic client registration
        C->>A: POST /register
        A->>C: Client Credentials
    end

    Note over C: Generate PKCE parameters
    C->>B: Open browser with authorization URL + code_challenge
    B->>A: Authorization request
    Note over A: User authorizes
    A->>B: Redirect to callback with authorization code
    B->>C: Authorization code callback
    C->>A: Token request + code_verifier
    A->>C: Access token (+ refresh token)
    C->>M: MCP request with access token
    M-->>C: MCP response
```

### 2.7 Access Token Usage

#### 2.7.1 Token Requirements

Access token handling **MUST** conform to
[OAuth 2.1 Section 5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5)
requirements for resource requests. Specifically:

1. MCP client **MUST** use the Authorization request header field
   [Section 5.1.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.1.1):

```
Authorization: Bearer <access-token>
```

Note that authorization **MUST** be included in every HTTP request from client to server,
even if they are part of the same logical session.

2. Access tokens **MUST NOT** be included in the URI query string

Example request:

```http
GET /v1/contexts HTTP/1.1
Host: mcp.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2.7.2 Token Handling

Resource servers **MUST** validate access tokens as described in
[Section 5.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.2).
If validation fails, servers **MUST** respond according to
[Section 5.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-5.3)
error handling requirements. Invalid or expired tokens **MUST** receive a HTTP 401
response.

MCP clients **MUST NOT** send tokens to the MCP server other than ones issued by the MCP server's authorization server.

MCP authorization servers **MUST** only accept tokens that are valid for use with their
own resources.

MCP servers **MUST NOT** accept or transit any other tokens.


### 2.8 Error Handling

Servers **MUST** return appropriate HTTP status codes for authorization errors:

| Status Code | Description  | Usage                                      |
| ----------- | ------------ | ------------------------------------------ |
| 401         | Unauthorized | Authorization required or token invalid    |
| 403         | Forbidden    | Invalid scopes or insufficient permissions |
| 400         | Bad Request  | Malformed authorization request            |

## 3. Security Considerations

Implementations **MUST** follow OAuth 2.1 security best practices as laid out in [Section 7. Security Considerations](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#name-security-considerations).

### 3.1 Token Theft
Attackers who obtain tokens stored by the client, or tokens cached or logged on the server can access protected resources with
requests that appear legitimate to resource servers.

Clients **MUST** implement secure token storage and follow OAuth best practices,
as outlined in [OAuth 2.1, section 7.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-7.1).

MCP authorization servers SHOULD issue short-lived access tokens token to reduce the impact of leaked tokens. For public clients, MCP authorization servers MUST rotate refresh tokens as described in [Section 4.3.1 of OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-4.3.1).

### 3.2 Communication Security
Implementations MUST follow [OAuth 2.1 section 1.5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-1.5).

Specifically:
1. All authorization server endpoints **MUST** be served over HTTPS.
1. All redirect URIs **MUST** be either `localhost` or use HTTPS.

### 3.3 Authorization Code Protection

An attacker who has gained access to an authorization code contained in an authorization response can try to redeem the authorization code for an access token or otherwise make use of the authorization code. (Further described in [OAuth 2.1, section 7.5](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-7.5))

MCP clients **MUST** implement PKCE according to [OAuth 2.1 section 7.5.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-7.5.2). PKCE helps prevent authorization code interception and injection attacks by requiring clients to create a secret verifier-challenge pair, ensuring that only the original requestor can exchange an authorization code for tokens.


### 3.3 Open Redirection
An attacker may craft malicious redirect URIs to direct users to phishing sites.

MCP clients **MUST** have redirect URIs registered with the authorization server.

Authorization servers **MUST** validate exact redirect URIs against pre-registered values to prevent redirection attacks.

MCP clients **SHOULD** use and verify state parameters in the authorization code flow
and discard any results that do not include or have a mis-match with the original state.

Authorization servers **MUST** take precautions to prevent redirecting user agents to untrusted URI's, following suggestions laid out in [OAuth 2.1, Section 7.12.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-7.12.2)

Authorization servers **SHOULD** only automatically redirect the user agent if it trusts the redirection URI. If the URI is not trusted, the authorization server MAY inform the user and rely on the user to make the correct decision.

### 3.4 Confused Deputy Problem

Attackers can exploit MCP servers acting as intermediaries to third-party APIs, leading to confused deputy vulnerabilities. By using stolen authorization codes, they can obtain access tokens without user consent. See [Security Best Practices 2.1](/specification/draft/basic/security_best_practices) for details.

MCP proxy servers using static client IDs **MUST** obtain user consent for each dynamically
registered client before forwarding to third-party authorization servers (which may require additional consent).


---
modelcontextprotocol/docs/specification/draft/basic/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol consists of several key components that work together:

- **Base Protocol**: Core JSON-RPC message types
- **Lifecycle Management**: Connection initialization, capability negotiation, and
  session control
- **Server Features**: Resources, prompts, and tools exposed by servers
- **Client Features**: Sampling and root directory lists provided by clients
- **Utilities**: Cross-cutting concerns like logging and argument completion

All implementations **MUST** support the base protocol and lifecycle management
components. Other components **MAY** be implemented based on the specific needs of the
application.

These protocol layers establish clear separation of concerns while enabling rich
interactions between clients and servers. The modular design allows implementations to
support exactly the features they need.

## Messages

All messages between MCP clients and servers **MUST** follow the
[JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification. The protocol defines
these types of messages:

### Requests

Requests are sent from the client to the server or vice versa, to initiate an operation.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Requests **MUST** include a string or integer ID.
- Unlike base JSON-RPC, the ID **MUST NOT** be `null`.
- The request ID **MUST NOT** have been previously used by the requestor within the same
  session.

### Responses

Responses are sent in reply to requests, containing the result or error of the operation.

```typescript
{
  jsonrpc: "2.0";
  id: string | number;
  result?: {
    [key: string]: unknown;
  }
  error?: {
    code: number;
    message: string;
    data?: unknown;
  }
}
```

- Responses **MUST** include the same ID as the request they correspond to.
- **Responses** are further sub-categorized as either **successful results** or
  **errors**. Either a `result` or an `error` **MUST** be set. A response **MUST NOT**
  set both.
- Results **MAY** follow any JSON object structure, while errors **MUST** include an
  error code and message at minimum.
- Error codes **MUST** be integers.

### Notifications

Notifications are sent from the client to the server or vice versa, as a one-way message.
The receiver **MUST NOT** send a response.

```typescript
{
  jsonrpc: "2.0";
  method: string;
  params?: {
    [key: string]: unknown;
  };
}
```

- Notifications **MUST NOT** include an ID.

### Batching

JSON-RPC also defines a means to
[batch multiple requests and notifications](https://www.jsonrpc.org/specification#batch),
by sending them in an array. MCP implementations **MAY** support sending JSON-RPC
batches, but **MUST** support receiving JSON-RPC batches.

## Auth

MCP provides an [Authorization](/specification/draft/basic/authorization) framework for use with HTTP.
Implementations using an HTTP-based transport **SHOULD** conform to this specification,
whereas implementations using STDIO transport **SHOULD NOT** follow this specification,
and instead retrieve credentials from the environment.

Additionally, clients and servers **MAY** negotiate their own custom authentication and
authorization strategies.

For further discussions and contributions to the evolution of MCP’s auth mechanisms, join
us in
[GitHub Discussions](https://github.com/modelcontextprotocol/specification/discussions)
to help shape the future of the protocol!

## Schema

The full specification of the protocol is defined as a
[TypeScript schema](https://github.com/modelcontextprotocol/specification/blob/main/schema/draft/schema.ts).
This is the source of truth for all protocol messages and structures.

There is also a
[JSON Schema](https://github.com/modelcontextprotocol/specification/blob/main/schema/draft/schema.json),
which is automatically generated from the TypeScript source of truth, for use with
various automated tooling.


---
modelcontextprotocol/docs/specification/draft/basic/lifecycle.mdx
---
---
title: Lifecycle
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) defines a rigorous lifecycle for client-server
connections that ensures proper capability negotiation and state management.

1. **Initialization**: Capability negotiation and protocol version agreement
2. **Operation**: Normal protocol communication
3. **Shutdown**: Graceful termination of the connection

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Initialization Phase
    activate Client
    Client->>+Server: initialize request
    Server-->>Client: initialize response
    Client--)Server: initialized notification

    Note over Client,Server: Operation Phase
    rect rgb(200, 220, 250)
        note over Client,Server: Normal protocol operations
    end

    Note over Client,Server: Shutdown
    Client--)-Server: Disconnect
    deactivate Server
    Note over Client,Server: Connection closed
```

## Lifecycle Phases

### Initialization

The initialization phase **MUST** be the first interaction between client and server.
During this phase, the client and server:

- Establish protocol version compatibility
- Exchange and negotiate capabilities
- Share implementation details

The client **MUST** initiate this phase by sending an `initialize` request containing:

- Protocol version supported
- Client capabilities
- Client implementation information

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  }
}
```

The initialize request **MUST NOT** be part of a JSON-RPC
[batch](https://www.jsonrpc.org/specification#batch), as other requests and notifications
are not possible until initialization has completed. This also permits backwards
compatibility with prior protocol versions that do not explicitly support JSON-RPC
batches.

The server **MUST** respond with its own capabilities and information:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    },
    "instructions": "Optional instructions for the client"
  }
}
```

After successful initialization, the client **MUST** send an `initialized` notification
to indicate it is ready to begin normal operations:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

- The client **SHOULD NOT** send requests other than
  [pings](/specification/draft/basic/utilities/ping) before the server has responded to the
  `initialize` request.
- The server **SHOULD NOT** send requests other than
  [pings](/specification/draft/basic/utilities/ping) and
  [logging](/specification/draft/server/utilities/logging) before receiving the `initialized`
  notification.

#### Version Negotiation

In the `initialize` request, the client **MUST** send a protocol version it supports.
This **SHOULD** be the _latest_ version supported by the client.

If the server supports the requested protocol version, it **MUST** respond with the same
version. Otherwise, the server **MUST** respond with another protocol version it
supports. This **SHOULD** be the _latest_ version supported by the server.

If the client does not support the version in the server's response, it **SHOULD**
disconnect.

#### Capability Negotiation

Client and server capabilities establish which optional protocol features will be
available during the session.

Key capabilities include:

| Category | Capability     | Description                                                                |
| -------- | -------------- | -------------------------------------------------------------------------- |
| Client   | `roots`        | Ability to provide filesystem [roots](/specification/draft/client/roots)       |
| Client   | `sampling`     | Support for LLM [sampling](/specification/draft/client/sampling) requests      |
| Client   | `experimental` | Describes support for non-standard experimental features                   |
| Server   | `prompts`      | Offers [prompt templates](/specification/draft/server/prompts)                 |
| Server   | `resources`    | Provides readable [resources](/specification/draft/server/resources)           |
| Server   | `tools`        | Exposes callable [tools](/specification/draft/server/tools)                    |
| Server   | `logging`      | Emits structured [log messages](/specification/draft/server/utilities/logging) |
| Server   | `experimental` | Describes support for non-standard experimental features                   |

Capability objects can describe sub-capabilities like:

- `listChanged`: Support for list change notifications (for prompts, resources, and
  tools)
- `subscribe`: Support for subscribing to individual items' changes (resources only)

### Operation

During the operation phase, the client and server exchange messages according to the
negotiated capabilities.

Both parties **SHOULD**:

- Respect the negotiated protocol version
- Only use capabilities that were successfully negotiated

### Shutdown

During the shutdown phase, one side (usually the client) cleanly terminates the protocol
connection. No specific shutdown messages are defined—instead, the underlying transport
mechanism should be used to signal connection termination:

#### stdio

For the stdio [transport](/specification/draft/basic/transports), the client **SHOULD** initiate
shutdown by:

1. First, closing the input stream to the child process (the server)
2. Waiting for the server to exit, or sending `SIGTERM` if the server does not exit
   within a reasonable time
3. Sending `SIGKILL` if the server does not exit within a reasonable time after `SIGTERM`

The server **MAY** initiate shutdown by closing its output stream to the client and
exiting.

#### HTTP

For HTTP [transports](/specification/draft/basic/transports), shutdown is indicated by closing the
associated HTTP connection(s).

## Timeouts

Implementations **SHOULD** establish timeouts for all sent requests, to prevent hung
connections and resource exhaustion. When the request has not received a success or error
response within the timeout period, the sender **SHOULD** issue a [cancellation
notification](/specification/draft/basic/utilities/cancellation) for that request and stop waiting for
a response.

SDKs and other middleware **SHOULD** allow these timeouts to be configured on a
per-request basis.

Implementations **MAY** choose to reset the timeout clock when receiving a [progress
notification](/specification/draft/basic/utilities/progress) corresponding to the request, as this
implies that work is actually happening. However, implementations **SHOULD** always
enforce a maximum timeout, regardless of progress notifications, to limit the impact of a
misbehaving client or server.

## Error Handling

Implementations **SHOULD** be prepared to handle these error cases:

- Protocol version mismatch
- Failure to negotiate required capabilities
- Request [timeouts](#timeouts)

Example initialization error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2024-11-05"],
      "requested": "1.0.0"
    }
  }
}
```


---
modelcontextprotocol/docs/specification/draft/basic/security_best_practices.mdx
---
---
title: Security Best Practices
---

## 1. Introduction

### 1.1 Purpose and Scope

This document provides security considerations for the Model Context Protocol (MCP), complementing the MCP Authorization specification. This document identifies security risks, attack vectors, and best practices specific to MCP implementations.

The primary audience for this document includes developers implementing MCP authorization flows, MCP server operators, and security professionals evaluating MCP-based systems. This document should be read alongside the MCP Authorization specification and [OAuth 2.0 security best practices](https://datatracker.ietf.org/doc/html/rfc9700).

## 2. Attacks and Mitigations

This section gives a detailed description of attacks on MCP implementations, along with potential countermeasures.

### 2.1 Confused Deputy Problem

Attackers can exploit MCP servers proxying other resource servers, creating "[confused deputy](https://en.wikipedia.org/wiki/Confused_deputy_problem)" vulnerabilities.

#### 2.1.1 Terminology

**MCP Proxy Server**
: An MCP server that connects MCP clients to third-party APIs, offering MCP features while delegating operations and acting as a single OAuth client to the third-party API server.

**Third-Party Authorization Server**
: Authorization server that protects the third-party API. It may lack dynamic client registration support, requiring MCP proxy to use a static client ID for all requests.

**Third-Party API**
: The protected resource server that provides the actual API functionality. Access to this 
  API requires tokens issued by the third-party authorization server.

**Static Client ID**
: A fixed OAuth 2.0 client identifier used by the MCP proxy server when communicating with
  the third-party authorization server. This Client ID refers to the MCP server acting as a client
  to the Third-Party API. It is the same value for all MCP server to Third-Party API interactions regardless of
  which MCP client initiated the request.

#### 2.1.2 Architecture and Attack Flows

##### 2.1.2.1 Normal OAuth proxy usage (preserves user consent)

```mermaid
sequenceDiagram
    participant UA as User-Agent (Browser)  
    participant MC as MCP Client
    participant M as MCP Proxy Server
    participant TAS as Third-Party Authorization Server

    Note over UA,M: Initial Auth flow completed

    Note over UA,TAS: Step 1: Legitimate user consent for Third Party Server

    M->>UA: Redirect to third party authorization server
    UA->>TAS: Authorization request (client_id: mcp-proxy)
    TAS->>UA: Authorization consent screen
    Note over UA: Review consent screen
    UA->>TAS: Approve
    TAS->>UA: Set consent cookie for client ID: mcp-proxy
    TAS->>UA: 3P Authorization code + redirect to mcp-proxy-server.com
    UA->>M: 3P Authorization code
    Note over M,TAS: Exchange 3P code for 3P token
    Note over M: Generate MCP authorization code
    M->>UA: Redirect to MCP Client with MCP authorization code

    Note over M,UA: Exchange code for token, etc.
```

##### 2.1.2.3 Malicious OAuth proxy usage (skips user consent)

```mermaid
sequenceDiagram
    participant UA as User-Agent (Browser)
    participant M as MCP Proxy Server
    participant TAS as Third-Party Authorization Server
    participant A as Attacker


    Note over UA,A: Step 2: Attack (leveraging existing cookie, skipping consent)
    A->>M: Dynamically register malicious client, redirect_uri: attacker.com
    A->>UA: Sends malicious link
    UA->>TAS: Authorization request (client_id: mcp-proxy) + consent cookie
    rect rgba(255, 17, 0, 0.67)
    TAS->>TAS: Cookie present, consent skipped
    end

   TAS->>UA: 3P Authorization code + redirect to mcp-proxy-server.com
   UA->>M: 3P Authorization code
   Note over M,TAS: Exchange 3P code for 3P token
   Note over M: Generate MCP authorization code
   M->>UA: Redirect to attacker.com with MCP Authorization code
   UA->>A: MCP Authorization code delivered to attacker.com
   Note over M,A: Attacker exchanges MCP code for MCP token
   A->>M: Attacker impersonates user to MCP server
```

#### 2.1.3 Attack Description

When an MCP proxy server uses a static client ID to authenticate with a third-party 
authorization server that does not support dynamic client registration, the following 
attack becomes possible:

1. A user authenticates normally through the MCP proxy server to access the third-party API
2. During this flow, the third-party authorization server sets a cookie on the user agent
   indicating consent for the static client ID
3. An attacker later sends the user a malicious link containing a crafted authorization request which contains a malicious redirect URI along with a new dynamically registered client ID
4. When the user clicks the link, their browser still has the consent cookie from the previous legitimate request
5. The third-party authorization server detects the cookie and skips the consent screen
6. The MCP authorization code is redirected to the attacker's server (specified in the crafted redirect_uri during dynamic client registration)
7. The attacker exchanges the stolen authorization code for access tokens for the MCP server without the user's explicit approval
8. Attacker now has access to the third-party API as the compromised user

#### 2.1.4 Mitigation

MCP proxy servers using static client IDs **MUST** obtain user consent for each dynamically
registered client before forwarding to third-party authorization servers (which may require additional consent).


---
modelcontextprotocol/docs/specification/draft/basic/transports.mdx
---
---
title: Transports
---

<Info>**Protocol Revision**: draft</Info>

MCP uses JSON-RPC to encode messages. JSON-RPC messages **MUST** be UTF-8 encoded.

The protocol currently defines two standard transport mechanisms for client-server
communication:

1. [stdio](#stdio), communication over standard in and standard out
2. [Streamable HTTP](#streamable-http)

Clients **SHOULD** support stdio whenever possible.

It is also possible for clients and servers to implement
[custom transports](#custom-transports) in a pluggable fashion.

## stdio

In the **stdio** transport:

- The client launches the MCP server as a subprocess.
- The server reads JSON-RPC messages from its standard input (`stdin`) and sends messages
  to its standard output (`stdout`).
- Messages are individual JSON-RPC requests, notifications, or responses.
- Messages are delimited by newlines, and **MUST NOT** contain embedded newlines.
- The server **MAY** write UTF-8 strings to its standard error (`stderr`) for logging
  purposes. Clients **MAY** capture, forward, or ignore this logging.
- The server **MUST NOT** write anything to its `stdout` that is not a valid MCP message.
- The client **MUST NOT** write anything to the server's `stdin` that is not a valid MCP
  message.

```mermaid
sequenceDiagram
    participant Client
    participant Server Process

    Client->>+Server Process: Launch subprocess
    loop Message Exchange
        Client->>Server Process: Write to stdin
        Server Process->>Client: Write to stdout
        Server Process--)Client: Optional logs on stderr
    end
    Client->>Server Process: Close stdin, terminate subprocess
    deactivate Server Process
```

## Streamable HTTP

<Info>This replaces the [HTTP+SSE
transport](/specification/2024-11-05/basic/transports#http-with-sse) from
protocol version 2024-11-05. See the [backwards compatibility](#backwards-compatibility)
guide below.</Info>

In the **Streamable HTTP** transport, the server operates as an independent process that
can handle multiple client connections. This transport uses HTTP POST and GET requests.
Server can optionally make use of
[Server-Sent Events](https://en.wikipedia.org/wiki/Server-sent_events) (SSE) to stream
multiple server messages. This permits basic MCP servers, as well as more feature-rich
servers supporting streaming and server-to-client notifications and requests.

The server **MUST** provide a single HTTP endpoint path (hereafter referred to as the
**MCP endpoint**) that supports both POST and GET methods. For example, this could be a
URL like `https://example.com/mcp`.

#### Security Warning

When implementing Streamable HTTP transport:

1. Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks
2. When running locally, servers **SHOULD** bind only to localhost (127.0.0.1) rather than all network interfaces (0.0.0.0)
3. Servers **SHOULD** implement proper authentication for all connections

Without these protections, attackers could use DNS rebinding to interact with local MCP servers from remote websites.

### Sending Messages to the Server

Every JSON-RPC message sent from the client **MUST** be a new HTTP POST request to the
MCP endpoint.

1. The client **MUST** use HTTP POST to send JSON-RPC messages to the MCP endpoint.
2. The client **MUST** include an `Accept` header, listing both `application/json` and
   `text/event-stream` as supported content types.
3. The body of the POST request **MUST** be a single JSON-RPC _request_, _notification_, or _response_.
4. If the input is a JSON-RPC _response_ or _notification_:
   - If the server accepts the input, the server **MUST** return HTTP status code 202
     Accepted with no body.
   - If the server cannot accept the input, it **MUST** return an HTTP error status code
     (e.g., 400 Bad Request). The HTTP response body **MAY** comprise a JSON-RPC _error
     response_ that has no `id`.
5. If the input is a JSON-RPC _request_, the server **MUST** either
   return `Content-Type: text/event-stream`, to initiate an SSE stream, or
   `Content-Type: application/json`, to return one JSON object. The client **MUST**
   support both these cases.
6. If the server initiates an SSE stream:
   - The SSE stream **SHOULD** eventually include JSON-RPC _response_ for the
     JSON-RPC _request_ sent in the POST body.
   - The server **MAY** send JSON-RPC _requests_ and _notifications_ before sending the
     JSON-RPC _response_. These messages **SHOULD** relate to the originating client
     _request_.
   - The server **SHOULD NOT** close the SSE stream before sending the JSON-RPC _response_
     for the received JSON-RPC _request_, unless the [session](#session-management)
     expires.
   - After the JSON-RPC _response_ has been sent, the server **SHOULD** close the SSE
     stream.
   - Disconnection **MAY** occur at any time (e.g., due to network conditions).
     Therefore:
     - Disconnection **SHOULD NOT** be interpreted as the client cancelling its request.
     - To cancel, the client **SHOULD** explicitly send an MCP `CancelledNotification`.
     - To avoid message loss due to disconnection, the server **MAY** make the stream
       [resumable](#resumability-and-redelivery).

### Listening for Messages from the Server

1. The client **MAY** issue an HTTP GET to the MCP endpoint. This can be used to open an
   SSE stream, allowing the server to communicate to the client, without the client first
   sending data via HTTP POST.
2. The client **MUST** include an `Accept` header, listing `text/event-stream` as a
   supported content type.
3. The server **MUST** either return `Content-Type: text/event-stream` in response to
   this HTTP GET, or else return HTTP 405 Method Not Allowed, indicating that the server
   does not offer an SSE stream at this endpoint.
4. If the server initiates an SSE stream:
   - The server **MAY** send JSON-RPC _requests_ and _notifications_ on the stream.
   - These messages **SHOULD** be unrelated to any concurrently-running JSON-RPC
     _request_ from the client.
   - The server **MUST NOT** send a JSON-RPC _response_ on the stream **unless**
     [resuming](#resumability-and-redelivery) a stream associated with a previous client
     request.
   - The server **MAY** close the SSE stream at any time.
   - The client **MAY** close the SSE stream at any time.

### Multiple Connections

1. The client **MAY** remain connected to multiple SSE streams simultaneously.
2. The server **MUST** send each of its JSON-RPC messages on only one of the connected
   streams; that is, it **MUST NOT** broadcast the same message across multiple streams.
   - The risk of message loss **MAY** be mitigated by making the stream
     [resumable](#resumability-and-redelivery).

### Resumability and Redelivery

To support resuming broken connections, and redelivering messages that might otherwise be
lost:

1. Servers **MAY** attach an `id` field to their SSE events, as described in the
   [SSE standard](https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation).
   - If present, the ID **MUST** be globally unique across all streams within that
     [session](#session-management)—or all streams with that specific client, if session
     management is not in use.
2. If the client wishes to resume after a broken connection, it **SHOULD** issue an HTTP
   GET to the MCP endpoint, and include the
   [`Last-Event-ID`](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-last-event-id-header)
   header to indicate the last event ID it received.
   - The server **MAY** use this header to replay messages that would have been sent
     after the last event ID, _on the stream that was disconnected_, and to resume the
     stream from that point.
   - The server **MUST NOT** replay messages that would have been delivered on a
     different stream.

In other words, these event IDs should be assigned by servers on a _per-stream_ basis, to
act as a cursor within that particular stream.

### Session Management

An MCP "session" consists of logically related interactions between a client and a
server, beginning with the [initialization phase](/specification/draft/basic/lifecycle). To support
servers which want to establish stateful sessions:

1. A server using the Streamable HTTP transport **MAY** assign a session ID at
   initialization time, by including it in an `Mcp-Session-Id` header on the HTTP
   response containing the `InitializeResult`.
   - The session ID **SHOULD** be globally unique and cryptographically secure (e.g., a
     securely generated UUID, a JWT, or a cryptographic hash).
   - The session ID **MUST** only contain visible ASCII characters (ranging from 0x21 to
     0x7E).
2. If an `Mcp-Session-Id` is returned by the server during initialization, clients using
   the Streamable HTTP transport **MUST** include it in the `Mcp-Session-Id` header on
   all of their subsequent HTTP requests.
   - Servers that require a session ID **SHOULD** respond to requests without an
     `Mcp-Session-Id` header (other than initialization) with HTTP 400 Bad Request.
3. The server **MAY** terminate the session at any time, after which it **MUST** respond
   to requests containing that session ID with HTTP 404 Not Found.
4. When a client receives HTTP 404 in response to a request containing an
   `Mcp-Session-Id`, it **MUST** start a new session by sending a new `InitializeRequest`
   without a session ID attached.
5. Clients that no longer need a particular session (e.g., because the user is leaving
   the client application) **SHOULD** send an HTTP DELETE to the MCP endpoint with the
   `Mcp-Session-Id` header, to explicitly terminate the session.
   - The server **MAY** respond to this request with HTTP 405 Method Not Allowed,
     indicating that the server does not allow clients to terminate sessions.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant Server

    note over Client, Server: initialization

    Client->>+Server: POST InitializeRequest
    Server->>-Client: InitializeResponse<br>Mcp-Session-Id: 1868a90c...

    Client->>+Server: POST InitializedNotification<br>Mcp-Session-Id: 1868a90c...
    Server->>-Client: 202 Accepted

    note over Client, Server: client requests
    Client->>+Server: POST ... request ...<br>Mcp-Session-Id: 1868a90c...

    alt single HTTP response
      Server->>Client: ... response ...
    else server opens SSE stream
      loop while connection remains open
          Server-)Client: ... SSE messages from server ...
      end
      Server-)Client: SSE event: ... response ...
    end
    deactivate Server

    note over Client, Server: client notifications/responses
    Client->>+Server: POST ... notification/response ...<br>Mcp-Session-Id: 1868a90c...
    Server->>-Client: 202 Accepted

    note over Client, Server: server requests
    Client->>+Server: GET<br>Mcp-Session-Id: 1868a90c...
    loop while connection remains open
        Server-)Client: ... SSE messages from server ...
    end
    deactivate Server

```

### Backwards Compatibility

Clients and servers can maintain backwards compatibility with the deprecated [HTTP+SSE
transport](/specification/2024-11-05/basic/transports#http-with-sse) (from
protocol version 2024-11-05) as follows:

**Servers** wanting to support older clients should:

- Continue to host both the SSE and POST endpoints of the old transport, alongside the
  new "MCP endpoint" defined for the Streamable HTTP transport.
  - It is also possible to combine the old POST endpoint and the new MCP endpoint, but
    this may introduce unneeded complexity.

**Clients** wanting to support older servers should:

1. Accept an MCP server URL from the user, which may point to either a server using the
   old transport or the new transport.
2. Attempt to POST an `InitializeRequest` to the server URL, with an `Accept` header as
   defined above:
   - If it succeeds, the client can assume this is a server supporting the new Streamable
     HTTP transport.
   - If it fails with an HTTP 4xx status code (e.g., 405 Method Not Allowed or 404 Not
     Found):
     - Issue a GET request to the server URL, expecting that this will open an SSE stream
       and return an `endpoint` event as the first event.
     - When the `endpoint` event arrives, the client can assume this is a server running
       the old HTTP+SSE transport, and should use that transport for all subsequent
       communication.

## Custom Transports

Clients and servers **MAY** implement additional custom transport mechanisms to suit
their specific needs. The protocol is transport-agnostic and can be implemented over any
communication channel that supports bidirectional message exchange.

Implementers who choose to support custom transports **MUST** ensure they preserve the
JSON-RPC message format and lifecycle requirements defined by MCP. Custom transports
**SHOULD** document their specific connection establishment and message exchange patterns
to aid interoperability.


---
modelcontextprotocol/docs/specification/draft/basic/utilities/cancellation.mdx
---
---
title: Cancellation
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) supports optional cancellation of in-progress requests
through notification messages. Either side can send a cancellation notification to
indicate that a previously-issued request should be terminated.

## Cancellation Flow

When a party wants to cancel an in-progress request, it sends a `notifications/cancelled`
notification containing:

- The ID of the request to cancel
- An optional reason string that can be logged or displayed

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "123",
    "reason": "User requested cancellation"
  }
}
```

## Behavior Requirements

1. Cancellation notifications **MUST** only reference requests that:
   - Were previously issued in the same direction
   - Are believed to still be in-progress
2. The `initialize` request **MUST NOT** be cancelled by clients
3. Receivers of cancellation notifications **SHOULD**:
   - Stop processing the cancelled request
   - Free associated resources
   - Not send a response for the cancelled request
4. Receivers **MAY** ignore cancellation notifications if:
   - The referenced request is unknown
   - Processing has already completed
   - The request cannot be cancelled
5. The sender of the cancellation notification **SHOULD** ignore any response to the
   request that arrives afterward

## Timing Considerations

Due to network latency, cancellation notifications may arrive after request processing
has completed, and potentially after a response has already been sent.

Both parties **MUST** handle these race conditions gracefully:

```mermaid
sequenceDiagram
   participant Client
   participant Server

   Client->>Server: Request (ID: 123)
   Note over Server: Processing starts
   Client--)Server: notifications/cancelled (ID: 123)
   alt
      Note over Server: Processing may have<br/>completed before<br/>cancellation arrives
   else If not completed
      Note over Server: Stop processing
   end
```

## Implementation Notes

- Both parties **SHOULD** log cancellation reasons for debugging
- Application UIs **SHOULD** indicate when cancellation is requested

## Error Handling

Invalid cancellation notifications **SHOULD** be ignored:

- Unknown request IDs
- Already completed requests
- Malformed notifications

This maintains the "fire and forget" nature of notifications while allowing for race
conditions in asynchronous communication.


---
modelcontextprotocol/docs/specification/draft/basic/utilities/ping.mdx
---
---
title: Ping
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol includes an optional ping mechanism that allows either party
to verify that their counterpart is still responsive and the connection is alive.

## Overview

The ping functionality is implemented through a simple request/response pattern. Either
the client or server can initiate a ping by sending a `ping` request.

## Message Format

A ping request is a standard JSON-RPC request with no parameters:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "ping"
}
```

## Behavior Requirements

1. The receiver **MUST** respond promptly with an empty response:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {}
}
```

2. If no response is received within a reasonable timeout period, the sender **MAY**:
   - Consider the connection stale
   - Terminate the connection
   - Attempt reconnection procedures

## Usage Patterns

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Sender->>Receiver: ping request
    Receiver->>Sender: empty response
```

## Implementation Considerations

- Implementations **SHOULD** periodically issue pings to detect connection health
- The frequency of pings **SHOULD** be configurable
- Timeouts **SHOULD** be appropriate for the network environment
- Excessive pinging **SHOULD** be avoided to reduce network overhead

## Error Handling

- Timeouts **SHOULD** be treated as connection failures
- Multiple failed pings **MAY** trigger connection reset
- Implementations **SHOULD** log ping failures for diagnostics


---
modelcontextprotocol/docs/specification/draft/basic/utilities/progress.mdx
---
---
title: Progress
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) supports optional progress tracking for long-running
operations through notification messages. Either side can send progress notifications to
provide updates about operation status.

## Progress Flow

When a party wants to _receive_ progress updates for a request, it includes a
`progressToken` in the request metadata.

- Progress tokens **MUST** be a string or integer value
- Progress tokens can be chosen by the sender using any means, but **MUST** be unique
  across all active requests.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "some_method",
  "params": {
    "_meta": {
      "progressToken": "abc123"
    }
  }
}
```

The receiver **MAY** then send progress notifications containing:

- The original progress token
- The current progress value so far
- An optional "total" value
- An optional "message" value

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100,
    "message": "Reticulating splines..."
  }
}
```

- The `progress` value **MUST** increase with each notification, even if the total is
  unknown.
- The `progress` and the `total` values **MAY** be floating point.
- The `message` field **SHOULD** provide relevant human readable progress information.

## Behavior Requirements

1. Progress notifications **MUST** only reference tokens that:

   - Were provided in an active request
   - Are associated with an in-progress operation

2. Receivers of progress requests **MAY**:
   - Choose not to send any progress notifications
   - Send notifications at whatever frequency they deem appropriate
   - Omit the total value if unknown

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver

    Note over Sender,Receiver: Request with progress token
    Sender->>Receiver: Method request with progressToken

    Note over Sender,Receiver: Progress updates
    loop Progress Updates
        Receiver-->>Sender: Progress notification (0.2/1.0)
        Receiver-->>Sender: Progress notification (0.6/1.0)
        Receiver-->>Sender: Progress notification (1.0/1.0)
    end

    Note over Sender,Receiver: Operation complete
    Receiver->>Sender: Method response
```

## Implementation Notes

- Senders and receivers **SHOULD** track active progress tokens
- Both parties **SHOULD** implement rate limiting to prevent flooding
- Progress notifications **MUST** stop after completion


---
modelcontextprotocol/docs/specification/draft/client/roots.mdx
---
---
title: Roots
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for clients to expose
filesystem "roots" to servers. Roots define the boundaries of where servers can operate
within the filesystem, allowing them to understand which directories and files they have
access to. Servers can request the list of roots from supporting clients and receive
notifications when that list changes.

## User Interaction Model

Roots in MCP are typically exposed through workspace or project configuration interfaces.

For example, implementations could offer a workspace/project picker that allows users to
select directories and files the server should have access to. This can be combined with
automatic workspace detection from version control systems or project files.

However, implementations are free to expose roots through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Clients that support roots **MUST** declare the `roots` capability during
[initialization](/specification/draft/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "roots": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the client will emit notifications when the list of roots
changes.

## Protocol Messages

### Listing Roots

To retrieve roots, servers send a `roots/list` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "roots/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "roots": [
      {
        "uri": "file:///home/user/projects/myproject",
        "name": "My Project"
      }
    ]
  }
}
```

### Root List Changes

When roots change, clients that support `listChanged` **MUST** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/roots/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client

    Note over Server,Client: Discovery
    Server->>Client: roots/list
    Client-->>Server: Available roots

    Note over Server,Client: Changes
    Client--)Server: notifications/roots/list_changed
    Server->>Client: roots/list
    Client-->>Server: Updated roots
```

## Data Types

### Root

A root definition includes:

- `uri`: Unique identifier for the root. This **MUST** be a `file://` URI in the current
  specification.
- `name`: Optional human-readable name for display purposes.

Example roots for different use cases:

#### Project Directory

```json
{
  "uri": "file:///home/user/projects/myproject",
  "name": "My Project"
}
```

#### Multiple Repositories

```json
[
  {
    "uri": "file:///home/user/repos/frontend",
    "name": "Frontend Repository"
  },
  {
    "uri": "file:///home/user/repos/backend",
    "name": "Backend Repository"
  }
]
```

## Error Handling

Clients **SHOULD** return standard JSON-RPC errors for common failure cases:

- Client does not support roots: `-32601` (Method not found)
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Roots not supported",
    "data": {
      "reason": "Client does not have roots capability"
    }
  }
}
```

## Security Considerations

1. Clients **MUST**:

   - Only expose roots with appropriate permissions
   - Validate all root URIs to prevent path traversal
   - Implement proper access controls
   - Monitor root accessibility

2. Servers **SHOULD**:
   - Handle cases where roots become unavailable
   - Respect root boundaries during operations
   - Validate all paths against provided roots

## Implementation Guidelines

1. Clients **SHOULD**:

   - Prompt users for consent before exposing roots to servers
   - Provide clear user interfaces for root management
   - Validate root accessibility before exposing
   - Monitor for root changes

2. Servers **SHOULD**:
   - Check for roots capability before usage
   - Handle root list changes gracefully
   - Respect root boundaries in operations
   - Cache root information appropriately


---
modelcontextprotocol/docs/specification/draft/client/sampling.mdx
---
---
title: Sampling
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to request LLM
sampling ("completions" or "generations") from language models via clients. This flow
allows clients to maintain control over model access, selection, and permissions while
enabling servers to leverage AI capabilities&mdash;with no server API keys necessary.
Servers can request text, audio, or image-based interactions and optionally include
context from MCP servers in their prompts.

## User Interaction Model

Sampling in MCP allows servers to implement agentic behaviors, by enabling LLM calls to
occur _nested_ inside other MCP server features.

Implementations are free to expose sampling through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny sampling requests.

Applications **SHOULD**:

- Provide UI that makes it easy and intuitive to review sampling requests
- Allow users to view and edit prompts before sending
- Present generated responses for review before delivery
</Warning>

## Capabilities

Clients that support sampling **MUST** declare the `sampling` capability during
[initialization](/specification/draft/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "sampling": {}
  }
}
```

## Protocol Messages

### Creating Messages

To request a language model generation, servers send a `sampling/createMessage` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "What is the capital of France?"
        }
      }
    ],
    "modelPreferences": {
      "hints": [
        {
          "name": "claude-3-sonnet"
        }
      ],
      "intelligencePriority": 0.8,
      "speedPriority": 0.5
    },
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 100
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "content": {
      "type": "text",
      "text": "The capital of France is Paris."
    },
    "model": "claude-3-sonnet-20240307",
    "stopReason": "endTurn"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Server
    participant Client
    participant User
    participant LLM

    Note over Server,Client: Server initiates sampling
    Server->>Client: sampling/createMessage

    Note over Client,User: Human-in-the-loop review
    Client->>User: Present request for approval
    User-->>Client: Review and approve/modify

    Note over Client,LLM: Model interaction
    Client->>LLM: Forward approved request
    LLM-->>Client: Return generation

    Note over Client,User: Response review
    Client->>User: Present response for approval
    User-->>Client: Review and approve/modify

    Note over Server,Client: Complete request
    Client-->>Server: Return approved response
```

## Data Types

### Messages

Sampling messages can contain:

#### Text Content

```json
{
  "type": "text",
  "text": "The message content"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/jpeg"
}
```

#### Audio Content

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

### Model Preferences

Model selection in MCP requires careful abstraction since servers and clients may use
different AI providers with distinct model offerings. A server cannot simply request a
specific model by name since the client may not have access to that exact model or may
prefer to use a different provider's equivalent model.

To solve this, MCP implements a preference system that combines abstract capability
priorities with optional model hints:

#### Capability Priorities

Servers express their needs through three normalized priority values (0-1):

- `costPriority`: How important is minimizing costs? Higher values prefer cheaper models.
- `speedPriority`: How important is low latency? Higher values prefer faster models.
- `intelligencePriority`: How important are advanced capabilities? Higher values prefer
  more capable models.

#### Model Hints

While priorities help select models based on characteristics, `hints` allow servers to
suggest specific models or model families:

- Hints are treated as substrings that can match model names flexibly
- Multiple hints are evaluated in order of preference
- Clients **MAY** map hints to equivalent models from different providers
- Hints are advisory&mdash;clients make final model selection

For example:

```json
{
  "hints": [
    { "name": "claude-3-sonnet" }, // Prefer Sonnet-class models
    { "name": "claude" } // Fall back to any Claude model
  ],
  "costPriority": 0.3, // Cost is less important
  "speedPriority": 0.8, // Speed is very important
  "intelligencePriority": 0.5 // Moderate capability needs
}
```

The client processes these preferences to select an appropriate model from its available
options. For instance, if the client doesn't have access to Claude models but has Gemini,
it might map the sonnet hint to `gemini-1.5-pro` based on similar capabilities.

## Error Handling

Clients **SHOULD** return errors for common failure cases:

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -1,
    "message": "User rejected sampling request"
  }
}
```

## Security Considerations

1. Clients **SHOULD** implement user approval controls
2. Both parties **SHOULD** validate message content
3. Clients **SHOULD** respect model preference hints
4. Clients **SHOULD** implement rate limiting
5. Both parties **MUST** handle sensitive data appropriately


---
modelcontextprotocol/docs/specification/draft/server/index.mdx
---
---
title: Overview
---

<Info>**Protocol Revision**: draft</Info>

Servers provide the fundamental building blocks for adding context to language models via
MCP. These primitives enable rich interactions between clients, servers, and language
models:

- **Prompts**: Pre-defined templates or instructions that guide language model
  interactions
- **Resources**: Structured data or content that provides additional context to the model
- **Tools**: Executable functions that allow models to perform actions or retrieve
  information

Each primitive can be summarized in the following control hierarchy:

| Primitive | Control                | Description                                        | Example                         |
| --------- | ---------------------- | -------------------------------------------------- | ------------------------------- |
| Prompts   | User-controlled        | Interactive templates invoked by user choice       | Slash commands, menu options    |
| Resources | Application-controlled | Contextual data attached and managed by the client | File contents, git history      |
| Tools     | Model-controlled       | Functions exposed to the LLM to take actions       | API POST requests, file writing |

Explore these key primitives in more detail below:

<CardGroup cols={3}>
  <Card title="Prompts" icon="message" href="prompts" />
  <Card title="Resources" icon="file-lines" href="resources" />
  <Card title="Tools" icon="wrench" href="tools" />
</CardGroup>


---
modelcontextprotocol/docs/specification/draft/server/prompts.mdx
---
---
title: Prompts
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose prompt
templates to clients. Prompts allow servers to provide structured messages and
instructions for interacting with language models. Clients can discover available
prompts, retrieve their contents, and provide arguments to customize them.

## User Interaction Model

Prompts are designed to be **user-controlled**, meaning they are exposed from servers to
clients with the intention of the user being able to explicitly select them for use.

Typically, prompts would be triggered through user-initiated commands in the user
interface, which allows users to naturally discover and invoke available prompts.

For example, as slash commands:

![Example of prompt exposed as slash command](slash-command.png)

However, implementors are free to expose prompts through any interface pattern that suits
their needs&mdash;the protocol itself does not mandate any specific user interaction
model.

## Capabilities

Servers that support prompts **MUST** declare the `prompts` capability during
[initialization](/specification/draft/basic/lifecycle#initialization):

```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available prompts changes.

## Protocol Messages

### Listing Prompts

To retrieve available prompts, clients send a `prompts/list` request. This operation
supports [pagination](/specification/draft/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "description": "Asks the LLM to analyze code quality and suggest improvements",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Getting a Prompt

To retrieve a specific prompt, clients send a `prompts/get` request. Arguments may be
auto-completed through [the completion API](/specification/draft/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n    print('world')"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n    print('world')"
        }
      }
    ]
  }
}
```

### List Changed Notification

When the list of available prompts changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: prompts/list
    Server-->>Client: List of prompts

    Note over Client,Server: Usage
    Client->>Server: prompts/get
    Server-->>Client: Prompt content

    opt listChanged
      Note over Client,Server: Changes
      Server--)Client: prompts/list_changed
      Client->>Server: prompts/list
      Server-->>Client: Updated prompts
    end
```

## Data Types

### Prompt

A prompt definition includes:

- `name`: Unique identifier for the prompt
- `description`: Optional human-readable description
- `arguments`: Optional list of arguments for customization

### PromptMessage

Messages in a prompt can contain:

- `role`: Either "user" or "assistant" to indicate the speaker
- `content`: One of the following content types:

#### Text Content

Text content represents plain text messages:

```json
{
  "type": "text",
  "text": "The text content of the message"
}
```

This is the most common content type used for natural language interactions.

#### Image Content

Image content allows including visual information in messages:

```json
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/png"
}
```

The image data **MUST** be base64-encoded and include a valid MIME type. This enables
multi-modal interactions where visual context is important.

#### Audio Content

Audio content allows including audio information in messages:

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

The audio data MUST be base64-encoded and include a valid MIME type. This enables
multi-modal interactions where audio context is important.

#### Embedded Resources

Embedded resources allow referencing server-side resources directly in messages:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

Resources can contain either text or binary (blob) data and **MUST** include:

- A valid resource URI
- The appropriate MIME type
- Either text content or base64-encoded blob data

Embedded resources enable prompts to seamlessly incorporate server-managed content like
documentation, code samples, or other reference materials directly into the conversation
flow.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid prompt name: `-32602` (Invalid params)
- Missing required arguments: `-32602` (Invalid params)
- Internal errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD** validate prompt arguments before processing
2. Clients **SHOULD** handle pagination for large prompt lists
3. Both parties **SHOULD** respect capability negotiation

## Security

Implementations **MUST** carefully validate all prompt inputs and outputs to prevent
injection attacks or unauthorized access to resources.


---
modelcontextprotocol/docs/specification/draft/server/resources.mdx
---
---
title: Resources
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to expose
resources to clients. Resources allow servers to share data that provides context to
language models, such as files, database schemas, or application-specific information.
Each resource is uniquely identified by a
[URI](https://datatracker.ietf.org/doc/html/rfc3986).

## User Interaction Model

Resources in MCP are designed to be **application-driven**, with host applications
determining how to incorporate context based on their needs.

For example, applications could:

- Expose resources through UI elements for explicit selection, in a tree or list view
- Allow the user to search through and filter available resources
- Implement automatic context inclusion, based on heuristics or the AI model's selection

![Example of resource context picker](resource-picker.png)

However, implementations are free to expose resources through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Servers that support resources **MUST** declare the `resources` capability:

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

The capability supports two optional features:

- `subscribe`: whether the client can subscribe to be notified of changes to individual
  resources.
- `listChanged`: whether the server will emit notifications when the list of available
  resources changes.

Both `subscribe` and `listChanged` are optional&mdash;servers can support neither,
either, or both:

```json
{
  "capabilities": {
    "resources": {} // Neither feature supported
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true // Only subscriptions supported
    }
  }
}
```

```json
{
  "capabilities": {
    "resources": {
      "listChanged": true // Only list change notifications supported
    }
  }
}
```

## Protocol Messages

### Listing Resources

To discover available resources, clients send a `resources/list` request. This operation
supports [pagination](/specification/draft/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///project/src/main.rs",
        "name": "main.rs",
        "description": "Primary application entry point",
        "mimeType": "text/x-rust"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Reading Resources

To retrieve resource contents, clients send a `resources/read` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///project/src/main.rs",
        "mimeType": "text/x-rust",
        "text": "fn main() {\n    println!(\"Hello world!\");\n}"
      }
    ]
  }
}
```

### Resource Templates

Resource templates allow servers to expose parameterized resources using
[URI templates](https://datatracker.ietf.org/doc/html/rfc6570). Arguments may be
auto-completed through [the completion API](/specification/draft/server/utilities/completion).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/templates/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "Project Files",
        "description": "Access files in the project directory",
        "mimeType": "application/octet-stream"
      }
    ]
  }
}
```

### List Changed Notification

When the list of available resources changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

### Subscriptions

The protocol supports optional subscriptions to resource changes. Clients can subscribe
to specific resources and receive notifications when they change:

**Subscribe Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Update Notification:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Resource Discovery
    Client->>Server: resources/list
    Server-->>Client: List of resources

    Note over Client,Server: Resource Access
    Client->>Server: resources/read
    Server-->>Client: Resource contents

    Note over Client,Server: Subscriptions
    Client->>Server: resources/subscribe
    Server-->>Client: Subscription confirmed

    Note over Client,Server: Updates
    Server--)Client: notifications/resources/updated
    Client->>Server: resources/read
    Server-->>Client: Updated contents
```

## Data Types

### Resource

A resource definition includes:

- `uri`: Unique identifier for the resource
- `name`: Human-readable name
- `description`: Optional description
- `mimeType`: Optional MIME type
- `size`: Optional size in bytes

### Resource Contents

Resources can contain either text or binary data:

#### Text Content

```json
{
  "uri": "file:///example.txt",
  "mimeType": "text/plain",
  "text": "Resource content"
}
```

#### Binary Content

```json
{
  "uri": "file:///example.png",
  "mimeType": "image/png",
  "blob": "base64-encoded-data"
}
```

## Common URI Schemes

The protocol defines several standard URI schemes. This list not
exhaustive&mdash;implementations are always free to use additional, custom URI schemes.

### https://

Used to represent a resource available on the web.

Servers **SHOULD** use this scheme only when the client is able to fetch and load the
resource directly from the web on its own—that is, it doesn’t need to read the resource
via the MCP server.

For other use cases, servers **SHOULD** prefer to use another URI scheme, or define a
custom one, even if the server will itself be downloading resource contents over the
internet.

### file://

Used to identify resources that behave like a filesystem. However, the resources do not
need to map to an actual physical filesystem.

MCP servers **MAY** identify file:// resources with an
[XDG MIME type](https://specifications.freedesktop.org/shared-mime-info-spec/0.14/ar01s02.html#id-1.3.14),
like `inode/directory`, to represent non-regular files (such as directories) that don’t
otherwise have a standard MIME type.

### git://

Git version control integration.

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Resource not found: `-32002`
- Internal errors: `-32603`

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32002,
    "message": "Resource not found",
    "data": {
      "uri": "file:///nonexistent.txt"
    }
  }
}
```

## Security Considerations

1. Servers **MUST** validate all resource URIs
2. Access controls **SHOULD** be implemented for sensitive resources
3. Binary data **MUST** be properly encoded
4. Resource permissions **SHOULD** be checked before operations


---
modelcontextprotocol/docs/specification/draft/server/tools.mdx
---
---
title: Tools
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) allows servers to expose tools that can be invoked by
language models. Tools enable models to interact with external systems, such as querying
databases, calling APIs, or performing computations. Each tool is uniquely identified by
a name and includes metadata describing its schema.

## User Interaction Model

Tools in MCP are designed to be **model-controlled**, meaning that the language model can
discover and invoke tools automatically based on its contextual understanding and the
user's prompts.

However, implementations are free to expose tools through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

<Warning>
For trust & safety and security, there **SHOULD** always
be a human in the loop with the ability to deny tool invocations.

Applications **SHOULD**:

- Provide UI that makes clear which tools are being exposed to the AI model
- Insert clear visual indicators when tools are invoked
- Present confirmation prompts to the user for operations, to ensure a human is in the
  loop
</Warning>

## Capabilities

Servers that support tools **MUST** declare the `tools` capability:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of
available tools changes.

## Protocol Messages

### Listing Tools

To discover available tools, clients send a `tools/list` request. This operation supports
[pagination](/specification/draft/server/utilities/pagination).

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather information for a location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or zip code"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Calling Tools

To invoke a tool, clients send a `tools/call` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "New York"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in New York:\nTemperature: 72°F\nConditions: Partly cloudy"
      }
    ],
    "isError": false
  }
}
```

### List Changed Notification

When the list of available tools changes, servers that declared the `listChanged`
capability **SHOULD** send a notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant LLM
    participant Client
    participant Server

    Note over Client,Server: Discovery
    Client->>Server: tools/list
    Server-->>Client: List of tools

    Note over Client,LLM: Tool Selection
    LLM->>Client: Select tool to use

    Note over Client,Server: Invocation
    Client->>Server: tools/call
    Server-->>Client: Tool result
    Client->>LLM: Process result

    Note over Client,Server: Updates
    Server--)Client: tools/list_changed
    Client->>Server: tools/list
    Server-->>Client: Updated tools
```

## Data Types

### Tool

A tool definition includes:

- `name`: Unique identifier for the tool
- `description`: Human-readable description of functionality
- `inputSchema`: JSON Schema defining expected parameters
- `annotations`: optional properties describing tool behavior

<Warning>For trust & safety and security, clients **MUST** consider
tool annotations to be untrusted unless they come from trusted servers.</Warning>

### Tool Result

Tool results can contain multiple content items of different types:

#### Text Content

```json
{
  "type": "text",
  "text": "Tool result text"
}
```

#### Image Content

```json
{
  "type": "image",
  "data": "base64-encoded-data",
  "mimeType": "image/png"
}
```

#### Audio Content

```json
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

#### Embedded Resources

[Resources](/specification/draft/server/resources) **MAY** be embedded, to provide additional context
or data, behind a URI that can be subscribed to or fetched again by the client later:

```json
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

## Error Handling

Tools use two error reporting mechanisms:

1. **Protocol Errors**: Standard JSON-RPC errors for issues like:

   - Unknown tools
   - Invalid arguments
   - Server errors

2. **Tool Execution Errors**: Reported in tool results with `isError: true`:
   - API failures
   - Invalid input data
   - Business logic errors

Example protocol error:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32602,
    "message": "Unknown tool: invalid_tool_name"
  }
}
```

Example tool execution error:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Failed to fetch weather data: API rate limit exceeded"
      }
    ],
    "isError": true
  }
}
```

## Security Considerations

1. Servers **MUST**:

   - Validate all tool inputs
   - Implement proper access controls
   - Rate limit tool invocations
   - Sanitize tool outputs

2. Clients **SHOULD**:
   - Prompt for user confirmation on sensitive operations
   - Show tool inputs to the user before calling the server, to avoid malicious or
     accidental data exfiltration
   - Validate tool results before passing to LLM
   - Implement timeouts for tool calls
   - Log tool usage for audit purposes


---
modelcontextprotocol/docs/specification/draft/server/utilities/completion.mdx
---
---
title: Completion
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to offer
argument autocompletion suggestions for prompts and resource URIs. This enables rich,
IDE-like experiences where users receive contextual suggestions while entering argument
values.

## User Interaction Model

Completion in MCP is designed to support interactive user experiences similar to IDE code
completion.

For example, applications may show completion suggestions in a dropdown or popup menu as
users type, with the ability to filter and select from available options.

However, implementations are free to expose completion through any interface pattern that
suits their needs&mdash;the protocol itself does not mandate any specific user
interaction model.

## Capabilities

Servers that support completions **MUST** declare the `completions` capability:

```json
{
  "capabilities": {
    "completions": {}
  }
}
```

## Protocol Messages

### Requesting Completions

To get completion suggestions, clients send a `completion/complete` request specifying
what is being completed through a reference type:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "code_review"
    },
    "argument": {
      "name": "language",
      "value": "py"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "completion": {
      "values": ["python", "pytorch", "pyside"],
      "total": 10,
      "hasMore": true
    }
  }
}
```

### Reference Types

The protocol supports two types of completion references:

| Type           | Description                 | Example                                             |
| -------------- | --------------------------- | --------------------------------------------------- |
| `ref/prompt`   | References a prompt by name | `{"type": "ref/prompt", "name": "code_review"}`     |
| `ref/resource` | References a resource URI   | `{"type": "ref/resource", "uri": "file:///{path}"}` |

### Completion Results

Servers return an array of completion values ranked by relevance, with:

- Maximum 100 items per response
- Optional total number of available matches
- Boolean indicating if additional results exist

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client: User types argument
    Client->>Server: completion/complete
    Server-->>Client: Completion suggestions

    Note over Client: User continues typing
    Client->>Server: completion/complete
    Server-->>Client: Refined suggestions
```

## Data Types

### CompleteRequest

- `ref`: A `PromptReference` or `ResourceReference`
- `argument`: Object containing:
  - `name`: Argument name
  - `value`: Current value

### CompleteResult

- `completion`: Object containing:
  - `values`: Array of suggestions (max 100)
  - `total`: Optional total matches
  - `hasMore`: Additional results flag

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Method not found: `-32601` (Capability not supported)
- Invalid prompt name: `-32602` (Invalid params)
- Missing required arguments: `-32602` (Invalid params)
- Internal errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD**:

   - Return suggestions sorted by relevance
   - Implement fuzzy matching where appropriate
   - Rate limit completion requests
   - Validate all inputs

2. Clients **SHOULD**:
   - Debounce rapid completion requests
   - Cache completion results where appropriate
   - Handle missing or partial results gracefully

## Security

Implementations **MUST**:

- Validate all completion inputs
- Implement appropriate rate limiting
- Control access to sensitive suggestions
- Prevent completion-based information disclosure


---
modelcontextprotocol/docs/specification/draft/server/utilities/logging.mdx
---
---
title: Logging
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) provides a standardized way for servers to send
structured log messages to clients. Clients can control logging verbosity by setting
minimum log levels, with servers sending notifications containing severity levels,
optional logger names, and arbitrary JSON-serializable data.

## User Interaction Model

Implementations are free to expose logging through any interface pattern that suits their
needs&mdash;the protocol itself does not mandate any specific user interaction model.

## Capabilities

Servers that emit log message notifications **MUST** declare the `logging` capability:

```json
{
  "capabilities": {
    "logging": {}
  }
}
```

## Log Levels

The protocol follows the standard syslog severity levels specified in
[RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1):

| Level     | Description                      | Example Use Case           |
| --------- | -------------------------------- | -------------------------- |
| debug     | Detailed debugging information   | Function entry/exit points |
| info      | General informational messages   | Operation progress updates |
| notice    | Normal but significant events    | Configuration changes      |
| warning   | Warning conditions               | Deprecated feature usage   |
| error     | Error conditions                 | Operation failures         |
| critical  | Critical conditions              | System component failures  |
| alert     | Action must be taken immediately | Data corruption detected   |
| emergency | System is unusable               | Complete system failure    |

## Protocol Messages

### Setting Log Level

To configure the minimum log level, clients **MAY** send a `logging/setLevel` request:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "logging/setLevel",
  "params": {
    "level": "info"
  }
}
```

### Log Message Notifications

Servers send log messages using `notifications/message` notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "error",
    "logger": "database",
    "data": {
      "error": "Connection failed",
      "details": {
        "host": "localhost",
        "port": 5432
      }
    }
  }
}
```

## Message Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Note over Client,Server: Configure Logging
    Client->>Server: logging/setLevel (info)
    Server-->>Client: Empty Result

    Note over Client,Server: Server Activity
    Server--)Client: notifications/message (info)
    Server--)Client: notifications/message (warning)
    Server--)Client: notifications/message (error)

    Note over Client,Server: Level Change
    Client->>Server: logging/setLevel (error)
    Server-->>Client: Empty Result
    Note over Server: Only sends error level<br/>and above
```

## Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:

- Invalid log level: `-32602` (Invalid params)
- Configuration errors: `-32603` (Internal error)

## Implementation Considerations

1. Servers **SHOULD**:

   - Rate limit log messages
   - Include relevant context in data field
   - Use consistent logger names
   - Remove sensitive information

2. Clients **MAY**:
   - Present log messages in the UI
   - Implement log filtering/search
   - Display severity visually
   - Persist log messages

## Security

1. Log messages **MUST NOT** contain:

   - Credentials or secrets
   - Personal identifying information
   - Internal system details that could aid attacks

2. Implementations **SHOULD**:
   - Rate limit messages
   - Validate all data fields
   - Control log access
   - Monitor for sensitive content


---
modelcontextprotocol/docs/specification/draft/server/utilities/pagination.mdx
---
---
title: Pagination
---

<Info>**Protocol Revision**: draft</Info>

The Model Context Protocol (MCP) supports paginating list operations that may return
large result sets. Pagination allows servers to yield results in smaller chunks rather
than all at once.

Pagination is especially important when connecting to external services over the
internet, but also useful for local integrations to avoid performance issues with large
data sets.

## Pagination Model

Pagination in MCP uses an opaque cursor-based approach, instead of numbered pages.

- The **cursor** is an opaque string token, representing a position in the result set
- **Page size** is determined by the server, and clients **MUST NOT** assume a fixed page
  size

## Response Format

Pagination starts when the server sends a **response** that includes:

- The current page of results
- An optional `nextCursor` field if more results exist

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "resources": [...],
    "nextCursor": "eyJwYWdlIjogM30="
  }
}
```

## Request Format

After receiving a cursor, the client can _continue_ paginating by issuing a request
including that cursor:

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {
    "cursor": "eyJwYWdlIjogMn0="
  }
}
```

## Pagination Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: List Request (no cursor)
    loop Pagination Loop
      Server-->>Client: Page of results + nextCursor
      Client->>Server: List Request (with cursor)
    end
```

## Operations Supporting Pagination

The following MCP operations support pagination:

- `resources/list` - List available resources
- `resources/templates/list` - List resource templates
- `prompts/list` - List available prompts
- `tools/list` - List available tools

## Implementation Guidelines

1. Servers **SHOULD**:

   - Provide stable cursors
   - Handle invalid cursors gracefully

2. Clients **SHOULD**:

   - Treat a missing `nextCursor` as the end of results
   - Support both paginated and non-paginated flows

3. Clients **MUST** treat cursors as opaque tokens:
   - Don't make assumptions about cursor format
   - Don't attempt to parse or modify cursors
   - Don't persist cursors across sessions

## Error Handling

Invalid cursors **SHOULD** result in an error with code -32602 (Invalid params).


---
modelcontextprotocol/docs/tutorials/building-a-client-node.mdx
---
<Tab title="Node">
## System Requirements

Before starting, ensure your system meets these requirements:
- Mac or Windows computer
- Node.js version 16 or higher installed
- npm (comes with Node.js)

## Setting Up Your Environment

First, create a new Node.js project:

```bash
# Create project directory
mkdir mcp-client
cd mcp-client

# Initialize npm project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk @anthropic-ai/sdk dotenv
npm install -D typescript @types/node

# Create TypeScript config
npx tsc --init

# Create necessary files
mkdir src
touch src/client.ts
touch .env
```

Update your `package.json` to add necessary configuration:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node build/client.js"
  }
}
```

Update your `tsconfig.json` with appropriate settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

## Setting Up Your API Key

You'll need an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

Create a `.env` file:
```bash
ANTHROPIC_API_KEY=your_key_here
```

Add `.env` to your `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Creating the Client

First, let's set up our imports and create the basic client class in `src/client.ts`:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as readline from "node:readline";

dotenv.config();

interface MCPClientConfig {
  name?: string;
  version?: string;
}

class MCPClient {
  private client: Client | null = null;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;

  constructor(config: MCPClientConfig = {}) {
    this.anthropic = new Anthropic();
  }

  // Methods will go here
}
```

## Server Connection Management

Next, implement the method to connect to an MCP server:

```typescript
  async connectToServer(serverScriptPath: string): Promise<void> {
    const isPython = serverScriptPath.endsWith(".py");
    const isJs = serverScriptPath.endsWith(".js");

    if (!isPython && !isJs) {
      throw new Error("Server script must be a .py or .js file");
    }

    const command = isPython ? "python" : "node";

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });

    this.client = new Client(
      {
        name: "mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);

    // List available tools
    const response = await this.client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );

    console.log(
      "\nConnected to server with tools:",
      response.tools.map((tool: any) => tool.name)
    );
  }
```

## Query Processing Logic

Now add the core functionality for processing queries and handling tool calls:

```typescript
  async processQuery(query: string): Promise<string> {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    // Initialize messages array with user query
    let messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    // Get available tools
    const toolsResponse = await this.client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );

    const availableTools = toolsResponse.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    const finalText: string[] = [];
    let currentResponse = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages,
      tools: availableTools,
    });

    // Process the response and any tool calls
    while (true) {
      // Add Claude's response to final text and messages
      for (const content of currentResponse.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          const toolName = content.name;
          const toolArgs = content.input;

          // Execute tool call
          const result = await this.client.request(
            {
              method: "tools/call",
              params: {
                name: toolName,
                arguments: toolArgs,
              },
            },
            CallToolResultSchema
          );

          finalText.push(
            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
          );

          // Add Claude's response (including tool use) to messages
          messages.push({
            role: "assistant",
            content: currentResponse.content,
          });

          // Add tool result to messages
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: content.id,
                content: [
                  { type: "text", text: JSON.stringify(result.content) },
                ],
              },
            ],
          });

          // Get next response from Claude with tool results
          currentResponse = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages,
            tools: availableTools,
          });

          // Add Claude's interpretation of the tool results to final text
          if (currentResponse.content[0]?.type === "text") {
            finalText.push(currentResponse.content[0].text);
          }

          // Continue the loop to process any additional tool calls
          continue;
        }
      }

      // If we reach here, there were no tool calls in the response
      break;
    }

    return finalText.join("\n");
  }

```

## Interactive Chat Interface

Add the chat loop and cleanup functionality:

```typescript
  async chatLoop(): Promise<void> {
    console.log("\nMCP Client Started!");
    console.log("Type your queries or 'quit' to exit.");

    // Using Node's readline for console input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = () => {
      rl.question("\nQuery: ", async (query: string) => {
        try {
          if (query.toLowerCase() === "quit") {
            await this.cleanup();
            rl.close();
            return;
          }

          const response = await this.processQuery(query);
          console.log("\n" + response);
          askQuestion();
        } catch (error) {
          console.error("\nError:", error);
          askQuestion();
        }
      });
    };

    askQuestion();
  }

  async cleanup(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }
```

## Main Entry Point

Finally, add the main execution logic outside the class:

```typescript
// Main execution
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: ts-node client.ts <path_to_server_script>");
    process.exit(1);
  }

  const client = new MCPClient();
  try {
    await client.connectToServer(process.argv[2]);
    await client.chatLoop();
  } catch (error) {
    console.error("Error:", error);
    await client.cleanup();
    process.exit(1);
  }
}

// Run main if this is the main module
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main();
}

export default MCPClient;
```

## Running the Client

To run your client with any MCP server:

```bash
# Build the TypeScript code. Make sure to rerun this every time you update `client.ts`!
npm run build

# Run the client
node build/client.js path/to/server.py  # for Python servers
node build/client.js path/to/server.js  # for Node.js servers
```

The client will:
1. Connect to the specified server
2. List available tools
3. Start an interactive chat session where you can:
   - Enter queries
   - See tool executions
   - Get responses from Claude

## Key Components Explained

#### 1. Client Initialization
- The `MCPClient` class initializes with session management and API clients
- Sets up the MCP client with basic capabilities
- Configures the Anthropic client for Claude interactions

#### 2. Server Connection
- Supports both Python and Node.js servers
- Validates server script type
- Sets up proper communication channels
- Lists available tools on connection

#### 3. Query Processing
- Maintains conversation context
- Handles Claude's responses and tool calls
- Manages the message flow between Claude and tools
- Combines results into a coherent response

#### 4. Interactive Interface
- Provides a simple command-line interface
- Handles user input and displays responses
- Includes basic error handling
- Allows graceful exit

#### 5. Resource Management
- Proper cleanup of resources
- Error handling for connection issues
- Graceful shutdown procedures

### Common Customization Points

1. **Tool Handling**
   - Modify `processQuery()` to handle specific tool types
   - Add custom error handling for tool calls
   - Implement tool-specific response formatting

2. **Response Processing**
   - Customize how tool results are formatted
   - Add response filtering or transformation
   - Implement custom logging

3. **User Interface**
   - Add a GUI or web interface
   - Implement rich console output
   - Add command history or auto-completion

### Best Practices

1. **Error Handling**
   - Always wrap tool calls in try-catch blocks
   - Provide meaningful error messages
   - Gracefully handle connection issues

2. **Resource Management**
   - Use proper cleanup methods
   - Close connections when done
   - Handle server disconnections

3. **Security**
   - Store API keys securely in `.env`
   - Validate server responses
   - Be cautious with tool permissions

### Troubleshooting

#### Server Path Issues
- Double-check the path to your server script
- Use absolute paths if relative paths aren't working
- For Windows users, use forward slashes (/) or escaped backslashes (\\)
- Verify the server file has the correct extension (.py or .js)

Example of correct path usage:
```bash
# Relative path
node build/client.js ./server/weather.js

# Absolute path
node build/client.js /Users/username/projects/mcp-server/weather.js

# Windows path (either format works)
node build/client.js C:/projects/mcp-server/weather.js
node build/client.js C:\\projects\\mcp-server\\weather.js
```

#### Connection Issues
- Verify the server script exists and has correct permissions
- Check that the server script is executable
- Ensure the server script's dependencies are installed
- Try running the server script directly to check for errors

#### Tool Execution Issues
- Check server logs for error messages
- Verify tool input arguments match the schema
- Ensure tool dependencies are available
- Add debug logging to track execution flow
</Tab>

---
modelcontextprotocol/docs/tutorials/building-mcp-with-llms.mdx
---
---
title: "Building MCP with LLMs"
description: "Speed up your MCP development using LLMs such as Claude!"
---

This guide will help you use LLMs to help you build custom Model Context Protocol (MCP) servers and clients. We'll be focusing on Claude for this tutorial, but you can do this with any frontier LLM.

## Preparing the documentation

Before starting, gather the necessary documentation to help Claude understand MCP:

1. Visit https://modelcontextprotocol.io/llms-full.txt and copy the full documentation text
2. Navigate to either the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) or [Python SDK repository](https://github.com/modelcontextprotocol/python-sdk)
3. Copy the README files and other relevant documentation
4. Paste these documents into your conversation with Claude

## Describing your server

Once you've provided the documentation, clearly describe to Claude what kind of server you want to build. Be specific about:

- What resources your server will expose
- What tools it will provide
- Any prompts it should offer
- What external systems it needs to interact with

For example:
```
Build an MCP server that:
- Connects to my company's PostgreSQL database
- Exposes table schemas as resources
- Provides tools for running read-only SQL queries
- Includes prompts for common data analysis tasks
```

## Working with Claude

When working with Claude on MCP servers:

1. Start with the core functionality first, then iterate to add more features
2. Ask Claude to explain any parts of the code you don't understand
3. Request modifications or improvements as needed
4. Have Claude help you test the server and handle edge cases

Claude can help implement all the key MCP features:

- Resource management and exposure
- Tool definitions and implementations
- Prompt templates and handlers
- Error handling and logging
- Connection and transport setup

## Best practices

When building MCP servers with Claude:

- Break down complex servers into smaller pieces
- Test each component thoroughly before moving on
- Keep security in mind - validate inputs and limit access appropriately
- Document your code well for future maintenance
- Follow MCP protocol specifications carefully

## Next steps

After Claude helps you build your server:

1. Review the generated code carefully
2. Test the server with the MCP Inspector tool
3. Connect it to Claude.app or other MCP clients
4. Iterate based on real usage and feedback

Remember that Claude can help you modify and improve your server as requirements change over time.

Need more guidance? Just ask Claude specific questions about implementing MCP features or troubleshooting issues that arise.

---
