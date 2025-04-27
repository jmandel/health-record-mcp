# A4A Monorepo

This repository contains **A4A (Agent-to-Agent) reference code** implemented in TypeScript and
executed with [Bun](https://bun.sh/). It is organised as a small mono-repo with two publishable
packages plus several runnable samples:

• **@jmandel/a2a-bun-express-server** – the server-side framework used to build A2A agents on
  top of Express.
• **@jmandel/a2a-client** – a lightweight, event-driven browser/Node client for talking to A2A
  servers.

Under `samples/` you'll find a handful of **ready-to-run agents** (servers) and a
`client/react-demo` single-page app that exercises the client library against those servers.

---

## Repository Layout

```
a4a/
├── src/                         → source code for the server library
├── client/                     → source code for the client library
│   └── react-demo/             → React demo that consumes the client lib
├── samples/
│   ├── joke-agent-v2/          → Joke agent using the new generator API
│   └── prior-auth-v2/          → Prior-authorization agent (Gemini + SSE)
└── …
```

Each `samples/*` folder is **stand-alone**: you can `bun install` and run it directly once the
workspace links are in place (see below).

---

## Local Development with `bun link`

Both libraries are unpublished drafts.  To make the samples resolve the packages while you're
working locally we use Bun's [link](https://bun.sh/docs/cli/link) mechanism:

1. **Create global links from the library packages**
   ```bash
   # from the repo root
   cd a4a
   bun link       # creates a global link called "@jmandel/a2a-bun-express-server"

   cd client
   bun link       # creates a global link called "@jmandel/a2a-client"
   ```

2. **Link the server library into each sample agent**
   ```bash
   # joke-agent-v2
   cd ../samples/joke-agent-v2
   bun link @jmandel/a2a-bun-express-server

   # prior-auth-v2
   cd ../prior-auth-v2
   bun link @jmandel/a2a-bun-express-server
   ```

3. **Link the client library into the React demo**
   ```bash
   cd ../../client/react-demo
   bun link @jmandel/a2a-client
   ```

---

## Installing & Running

After the links are established, each project follows the usual Bun flow:

```bash
# inside a sample directory, e.g. a4a/samples/joke-agent-v2
bun install   # installs external deps, the linked lib is already resolved
bun run dev   # or `bun run server.ts` for plain runs
```

For the React demo:

```bash
cd a4a/client/react-demo
bun install
bun run dev   # Vite dev-server on http://localhost:5173 by default
```

---

## What's Inside the Server Library?

`@jmandel/a2a-bun-express-server` provides:

* **A2AServerCoreLite** – core finite-state machine for V2 processors (async generators).
* **Express helpers** (`startA2AExpressServerV2`) – spin up an agent with a couple of lines.
* **SseConnectionManager** – drop-in Server-Sent-Events broadcaster (autoprovisioned unless you
  explicitly disable `capabilities.streaming`).
* **InMemoryTaskStore** – simple persistence implementation suitable for demos/tests.
* Type definitions for tasks, messages, artifacts, etc.

The V2 processor API lets you write pure async generators that `yield` status updates, artifacts
or `input-required` states.  See `samples/joke-agent-v2/TopicJokeProcessorV2.ts` for an annotated
example.

---

## The Client Library & Demo

`@jmandel/a2a-client` is a minimal wrapper around the JSON-RPC / SSE protocol.  The React demo
(`client/react-demo`) shows:

* a "session" layer that wires the client to components (`PaSession`)
* an `ehr.html` viewer that renders mock EHR snippets
* a `tester.html` helper for ad-hoc requests

Open the demo in your browser after running `bun run dev` and point it at a running agent (e.g.
`http://localhost:3006/a2a` for the joke agent).

---

## Publishing (optional)

When ready, publish from each library folder:

```bash
# inside a4a (server lib)
npm publish --access public

# inside a4a/client (client lib)
npm publish --access public
```

Make sure to bump the version numbers first.  The samples will then be able to depend on the real
npm packages instead of Bun links.

---

Happy hacking! 🎉 
