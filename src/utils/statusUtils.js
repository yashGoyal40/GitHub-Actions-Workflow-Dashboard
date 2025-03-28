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