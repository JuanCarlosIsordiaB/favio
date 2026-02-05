import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useIntegrations } from '../hooks/useIntegrations';
import IntegrationListView from './vistas/IntegrationListView';
import SyncHistoryView from './vistas/SyncHistoryView';
import IntegrationStatusPanel from './alertas/IntegrationStatusPanel';
import IntegrationConfigModal from './modales/IntegrationConfigModal';
import { Plus, Zap, Clock, AlertCircle } from 'lucide-react';

export default function IntegrationsManager({ firmId, currentUser }) {
  const [currentTab, setCurrentTab] = useState('integraciones');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);

  const {
    integraciones,
    estado,
    loading,
    syncing,
    cargarIntegraciones,
    cargarEstado,
    crear,
    actualizar,
    activar,
    desactivar,
    probarConexion,
    sincronizar,
    obtenerHistorial
  } = useIntegrations(firmId);

  if (!firmId) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          Selecciona una empresa para gestionar integraciones.
        </p>
      </Card>
    );
  }

  const handleNuevaIntegracion = () => {
    setEditingIntegration(null);
    setShowConfigModal(true);
  };

  const handleEditarIntegracion = (integracion) => {
    setEditingIntegration(integracion);
    setShowConfigModal(true);
  };

  const handleGuardarIntegracion = async (formData) => {
    try {
      if (editingIntegration) {
        await actualizar(editingIntegration.id, formData);
      } else {
        await crear(formData);
      }
      setShowConfigModal(false);
      setEditingIntegration(null);
    } catch (err) {
      console.error('Error guardando integración:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      {estado && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Integraciones</p>
                <p className="text-2xl font-bold">{estado.total_integraciones}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold text-green-600">{estado.activas}</p>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">{estado.pausadas}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errores</p>
                <p className="text-2xl font-bold text-red-600">{estado.en_error}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="estado">Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="integraciones" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Integraciones Configuradas</h3>
            <Button onClick={handleNuevaIntegracion} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Integración
            </Button>
          </div>

          <IntegrationListView
            integraciones={integraciones}
            loading={loading}
            syncing={syncing}
            onEdit={handleEditarIntegracion}
            onSync={sincronizar}
            onProbarConexion={probarConexion}
            onActivar={activar}
            onDesactivar={desactivar}
            onRefresh={cargarIntegraciones}
          />
        </TabsContent>

        <TabsContent value="historial">
          <SyncHistoryView
            integraciones={integraciones}
            obtenerHistorial={obtenerHistorial}
          />
        </TabsContent>

        <TabsContent value="estado">
          <IntegrationStatusPanel
            estado={estado}
            integraciones={integraciones}
            onRefresh={cargarEstado}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de configuración */}
      {showConfigModal && (
        <IntegrationConfigModal
          integracion={editingIntegration}
          onSave={handleGuardarIntegracion}
          onClose={() => {
            setShowConfigModal(false);
            setEditingIntegration(null);
          }}
        />
      )}
    </div>
  );
}
