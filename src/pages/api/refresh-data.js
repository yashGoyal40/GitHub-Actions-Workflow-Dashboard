import { fetchAndStoreWorkflowRuns } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const repositories = process.env.GITHUB_REPOSITORIES?.split(',') || [];
    
    if (repositories.length === 0) {
      console.error('No repositories configured in GITHUB_REPOSITORIES');
      return res.status(400).json({ 
        message: 'No repositories configured',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch fresh data from GitHub and store in DB
    const updatedData = await fetchAndStoreWorkflowRuns(repositories);
        
    res.status(200).json({
      message: 'Data refreshed successfully',
      data: updatedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Refresh API Error:`, error);
    res.status(500).json({ 
      message: 'Error refreshing workflow runs',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 