import { useState, useEffect } from 'react';
import Head from 'next/head';
import RepositoryList from '../components/RepositoryList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

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

  // Set up automatic refresh from MongoDB every 30 seconds
  useEffect(() => {
    // Initial fetch
    fetchFromMongoDB();
    
    // Set up interval for regular updates
    const interval = setInterval(fetchFromMongoDB, 30000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
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
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold text-gray-100 mb-2">GitHub Actions Dashboard</h1>
              <p className="text-gray-400">Monitor your workflow runs in real-time</p>
            </div>
            <div className="flex items-center gap-4">
              {loading && (
                <div className="flex items-center text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              )}
              <button
                onClick={fetchWorkflowRuns}
                className="btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <div className="w-full">
            <RepositoryList repositories={workflowRuns} />
          </div>
        </div>
      </div>
    </>
  );
} 