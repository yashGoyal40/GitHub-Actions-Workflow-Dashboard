import { getWorkflowRunsFromDB } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const workflowRuns = await getWorkflowRunsFromDB();
    console.log(`[${new Date().toISOString()}] API: Sending fresh data for ${workflowRuns.length} repositories`);
    res.status(200).json(workflowRuns);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API Error:`, error);
    res.status(500).json({ 
      message: 'Error fetching workflow runs',
      error: error.message 
    });
  }
} 