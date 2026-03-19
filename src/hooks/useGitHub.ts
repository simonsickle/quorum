import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function useGitHub() {
  const {
    pullRequests,
    selectedPR,
    prLoading,
    prError,
    filterText,
    sortBy,
    fetchPullRequests,
    selectPR,
    setFilter,
    setSortBy,
  } = useStore();

  useEffect(() => {
    fetchPullRequests();
  }, []);

  const filteredPRs = pullRequests
    .filter((pr) => {
      if (!filterText) return true;
      const search = filterText.toLowerCase();
      return (
        pr.title.toLowerCase().includes(search) ||
        pr.repository.nameWithOwner.toLowerCase().includes(search) ||
        pr.author.login.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const refresh = useCallback(() => {
    fetchPullRequests();
  }, [fetchPullRequests]);

  return {
    pullRequests: filteredPRs,
    selectedPR,
    loading: prLoading,
    error: prError,
    filterText,
    sortBy,
    selectPR,
    setFilter,
    setSortBy,
    refresh,
  };
}
