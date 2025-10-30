import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { formatDate } from '../utils/dateUtils';
import { getWorkflowRunColor, getDisplayStatus } from '../utils/statusUtils';

export default function OngoingBuilds() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ongoing-runs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch ongoing runs');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pollMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 30000;
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const es = new EventSource('/api/events');
      es.onmessage = (event) => {
        if (!event?.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'repo-update') {
            // Merge update into list by recomputing filtered active runs for the repo
            setItems((prev) => {
              const existing = Array.isArray(prev) ? prev : [];
              const others = existing.filter(it => it.repo !== payload.repo);
              const newActive = (payload.runs || [])
                .filter(r => r?.status === 'in_progress' || r?.status === 'queued')
                .map(r => ({ repo: payload.repo, ...r }));
              return [...others, ...newActive];
            });
          }
        } catch {}
      };
      es.onerror = () => {};
      return () => { try { es.close(); } catch (_) {} };
    } catch (_) {}
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => (i.repo || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q));
  }, [items, search]);

  return (
    <>
      <Head>
        <title>Ongoing Builds • GitHub Actions Dashboard</title>
        <link rel="icon" href="/git.svg" type="image/svg+xml" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-black to-zinc-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-100">Ongoing Builds</h1>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repo or workflow..."
                className="w-full md:w-80 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={load} className="btn-secondary">Refresh</button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 p-4 glass rounded-lg mb-4">{error}</div>
          )}

          {loading && (
            <div className="text-gray-400 mb-4">Loading...</div>
          )}

          {filtered.length === 0 ? (
            <div className="text-gray-400 text-center p-6 glass rounded-lg">No ongoing builds</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .map((run) => {
                  const statusColor = getWorkflowRunColor(run.status, run.conclusion);
                  const display = getDisplayStatus(run.status, run.conclusion);
                  return (
                    <a key={`${run.repo}-${run.id}`} href={run.html_url} target="_blank" rel="noopener noreferrer"
                       className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all" style={{ borderLeftColor: statusColor, borderLeftWidth: '3px' }}>
                      <div className="flex justify-between items-center">
                        <div className="min-w-0">
                          <div className="text-gray-300 font-medium truncate">{run.name}</div>
                          <div className="text-sm text-gray-400 truncate">{run.repo}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(run.created_at)}</div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusColor, color: 'white' }}>{display}</span>
                      </div>
                    </a>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
