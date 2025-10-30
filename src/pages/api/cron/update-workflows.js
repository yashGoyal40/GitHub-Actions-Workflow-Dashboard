import { fetchAndStoreWorkflowRuns } from '../../../services/github';
import { broadcast } from '../../../lib/events';

// This is a cron job that runs every minute
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify the request is from our cron service
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error(`[${new Date().toISOString()}] Unauthorized cron job attempt`);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const repositories = process.env.GITHUB_REPOSITORIES?.split(',') || [];
    
    if (repositories.length === 0) {
      console.error(`[${new Date().toISOString()}] No repositories configured in GITHUB_REPOSITORIES`);
      return res.status(400).json({ message: 'No repositories configured' });
    }

    if (process.env.DEBUG_LOGS === '1') {
      console.log(`[${new Date().toISOString()}] Starting GitHub data fetch for ${repositories.length} repositories`);
    }
    
    // Fetch and store workflow runs from GitHub
    const results = await fetchAndStoreWorkflowRuns(repositories);
    
    // Log the results
    if (process.env.DEBUG_LOGS === '1') {
      results.forEach(result => {
        if (result.runs.length > 0) {
          console.log(`[${new Date().toISOString()}] Successfully fetched ${result.runs.length} workflows from GitHub for ${result.repo}`);
        }
      });
    }

    // Broadcast updates
    if (Array.isArray(results)) {
      results.forEach(item => {
        if (!item || !item.repo) return;
        broadcast({ type: 'repo-update', repo: item.repo, runs: item.runs || [], lastUpdated: item.lastUpdated });
      });
    }
    
    res.status(200).json({ 
      message: 'GitHub data fetch completed', 
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] GitHub fetch error:`, error);
    res.status(500).json({ 
      message: 'Error fetching GitHub data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Start the cron job when the server starts
if (process.env.NODE_ENV !== 'development') {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not set in environment variables');
  } else {
    // Call the endpoint immediately
    fetch(`${baseUrl}/api/cron/update-workflows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      console.error('Failed to start cron job:', error);
    });

    // Set up the interval (configurable)
    const cronMs = Number(process.env.CRON_INTERVAL_MS) || 60000;
    setInterval(() => {
      fetch(`${baseUrl}/api/cron/update-workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
      }).catch(error => {
        console.error('Cron job failed:', error);
      });
    }, cronMs);
  }
} 
