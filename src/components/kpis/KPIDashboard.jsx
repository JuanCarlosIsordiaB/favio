/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente Principal: Dashboard de KPIs
 *
 * Vista consolidada con:
 * - Grid de KPI Cards con semáforos
 * - Filtros por categoría y período
 * - Alertas críticas
 * - Control por rol
 */

import React, { useState, useMemo } from 'react';
import { normalizeRole, getAllowedKPICategories } from '../../lib/roleMapping';
import { useKPIs } from '../../hooks/useKPIs';
import { useKPIAlerts } from '../../hooks/useKPIAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import KPICard from './KPICard';
import KPIAlertsList from './KPIAlertsList';
import KPIFilterPanel from './KPIFilterPanel';
import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CATEGORIAS = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'PRODUCTIVO_GANADERO', label: 'Productivos Ganaderos' },
  { value: 'ECONOMICO', label: 'Económicos' },
  { value: 'PASTURAS', label: 'Pasturas' },
  { value: 'GESTION', label: 'Gestión' }
];

export default function KPIDashboard({ firmId, premiseId, userRole = 'administrador' }) {
  // Normalizar rol del usuario
  const normalizedRole = normalizeRole(userRole);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [periodo, setPeriodo] = useState('mes');
  const [filters, setFilters] = useState({});

  // Hooks
  const { kpis, loading, error, resumen, loadKPIs, calcularTodos, limpiarCache } = useKPIs(
    firmId,
    premiseId,
    { category: selectedCategory, ...filters }
  );

  const { alertasCriticas, alertasAdvertencia, cargarAlertasCriticas, cargarAlertasAdvertencia } =
    useKPIAlerts(firmId);

  // Calcular período según selección
  const getPeriodo = () => {
    const hoy = new Date();
    const inicio = new Date();

    switch (periodo) {
      case 'semana':
        inicio.setDate(hoy.getDate() - 7);
        break;
      case 'mes':
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'trimestre':
        inicio.setMonth(hoy.getMonth() - 3);
        break;
      default:
        inicio.setMonth(hoy.getMonth() - 1);
    }

    return { inicio, fin: hoy };
  };

  // Filtrar KPIs por rol
  const kpisVisibles = useMemo(() => {
    // Obtener categorías permitidas según rol
    const allowedCategories = getAllowedKPICategories(normalizedRole);

    // Filtrar KPIs por categorías permitidas
    const filtered = kpis.filter(k => allowedCategories.includes(k.category));

    return filtered;
  }, [kpis, normalizedRole]);

  // Refresh
  const handleRefresh = async () => {
    limpiarCache();
    const periodoData = getPeriodo();
    await calcularTodos(periodoData.inicio, periodoData.fin);
    await cargarAlertasCriticas();
    await cargarAlertasAdvertencia();
  };

  if (!firmId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Selecciona una firma para ver los KPIs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPIs y Umbrales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Modelo de indicadores clave con semáforos automáticos
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Período */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Período</label>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Última semana</SelectItem>
              <SelectItem value="mes">Último mes</SelectItem>
              <SelectItem value="trimestre">Último trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtros avanzados */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          Filtros avanzados
        </Button>
      </div>

      {/* Panel de filtros (si está visible) */}
      {showFilters && (
        <div className="border rounded p-4 bg-gray-50">
          <KPIFilterPanel
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Resumen de estado */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{resumen.verdes}</div>
              <p className="text-sm text-gray-500 mt-1">Óptimos</p>
              <p className="text-xs text-gray-400">{resumen.porcentajeVerde}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{resumen.amarillos}</div>
              <p className="text-sm text-gray-500 mt-1">Advertencia</p>
              <p className="text-xs text-gray-400">{resumen.porcentajeAmarillo}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{resumen.rojos}</div>
              <p className="text-sm text-gray-500 mt-1">Críticos</p>
              <p className="text-xs text-gray-400">{resumen.porcentajeRojo}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{resumen.total}</div>
              <p className="text-sm text-gray-500 mt-1">Total KPIs</p>
              <p className="text-xs text-gray-400">Activos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kpis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kpis">
            KPIs ({kpisVisibles.length})
          </TabsTrigger>
          <TabsTrigger value="alertas">
            <div className="flex items-center gap-2">
              Alertas
              {alertasCriticas.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {alertasCriticas.length}
                </span>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        {/* Tab: KPIs */}
        <TabsContent value="kpis" className="space-y-4">
          {loading && !kpisVisibles.length && (
            <div className="text-center py-8 text-gray-500">
              <p>Cargando KPIs...</p>
            </div>
          )}

          {!loading && kpisVisibles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay KPIs para mostrar con los filtros seleccionados</p>
            </div>
          )}

          {kpisVisibles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpisVisibles.map(kpi => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  onClick={() => setSelectedKPI(kpi)}
                  userRole={normalizedRole}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="space-y-4">
          {alertasCriticas.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-red-600">
                <AlertCircle size={18} />
                Alertas Críticas ({alertasCriticas.length})
              </h3>
              <KPIAlertsList
                alertas={alertasCriticas}
                priority="alta"
              />
            </div>
          )}

          {alertasAdvertencia.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-600">
                Alertas de Advertencia ({alertasAdvertencia.length})
              </h3>
              <KPIAlertsList
                alertas={alertasAdvertencia}
                priority="media"
              />
            </div>
          )}

          {alertasCriticas.length === 0 && alertasAdvertencia.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>✅ No hay alertas activas</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Resumen General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">KPIs Óptimos</p>
                  <p className="text-2xl font-bold text-green-600">{resumen.verdes}/{resumen.total}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <p className="text-sm text-gray-600">En Advertencia</p>
                  <p className="text-2xl font-bold text-yellow-600">{resumen.amarillos}/{resumen.total}</p>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-sm text-gray-600">Críticos</p>
                  <p className="text-2xl font-bold text-red-600">{resumen.rojos}/{resumen.total}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Salud General</p>
                  <p className="text-2xl font-bold text-blue-600">{resumen.porcentajeVerde}%</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2">Últimas acciones</h4>
                <p className="text-sm text-gray-500">
                  Dashboard actualizado el {new Date().toLocaleTimeString('es-ES')}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Los datos se actualizan automáticamente cada 2 minutos durante operación
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        <p>Sistema de KPIs y Alertas • Módulo 15 • Última actualización: {new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  );
}
