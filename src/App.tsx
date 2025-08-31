import { Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom'
import ListsPage from './features/ListsPage'
import ShoppingListPage from './features/ShoppingListPage'
import ProductDetailPage from './features/ProductDetailPage'
import CategorySelectPage from './features/CategorySelectPage'
import UnitSelectPage from './features/UnitSelectPage'
import SearchPage from './features/SearchPage'
import LoginPage from './features/LoginPage'
import RegisterPage from './features/RegisterPage'
import CreateListPage from './features/CreateListPage'
import EditListPage from './features/EditListPage'
import AccountPage from './features/AccountPage'
import ResetPasswordPage from './features/ResetPasswordPage'
import CookbookPage from './features/CookbookPage'
import Header from './components/Header'
import PWAUpdateBanner from './components/PWAUpdateBanner'
import OfflineIndicator from './components/OfflineIndicator'
import RealtimeStatus from './components/RealtimeStatus'
import ProtectedRoute from './components/ProtectedRoute'

function Layout() {
  const location = useLocation();
  
  // Optional: Header auf bestimmten Seiten ausblenden
  // const hideHeader = location.pathname === '/';
  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <OfflineIndicator />
      <PWAUpdateBanner />
      <Header />
      <div className="w-full"><Outlet /></div>
      <RealtimeStatus />
    </div>
  );
}

// Home component removed - ListsPage is now the home page

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected routes with layout */}
      <Route element={<Layout />}>
        <Route path="/" element={
          <ProtectedRoute>
            <ListsPage />
          </ProtectedRoute>
        } />
        <Route path="/lists" element={
          <ProtectedRoute>
            <ListsPage />
          </ProtectedRoute>
        } />
        <Route path="/create-list" element={
          <ProtectedRoute>
            <CreateListPage />
          </ProtectedRoute>
        } />
        <Route path="/edit-list" element={
          <ProtectedRoute>
            <EditListPage />
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId" element={
          <ProtectedRoute>
            <ShoppingListPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId/search" element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId/product/:productId" element={
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId/product/:productId/category" element={
          <ProtectedRoute>
            <CategorySelectPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId/product/:productId/unit" element={
          <ProtectedRoute>
            <UnitSelectPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/:listId/cookbook" element={
          <ProtectedRoute>
            <CookbookPage />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Redirect root to lists if not on login/register */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
