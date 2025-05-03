
    // Import SDK Server and your custom Transport
     import { McpServer, IntraBrowserServerTransport, z } from '@jmandel/ehr-mcp/src/tools-browser-entry.js';

    // --- Logging Setup ---
    const logElement = document.getElementById('log');
    function log(message, ...details) {
        console.log('[Echo Tool SDK]', message, ...details);
        if (logElement) {
            const time = new Date().toLocaleTimeString();
            const detailString = details.length > 0 ? ` ${JSON.stringify(details)}` : "";
            logElement.textContent += `[${time}] ${message}${detailString}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    // --- Server Info ---
    const myServerInfo = {
        name: "iframe-echo-server-sdk",
        version: "2.0.0"
    };

    // --- Tool Schema ---
    // Define schema using Zod
    const echoSchema = z.object({
        text: z.string().describe("The text to echo."),
        delayMs: z.number().optional().describe("Optional delay in milliseconds.")
    });

    // --- Tool Handler Function ---
    // Note: Receives named arguments directly from the SDK
    async function handleEcho({ text, delayMs }) {
        log(`Handling echo for: ${text}`);
        if (delayMs) {
            log(`Delaying for ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        // SDK server.tool expects { content: [...] }
        return {
            content: [{ type: "text", text: `[From SDK] You sent: ${text}` }]
        };
    }

    // --- Main Setup ---
    async function main() {
        log("Setting up MCP Server with IntraBrowserServerTransport...");

        // 1. Create the MCP Server instance
        const server = new McpServer(myServerInfo);
        log("McpServer instance created.");

        // 2. Register the tool
        server.tool("echo", echoSchema.shape, handleEcho);
        log("Registered 'echo' tool.", echoSchema, handleEcho);

        // 3. Create the IntraBrowser Server Transport instance
        //    Replace '*' with specific origin(s) for production security
        const transport = new IntraBrowserServerTransport({
             trustedClientOrigins: '*'
        });
        log("IntraBrowserServerTransport instance created.");

        try {
            // 4. Connect the server and the transport
            //    This implicitly calls transport.start() which will wait for the client handshake
            log("Attempting server.connect(transport)...");
            await server.connect(transport);
            log("Server connected to transport successfully!");
            // The server is now running and listening for requests

        } catch (error) {
            log("Error connecting server to transport:", error);
            console.error("MCP Connection failed:", error);
        }
    }

    // Run the main setup function
    main();

    log("Echo server script loaded.");

