import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/Auth';
import { AppDataProvider } from './context/AppData';
import Login from './pages/Login';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Properties from './pages/Properties';
import PropertyTaxes from './pages/PropertyTaxes';
import HOADues from './pages/HOADues';
import ProjectedCashflow from './pages/ProjectedCashflow';
import Tenants from './pages/Tenants';
import Owners from './pages/Owners';

function AppRoutes() {
  const { session, needsSetup } = useAuth();

  // Still initializing
  if (session === undefined) return null;

  if (!session || needsSetup) return <Login />;

  return (
    <AppDataProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/import" element={<Import />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/property-taxes" element={<PropertyTaxes />} />
            <Route path="/hoa-dues" element={<HOADues />} />
            <Route path="/projected-cashflow" element={<ProjectedCashflow />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/owners" element={<Owners />} />
            <Route path="/users" element={<Users />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
