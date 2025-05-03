/* ------------------------------------------------------------------
   Front‑end bridge for a SINGLE tool iframe.
   • default tool   = /tool-sample/
   • override via   ?tool=https://other.example.dev
   • same ?token=…  param still used for WebSocket auth
-------------------------------------------------------------------*/
const p      = new URLSearchParams(location.search);
let   config = p.get("config") || "";           // mutable – can be changed via form
const urlArg = p.get("tool");                    // optional override
const DEFAULT_TOOL = "/tool-sample/";

// No mandatory param. When ?config is absent we default to "global" on the server.

/*  DOM helpers  */
const urlInput    = document.getElementById("toolUrl");
const configInput = document.getElementById("configVal");
const loadBtn     = document.getElementById("loadBtn");
const host        = document.getElementById("iframeHost");
const logEl       = document.getElementById("log");
const loaderUI    = document.getElementById("loader");

function log(m){ logEl.append(m+"\n"); logEl.scrollTo(0, 9e9); }

let ws = null;

function openWebSocket(){
  if (ws && ws.readyState === WebSocket.OPEN){
      ws.close(4000, "reopening with new config");
  }
  const wsURL = new URL("/ws", location.origin);
  if (config) wsURL.searchParams.set("config", config);
  ws = new WebSocket(wsURL);
  ws.onopen  = ()    => log("WS connected");
  ws.onerror = err   => log("WS error "+err);
  ws.onclose = ()    => log("WS closed");
  ws.onmessage = ev  => {
    const iframe = host.querySelector("iframe");
    if (iframe) {
      if (isToolServerReady) {
        // Tool ready - send immediately
        iframe.contentWindow.postMessage(ev.data, "*");
      } else {
        // Tool not ready - queue for later delivery
        toolReadyQueue.push(ev.data);
        log(`Queued message from WS (tool not ready yet). Queue size: ${toolReadyQueue.length}`);
      }
    } else {
      log("iframe not yet loaded – message dropped");
    }
  };
}

// initial WS
openWebSocket();

// Queue of messages to be delivered when tool's MCP server is ready
let toolReadyQueue = [];
let isToolServerReady = false;

/*  iframe → WS relay  */
window.addEventListener("message", ev => {
  try {
    // Messages FROM iframe TO server/proxy
    if (typeof ev.data === 'string') {
      const msg = JSON.parse(ev.data);
      
      // Handle special server_ready notification from intralib.js
      if (msg.method === 'server_ready') {
        log("Tool MCP server ready - can now deliver queued messages");
        isToolServerReady = true;
        
        // Flush any queued messages to the now-ready iframe
        if (toolReadyQueue.length > 0) {
          const iframe = host.querySelector('iframe');
          if (iframe) {
            log(`Flushing ${toolReadyQueue.length} queued messages to tool`);
            toolReadyQueue.forEach(m => iframe.contentWindow.postMessage(m, '*'));
            toolReadyQueue = [];
          }
        }
        return;
      }
    }
    
    // Forward all other messages to WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(ev.data);
  } catch(e) {
    log(`Error processing message: ${e.message}`);
  }
});

/*  Create / replace iframe  */
function makeIframe(src){
  // Reset ready state and queue when loading a new iframe
  isToolServerReady = false;
  toolReadyQueue = [];
  host.innerHTML = "";
  const fr = document.createElement("iframe");
  let iframeSrc = src;
  if (config){
    try{
      const urlObj = new URL(src, location.origin);
      urlObj.searchParams.set("config", config);
      iframeSrc = urlObj.pathname + urlObj.search + urlObj.hash;
    }catch{
      iframeSrc = src + (src.includes("?") ? "&" : "?") + "config="+encodeURIComponent(config);
    }
  }
  fr.src = iframeSrc;
  host.append(fr);
  log("iframe loaded: "+iframeSrc);
}

/*  Button / manual entry  */
loadBtn.onclick = () => {
  const u = urlInput.value.trim();
  // Update config from form (overrides URL param)
  const newConfig = (configInput.value || "").trim();
  if (newConfig !== config){
      config = newConfig;
      openWebSocket();
  }
  if (u) makeIframe(u);
};

/*  Init: set default or auto‑load  */
if (configInput) configInput.value = config; // pre-fill

if (urlArg){
  loaderUI.style.display = "none";   // hide form entirely
  makeIframe(urlArg);
} else {
  urlInput.value = DEFAULT_TOOL;
  makeIframe(DEFAULT_TOOL); // Auto-load the default tool
}
