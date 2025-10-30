import { getWorkflowRunsFromDB } from '../../services/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data = await getWorkflowRunsFromDB();
    const active = [];
    for (const item of data) {
      const repo = item?.repo;
      const runs = Array.isArray(item?.runs) ? item.runs : [];
      for (const run of runs) {
        if (run?.status === 'in_progress' || run?.status === 'queued') {
          active.push({ repo, ...run });
        }
      }
    }
    res.status(200).json(active);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ongoing runs', error: error.message });
  }
}
