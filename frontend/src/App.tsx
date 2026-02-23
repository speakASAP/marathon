import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Winners from './pages/Winners';
import WinnerDetail from './pages/WinnerDetail';
import Reviews from './pages/Reviews';
import About from './pages/About';
import Rules from './pages/Rules';
import Faq from './pages/Faq';
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import Step from './pages/Step';
import Support from './pages/Support';
import SupportStep from './pages/SupportStep';
import Register from './pages/Register';
import Awards from './pages/Awards';
import Gift from './pages/Gift';
import LeaveConfirm from './pages/LeaveConfirm';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/gift" element={<Gift />} />
        <Route path="/leave-confirm" element={<LeaveConfirm />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/winners/:winnerId" element={<WinnerDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/about" element={<About />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:marathonerId" element={<ProfileDetail />} />
        <Route path="/steps/:stepId" element={<Step />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/step/:stepId" element={<SupportStep />} />
        <Route path="/:langSlug/" element={<Landing />} />
      </Route>
    </Routes>
  );
}

export default App;
