import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import RepositoryList from '../components/RepositoryList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import SummaryStat from '../components/SummaryStat';
import Toolbar from '../components/Toolbar';
import StatusBadge from '../components/StatusBadge';

export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/initial-data`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch initial data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: expected an array');
    }
    
    const validatedData = data.map(item => {
      if (!item.repo || !Array.isArray(item.runs)) {
        throw new Error('Invalid data format: missing required properties');
      }
      return {
        ...item,
        runs: item.runs.map(run => ({
          ...run,
          lastUpdated: item.lastUpdated || new Date().toISOString(),
        })),
      };
    });
    
    return {
      props: {
        initialWorkflowRuns: validatedData,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        initialWorkflowRuns: [],
        error: error.message || 'Failed to fetch workflow runs',
      },
    };
  }
}

export default function Home({ initialWorkflowRuns, error: initialError }) {
  const [workflowRuns, setWorkflowRuns] = useState(initialWorkflowRuns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [lastUpdateDisplay, setLastUpdateDisplay] = useState('—');
  const [rightSearch, setRightSearch] = useState('');

  const formatNowTime = () => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(11, 19); // HH:MM:SS fallback
    }
  };

  // Flatten list of currently running workflows across all repositories
  const runningNow = useMemo(() => {
    try {
      const list = [];
      for (const repoEntry of Array.isArray(workflowRuns) ? workflowRuns : []) {
        const repo = repoEntry?.repo;
        const runs = Array.isArray(repoEntry?.runs) ? repoEntry.runs : [];
        for (const run of runs) {
          if (run?.status === 'in_progress') {
            list.push({ repo, ...run });
          }
        }
      }
      // Recent first
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch {
      return [];
    }
  }, [workflowRuns]);

  // Flatten list of queued workflows across all repositories
  const queuedNow = useMemo(() => {
    try {
      const list = [];
      for (const repoEntry of Array.isArray(workflowRuns) ? workflowRuns : []) {
        const repo = repoEntry?.repo;
        const runs = Array.isArray(repoEntry?.runs) ? repoEntry.runs : [];
        for (const run of runs) {
          if (run?.status === 'queued') {
            list.push({ repo, ...run });
          }
        }
      }
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch {
      return [];
    }
  }, [workflowRuns]);

  // Recently completed (success/failure) within last 10 minutes
  const { recentSuccess, recentFailed } = useMemo(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    const success = [];
    const failed = [];
    for (const repoEntry of Array.isArray(workflowRuns) ? workflowRuns : []) {
      const repo = repoEntry?.repo;
      const runs = Array.isArray(repoEntry?.runs) ? repoEntry.runs : [];
      for (const run of runs) {
        const finishedAt = new Date(run?.updated_at || run?.created_at || 0).getTime();
        if (run?.status === 'completed' && finishedAt >= cutoff) {
          if (run?.conclusion === 'success') success.push({ repo, ...run });
          else if (run?.conclusion === 'failure') failed.push({ repo, ...run });
        }
      }
    }
    success.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    failed.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    return { recentSuccess: success, recentFailed: failed };
  }, [workflowRuns]);

  // Function to fetch data from MongoDB only
  const fetchFromMongoDB = async () => {
    try {
      const response = await fetch('/api/initial-data', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store', // This ensures we always get fresh data
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format: expected an array');
      }
      
      const currentTime = new Date().toISOString();
      
      // Update the data with current timestamp
      const validatedData = data.map(item => {
        if (!item.repo || !Array.isArray(item.runs)) {
          throw new Error('Invalid data format: missing required properties');
        }
        return {
          ...item,
          lastUpdated: currentTime, // Always use current time for lastUpdated
          runs: item.runs.map(run => ({
            ...run,
            lastUpdated: currentTime, // Update each run's lastUpdated time as well
          })),
        };
      });
      
      setWorkflowRuns(validatedData);
      setLastUpdateDisplay(formatNowTime());
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error fetching from MongoDB:`, err);
      setError(err.message || 'Failed to fetch workflow runs');
    }
  };

  // Function to manually refresh from GitHub
  const fetchWorkflowRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, trigger a refresh of the data from GitHub (server-side)
      const refreshResponse = await fetch('/api/refresh-data', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to refresh data: ${refreshResponse.statusText}`);
      }
      
      // Then, fetch the updated data from MongoDB
      await fetchFromMongoDB();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error refreshing from GitHub:`, err);
      setError(err.message || 'Failed to refresh workflow runs');
    } finally {
      setLoading(false);
    }
  };

  // Set up automatic refresh from MongoDB on interval
  useEffect(() => {
    const pollMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 30000;
    // Initial fetch
    fetchFromMongoDB();
    
    // Set up interval for regular updates
    const interval = setInterval(fetchFromMongoDB, pollMs);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  // Subscribe to Server-Sent Events for real-time updates
  useEffect(() => {
    try {
      const es = new EventSource('/api/events');

      es.onmessage = (event) => {
        if (!event?.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'repo-update' && payload.repo) {
            setWorkflowRuns((prev) => {
              const existing = Array.isArray(prev) ? prev : [];
              let found = false;
              const updated = existing.map(item => {
                if (item.repo === payload.repo) {
                  found = true;
                  return {
                    repo: payload.repo,
                    runs: Array.isArray(payload.runs) ? payload.runs : [],
                    lastUpdated: payload.lastUpdated || new Date().toISOString(),
                  };
                }
                return item;
              });
              if (!found) {
                updated.push({
                  repo: payload.repo,
                  runs: Array.isArray(payload.runs) ? payload.runs : [],
                  lastUpdated: payload.lastUpdated || new Date().toISOString(),
                });
              }
              return updated;
            });
            setLastUpdateDisplay(formatNowTime());
          }
        } catch {}
      };

      es.onerror = () => {
        // Let polling continue as fallback
      };

      return () => {
        try { es.close(); } catch (_) {}
      };
    } catch (_) {
      // ignore
    }
  }, []);

  if (loading && !workflowRuns.length) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchWorkflowRuns} />;
  }

  if (!workflowRuns.length) {
    return (
      <>
        <Head>
          <title>GitHub Actions Dashboard</title>
          <link rel="icon" href="/git.svg" type="image/svg+xml" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center p-8 glass rounded-2xl max-w-md mx-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">No Workflow Runs Found</h2>
            <p className="text-gray-400 mb-6">Make sure you have configured your GitHub repositories in the environment variables.</p>
            <button
              onClick={fetchWorkflowRuns}
              className="btn-primary"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>GitHub Actions Dashboard</title>
        <link rel="icon" href="/git.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-black to-zinc-900">
        <div className="container mx-auto px-4 py-8">
          <Toolbar
            left={
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold text-gray-100 mb-2">GitHub Actions Dashboard</h1>
                <p className="text-gray-400">Monitor your workflow runs in real-time</p>
              </div>
            }
            right={
              <>
                {loading && (
                  <div className="flex items-center text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </div>
                )}
                <a href="/ongoing" className="btn-secondary hidden sm:flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Ongoing
                </a>
                <button onClick={fetchWorkflowRuns} className="btn-secondary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </>
            }
          />

          {/* moved summary stats into left column above ongoing builds */}

          {/* Main content split: left (insights) 2/3, right (repos) 1/3 on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 xl:col-span-9">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <SummaryStat
              label="Repositories"
              value={workflowRuns.length}
              color="blue"
              icon={(
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
            />
            <SummaryStat
              label="Running"
              value={workflowRuns.reduce((acc, r) => acc + (Array.isArray(r.runs) ? r.runs.filter(x => x.status === 'in_progress').length : 0), 0)}
              color="green"
              icon={(
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            />
            <SummaryStat
              label="Queued"
              value={workflowRuns.reduce((acc, r) => acc + (Array.isArray(r.runs) ? r.runs.filter(x => x.status === 'queued').length : 0), 0)}
              color="amber"
              icon={(
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            />
            <SummaryStat
              label="Last Update"
              value={lastUpdateDisplay}
              color="slate"
              icon={(
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 6a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              )}
            />
          </div>
          {/* Ongoing builds strip */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-200">Ongoing builds</h2>
              <a href="/ongoing" className="text-sm text-blue-400 hover:text-blue-300">View all</a>
            </div>
            {runningNow.length === 0 ? (
              <div className="text-sm text-gray-500 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"/></svg>
                No builds are running right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {runningNow.map((run) => (
                  <a key={`${run.repo}-${run.id}`} href={run.html_url} target="_blank" rel="noopener noreferrer"
                     className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200" style={{ borderLeftColor: '#1976D2', borderLeftWidth: '3px' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-gray-200 font-medium truncate">{run.name}</div>
                        <div className="text-sm text-gray-400 truncate">{run.repo}</div>
                      </div>
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Queued builds strip */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-200">Queued builds</h2>
            </div>
            {queuedNow.length === 0 ? (
              <div className="text-sm text-gray-500 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-4H3v4a2 2 0 002 2z"/></svg>
                No builds are queued right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {queuedNow.map((run) => (
                  <a key={`${run.repo}-${run.id}`} href={run.html_url} target="_blank" rel="noopener noreferrer"
                     className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200" style={{ borderLeftColor: '#ED6C02', borderLeftWidth: '3px' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-gray-200 font-medium truncate">{run.name}</div>
                        <div className="text-sm text-gray-400 truncate">{run.repo}</div>
                      </div>
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Recently completed (success) within 10 minutes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-200">Recently successful (last 10 min)</h2>
            </div>
            {recentSuccess.length === 0 ? (
              <div className="text-sm text-gray-500 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                No recent successful builds.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentSuccess.map((run) => (
                  <a key={`${run.repo}-${run.id}`} href={run.html_url} target="_blank" rel="noopener noreferrer"
                     className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200" style={{ borderLeftColor: '#2E7D32', borderLeftWidth: '3px' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-gray-200 font-medium truncate">{run.name}</div>
                        <div className="text-sm text-gray-400 truncate">{run.repo}</div>
                      </div>
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Recently completed (failed) within 10 minutes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-200">Recently failed (last 10 min)</h2>
            </div>
            {recentFailed.length === 0 ? (
              <div className="text-sm text-gray-500 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
                No recent failed builds.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentFailed.map((run) => (
                  <a key={`${run.repo}-${run.id}`} href={run.html_url} target="_blank" rel="noopener noreferrer"
                     className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200" style={{ borderLeftColor: '#D32F2F', borderLeftWidth: '3px' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-gray-200 font-medium truncate">{run.name}</div>
                        <div className="text-sm text-gray-400 truncate">{run.repo}</div>
                      </div>
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
            </div>

            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 self-start">
              {/* Right column search above repositories */}
              <div className="hidden md:block mb-3">
                <div className="relative">
                  <input
                    type="text"
                    value={rightSearch}
                    onChange={(e) => setRightSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="max-h-[calc(100vh-220px)] overflow-auto pr-1">
                <RepositoryList repositories={workflowRuns} externalQuery={rightSearch} />
              </div>
            </div>
          </div>
          {/* moved repository list into left column above */}
        </div>
      </div>
    </>
  );
} 
