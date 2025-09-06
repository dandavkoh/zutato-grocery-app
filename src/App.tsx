import { Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom'
import { IonApp, IonRouterOutlet, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonLabel, IonIcon, IonHeader, IonToolbar, IonTitle, IonMenuButton, IonButtons } from '@ionic/react'
import { home, list, add, person, settings, book } from 'ionicons/icons'
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
import ProtectedRoute from './components/ProtectedRoute'
import { GlobalRealtimeProvider } from './services/globalRealtimeService'

function Layout() {
  const location = useLocation();
  
  return (
    <IonSplitPane contentId="main-content">
      <IonMenu contentId="main-content" type="overlay">
        <IonHeader>
          <IonToolbar>
            <IonTitle>ZUTATO</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem routerLink="/" routerDirection="none">
              <IonIcon icon={home} slot="start" />
              <IonLabel>Einkaufslisten</IonLabel>
            </IonItem>
            <IonItem routerLink="/create-list" routerDirection="none">
              <IonIcon icon={add} slot="start" />
              <IonLabel>Neue Liste</IonLabel>
            </IonItem>
            <IonItem routerLink="/account" routerDirection="none">
              <IonIcon icon={person} slot="start" />
              <IonLabel>Konto</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonMenu>
      
      <div id="main-content">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>ZUTATO</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <GlobalRealtimeProvider>
            <Outlet />
          </GlobalRealtimeProvider>
        </IonContent>
      </div>
    </IonSplitPane>
  );
}

// Home component removed - ListsPage is now the home page

function App() {
  return (
    <IonApp>
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
    </IonApp>
  )
}

export default App
