import { addClient, removeClient, heartbeat } from '../../lib/events';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Initial ping so client considers the connection established
  res.write(': connected\n\n');

  addClient(res);

  const interval = setInterval(() => heartbeat(), 15000);

  req.on('close', () => {
    clearInterval(interval);
    removeClient(res);
    try { res.end(); } catch (_) {}
  });
}
