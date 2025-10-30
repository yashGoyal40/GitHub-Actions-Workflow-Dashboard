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
    const meta = db.collection("workflow-metadata");

    const effectiveLimit = Number(process.env.BUILD_LIMIT) || buildLimit;
    const results = await Promise.all(repositories.map(async (repo) => {
      try {
        // Clean up the repository name
        const cleanRepo = repo.trim();
        if (!cleanRepo) return null;

        if (process.env.DEBUG_LOGS === '1') {
          console.log(`[${new Date().toISOString()}] Fetching latest ${effectiveLimit} workflows from GitHub for ${cleanRepo}`);
        }
        
        // Conditional request using stored ETag when available
        const metaDoc = await meta.findOne({ repo: cleanRepo });
        const headers = {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        };
        if (metaDoc?.etag) headers['If-None-Match'] = metaDoc.etag;

        const response = await fetch(
          `https://api.github.com/repos/${cleanRepo}/actions/runs?per_page=${effectiveLimit}`,
          { headers }
        );

        if (response.status === 304) {
          // Not modified: return existing DB data to avoid write
          const existing = await collection.findOne({ repo: cleanRepo });
          return existing ? {
            repo: existing.repo,
            runs: Array.isArray(existing.runs) ? existing.runs.slice(0, effectiveLimit) : [],
            lastUpdated: existing.lastUpdated || new Date().toISOString(),
          } : {
            repo: cleanRepo,
            runs: [],
            lastUpdated: new Date().toISOString(),
          };
        }

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.workflow_runs) {
          throw new Error('Invalid response from GitHub API');
        }

        // Process only the latest 5 runs
        const latestRuns = data.workflow_runs.slice(0, effectiveLimit).map(run => ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          html_url: run.html_url,
          created_at: run.created_at,
          updated_at: run.updated_at,
        }));

        const workflowData = {
          repo: cleanRepo,
          runs: latestRuns,
          lastUpdated: new Date().toISOString(),
        };

        // Update metadata ETag if present
        const etag = response.headers.get('etag');
        if (etag) {
          await meta.updateOne(
            { repo: cleanRepo },
            { $set: { repo: cleanRepo, etag, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );
        }

        // Update or insert the data in MongoDB (only if changed)
        const prev = await collection.findOne({ repo: cleanRepo });
        const prevSignature = JSON.stringify(prev?.runs || []);
        const nextSignature = JSON.stringify(workflowData.runs || []);
        if (prevSignature === nextSignature) {
          return {
            repo: cleanRepo,
            runs: prev?.runs || [],
            lastUpdated: prev?.lastUpdated || new Date().toISOString(),
          };
        }

        const updateResult = await collection.updateOne(
          { repo: cleanRepo },
          { $set: workflowData },
          { upsert: true }
        );

        if (process.env.DEBUG_LOGS === '1') {
          if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
            console.log(`[${new Date().toISOString()}] Successfully updated MongoDB for ${cleanRepo}`);
          }
        }
        
        return workflowData;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching from GitHub for ${repo}: ${error.message}`);
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
    console.error(`[${new Date().toISOString()}] Error in GitHub fetch process: ${error.message}`);
    throw error;
  }
};

export const getWorkflowRunsFromDB = async () => {
  try {
    const client = await clientPromise;
    const db = client.db("github-actions-dashboard");
    const collection = db.collection("workflow-runs");
    
    const results = await collection.find({}).toArray();
    
    // Optional verbose logging
    if (process.env.DEBUG_LOGS === '1') {
      results.forEach(item => {
        console.log(`[${new Date().toISOString()}] Repository ${item.repo} last updated: ${item.lastUpdated}`);
      });
    }
    
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
