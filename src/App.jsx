import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import Dashboard from './components/Dashboard';
import FirmManager from './components/FirmManager';
import PremiseManager from './components/PremiseManager';
import LotManager from './components/LotManager';
import InputsManager from './components/InputsManager';
import RecordsManager from './components/RecordsManager';
import WorkManager from './components/WorkManager';
import FinanceManager from './components/FinanceManager';
import MonitoringManager from './components/MonitoringManager';
import PurchaseOrders from './components/PurchaseOrders';
import RemittancesManager from './components/RemittancesManager';
import PaymentOrders from './components/PaymentOrders';
import SalesManager from './components/SalesManager';
import AlertsManager from './components/AlertsManager';
import ReportsManager from './components/ReportsManager';
import LivestockManager from './components/LivestockManager';
import GestionesManager from './components/GestionesManager';
import PersonnelManager from './components/PersonnelManager';
import MachineryManager from './components/MachineryManager';
import IntegrationsManager from './components/IntegrationsManager';
import ConfigurationManager from './components/ConfigurationManager';
import KPIsByRole from './components/kpis/KPIsByRole';
import DebugAlertsRLS from './components/DebugAlertsRLS';

// ============================================================================
// APP CONTENT - Componente interior que usa AuthContext
// ============================================================================
function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('main');
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [selectedPremise, setSelectedPremise] = useState(null);

  // Detectar si el usuario está en la página de aceptar invitación
  const params = new URLSearchParams(window.location.search);
  const invitationToken = params.get('token');
  const pathname = window.location.pathname;

  const managementViews = [
    'alerts',
    'records',
    'lots',
    'livestock',
    'inputs',
    'works',
    'finance',
    'purchase-orders',
    'remittances',
    'sales',
    'payment-orders',
    'monitoring',
    'gestiones',
    'reports',
    'kpis',
    'personnel',
    'machinery',
    'integrations',
    'settings'
  ];

  // FIX #2: Cargar contexto del localStorage al iniciar
  useEffect(() => {
    const savedFirmId = localStorage.getItem('selectedFirmId');
    const savedFirmData = localStorage.getItem('selectedFirmData');
    const savedPremiseId = localStorage.getItem('selectedPremiseId');
    const savedPremiseData = localStorage.getItem('selectedPremiseData');

    if (savedFirmData) {
      try {
        setSelectedFirm(JSON.parse(savedFirmData));
      } catch (err) {
        console.warn('Error loading saved firm:', err);
      }
    }

    if (savedPremiseData) {
      try {
        setSelectedPremise(JSON.parse(savedPremiseData));
      } catch (err) {
        console.warn('Error loading saved premise:', err);
      }
    }
  }, []);

  // FIX #2: Guardar contexto en localStorage cuando cambia
  useEffect(() => {
    if (selectedFirm) {
      localStorage.setItem('selectedFirmId', selectedFirm.id);
      localStorage.setItem('selectedFirmData', JSON.stringify(selectedFirm));
    }
  }, [selectedFirm]);

  useEffect(() => {
    if (selectedPremise) {
      localStorage.setItem('selectedPremiseId', selectedPremise.id);
      localStorage.setItem('selectedPremiseData', JSON.stringify(selectedPremise));
    }
  }, [selectedPremise]);

  // FIX #10: Resetear predio cuando cambia firma
  useEffect(() => {
    if (selectedFirm) {
      // Si hay un predio seleccionado, verificar que pertenece a la firma
      if (selectedPremise && selectedPremise.firm_id !== selectedFirm.id) {
        console.warn(
          `⚠️ Predio ${selectedPremise.id} no pertenece a firma ${selectedFirm.id}. Reseteando predio...`
        );
        setSelectedPremise(null);
        localStorage.removeItem('selectedPremiseId');
        localStorage.removeItem('selectedPremiseData');
      }
    }
  }, [selectedFirm]);

  useEffect(() => {
    if (managementViews.includes(currentView) && (!selectedFirm || !selectedPremise)) {
      console.log('Blocking access to management view. Redirecting to firms...');
      setCurrentView('firms');
    }
  }, [currentView, selectedFirm, selectedPremise]);

  // TODOS LOS HOOKS DEBEN ESTAR ARRIBA DE ESTE PUNTO
  // Los returns condicionales ahora están aquí, después de todos los hooks

  // Si tiene token de invitación, mostrar página de aceptación (acceso público)
  if (invitationToken && pathname === '/accept-invitation') {
    return <AcceptInvitationPage />;
  }

  // Si está cargando autenticación, mostrar loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-green-600 mx-auto mb-6"></div>
          <p className="text-slate-600 font-medium">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar LoginPage
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'main':
        if (!selectedFirm || !selectedPremise) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md p-8">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 shadow-lg">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">
                    Configuración Requerida
                  </h2>
                  <p className="text-slate-600 mb-6">
                    Para comenzar a utilizar Campo Gestor, primero debe seleccionar una <strong>Firma</strong> y un <strong>Predio</strong>.
                  </p>
                  <button
                    onClick={() => setCurrentView('firms')}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                  >
                    Ir a Mis Firmas
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <AlertsManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'firms':
        return (
          <FirmManager
            onSelectFirm={(firm) => {
              setSelectedFirm(firm);
              // Resetear predio cuando se selecciona una nueva firma
              setSelectedPremise(null);
              localStorage.removeItem('selectedPremiseId');
              localStorage.removeItem('selectedPremiseData');
            }}
            selectedFirmId={selectedFirm?.id}
          />
        );
      case 'premises':
        return (
          <PremiseManager
            selectedFirmId={selectedFirm?.id}
            onSelectPremise={(premise) => setSelectedPremise(premise)}
            selectedPremiseId={selectedPremise?.id}
          />
        );
      case 'alerts':
        return (
          <AlertsManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'records':
        return (
          <RecordsManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'lots':
        return (
          <LotManager
            selectedFirmId={selectedFirm?.id}
            selectedPremiseId={selectedPremise?.id}
            onSelectPremise={(premise) => setSelectedPremise(premise)}
          />
        );
      case 'livestock':
        return (
          <LivestockManager
            selectedFirmId={selectedFirm?.id}
            selectedPremiseId={selectedPremise?.id}
          />
        );
      case 'inputs':
        return (
          <InputsManager
            selectedFirmId={selectedFirm?.id}
            selectedPremiseId={selectedPremise?.id}
            onSelectPremise={(premise) => setSelectedPremise(premise)}
          />
        );
      case 'works':
        return <WorkManager />;
      case 'finance':
        return (
          <FinanceManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'purchase-orders':
        return <PurchaseOrders firmId={selectedFirm?.id} premiseId={selectedPremise?.id} />;
      case 'remittances':
        return (
          <RemittancesManager
            selectedFirm={selectedFirm}
            selectedPremise={selectedPremise}
            currentUser={user?.id}
          />
        );
      case 'sales':
        return (
          <SalesManager
            selectedFirmId={selectedFirm?.id}
            selectedPremiseId={selectedPremise?.id}
          />
        );
      case 'payment-orders':
        return (
          <FinanceManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
            initialTab="payment_orders"
          />
        );
      case 'monitoring':
        return (
          <MonitoringManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'reports':
        return (
          <ReportsManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'kpis':
        return (
          <KPIsByRole
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
            currentUser={user}
          />
        );
      case 'gestiones':
        return (
          <GestionesManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
      case 'personnel':
        return (
          <PersonnelManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
            currentUser="Usuario"
          />
        );
      case 'machinery':
        return (
          <MachineryManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
            currentUser="Usuario"
          />
        );
      case 'integrations':
        return (
          <IntegrationsManager
            firmId={selectedFirm?.id}
            currentUser="Usuario"
          />
        );
      case 'settings':
        return (
          <ConfigurationManager
            firmId={selectedFirm?.id}
            firmName={selectedFirm?.name}
            selectedPremise={selectedPremise}
          />
        );
      case 'debug-rls':
        return <DebugAlertsRLS />;
      default:
        if (!selectedFirm || !selectedPremise) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md p-8">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 shadow-lg">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">
                    Configuración Requerida
                  </h2>
                  <p className="text-slate-600 mb-6">
                    Para comenzar a utilizar Campo Gestor, primero debe seleccionar una <strong>Firma</strong> y un <strong>Predio</strong>.
                  </p>
                  <button
                    onClick={() => setCurrentView('firms')}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                  >
                    Ir a Mis Firmas
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return (
          <AlertsManager
            firmId={selectedFirm?.id}
            premiseId={selectedPremise?.id}
          />
        );
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        expand
        closeButton
      />
      <Layout
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedFirm={selectedFirm}
        selectedPremise={selectedPremise}
      >
        {renderContent()}
      </Layout>
    </>
  );
}

// ============================================================================
// APP - Componente raíz que provee AuthContext
// ============================================================================
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
