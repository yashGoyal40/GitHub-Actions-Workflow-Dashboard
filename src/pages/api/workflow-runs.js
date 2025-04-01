import { getWorkflowRunsFromDB } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const workflowRuns = await getWorkflowRunsFromDB();
    res.status(200).json(workflowRuns);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Error fetching workflow runs',
      error: error.message,
      stack: error.stack
    });
  }
} 