import { create } from 'zustand';
import { PRSlice, createPRSlice } from './prSlice';
import { ReviewSlice, createReviewSlice } from './reviewSlice';
import { SettingsSlice, createSettingsSlice } from './settingsSlice';

type AppStore = PRSlice & ReviewSlice & SettingsSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createPRSlice(...a),
  ...createReviewSlice(...a),
  ...createSettingsSlice(...a),
}));
