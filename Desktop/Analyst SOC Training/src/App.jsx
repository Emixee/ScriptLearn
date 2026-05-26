import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import useAppStore from './store/useAppStore';
import Layout from './components/Layout/Layout';
import ProfileSelect from './pages/ProfileSelect';
import Dashboard from './pages/Dashboard';
import Curriculum from './pages/Curriculum';
import Lesson from './pages/Lesson';
import CTF from './pages/CTF';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const currentProfile = useAppStore(s => s.currentProfile);
  if (!currentProfile) return <Navigate to="/" replace />;
  return children;
}

function LessonWrapper() {
  const { id } = useParams();
  return <Layout><Lesson key={id} /></Layout>;
}

export default function App() {
  const { loadProfiles, loadSettings, currentProfile } = useAppStore();

  useEffect(() => {
    loadProfiles();
    loadSettings();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          currentProfile
            ? <Navigate to="/dashboard" replace />
            : <ProfileSelect />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/curriculum" element={
          <ProtectedRoute>
            <Layout><Curriculum /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/lesson/:id" element={
          <ProtectedRoute>
            <LessonWrapper />
          </ProtectedRoute>
        } />
        <Route path="/ctf" element={
          <ProtectedRoute>
            <Layout><CTF /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><Settings /></Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
