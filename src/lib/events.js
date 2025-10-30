// Simple in-memory SSE broadcaster shared across API routes
// Note: This lives in module scope and persists per server instance

const clients = [];

export function addClient(res) {
  clients.push(res);
}

export function removeClient(res) {
  const index = clients.indexOf(res);
  if (index !== -1) clients.splice(index, 1);
}

export function broadcast(event) {
  if (!event || typeof event !== 'object') return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch (_) {
      // ignore write errors; client cleanup happens on close
    }
  }
}

export function heartbeat() {
  const data = `: keep-alive\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch (_) {}
  }
}

export function getClientCount() {
  return clients.length;
}
