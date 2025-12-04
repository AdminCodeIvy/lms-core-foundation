import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import UserForm from "./pages/admin/UserForm";
import LookupManagement from "./pages/admin/LookupManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import CustomerList from "./pages/customers/CustomerList";
import CustomerDetail from "./pages/customers/CustomerDetail";
import CustomerNew from "./pages/customers/CustomerNew";
import CustomerEdit from "./pages/customers/CustomerEdit";
import PropertyList from "./pages/properties/PropertyList";
import PropertyDetail from "./pages/properties/PropertyDetail";
import PropertyNew from "./pages/properties/PropertyNew";
import PropertyEdit from "./pages/properties/PropertyEdit";
import TaxList from "./pages/tax/TaxList";
import TaxDetail from "./pages/tax/TaxDetail";
import TaxNew from "./pages/tax/TaxNew";
import TaxPaymentNew from "./pages/tax/TaxPaymentNew";
import { ReviewQueue } from "./pages/workflow/ReviewQueue";
import { ReviewQueueDetail } from "./pages/workflow/ReviewQueueDetail";
import BulkUpload from "./pages/BulkUpload";
import MapView from "./pages/MapView";
import AgoSettings from "./pages/admin/AgoSettings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route 
                index 
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'ADMINISTRATOR']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Customer Routes */}
              <Route
                path="customers"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <CustomerList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="customers/new"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'ADMINISTRATOR']}>
                    <CustomerNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="customers/:id"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <CustomerDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="customers/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'ADMINISTRATOR']}>
                    <CustomerEdit />
                  </ProtectedRoute>
                }
              />
              
              {/* Property Routes */}
              <Route
                path="properties"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <PropertyList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/new"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'ADMINISTRATOR']}>
                    <PropertyNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/:id"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <PropertyDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'ADMINISTRATOR']}>
                    <PropertyEdit />
                  </ProtectedRoute>
                }
              />
              
              {/* Tax Routes */}
              <Route
                path="tax"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <TaxList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tax/new"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'ADMINISTRATOR']}>
                    <TaxNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tax/:id"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'VIEWER', 'ADMINISTRATOR']}>
                    <TaxDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tax/:assessmentId/payment/new"
                element={
                  <ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'ADMINISTRATOR']}>
                    <TaxPaymentNew />
                  </ProtectedRoute>
                }
              />
              
              {/* Workflow Routes */}
              <Route
                path="review-queue"
                element={
                  <ProtectedRoute allowedRoles={['APPROVER', 'ADMINISTRATOR']}>
                    <ReviewQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="review-queue/:id"
                element={
                  <ProtectedRoute allowedRoles={['APPROVER', 'ADMINISTRATOR']}>
                    <ReviewQueueDetail />
                  </ProtectedRoute>
                }
              />
              
              {/* Notifications Route */}
              <Route
                path="notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              
              {/* Bulk Upload & Map Routes */}
              <Route path="bulk-upload" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><BulkUpload /></ProtectedRoute>} />
              <Route path="map" element={<ProtectedRoute allowedRoles={['INPUTTER', 'APPROVER', 'ADMINISTRATOR']}><MapView /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="admin/users" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><UserManagement /></ProtectedRoute>} />
              <Route path="admin/users/new" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><UserForm /></ProtectedRoute>} />
              <Route path="admin/users/edit" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><UserForm /></ProtectedRoute>} />
              <Route path="admin/lookups" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><LookupManagement /></ProtectedRoute>} />
              <Route path="admin/ago-settings" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><AgoSettings /></ProtectedRoute>} />
              <Route path="admin/audit-logs" element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']}><AuditLogs /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
