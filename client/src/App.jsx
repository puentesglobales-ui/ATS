import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import api from './services/api';
import Login from './components/Login';

import LandingPage from './components/LandingPage';

import LanguageSelector from './components/LanguageSelector';
import StudyPlan from './components/StudyPlan';
import AdminDashboard from './components/AdminDashboard';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import PaymentSetup from './components/PaymentSetup';
import ATSScanner from './components/ATSScanner';
import CVEditor from './components/CVEditor';
import InterviewSimulator from './components/InterviewSimulator';


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  useEffect(() => {
    // Safety check: specific handling if supabase client is null (config error)
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      // CHECK DEMO MODE (Bypass)
      const demoMode = localStorage.getItem('demo_mode') === 'true';
      if (demoMode) {
        console.warn("DEMO MODE ACTIVE: Using Mock Session");
        const mockSession = {
          user: {
            id: 'demo-admin-id',
            email: 'admin@demo.com',
            user_metadata: { is_student: false, payment_completed: true, role: 'admin' }
          }
        };
        setSession(mockSession);
        setLoading(false);
        return;
      }

      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // If demo mode active, ignore supabase updates (unless it's a real login attempt overwriting it)
      const demoMode = localStorage.getItem('demo_mode') === 'true';
      if (demoMode && !newSession) return; // Keep demo session if supabase says null

      setSession(newSession);
      if (newSession) checkProfile(newSession.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error de Conexión</h2>
          <p className="text-slate-300 mb-4">
            No se ha podido conectar con el servidor (Supabase).
            Esto suele deberse a que faltan las variables de entorno en Vercel.
          </p>
          <p className="text-xs text-slate-500 font-mono bg-black/50 p-2 rounded">
            VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no detectadas.
          </p>
        </div>
      </div>
    );
  }

  const checkProfile = async (userId) => {
    try {
      // We use our new server endpoint to check connection
      // But for speed, we might want to check supabase directly if policy allows
      // or just use the local api service we built.
      // Let's use the API service.
      // Use the configured API client which handles the base URL correctly for Prod/Dev
      const response = await api.get(`/profile/${userId}`);
      if (response.data) {
        // Axios returns data in response.data
        const profile = response.data;
        setOnboardingComplete(!!profile.onboarding_completed);
      } else {
        setOnboardingComplete(false);
      }
    } catch (e) {
      console.error("Profile check failed", e);
      setOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
  }

  const getRedirectPath = () => {
    if (!session) return "/login";

    const { is_student, payment_completed } = session.user.user_metadata || {};
    // If Freemium (is_student === false) and NO payment, go to payment setup
    // Explicitly check false because undefined might be old users or admin
    if (is_student === false && !payment_completed) {
      return "/payment-setup";
    }

    return onboardingComplete ? "/ats-scanner" : "/onboarding";
  };

  // Helper for protected routes that should also respect payment gate
  const ProtectedRoute = ({ children }) => {
    if (!session) return <Navigate to="/login" />;

    const { is_student, payment_completed } = session.user.user_metadata || {};
    if (is_student === false && !payment_completed) {
      return <Navigate to="/payment-setup" />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to={getRedirectPath()} />} />

          <Route path="/languages" element={
            <ProtectedRoute>
              {onboardingComplete ? <LanguageSelector /> : <LanguageSelector />}
            </ProtectedRoute>
          } />

          <Route path="/onboarding" element={
            <ProtectedRoute>
              {onboardingComplete ? <Navigate to="/ats-scanner" /> : <OnboardingWizard session={session} onComplete={() => { setOnboardingComplete(true); }} />}
            </ProtectedRoute>
          } />

          <Route path="/study" element={
            <ProtectedRoute>
              {onboardingComplete ? <StudyPlan /> : <Navigate to="/languages" />}
            </ProtectedRoute>
          } />

          <Route path="/ats-scanner" element={
            <ProtectedRoute>
              {onboardingComplete ? <ATSScanner session={session} /> : <Navigate to="/onboarding" />}
            </ProtectedRoute>
          } />

          {/* Admin & Billing Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard session={session} /></ProtectedRoute>} />
          <Route path="/payment-setup" element={<ProtectedRoute><PaymentSetup /></ProtectedRoute>} />

          <Route path="/cv-editor" element={<ProtectedRoute><CVEditor /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewSimulator session={session} /></ProtectedRoute>} />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
