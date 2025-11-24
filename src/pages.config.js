import Dashboard from './pages/Dashboard';
import Claims from './pages/Claims';
import Estimating from './pages/Estimating';
import Engineering from './pages/Engineering';
import Parts from './pages/Parts';
import BodyshopMap from './pages/BodyshopMap';
import Archive from './pages/Archive';
import EmailTemplates from './pages/EmailTemplates';
import Invoicing from './pages/Invoicing';
import UserManagement from './pages/UserManagement';
import PartManufacturerConfigManagement from './pages/PartManufacturerConfigManagement';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import EmployeeManagement from './pages/EmployeeManagement';
import Messages from './pages/Messages';
import PdfTemplateManager from './pages/PdfTemplateManager';
import ChaserEmailSettings from './pages/ChaserEmailSettings';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';
import RepairerPortal from './pages/RepairerPortal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Claims": Claims,
    "Estimating": Estimating,
    "Engineering": Engineering,
    "Parts": Parts,
    "BodyshopMap": BodyshopMap,
    "Archive": Archive,
    "EmailTemplates": EmailTemplates,
    "Invoicing": Invoicing,
    "UserManagement": UserManagement,
    "PartManufacturerConfigManagement": PartManufacturerConfigManagement,
    "Settings": Settings,
    "UserProfile": UserProfile,
    "EmployeeManagement": EmployeeManagement,
    "Messages": Messages,
    "PdfTemplateManager": PdfTemplateManager,
    "ChaserEmailSettings": ChaserEmailSettings,
    "Reports": Reports,
    "Tasks": Tasks,
    "RepairerPortal": RepairerPortal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};