import { Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom'
import ListsPage from './features/ListsPage'
import ShoppingListPage from './features/ShoppingListPage'
import ProductDetailPage from './features/ProductDetailPage'
import CategorySelectPage from './features/CategorySelectPage'
import UnitSelectPage from './features/UnitSelectPage'
import SearchPage from './features/SearchPage'
import LoginPage from './features/LoginPage'
import RegisterPage from './features/RegisterPage'
import Header from './components/Header'
import PWAUpdateBanner from './components/PWAUpdateBanner'
import OfflineIndicator from './components/OfflineIndicator'
import ProtectedRoute from './components/ProtectedRoute'

function Layout() {
  const location = useLocation();
  // Optional: Header auf bestimmten Seiten ausblenden
  // const hideHeader = location.pathname === '/';
  return (
    <div className="min-h-screen bg-black">
      <OfflineIndicator />
      <PWAUpdateBanner />
      <Header />
      <div className="w-full"><Outlet /></div>
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
        <Route path="/shopping-list" element={
          <ProtectedRoute>
            <ShoppingListPage />
          </ProtectedRoute>
        } />
        <Route path="/shopping-list/search" element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        } />
        <Route path="/product" element={
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/product/category" element={
          <ProtectedRoute>
            <CategorySelectPage />
          </ProtectedRoute>
        } />
        <Route path="/product/unit" element={
          <ProtectedRoute>
            <UnitSelectPage />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Redirect root to lists if not on login/register */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
