import { getWorkflowRunsFromDB, fetchAndStoreWorkflowRuns } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    // Get repositories from environment variable
    const repositories = process.env.GITHUB_REPOSITORIES?.split(',') || [];
    
    if (repositories.length === 0) {
      throw new Error('No repositories configured in GITHUB_REPOSITORIES');
    }

    // Fetch fresh data from GitHub
    console.log(`[${new Date().toISOString()}] Fetching fresh data from GitHub for ${repositories.length} repositories`);
    await fetchAndStoreWorkflowRuns(repositories);

    // Get the updated data from MongoDB
    const workflowRuns = await getWorkflowRunsFromDB();
    res.status(200).json(workflowRuns);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API Error:`, error);
    res.status(500).json({ 
      message: 'Error fetching workflow runs',
      error: error.message 
    });
  }
} 