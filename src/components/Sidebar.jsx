import React, { useState } from 'react';
import { DollarSign, Package, Calendar, Users, Settings, FileText, Map, Building2, MapPin, Edit2, ClipboardList, Activity, ChevronDown, ChevronRight, ShoppingCart, Truck, CreditCard, Receipt, Bell, BarChart3, Briefcase, Beef, CalendarRange, Zap, LogOut, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canAccessModule, getRoleDisplayName } from '../lib/permissions';

export default function Sidebar({ currentView, setCurrentView, selectedFirm, selectedPremise }) {
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  // Obtener módulos accesibles según permisos
  const canAccessFinance = user ? canAccessModule(user, 'finance') : false;
  const canAccessSettings = user ? canAccessModule(user, 'settings') : false;
  const canAccessPersonnel = user ? canAccessModule(user, 'personnel') : false;
  const canAccessMachinery = user ? canAccessModule(user, 'machinery') : false;
  const canAccessIntegrations = user ? canAccessModule(user, 'integrations') : false;
  const canAccessReports = user ? canAccessModule(user, 'reports') : false;
  const canAccessKPIs = user ? canAccessModule(user, 'kpis') : false;

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-green-500">Campo Gestor</h1>
        <p className="text-xs text-slate-400 mt-1">Gestión Agropecuaria</p>
      </div>
      
      <div className="px-4 py-3 bg-slate-800/50">
        <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Contexto Actual</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2 text-sm text-slate-300 overflow-hidden">
              <Building2 size={14} className="text-green-500 flex-shrink-0" />
              <span className="truncate">{selectedFirm ? selectedFirm.name : 'Sin Firma'}</span>
            </div>
            {selectedFirm && (
              <button 
                onClick={() => setCurrentView('firms')}
                className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Gestionar Firmas"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2 text-sm text-slate-300 overflow-hidden">
              <MapPin size={14} className="text-green-500 flex-shrink-0" />
              <span className="truncate">{selectedPremise ? selectedPremise.name : 'Sin Predio'}</span>
            </div>
            {selectedPremise && (
              <button 
                onClick={() => setCurrentView('premises')}
                className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Gestionar Predios"
              >
                <Edit2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="pt-2 pb-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estructura</p>
        </div>
        
        <NavItem 
          icon={<Building2 size={20} />} 
          label="Mis Firmas" 
          active={currentView === 'firms'} 
          onClick={() => setCurrentView('firms')}
        />
        <NavItem 
          icon={<MapPin size={20} />} 
          label="Mis Predios" 
          active={currentView === 'premises'} 
          onClick={() => setCurrentView('premises')}
        />

        <div className="pt-2 pb-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión</p>
        </div>

        <NavItem
          icon={<Bell size={20} />}
          label="Alertas y Recordatorios"
          active={currentView === 'alerts'}
          onClick={() => setCurrentView('alerts')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<ClipboardList size={20} />}
          label="Registros"
          active={currentView === 'records'}
          onClick={() => setCurrentView('records')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<Map size={20} />}
          label="Lotes y Mapas"
          active={currentView === 'lots'}
          onClick={() => setCurrentView('lots')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<Package size={20} />}
          label="Insumos y Stock"
          active={currentView === 'inputs'}
          onClick={() => setCurrentView('inputs')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<Beef size={20} />}
          label="Ganadería"
          active={currentView === 'livestock'}
          onClick={() => setCurrentView('livestock')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<Briefcase size={20} />}
          label="Trabajo y Proyecciones"
          active={currentView === 'works'}
          onClick={() => setCurrentView('works')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<CalendarRange size={20} />}
          label="Gestiones (Períodos)"
          active={currentView === 'gestiones'}
          onClick={() => setCurrentView('gestiones')}
          disabled={!selectedFirm || !selectedPremise}
          dataId="sidebar-nav-gestiones"
        />

        {/* Ingresos y Gastos - Solo si el usuario tiene permisos */}
        {canAccessFinance && (
          <NavItemWithSubmenu
            icon={<DollarSign size={20} />}
            label="Ingresos y Gastos"
            active={['finance', 'purchase-orders', 'remittances', 'payment-orders'].includes(currentView)}
            isOpen={financeMenuOpen}
            onToggle={() => setFinanceMenuOpen(!financeMenuOpen)}
            submenuItems={[
              {
                label: 'Facturas (Ingresos/Gastos)',
                view: 'finance',
                icon: <Receipt size={16} />,
                active: currentView === 'finance'
              },
              {
                label: 'Órdenes de Compra',
                view: 'purchase-orders',
                icon: <ShoppingCart size={16} />,
                active: currentView === 'purchase-orders'
              },
              {
                label: 'Remitos',
                view: 'remittances',
                icon: <Truck size={16} />,
                active: currentView === 'remittances'
              },
              {
                label: 'Órdenes de Pago',
                view: 'payment-orders',
                icon: <CreditCard size={16} />,
                active: currentView === 'payment-orders'
              }
            ]}
            onSelectSubmenu={(view) => setCurrentView(view)}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}

        <NavItem
          icon={<TrendingUp size={20} />}
          label="Ventas"
          active={currentView === 'sales'}
          onClick={() => setCurrentView('sales')}
          disabled={!selectedFirm || !selectedPremise}
        />

        <NavItem
          icon={<Activity size={20} />}
          label="Monitoreo"
          active={currentView === 'monitoring'}
          onClick={() => setCurrentView('monitoring')}
          disabled={!selectedFirm || !selectedPremise}
        />

        {canAccessReports && (
          <NavItem
            icon={<BarChart3 size={20} />}
            label="Reportes"
            active={currentView === 'reports'}
            onClick={() => setCurrentView('reports')}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}

        {canAccessKPIs && (
          <NavItem
            icon={<TrendingUp size={20} />}
            label="KPIs y Umbrales"
            active={currentView === 'kpis'}
            onClick={() => setCurrentView('kpis')}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}

        {canAccessPersonnel && (
          <NavItem
            icon={<Users size={20} />}
            label="Personal"
            active={currentView === 'personnel'}
            onClick={() => setCurrentView('personnel')}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}

        {canAccessMachinery && (
          <NavItem
            icon={<Truck size={20} />}
            label="Maquinaria"
            active={currentView === 'machinery'}
            onClick={() => setCurrentView('machinery')}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}

        {canAccessIntegrations && (
          <NavItem
            icon={<Zap size={20} />}
            label="Integraciones"
            active={currentView === 'integrations'}
            onClick={() => setCurrentView('integrations')}
            disabled={!selectedFirm}
          />
        )}

        {/* Configuración - Solo si el usuario tiene permisos */}
        {canAccessSettings && (
          <NavItem
            icon={<Settings size={20} />}
            label="Configuración"
            active={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
            disabled={!selectedFirm || !selectedPremise}
          />
        )}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold">
            {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Usuario'}</p>
            <p className="text-xs text-slate-400">{user ? getRoleDisplayName(user.role) : 'Invitado'}</p>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, disabled, dataId }) {
  return (
    <button
      data-id={dataId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        disabled
          ? 'text-slate-500 cursor-not-allowed opacity-50'
          : active
          ? 'bg-green-600 text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      title={disabled ? 'Seleccione una Firma y Predio para acceder' : ''}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function NavItemWithSubmenu({ icon, label, active, isOpen, onToggle, submenuItems, onSelectSubmenu, disabled }) {
  return (
    <div>
      <button
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          disabled
            ? 'text-slate-500 cursor-not-allowed opacity-50'
            : active
            ? 'bg-green-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        title={disabled ? 'Seleccione una Firma y Predio para acceder' : ''}
      >
        {icon}
        <span className="font-medium flex-1 text-left">{label}</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && !disabled && (
        <div className="ml-4 mt-1 space-y-1">
          {submenuItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onSelectSubmenu(item.view)}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                item.active
                  ? 'bg-green-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}