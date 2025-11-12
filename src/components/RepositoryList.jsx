import React, { useState, useMemo } from 'react';
import WorkflowCard from './WorkflowCard';
import { formatDate } from '../utils/dateUtils';

const RepositoryList = ({ repositories = [], externalQuery }) => {
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleRepo = (repo) => {
    setExpandedRepo(expandedRepo === repo ? null : repo);
  };

  // Filter repositories based on search query
  const filteredRepositories = useMemo(() => {
    const querySource = typeof externalQuery === 'string' ? externalQuery : searchQuery;
    if (!querySource?.trim()) return repositories;
    
    const query = querySource.toLowerCase().trim();
    return repositories.filter(repoData => {
      if (!repoData || !repoData.repo) return false;
      return repoData.repo.toLowerCase().includes(query);
    });
  }, [repositories, searchQuery, externalQuery]);

  if (!Array.isArray(repositories)) {
    console.error('Invalid repositories prop:', repositories);
    return (
      <div className="text-red-400 p-4 glass rounded-lg">
        Error: Invalid data format
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="text-gray-400 text-center p-4 glass rounded-lg">
        No repositories found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      {/* Local search input visible only on small screens; header controls on md+ */}
      <div className="relative md:hidden">
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-400">
        {filteredRepositories.length} repository{filteredRepositories.length !== 1 ? 'ies' : ''} found
      </div>

      {/* Repository List */}
      <div className="flex flex-col gap-3">
        {filteredRepositories.map((repoData, index) => {
          if (!repoData || typeof repoData !== 'object') {
            console.error('Invalid repository data:', repoData);
            return null;
          }

          const { repo, runs = [], lastUpdated } = repoData;

          if (!repo || !Array.isArray(runs)) {
            console.error('Missing required properties in repository data:', repoData);
            return null;
          }

          return (
            <div 
              key={repo} 
              className="card overflow-hidden animate-fade-in hover:shadow-lg/20 hover:ring-1 hover:ring-zinc-700 transition w-full"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => toggleRepo(repo)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <span className="text-gray-100 font-medium block break-words">{repo}</span>
                      <span className="text-sm text-gray-400 block mt-1">
                        Last updated: {formatDate(lastUpdated)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                        expandedRepo === repo ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                {expandedRepo === repo && (
                  <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
                    <div className="flex flex-col gap-3">
                      {runs.map((run) => {
                        if (!run || typeof run !== 'object' || !run.id) {
                          console.error('Invalid workflow run data:', run);
                          return null;
                        }
                        return <WorkflowCard key={run.id} run={run} showStatus={false} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results Message */}
      {filteredRepositories.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">No repositories found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default RepositoryList; 
