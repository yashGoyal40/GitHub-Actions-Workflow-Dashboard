import { fetchAndStoreWorkflowRuns } from '../../../services/github';

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

    console.log(`[${new Date().toISOString()}] Starting workflow update for ${repositories.length} repositories`);
    
    const results = await fetchAndStoreWorkflowRuns(repositories);
    
    // Log the update results
    results.forEach(result => {
      console.log(`[${new Date().toISOString()}] Updated repository ${result.repo} with ${result.runs.length} workflows`);
    });
    
    console.log(`[${new Date().toISOString()}] Successfully updated ${results.length} repositories`);
    
    res.status(200).json({ 
      message: 'Workflow runs updated successfully', 
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron Job Error:`, error);
    res.status(500).json({ 
      message: 'Error updating workflow runs',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 