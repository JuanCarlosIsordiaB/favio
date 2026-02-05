/**
 * ConfigurationManager.jsx
 *
 * Módulo de Configuración - Panel principal con tabs para:
 * - Usuarios y Permisos
 * - Centros de Costo
 * - Firmas (acceso rápido)
 * - Predios (acceso rápido)
 * - Auditoría
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UsersManager from './UsersManager';
import CostCenterManager from './CostCenterManager';
import ChartOfAccountsManager from './ChartOfAccountsManager';
import ActivitiesManager from './ActivitiesManager';
import AuditLogViewer from './AuditLogViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Grid3X3, Building2, MapPin, Activity, AlertCircle, BookOpen, Zap, Shield } from 'lucide-react';

export default function ConfigurationManager({ firmId, firmName, selectedPremise }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'administrador';
  const [activeTab, setActiveTab] = useState('users');

  if (!firmId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Selecciona una firma</p>
            <p className="text-sm text-yellow-800 mt-1">Debe seleccionar una firma para acceder a la configuración.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Acceso denegado</p>
            <p className="text-sm text-red-800 mt-1">Solo los administradores pueden acceder al módulo de configuración.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-600 mt-2">Gestiona usuarios, permisos, centros de costo y más</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto gap-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={18} />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Grid3X3 size={18} />
            <span className="hidden sm:inline">Centros</span>
          </TabsTrigger>
          <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
            <BookOpen size={18} />
            <span className="hidden sm:inline">Cuentas</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Zap size={18} />
            <span className="hidden sm:inline">Actividads</span>
          </TabsTrigger>
          <TabsTrigger value="firms" className="flex items-center gap-2">
            <Building2 size={18} />
            <span className="hidden sm:inline">Firmas</span>
          </TabsTrigger>
          <TabsTrigger value="premises" className="flex items-center gap-2">
            <MapPin size={18} />
            <span className="hidden sm:inline">Predios</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield size={18} />
            <span className="hidden sm:inline">Auditoría</span>
          </TabsTrigger>
        </TabsList>

        {/* Usuarios y Permisos */}
        <TabsContent value="users" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <UsersManager firmId={firmId} firmName={firmName} />
          </div>
        </TabsContent>

        {/* Centros de Costo */}
        <TabsContent value="cost-centers" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <CostCenterManager firmId={firmId} firmName={firmName} />
          </div>
        </TabsContent>

        {/* Plan de Cuentas Contable */}
        <TabsContent value="chart-of-accounts" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ChartOfAccountsManager firmId={firmId} firmName={firmName} />
          </div>
        </TabsContent>

        {/* Actividades */}
        <TabsContent value="activities" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ActivitiesManager firmId={firmId} firmName={firmName} />
          </div>
        </TabsContent>

        {/* Firmas */}
        <TabsContent value="firms" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Información de Firma</h3>
                <p className="text-sm text-slate-600">Gestiona los detalles de la firma actual</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Nombre</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{firmName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">ID</p>
                  <p className="text-sm font-mono text-slate-700 mt-1 break-all">{firmId}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  Para editar los detalles de la firma (moneda, perfil de contribuyente, unidades de negocio),
                  ve al módulo de <strong>Firmas</strong> desde el menú principal.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Predios */}
        <TabsContent value="premises" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Información de Predio</h3>
                <p className="text-sm text-slate-600">Gestiona los detalles del predio actual</p>
              </div>

              {selectedPremise ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Nombre</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{selectedPremise.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Ubicación</p>
                    <p className="text-sm text-slate-700 mt-1">{selectedPremise.location || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Área Total</p>
                    <p className="text-sm text-slate-700 mt-1">
                      {selectedPremise.total_area ? `${selectedPremise.total_area.toLocaleString()} ha` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">ID</p>
                    <p className="text-sm font-mono text-slate-700 mt-1 break-all">{selectedPremise.id}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No hay predio seleccionado. Ve al menú principal y selecciona un predio para ver su información.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  Para editar los detalles del predio (DICOSE, CONEAT, padrones),
                  ve al módulo de <strong>Predios</strong> desde el menú principal.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Auditoría */}
        <TabsContent value="audit" className="mt-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <AuditLogViewer firmId={firmId} firmName={firmName} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-700">
          <strong>Tip:</strong> Los cambios se guardan automáticamente. Algunos cambios podrían requerir que recargues la página.
        </p>
      </div>
    </div>
  );
}
