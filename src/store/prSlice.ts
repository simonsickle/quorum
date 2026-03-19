import { StateCreator } from 'zustand';
import { PullRequest } from '../types/github';

export interface PRSlice {
  pullRequests: PullRequest[];
  selectedPR: PullRequest | null;
  prLoading: boolean;
  prError: string | null;
  filterText: string;
  sortBy: 'updated' | 'created' | 'title';
  fetchPullRequests: () => Promise<void>;
  selectPR: (pr: PullRequest | null) => void;
  setFilter: (text: string) => void;
  setSortBy: (sort: 'updated' | 'created' | 'title') => void;
}

export const createPRSlice: StateCreator<PRSlice> = (set) => ({
  pullRequests: [],
  selectedPR: null,
  prLoading: false,
  prError: null,
  filterText: '',
  sortBy: 'updated',

  fetchPullRequests: async () => {
    set({ prLoading: true, prError: null });
    try {
      const prs = await window.electronAPI.github.fetchPendingReviews();
      set({ pullRequests: prs, prLoading: false });
    } catch (error: any) {
      set({ prError: error.message || 'Failed to fetch PRs', prLoading: false });
    }
  },

  selectPR: (pr) => set({ selectedPR: pr }),
  setFilter: (text) => set({ filterText: text }),
  setSortBy: (sort) => set({ sortBy: sort }),
});
