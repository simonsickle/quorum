import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // GitHub
  github: {
    validateToken: (token: string) => Promise<{ login: string; valid: boolean }>;
    fetchPendingReviews: () => Promise<any[]>;
    fetchPRDiff: (owner: string, repo: string, prNumber: number) => Promise<any>;
    fetchFileContents: (owner: string, repo: string, path: string, ref: string) => Promise<string>;
    submitReview: (review: any) => Promise<void>;
  };
  // Reviews
  reviews: {
    runReview: (prId: string) => Promise<any>;
    getReviewResults: (prId: string) => Promise<any>;
    getReviewHistory: (prId: string) => Promise<any[]>;
    loadSpecificReview: (reviewId: string) => Promise<any>;
    cancelReview: () => void;
    onProgress: (callback: (progress: any) => void) => () => void;
  };
  // Settings
  settings: {
    get: () => Promise<any>;
    save: (settings: any) => Promise<void>;
    saveApiKey: (provider: string, key: string) => Promise<void>;
    getApiKey: (provider: string) => Promise<string>;
    deleteApiKey: (provider: string) => Promise<void>;
  };
  // Stack
  stack: {
    detectStack: (repoPath: string, branch: string) => Promise<any>;
    getStackContext: (repoPath: string, stackId: string) => Promise<any>;
  };
  // Feedback
  feedback: {
    recordAction: (findingId: string, action: 'agree' | 'disagree', context: any) => Promise<void>;
    getAnalytics: (repoName: string) => Promise<any>;
    getSuggestedRules: (repoName: string) => Promise<any[]>;
  };
  // Chat
  chat: {
    sendMessage: (findingId: string, message: string, model?: string) => Promise<string>;
    getHistory: (findingId: string) => Promise<any[]>;
  };
}

const api: ElectronAPI = {
  github: {
    validateToken: (token) => ipcRenderer.invoke('github:validate-token', token),
    fetchPendingReviews: () => ipcRenderer.invoke('github:fetch-pending-reviews'),
    fetchPRDiff: (owner, repo, prNumber) =>
      ipcRenderer.invoke('github:fetch-pr-diff', owner, repo, prNumber),
    fetchFileContents: (owner, repo, path, ref) =>
      ipcRenderer.invoke('github:fetch-file-contents', owner, repo, path, ref),
    submitReview: (review) => ipcRenderer.invoke('github:submit-review', review),
  },
  reviews: {
    runReview: (prId) => ipcRenderer.invoke('reviews:run', prId),
    getReviewResults: (prId) => ipcRenderer.invoke('reviews:get-results', prId),
    getReviewHistory: (prId) => ipcRenderer.invoke('reviews:get-history', prId),
    loadSpecificReview: (reviewId) => ipcRenderer.invoke('reviews:load-specific', reviewId),
    cancelReview: () => ipcRenderer.send('reviews:cancel'),
    onProgress: (callback) => {
      const handler = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('reviews:progress', handler);
      return () => ipcRenderer.removeListener('reviews:progress', handler);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
    saveApiKey: (provider, key) => ipcRenderer.invoke('settings:save-api-key', provider, key),
    getApiKey: (provider) => ipcRenderer.invoke('settings:get-api-key', provider),
    deleteApiKey: (provider) => ipcRenderer.invoke('settings:delete-api-key', provider),
  },
  stack: {
    detectStack: (repoPath, branch) =>
      ipcRenderer.invoke('stack:detect', repoPath, branch),
    getStackContext: (repoPath, stackId) =>
      ipcRenderer.invoke('stack:get-context', repoPath, stackId),
  },
  feedback: {
    recordAction: (findingId, action, context) =>
      ipcRenderer.invoke('feedback:record', findingId, action, context),
    getAnalytics: (repoName) => ipcRenderer.invoke('feedback:analytics', repoName),
    getSuggestedRules: (repoName) => ipcRenderer.invoke('feedback:suggested-rules', repoName),
  },
  chat: {
    sendMessage: (findingId, message, model) =>
      ipcRenderer.invoke('chat:send', findingId, message, model),
    getHistory: (findingId) => ipcRenderer.invoke('chat:history', findingId),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
