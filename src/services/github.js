import { Octokit } from '@octokit/rest';
import clientPromise from '../lib/mongodb';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const fetchAndStoreWorkflowRuns = async (repositories, buildLimit = 5) => {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GitHub token not found in environment variables');
  }

  if (!Array.isArray(repositories) || repositories.length === 0) {
    throw new Error('No repositories provided');
  }

  try {
    const client = await clientPromise;
    const db = client.db("github-actions-dashboard");
    const collection = db.collection("workflow-runs");

    const results = await Promise.all(repositories.map(async (repo) => {
      try {
        // Clean up the repository name
        const cleanRepo = repo.trim();
        if (!cleanRepo) return null;

        const response = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/runs?per_page=${buildLimit}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.workflow_runs) {
          throw new Error('Invalid response from GitHub API');
        }

        const workflowData = {
          repo: cleanRepo,
          runs: data.workflow_runs.map(run => ({
            id: run.id,
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            html_url: run.html_url,
            created_at: run.created_at,
            updated_at: run.updated_at,
          })),
          lastUpdated: new Date().toISOString(),
        };

        // Update or insert the data in MongoDB
        await collection.updateOne(
          { repo: cleanRepo },
          { $set: workflowData },
          { upsert: true }
        );

        return workflowData;
      } catch (error) {
        console.error(`Error fetching data for ${repo}:`, error);
        // Return a valid object even if the fetch fails
        return {
          repo: repo.trim(),
          runs: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    }));

    // Filter out any null results and return
    return results.filter(Boolean);
  } catch (error) {
    console.error('Error fetching and storing workflow runs:', error);
    throw error;
  }
};

export const getWorkflowRunsFromDB = async () => {
  try {
    const client = await clientPromise;
    const db = client.db("github-actions-dashboard");
    const collection = db.collection("workflow-runs");
    
    const results = await collection.find({}).toArray();
    
    // Log the last update time for each repository
    results.forEach(item => {
      console.log(`[${new Date().toISOString()}] Repository ${item.repo} last updated: ${item.lastUpdated}`);
    });
    
    // Ensure all required fields are present
    return results.map(item => ({
      repo: item.repo || '',
      runs: Array.isArray(item.runs) ? item.runs : [],
      lastUpdated: item.lastUpdated || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching workflow runs from DB:', error);
    throw error;
  }
};

// These utility functions can be used on both client and server
export const getWorkflowRunColor = (status, conclusion) => {
  if (status === 'completed') {
    return conclusion === 'success' ? '#2E7D32' : 
           conclusion === 'failure' ? '#D32F2F' : 
           '#757575';
  }
  const colors = {
    in_progress: '#1976D2',
    queued: '#ED6C02',
  };
  return colors[status] || '#757575';
};

export const getDisplayStatus = (status, conclusion) => {
  if (status === 'completed') {
    return conclusion === 'success' ? 'Success' :
           conclusion === 'failure' ? 'Failed' :
           'Completed';
  }
  return status === 'in_progress' ? 'In Progress' :
         status === 'queued' ? 'Queued' : 
         status;
};
