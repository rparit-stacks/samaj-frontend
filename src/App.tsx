import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminParentRoute } from "@/components/admin/AdminParentRoute";
import Index from "./pages/Index";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Directory from "./pages/Directory";
import DirectoryProfile from "./pages/DirectoryProfile";
import DirectorySettings from "./pages/DirectorySettings";
import MemberDetail from "./pages/MemberDetail";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import About from "./pages/About";
import More from "./pages/More";
import Profile from "./pages/Profile";
import ProfileRedirect from "./pages/ProfileRedirect";
import Settings from "./pages/Settings";
import Emergency from "./pages/Emergency";
import CreateEmergencyPage from "./pages/CreateEmergency";
import Feeds from "./pages/Feeds";
import Gallery from "./pages/Gallery";
import GalleryMy from "./pages/GalleryMy";
import Documents from "./pages/Documents";
import DocumentsMy from "./pages/DocumentsMy";
import Suggestions from "./pages/Suggestions";
import Matrimony from "./pages/Matrimony";
import MatrimonyProfile from "./pages/MatrimonyProfile";
import MatrimonyCreate from "./pages/MatrimonyCreate";
import MatrimonyEditProfile from "./pages/MatrimonyEditProfile";
import MatrimonyProfileWizard from "./pages/MatrimonyProfileWizard";
import MatrimonyMy from "./pages/MatrimonyMy";
import MatrimonySettings from "./pages/MatrimonySettings";
import MatrimonyDashboard from "./pages/MatrimonyDashboard";
import MatrimonyChats from "./pages/MatrimonyChats";
import MatrimonyChatThread from "./pages/MatrimonyChatThread";
import Exams from "./pages/Exams";
import AchievementsList from "./pages/AchievementsList";
import AchievementDetail from "./pages/AchievementDetail";
import AchievementForm from "./pages/AchievementForm";
import SamajHistory from "./pages/SamajHistory";
import SamajHistoryDetail from "./pages/SamajHistoryDetail";
import ChatList from "./pages/ChatList";
import ChatThread from "./pages/ChatThread";
import Services from "./pages/Services";
import FindMembers from "./pages/FindMembers";
import Notifications from "./pages/Notifications";
import ContactRequests from "./pages/ContactRequests";
import Search from "./pages/Search";
import Donate from "./pages/Donate";
import NotFound from "./pages/NotFound";
// Admin Pages
import AdminInstall from "./pages/admin/AdminInstall";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminKYC from "./pages/admin/AdminKYC";
import { isAdminKycEnabled } from "@/lib/featureFlags";
import AdminContent from "./pages/admin/AdminContent";
import AdminNewsCreate from "./pages/admin/AdminNewsCreate";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminExams from "./pages/admin/AdminExams";
import AdminExamPaperEditor from "./pages/admin/AdminExamPaperEditor";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminMatrimonyProfiles from "./pages/admin/AdminMatrimonyProfiles";
import AdminMatrimonySafety from "./pages/admin/AdminMatrimonySafety";
import AdminMatrimonyContent from "./pages/admin/AdminMatrimonyContent";
import AdminMatrimonyAnalytics from "./pages/admin/AdminMatrimonyAnalytics";
import AdminEmergency from "./pages/admin/AdminEmergency";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminAchievements from "./pages/admin/AdminAchievements";
import AdminHistory from "./pages/admin/AdminHistory";
import AdminCommunity from "./pages/admin/AdminCommunity";
import AdminDirectory from "./pages/admin/AdminDirectory";
import AdminDonations from "./pages/admin/AdminDonations";
import AdminBusiness from "./pages/admin/AdminBusiness";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminSubAdmins from "./pages/admin/AdminSubAdmins";
import AdminInviteAccept from "./pages/admin/AdminInviteAccept";
import Business from "./pages/Business";
import BusinessDetail from "./pages/BusinessDetail";
import BusinessForm from "./pages/BusinessForm";
import BusinessMy from "./pages/BusinessMy";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobSubmit from "./pages/JobSubmit";
import JobsMy from "./pages/JobsMy";
import JobsMyDetail from "./pages/JobsMyDetail";
import JobEdit from "./pages/JobEdit";
// Auth Pages
import UserLogin from "./pages/auth/UserLogin";
import UserSignup from "./pages/auth/UserSignup";
import Onboarding from "./pages/auth/Onboarding";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import GoogleCompleteProfile from "./pages/auth/GoogleCompleteProfile";
import Privacy from "./pages/auth/Privacy";
import Terms from "./pages/auth/Terms";
import Help from "./pages/auth/Help";
import DeleteAccount from "./pages/auth/DeleteAccount";
import MaintenanceMode from "./pages/MaintenanceMode";

const queryClient = new QueryClient();

function UserAuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

/** Scroll focused input above mobile keyboard (like native SDK) */
const useMobileKeyboardScroll = () => {
  useEffect(() => {
    const isMobile = () => window.innerWidth < 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const scrollFocusedIntoView = () => {
      const el = document.activeElement as HTMLElement;
      if (!el?.matches?.("input, textarea, select, [contenteditable='true']")) return;
      const vv = window.visualViewport;
      if (vv) {
        const rect = el.getBoundingClientRect();
        const vvBottom = vv.height;
        const padding = 8;
        if (rect.bottom > vvBottom - padding) {
          const scrollY = rect.bottom - vvBottom + padding;
          window.scrollBy({ top: scrollY, behavior: "smooth" });
          return;
        }
      }
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const onFocus = () => {
      if (!isMobile()) return;
      [50, 150, 350, 550, 900].forEach((ms) => setTimeout(scrollFocusedIntoView, ms));
    };
    const onViewportResize = () => {
      if (!isMobile()) return;
      scrollFocusedIntoView();
    };
    document.addEventListener("focusin", onFocus);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("scroll", onViewportResize);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("scroll", onViewportResize);
    };
  }, []);
};

const App = () => {
  useMobileKeyboardScroll();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <DeepLinkHandler />
          <Routes>
            {/* Admin Portal - separate auth (no user AuthProvider mounted) */}
            <Route path="/install" element={<AdminInstall />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            {/* Public invite-accept flow — no AdminProtectedRoute */}
            <Route path="/admin/invite/:token" element={<AdminInviteAccept />} />
            <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
            <Route
              path="/admin/kyc"
              element={
                <AdminProtectedRoute>
                  {isAdminKycEnabled() ? <AdminKYC /> : <Navigate to="/admin/dashboard" replace />}
                </AdminProtectedRoute>
              }
            />
            <Route path="/admin/content" element={<AdminProtectedRoute><AdminContent /></AdminProtectedRoute>} />
            <Route path="/admin/news/new" element={<AdminProtectedRoute><AdminNewsCreate /></AdminProtectedRoute>} />
            <Route path="/admin/events" element={<AdminProtectedRoute><AdminEvents /></AdminProtectedRoute>} />
            <Route path="/admin/exams" element={<AdminProtectedRoute><AdminExams /></AdminProtectedRoute>} />
            <Route path="/admin/exams/new" element={<AdminProtectedRoute><AdminExamPaperEditor /></AdminProtectedRoute>} />
            <Route path="/admin/exams/:examId/edit" element={<AdminProtectedRoute><AdminExamPaperEditor /></AdminProtectedRoute>} />
            <Route path="/admin/gallery" element={<AdminProtectedRoute><AdminGallery /></AdminProtectedRoute>} />
            <Route path="/admin/matrimony" element={<AdminProtectedRoute><AdminMatrimonyProfiles /></AdminProtectedRoute>} />
            <Route path="/admin/matrimony/safety" element={<AdminProtectedRoute><AdminMatrimonySafety /></AdminProtectedRoute>} />
            <Route path="/admin/matrimony/content" element={<AdminProtectedRoute><AdminMatrimonyContent /></AdminProtectedRoute>} />
            <Route path="/admin/matrimony/analytics" element={<AdminProtectedRoute><AdminMatrimonyAnalytics /></AdminProtectedRoute>} />
            <Route path="/admin/emergency" element={<AdminProtectedRoute><AdminEmergency /></AdminProtectedRoute>} />
            <Route path="/admin/documents" element={<AdminProtectedRoute><AdminDocuments /></AdminProtectedRoute>} />
            <Route path="/admin/community" element={<AdminProtectedRoute><AdminCommunity /></AdminProtectedRoute>} />
            <Route path="/admin/directory" element={<AdminProtectedRoute><AdminDirectory /></AdminProtectedRoute>} />
            <Route path="/admin/settings" element={<AdminParentRoute><AdminSettings /></AdminParentRoute>} />
            <Route path="/admin/audit-logs" element={<AdminProtectedRoute><AdminAuditLogs /></AdminProtectedRoute>} />
            <Route path="/admin/achievements" element={<AdminProtectedRoute><AdminAchievements /></AdminProtectedRoute>} />
            <Route path="/admin/history" element={<AdminProtectedRoute><AdminHistory /></AdminProtectedRoute>} />
            <Route path="/admin/donations" element={<AdminProtectedRoute><AdminDonations /></AdminProtectedRoute>} />
            <Route path="/admin/business" element={<AdminProtectedRoute><AdminBusiness /></AdminProtectedRoute>} />
            <Route path="/admin/jobs" element={<AdminProtectedRoute><AdminJobs /></AdminProtectedRoute>} />
            <Route path="/admin/sub-admins" element={<AdminProtectedRoute><AdminSubAdmins /></AdminProtectedRoute>} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Maintenance Mode - public, no auth required */}
            <Route path="/maintenance" element={<MaintenanceMode />} />

            {/* User App (wrapped in user AuthProvider) */}
            <Route element={<UserAuthLayout />}>
              {/* Public - Auth & onboarding */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/signup" element={<UserSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/google-complete" element={<GoogleCompleteProfile />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/help" element={<Help />} />
              <Route path="/delete-account" element={<DeleteAccount />} />

              {/* Protected - requires login */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
              <Route path="/find-members" element={<ProtectedRoute><FindMembers /></ProtectedRoute>} />
              <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
              <Route path="/news/:id" element={<ProtectedRoute><NewsDetail /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><SamajHistory /></ProtectedRoute>} />
              <Route path="/history/:id" element={<ProtectedRoute><SamajHistoryDetail /></ProtectedRoute>} />
              <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
              <Route path="/directory/settings" element={<ProtectedRoute><DirectorySettings /></ProtectedRoute>} />
              <Route path="/directory/:id" element={<ProtectedRoute><DirectoryProfile /></ProtectedRoute>} />
              <Route path="/user/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
              {/* /profile redirects to /profile/{profileKey} (Instagram-style canonical URL) */}
              <Route path="/profile" element={<ProtectedRoute><ProfileRedirect /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
              <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
              <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
              <Route path="/emergency/create" element={<ProtectedRoute><CreateEmergencyPage /></ProtectedRoute>} />
              <Route path="/feeds" element={<ProtectedRoute><Feeds /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
              <Route path="/gallery/me" element={<ProtectedRoute><GalleryMy /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/me" element={<ProtectedRoute><DocumentsMy /></ProtectedRoute>} />
              <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
              <Route path="/matrimony/create" element={<ProtectedRoute><MatrimonyCreate /></ProtectedRoute>} />
              <Route path="/matrimony/edit/:profileId" element={<ProtectedRoute><MatrimonyEditProfile /></ProtectedRoute>} />
              <Route path="/matrimony/profile/new" element={<ProtectedRoute><MatrimonyProfileWizard /></ProtectedRoute>} />
              <Route path="/matrimony/profile/:profileId/edit" element={<ProtectedRoute><MatrimonyProfileWizard /></ProtectedRoute>} />
              <Route path="/matrimony/my" element={<ProtectedRoute><MatrimonyMy /></ProtectedRoute>} />
              <Route path="/matrimony/profile/:profileId/settings" element={<ProtectedRoute><MatrimonySettings /></ProtectedRoute>} />
              <Route path="/matrimony/dashboard" element={<ProtectedRoute><MatrimonyDashboard /></ProtectedRoute>} />
              <Route path="/matrimony/chats" element={<ProtectedRoute><MatrimonyChats /></ProtectedRoute>} />
              <Route path="/matrimony/chats/:conversationId" element={<ProtectedRoute><MatrimonyChatThread /></ProtectedRoute>} />
              <Route path="/matrimony" element={<ProtectedRoute><Matrimony /></ProtectedRoute>} />
              <Route path="/matrimony/:id" element={<ProtectedRoute><MatrimonyProfile /></ProtectedRoute>} />
              <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><AchievementsList /></ProtectedRoute>} />
              <Route path="/achievements/new" element={<ProtectedRoute><AchievementForm /></ProtectedRoute>} />
              <Route path="/achievements/:id" element={<ProtectedRoute><AchievementDetail /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
              <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatThread /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/contact-requests" element={<ProtectedRoute><ContactRequests /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/donate" element={<ProtectedRoute><Donate /></ProtectedRoute>} />
              <Route path="/business" element={<ProtectedRoute><Business /></ProtectedRoute>} />
              <Route path="/business/create" element={<ProtectedRoute><BusinessForm /></ProtectedRoute>} />
              <Route path="/business/my" element={<ProtectedRoute><BusinessMy /></ProtectedRoute>} />
              <Route path="/business/:id/edit" element={<ProtectedRoute><BusinessForm /></ProtectedRoute>} />
              <Route path="/business/:id" element={<ProtectedRoute><BusinessDetail /></ProtectedRoute>} />
              <Route path="/jobs/submit" element={<ProtectedRoute><JobSubmit /></ProtectedRoute>} />
              <Route path="/jobs/my/:id/edit" element={<ProtectedRoute><JobEdit /></ProtectedRoute>} />
              <Route path="/jobs/my/:id" element={<ProtectedRoute><JobsMyDetail /></ProtectedRoute>} />
              <Route path="/jobs/my" element={<ProtectedRoute><JobsMy /></ProtectedRoute>} />
              <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
