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
import { lazy, Suspense } from 'react';
const PublicPartsRequest = lazy(() => import('@/pages/PublicPartsRequest'));
const BackorderForm = lazy(() => import('@/pages/BackorderForm'));
const ClientClaimForm = lazy(() => import('@/pages/ClientClaimForm'));
const TyreRequests = lazy(() => import('@/pages/TyreRequests'));
const CompanyManagement = lazy(() => import('@/pages/CompanyManagement'));
const MigrateUsers = lazy(() => import('@/pages/MigrateUsers'));
const ClientPortal = lazy(() => import('@/pages/ClientPortal'));
const RepairerDirectory = lazy(() => import('@/pages/RepairerDirectory'));
const IndemnityForm = lazy(() => import('@/pages/IndemnityForm'));
const RepairPreferenceForm = lazy(() => import('@/pages/RepairPreferenceForm'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PUBLIC_PATHS = ['/backorder-form', '/parts-request', '/client-claim-form', '/indemnity-form', '/repair-preference-form'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

  // For public pages, render IMMEDIATELY — no auth, no loading screen
  if (isPublicPath) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/parts-request" element={<PublicPartsRequest />} />
          <Route path="/backorder-form" element={<BackorderForm />} />
          <Route path="/client-claim-form" element={<ClientClaimForm />} />
          <Route path="/indemnity-form" element={<IndemnityForm />} />
          <Route path="/repair-preference-form" element={<RepairPreferenceForm />} />
        </Routes>
      </Suspense>
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
    <Suspense fallback={<LoadingScreen />}>
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
      <Route path="/admin/companies" element={
        <LayoutWrapper currentPageName="CompanyManagement">
          <CompanyManagement />
        </LayoutWrapper>
      } />
      <Route path="/admin/migrate-users" element={
        <LayoutWrapper currentPageName="MigrateUsers">
          <MigrateUsers />
        </LayoutWrapper>
      } />
      <Route path="/ClientPortal" element={
        <LayoutWrapper currentPageName="ClientPortal">
          <ClientPortal />
        </LayoutWrapper>
      } />
      <Route path="/RepairerDirectory" element={
        <LayoutWrapper currentPageName="RepairerDirectory">
          <RepairerDirectory />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function PublicApp() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/parts-request" element={<PublicPartsRequest />} />
        <Route path="/backorder-form" element={<BackorderForm />} />
        <Route path="/client-claim-form" element={<ClientClaimForm />} />
        <Route path="/indemnity-form" element={<IndemnityForm />} />
        <Route path="/repair-preference-form" element={<RepairPreferenceForm />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const isPublicPath = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));

  // Add beforeunload listener to track page reloads
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
      console.trace('PAGE UNLOAD TRIGGERED');
    });
  }

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