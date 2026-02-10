/**
 * RemittancesManager.jsx
 * Módulo 09 - Remitos
 *
 * Componente principal que gestiona:
 * - Listado de remitos
 * - Recepciones pendientes
 * - Reportes y estadísticas
 * - Creación de nuevos remitos
 *
 * Stack: React, Supabase, sonner, lucide-react, shadcn/ui
 */

import { useState, useEffect } from "react";
import { useRemittances } from "../hooks/useRemittances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Plus,
  Package,
  TruckIcon,
  ClipboardList,
  AlertCircle,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import RemittanceFormModal from "./modales/RemittanceFormModal";
import RemittanceListView from "./vistas/RemittanceListView";
import RemittanceReceptionView from "./vistas/RemittanceReceptionView";
import RemittanceReportsView from "./vistas/RemittanceReportsView";
import { crearRegistro } from "../services/registros";
import { cn } from "../lib/utils";

/**
 * Componente principal del Módulo de Remitos
 * @param {Object} props
 * @param {Object} props.selectedFirm - Firma seleccionada
 * @param {Object} props.selectedPremise - Predio seleccionado
 * @param {string} props.currentUser - Usuario actual
 */
export default function RemittancesManager({
  selectedFirm,
  selectedPremise,
  currentUser,
}) {
  // ===========================
  // ESTADO
  // ===========================

  const [currentTab, setCurrentTab] = useState("list");
  const [isCreatingRemittance, setIsCreatingRemittance] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pendingRemittances, setPendingRemittances] = useState([]);

  const {
    remittances,
    loading,
    loadRemittances,
    addRemittance,
    getStatistics,
    getPendingRemittances,
  } = useRemittances();

  // ===========================
  // EFECTOS
  // ===========================

  // Cargar remitos al montar o cambiar firma
  useEffect(() => {
    if (selectedFirm?.id) {
      loadRemittances(selectedFirm.id);
      loadStats();
      loadPendingRemittances();
    }
  }, [selectedFirm?.id, loadRemittances]);

  // ===========================
  // FUNCIONES
  // ===========================

  /**
   * Cargar estadísticas
   */
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const statistics = await getStatistics(selectedFirm.id);
      setStats(statistics);
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  /**
   * Cargar remitos pendientes de resolución
   */
  const loadPendingRemittances = async () => {
    try {
      const pending = await getPendingRemittances(selectedFirm.id, 30);
      setPendingRemittances(pending || []);
    } catch (err) {
      console.error("Error cargando remitos pendientes:", err);
    }
  };

  /**
   * Crear nuevo remito
   */
  const handleCreateRemittance = async (remittanceData, items) => {
    try {
      const nuevoRemito = await addRemittance(remittanceData, items);

      // Auditoría
      try {
        await crearRegistro({
          firmId: selectedFirm.id,
          premiseId: selectedPremise?.id || remittanceData.premise_id,
          tipo: "remito_creado",
          descripcion: `Remito ${remittanceData.remittance_number} creado para ${remittanceData.supplier_name}`,
          moduloOrigen: "remitos",
          usuario: currentUser,
          metadata: { remittance_id: nuevoRemito.id },
        });
      } catch (auditErr) {
        console.warn(
          "Advertencia: No se pudo registrar en auditoría",
          auditErr,
        );
      }

      setIsCreatingRemittance(false);
      await loadStats();
    } catch (err) {
      console.error("Error creando remito:", err);
    }
  };

  /**
   * Refrescar datos
   */
  const handleRefresh = async () => {
    if (selectedFirm?.id) {
      await loadRemittances(selectedFirm.id);
      await loadStats();
      await loadPendingRemittances();
      toast.success("Datos actualizados");
    }
  };

  // ===========================
  // RENDERS
  // ===========================

  if (!selectedFirm) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
          <p className="text-blue-900">Selecciona una firma para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Módulo de Remitos</h1>
          <p className="text-slate-600 mt-1">
            Registro de recepciones de mercadería y control de stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Actualizar
          </Button>
          <Button
            onClick={() => setIsCreatingRemittance(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Remito
          </Button>
        </div>
      </div>

      {/* ===== ALERTA REMITOS PENDIENTES ===== */}
      {pendingRemittances.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-900">
              Remitos pendientes de recepción
            </h3>
            <p className="text-sm text-orange-800 mt-1">
              {pendingRemittances.length} remito(s) en tránsito hace más de 30
              días sin ser procesados.
            </p>
          </div>
        </div>
      )}

      {/* ===== DASHBOARD DE MÉTRICAS ===== */}
      {stats && !statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Remitos */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Remitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.total}
              </div>
              <p className="text-xs text-slate-600 mt-1">Desde el inicio</p>
            </CardContent>
          </Card>

          {/* En Tránsito */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center">
                <TruckIcon className="w-4 h-4 mr-2 text-blue-600" />
                Pendientes / Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.in_transit}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Pendientes de recibir
              </p>
            </CardContent>
          </Card>

          {/* Recibidos */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center">
                <Package className="w-4 h-4 mr-2 text-green-600" />
                Recibidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.received}
              </div>
              <p className="text-xs text-slate-600 mt-1">Stock actualizado</p>
            </CardContent>
          </Card>

          {/* Parcialmente Recibidos */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center">
                <ClipboardList className="w-4 h-4 mr-2 text-orange-600" />
                Parciales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.partially_received}
              </div>
              <p className="text-xs text-slate-600 mt-1">Falta recibir</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== TABS DE VISTAS ===== */}
      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="bg-white rounded-lg border"
      >
        <TabsList className="w-full justify-start border-b rounded-none bg-slate-50">
          <TabsTrigger value="list" className="rounded-none">
            <ClipboardList className="w-4 h-4 mr-2" />
            Listado
          </TabsTrigger>
          <TabsTrigger value="reception" className="rounded-none">
            <Package className="w-4 h-4 mr-2" />
            Recepciones Pendientes
            {stats?.in_transit > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {stats.in_transit}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none">
            <TruckIcon className="w-4 h-4 mr-2" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Listado */}
        <TabsContent value="list" className="p-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <RemittanceListView
              remittances={remittances}
              loading={loading}
              selectedFirm={selectedFirm}
              selectedPremise={selectedPremise}
              currentUser={currentUser}
              onRefresh={handleRefresh}
            />
          )}
        </TabsContent>

        {/* Tab: Recepciones Pendientes */}
        <TabsContent value="reception" className="p-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <RemittanceReceptionView
              remittances={remittances.filter((r) =>
                [
                  "pending",
                  "sent",
                  "in_transit",
                  "partially_received",
                ].includes(r.status),
              )}
              loading={loading}
              selectedFirm={selectedFirm}
              selectedPremise={selectedPremise}
              currentUser={currentUser}
              onRefresh={handleRefresh}
            />
          )}
        </TabsContent>

        {/* Tab: Reportes */}
        <TabsContent value="reports" className="p-6">
          <RemittanceReportsView
            remittances={remittances}
            selectedFirm={selectedFirm}
          />
        </TabsContent>
      </Tabs>

      {/* ===== MODAL: CREAR REMITO ===== */}
      {isCreatingRemittance && (
        <RemittanceFormModal
          isOpen={isCreatingRemittance}
          onClose={() => setIsCreatingRemittance(false)}
          onSubmit={handleCreateRemittance}
          selectedFirm={selectedFirm}
          selectedPremise={selectedPremise}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
