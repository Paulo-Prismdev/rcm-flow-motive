import './App.css'
import { Toaster } from "@/components/ui/toaster"
import ConfirmHost from "@/components/shared/ConfirmHost"
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
import ErrorBoundary from '@/components/ErrorBoundary';
const PublicPartsRequest = lazy(() => import('@/pages/PublicPartsRequest'));
const BackorderForm = lazy(() => import('@/pages/BackorderForm'));
const ClientClaimForm = lazy(() => import('@/pages/ClientClaimForm'));
const TyreRequests = lazy(() => import('@/pages/TyreRequests'));
const CompanyManagement = lazy(() => import('@/pages/CompanyManagement'));
const ClientPortal = lazy(() => import('@/pages/ClientPortal'));
const RepairerDirectory = lazy(() => import('@/pages/RepairerDirectory'));
const InsurerDirectory = lazy(() => import('@/pages/InsurerDirectory'));
const CreditRepairDirectory = lazy(() => import('@/pages/CreditRepairDirectory'));
const ClientDirectory = lazy(() => import('@/pages/ClientDirectory'));
const IndemnityForm = lazy(() => import('@/pages/IndemnityForm'));
const RepairPreferenceForm = lazy(() => import('@/pages/RepairPreferenceForm'));
const WitnessStatementForm = lazy(() => import('@/pages/WitnessStatementForm'));
const DeclarationOfNeedForm = lazy(() => import('@/pages/DeclarationOfNeedForm'));
const BodyshopUpdateForm = lazy(() => import('@/pages/BodyshopUpdateForm'));
const StatusMigrationReview = lazy(() => import('@/pages/StatusMigrationReview'));
const Invoicing = lazy(() => import('@/pages/Invoicing'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const TwoFactorVerify = lazy(() => import('@/pages/TwoFactorVerify'));
import InactivityGuard from '@/components/auth/InactivityGuard';
import PasswordGate from '@/components/auth/PasswordGate';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PUBLIC_PATHS = ['/backorder-form', '/parts-request', '/client-claim-form', '/indemnity-form', '/repair-preference-form', '/witness-statement-form', '/declaration-of-need-form', '/bodyshop-update', '/login', '/forgot-password', '/reset-password'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, twofaStatus, user } = useAuth();

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
          <Route path="/witness-statement-form" element={<WitnessStatementForm />} />
          <Route path="/declaration-of-need-form" element={<DeclarationOfNeedForm />} />
          <Route path="/bodyshop-update" element={<BodyshopUpdateForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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

  // The second sign-in step: staff enter the code we email them before anything of
  // the app opens. (If the check itself can't run, staff still see the code screen;
  // portal users, who don't need a code, carry on.)
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }
  if (twofaStatus.loading) {
    return <LoadingScreen />;
  }
  const needsCode = twofaStatus.required && !twofaStatus.verified
    && !(twofaStatus.failed && user?.user_type !== 'internal');
  if (needsCode) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <InactivityGuard />
        <TwoFactorVerify />
      </Suspense>
    );
  }

  // Render the main app: signed out after 30 minutes idle, and held at "choose a new
  // password" once a password is over 90 days old.
  return (
    <Suspense fallback={<LoadingScreen />}>
    <InactivityGuard />
    <PasswordGate>
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
      <Route path="/invoicing" element={
        <LayoutWrapper currentPageName="Invoicing">
          <Invoicing />
        </LayoutWrapper>
      } />
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
      <Route path="/admin/status-migration" element={
        <LayoutWrapper currentPageName="StatusMigrationReview">
          <StatusMigrationReview />
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
      <Route path="/InsurerDirectory" element={
        <LayoutWrapper currentPageName="InsurerDirectory">
          <InsurerDirectory />
        </LayoutWrapper>
      } />
      <Route path="/CreditRepairDirectory" element={
        <LayoutWrapper currentPageName="CreditRepairDirectory">
          <CreditRepairDirectory />
        </LayoutWrapper>
      } />
      <Route path="/ClientDirectory" element={
        <LayoutWrapper currentPageName="ClientDirectory">
          <ClientDirectory />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </PasswordGate>
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
          <Route path="/witness-statement-form" element={<WitnessStatementForm />} />
        <Route path="/declaration-of-need-form" element={<DeclarationOfNeedForm />} />
        <Route path="/bodyshop-update" element={<BodyshopUpdateForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Suspense>
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
        <ErrorBoundary>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        </ErrorBoundary>
        <Toaster />
        <ConfirmHost />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App