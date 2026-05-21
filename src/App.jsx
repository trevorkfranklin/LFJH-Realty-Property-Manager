import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Properties from './pages/Properties';
import PropertyTaxes from './pages/PropertyTaxes';
import ProjectedCashflow from './pages/ProjectedCashflow';
import Tenants from './pages/Tenants';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property-taxes" element={<PropertyTaxes />} />
          <Route path="/projected-cashflow" element={<ProjectedCashflow />} />
          <Route path="/tenants" element={<Tenants />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
