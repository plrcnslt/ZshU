import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import MenuPage from "./pages/MenuPage";
import ProfilePage from "./pages/ProfilePage";
import StaffPortalPage from "./pages/StaffPortalPage";
import ManagementPage from "./pages/ManagementPage";
import TravelDeskPage from "./pages/TravelDeskPage";
import EventsPage from "./pages/EventsPage";
import BlogPage from "./pages/BlogPage";
import ShopPage from "./pages/ShopPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import TasksPage from "./pages/TasksPage";
import ReportsPage from "./pages/ReportsPage";
import AccountsPage from "./pages/AccountsPage";
import ReviewsPage from "./pages/ReviewsPage";
import ConciergePage from "./pages/ConciergePage";
import OffersPage from "./pages/OffersPage";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import { Toaster } from "./components/ui/sonner";
import "./global.css";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <BrowserRouter>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/staff" element={<StaffPortalPage />} />
              <Route path="/management" element={<ManagementPage />} />
              <Route path="/travel" element={<TravelDeskPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/tasks/*" element={<TasksPage />} />
              <Route path="/tasks/new" element={<TasksPage />} />
              <Route path="/tasks/list" element={<TasksPage />} />
              <Route path="/tasks/chat" element={<TasksPage />} />
              <Route path="/reports/*" element={<ReportsPage />} />
              <Route path="/reports/tasks" element={<ReportsPage />} />
              <Route path="/reports/performance" element={<ReportsPage />} />
              <Route path="/reports/vendors" element={<ReportsPage />} />
              <Route path="/accounts/*" element={<AccountsPage />} />
              <Route path="/accounts/vendors" element={<AccountsPage />} />
              <Route path="/accounts/quotes" element={<AccountsPage />} />
              <Route path="/accounts/billing" element={<AccountsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/concierge" element={<ConciergePage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route
                path="/spa"
                element={<PlaceholderPage section="Spa & Wellness" />}
              />
              <Route
                path="/fitness"
                element={<PlaceholderPage section="Fitness Center" />}
              />
              <Route path="/concierge" element={<ConciergePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
