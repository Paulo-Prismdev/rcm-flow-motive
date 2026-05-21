import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoadingScreen from '@/components/LoadingScreen';
import PublicPartsRequest from '@/pages/PublicPartsRequest';
import BackorderForm from '@/pages/BackorderForm';
import ClientClaimForm from '@/pages/ClientClaimForm';
import TyreRequests from '@/pages/TyreRequests';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PUBLIC_PATHS = ['/backorder-form', '/parts-request', '/client-claim-form'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

  // For public pages, render IMMEDIATELY — no auth, no loading screen
  if (isPublicPath) {
    return (
      <Routes>
        <Route path="/parts-request" element={<PublicPartsRequest />} />
        <Route path="/backorder-form" element={<BackorderForm />} />
        <Route path="/client-claim-form" element={<ClientClaimForm />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/parts-request" element={<PublicPartsRequest />} />
      <Route path="/backorder-form" element={<BackorderForm />} />
      <Route path="/client-claim-form" element={<ClientClaimForm />} />
      <Route path="/TyreRequests" element={
        <LayoutWrapper currentPageName="TyreRequests">
          <TyreRequests />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function PublicApp() {
  return (
    <Routes>
      <Route path="/parts-request" element={<PublicPartsRequest />} />
      <Route path="/backorder-form" element={<BackorderForm />} />
      <Route path="/client-claim-form" element={<ClientClaimForm />} />
    </Routes>
  );
}

function App() {
  const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

  if (isPublicPath) {
    return (
      <Router>
        <PublicApp />
      </Router>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App