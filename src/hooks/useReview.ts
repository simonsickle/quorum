import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function useReview(prId?: string) {
  const {
    currentReview,
    reviewProgress,
    reviewRunning,
    reviewError,
    runReview,
    loadReview,
    cancelReview,
    updateFindingAction,
    setProgress,
  } = useStore();

  // Subscribe to progress events from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.reviews.onProgress((progress) => {
      setProgress(progress);
    });
    return unsubscribe;
  }, [setProgress]);

  // Load existing review when PR changes
  useEffect(() => {
    if (prId) {
      loadReview(prId);
    }
  }, [prId, loadReview]);

  const startReview = useCallback(async () => {
    if (!prId) return;
    await runReview(prId);
  }, [prId, runReview]);

  const handleAgree = useCallback(
    async (findingId: string) => {
      updateFindingAction(findingId, 'agree');

      const finding = currentReview?.findings.find((f) => f.id === findingId);
      if (finding) {
        await window.electronAPI.feedback.recordAction(findingId, 'agree', {
          prId,
          repoName: '', // will be filled from PR context
          filePath: finding.filePath,
          category: finding.category,
          severity: finding.severity,
          confidence: finding.confidence,
          sourceModels: finding.sourceModels,
          sourceAgents: finding.sourceAgents,
          description: finding.description,
        });
      }
    },
    [currentReview, prId, updateFindingAction]
  );

  const handleDisagree = useCallback(
    async (findingId: string) => {
      updateFindingAction(findingId, 'disagree');

      const finding = currentReview?.findings.find((f) => f.id === findingId);
      if (finding) {
        await window.electronAPI.feedback.recordAction(findingId, 'disagree', {
          prId,
          repoName: '',
          filePath: finding.filePath,
          category: finding.category,
          severity: finding.severity,
          confidence: finding.confidence,
          sourceModels: finding.sourceModels,
          sourceAgents: finding.sourceAgents,
          description: finding.description,
        });
      }
    },
    [currentReview, prId, updateFindingAction]
  );

  return {
    review: currentReview,
    progress: reviewProgress,
    running: reviewRunning,
    error: reviewError,
    startReview,
    cancelReview,
    handleAgree,
    handleDisagree,
  };
}
