import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { PRList } from './components/PRList/PRList';
import { DiffView } from './components/DiffView/DiffView';
import { Settings } from './components/Settings/Settings';
import { Dashboard } from './components/FeedbackDashboard/Dashboard';
import { useStore } from './store';

export default function App() {
  const { loadSettings, settingsLoaded } = useStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PRList />} />
        <Route path="/review/:prId" element={<DiffView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}
