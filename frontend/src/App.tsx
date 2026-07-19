import { useEffect } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ConsentBanner from './components/ConsentBanner';
import Landing from './pages/Landing';
import Winners from './pages/Winners';
import WinnerDetail from './pages/WinnerDetail';
import Reviews from './pages/Reviews';
import About from './pages/About';
import Rules from './pages/Rules';
import Faq from './pages/Faq';
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import ParticipantReports from './pages/ParticipantReports';
import Step from './pages/Step';
import SupportStep from './pages/SupportStep';
import Register from './pages/Register';
import Awards from './pages/Awards';
import LeaveConfirm from './pages/LeaveConfirm';
import AdminMarathonPrices from './pages/AdminMarathonPrices';

function ScrollToHash() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (!hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
      }

      const targetId = decodeURIComponent(hash.slice(1));
      if (!targetId || targetId === 'top') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
      }

      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });
  }, [pathname, search, hash]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/awards" element={<Awards />} />
          <Route path="/leave-confirm" element={<LeaveConfirm />} />
          <Route path="/winners" element={<Winners />} />
          <Route path="/winners/:winnerId" element={<WinnerDetail />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/about" element={<About />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:marathonerId/awards" element={<Navigate to=".." replace relative="path" />} />
          <Route path="/profile/:marathonerId" element={<ProfileDetail />} />
          <Route path="/participants/:participantId/reports" element={<ParticipantReports />} />
          <Route path="/steps/:stepId" element={<Step />} />
          <Route path="/support" element={<Navigate to="/faq" replace />} />
          <Route path="/support/step/:stepId" element={<SupportStep />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/marathon/:langSlug" element={<Landing />} />
          <Route path="/admin/marathons/prices" element={<AdminMarathonPrices />} />
          <Route path="/:langSlug" element={<Landing />} />
          <Route path="/:langSlug/" element={<Landing />} />
        </Route>
      </Routes>
      <ConsentBanner />
    </>
  );
}

export default App;
