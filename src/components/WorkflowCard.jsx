import React from 'react';
import { getWorkflowRunColor, getDisplayStatus } from '../utils/statusUtils';
import { formatDate } from '../utils/dateUtils';

const WorkflowCard = ({ run }) => {
  if (!run || typeof run !== 'object') {
    console.error('Invalid run prop:', run);
    return null;
  }

  const { html_url, name, status, conclusion, created_at } = run;

  if (!html_url || !name || !status) {
    console.error('Missing required properties in run data:', run);
    return null;
  }

  const statusColor = getWorkflowRunColor(status, conclusion);
  const displayStatus = getDisplayStatus(status, conclusion);
  
  return (
    <a
      href={html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass rounded-lg p-4 hover:bg-zinc-800/50 transition-all duration-200 group"
      style={{
        borderLeftColor: statusColor,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-100 group-hover:text-zinc-300 transition-colors truncate block">
                {name}
              </span>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatDate(created_at)}
              </p>
            </div>
            <svg 
              className="w-4 h-4 text-gray-400 group-hover:text-zinc-300 transition-colors flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
              />
            </svg>
          </div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium ml-4 flex-shrink-0 shadow-sm"
          style={{
            backgroundColor: statusColor,
            color: 'white',
          }}
        >
          {displayStatus}
        </span>
      </div>
    </a>
  );
};

export default WorkflowCard; 