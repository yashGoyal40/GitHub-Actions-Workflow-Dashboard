import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: 'unknown',
      github: 'unknown'
    }
  };
  
  try {
    // Check MongoDB connection
    const client = await clientPromise;
    const db = client.db("github-actions-dashboard");
    await db.command({ ping: 1 });
    health.services.mongodb = 'ok';
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    health.services.mongodb = 'error';
    health.status = 'degraded';
  }
  
  // Check GitHub token
  if (process.env.GITHUB_TOKEN) {
    health.services.github = 'configured';
  } else {
    health.services.github = 'missing';
    health.status = 'degraded';
  }
  
  // Set appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 207 : 500;
  
  res.status(statusCode).json(health);
} 