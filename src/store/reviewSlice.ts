import { StateCreator } from 'zustand';
import { ReviewResult, ReviewProgress, ConsensusFinding } from '../types/review';

export interface ReviewSlice {
  currentReview: ReviewResult | null;
  reviewProgress: ReviewProgress | null;
  reviewRunning: boolean;
  reviewError: string | null;
  runReview: (prId: string) => Promise<void>;
  loadReview: (prId: string) => Promise<void>;
  loadSpecificReview: (reviewId: string) => Promise<void>;
  cancelReview: () => void;
  updateFindingAction: (findingId: string, action: 'agree' | 'disagree') => void;
  setProgress: (progress: ReviewProgress) => void;
}

export const createReviewSlice: StateCreator<ReviewSlice> = (set, get) => ({
  currentReview: null,
  reviewProgress: null,
  reviewRunning: false,
  reviewError: null,

  runReview: async (prId) => {
    set({ reviewRunning: true, reviewError: null, reviewProgress: null });
    try {
      const result = await window.electronAPI.reviews.runReview(prId);
      set({ currentReview: result, reviewRunning: false });
    } catch (error: any) {
      set({
        reviewError: error.message || 'Review failed',
        reviewRunning: false,
      });
    }
  },

  loadReview: async (prId) => {
    try {
      const result = await window.electronAPI.reviews.getReviewResults(prId);
      if (result) {
        set({ currentReview: result });
      }
    } catch (error: any) {
      console.error('Failed to load review:', error);
    }
  },

  loadSpecificReview: async (reviewId) => {
    try {
      const result = await window.electronAPI.reviews.loadSpecificReview(reviewId);
      if (result) {
        set({ currentReview: result });
      }
    } catch (error: any) {
      console.error('Failed to load specific review:', error);
    }
  },

  cancelReview: () => {
    window.electronAPI.reviews.cancelReview();
    set({ reviewRunning: false, reviewProgress: null });
  },

  updateFindingAction: (findingId, action) => {
    const review = get().currentReview;
    if (!review) return;

    const updatedFindings = review.findings.map((f) =>
      f.id === findingId ? { ...f, userAction: action } : f
    );

    set({
      currentReview: { ...review, findings: updatedFindings },
    });
  },

  setProgress: (progress) => set({ reviewProgress: progress }),
});
