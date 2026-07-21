import { lazy } from 'react';

// Code-split every page into its own chunk. This keeps the main bundle small,
// so public routes (e.g. /indemnity-form) only download the form — not the entire
// internal app. Internal pages load on demand when a signed-in user navigates.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Claims = lazy(() => import('./pages/Claims'));
const Estimating = lazy(() => import('./pages/Estimating'));
const Engineering = lazy(() => import('./pages/Engineering'));
const Parts = lazy(() => import('./pages/Parts'));
const BodyshopMap = lazy(() => import('./pages/BodyshopMap'));
const Archive = lazy(() => import('./pages/Archive'));
const EmailTemplates = lazy(() => import('./pages/EmailTemplates'));
const Settings = lazy(() => import('./pages/Settings'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'));
const Messages = lazy(() => import('./pages/Messages'));
const PdfTemplateManager = lazy(() => import('./pages/PdfTemplateManager'));
const ChaserEmailSettings = lazy(() => import('./pages/ChaserEmailSettings'));
const Reports = lazy(() => import('./pages/Reports'));
const Tasks = lazy(() => import('./pages/Tasks'));
const RepairerPortal = lazy(() => import('./pages/RepairerPortal'));
const ReferrerPortal = lazy(() => import('./pages/ReferrerPortal'));
const SupplierManagement = lazy(() => import('./pages/SupplierManagement'));
const FeedbackHub = lazy(() => import('./pages/FeedbackHub'));
const CompanyIdLookup = lazy(() => import('./pages/CompanyIdLookup'));
const __Layout = lazy(() => import('./Layout.jsx'));


export const PAGES = {
    "Dashboard": Dashboard,
    "Claims": Claims,
    "Estimating": Estimating,
    "Engineering": Engineering,
    "Parts": Parts,
    "BodyshopMap": BodyshopMap,
    "Archive": Archive,
    "EmailTemplates": EmailTemplates,
    "Settings": Settings,
    "UserProfile": UserProfile,
    "EmployeeManagement": EmployeeManagement,
    "Messages": Messages,
    "PdfTemplateManager": PdfTemplateManager,
    "ChaserEmailSettings": ChaserEmailSettings,
    "Reports": Reports,
    "Tasks": Tasks,
    "RepairerPortal": RepairerPortal,
    "ReferrerPortal": ReferrerPortal,
    "SupplierManagement": SupplierManagement,
    "FeedbackHub": FeedbackHub,
    "CompanyIdLookup": CompanyIdLookup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};