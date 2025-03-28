import { fetchAndStoreWorkflowRuns } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const repositories = process.env.GITHUB_REPOSITORIES?.split(',') || [];
    
    console.log('Configured repositories:', repositories);
    
    if (repositories.length === 0) {
      return res.status(400).json({ 
        message: 'No repositories configured',
        env: process.env.GITHUB_REPOSITORIES 
      });
    }

    // Clean up repository names (remove any whitespace)
    const cleanRepositories = repositories.map(repo => repo.trim());

    const results = await fetchAndStoreWorkflowRuns(cleanRepositories);
    res.status(200).json(results);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Error updating workflow runs',
      error: error.message 
    });
  }
} 