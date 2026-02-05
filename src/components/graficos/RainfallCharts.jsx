/**
 * RainfallCharts.jsx
 *
 * Contenedor principal de gráficos de lluvia
 * Integra los 3 tipos de visualización con tabs
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader, BarChart3, Calendar, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import RainfallDailyChart from './RainfallDailyChart';
import RainfallMonthlyChart from './RainfallMonthlyChart';
import RainfallComparisonChart from './RainfallComparisonChart';
import { useRainfallData } from '../../hooks/useRainfallData';

export default function RainfallCharts({ premiseId }) {
  const [activeTab, setActiveTab] = useState('daily');
  const [diasDiario, setDiasDiario] = useState(30);
  const [mesesMensual, setMesesMensual] = useState(12);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  // Cargar campañas del predio
  useEffect(() => {
    if (premiseId) {
      loadCampaigns();
    }
  }, [premiseId]);

  const loadCampaigns = async () => {
    try {
      // Las campañas están asociadas a firm_id, no premise_id
      // Obtener el firmId desde localStorage (disponible en App.jsx)
      const firmIdStr = localStorage.getItem('selectedFirmData');
      if (!firmIdStr) {
        console.warn('⚠️ No firm selected, cannot fetch campaigns');
        setCampaigns([]);
        return;
      }

      let firmData;
      try {
        firmData = JSON.parse(firmIdStr);
      } catch (parseError) {
        console.error('⚠️ Failed to parse selectedFirmData from localStorage:', parseError);
        setCampaigns([]);
        return;
      }

      const firmId = firmData?.id;

      if (!firmId) {
        console.warn('⚠️ Invalid firmId from localStorage');
        setCampaigns([]);
        return;
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, start_date, end_date, status')
        .eq('firm_id', firmId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error cargando campañas:', error);
    }
  };

  const {
    registros,
    acumuladoMensual,
    distribucionMensual,
    comparacionInteranual,
    promedioHistorico,
    deficitHidrico,
    excesoLluvia,
    loading,
    error,
    refetch
  } = useRainfallData(premiseId);

  // Filtrar registros por campaña seleccionada
  const registrosFiltrados = selectedCampaign === 'all'
    ? registros
    : registros?.filter(r => r.campaign_id === selectedCampaign) || [];

  // Si no hay premiseId seleccionado
  if (!premiseId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráficos de Lluvia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
            <p>Selecciona un predio para ver los gráficos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráficos de Lluvia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-muted-foreground">Cargando datos de lluvia...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráficos de Lluvia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-semibold mb-2">Error cargando datos</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para distribución mensual
  const datosDistribucionMensual = distribucionMensual?.meses || [];

  // Preparar datos para comparación interanual
  const datosComparacion = comparacionInteranual || [];

  return (
    <div className="space-y-6">
      {/* Alertas si existen */}
      {(deficitHidrico?.hayDeficit || excesoLluvia?.hayExceso) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deficitHidrico?.hayDeficit && (
              <div className="p-3 bg-white rounded-lg border border-orange-200">
                <p className="font-semibold text-sm text-orange-700">
                  {deficitHidrico.severidad}
                </p>
                <p className="text-sm text-gray-600">{deficitHidrico.descripcion}</p>
              </div>
            )}
            {excesoLluvia?.hayExceso && (
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="font-semibold text-sm text-blue-700">Exceso de Lluvia</p>
                <p className="text-sm text-gray-600">
                  {excesoLluvia.acumulado.toFixed(1)} mm en los últimos 7 días
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs con gráficos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gráficos de Precipitaciones</CardTitle>
              <CardDescription>
                Análisis visual de datos históricos de lluvia
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Selector de campaña */}
              {campaigns.length > 0 && (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Todas las campañas</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.status === 'ACTIVE' ? '(Activa)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <Button onClick={refetch} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Indicador de filtro activo */}
          {selectedCampaign !== 'all' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Filtro activo:</strong> Mostrando datos de{' '}
                {campaigns.find(c => c.id === selectedCampaign)?.name || 'campaña seleccionada'}
              </p>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Diario</span>
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Mensual</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Comparación</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Diario */}
            <TabsContent value="daily" className="mt-6">
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-medium">Mostrar últimos:</label>
                <div className="flex gap-2">
                  <Button
                    variant={diasDiario === 30 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiasDiario(30)}
                  >
                    30 días
                  </Button>
                  <Button
                    variant={diasDiario === 60 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiasDiario(60)}
                  >
                    60 días
                  </Button>
                  <Button
                    variant={diasDiario === 90 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDiasDiario(90)}
                  >
                    90 días
                  </Button>
                </div>
              </div>
              <RainfallDailyChart data={registrosFiltrados} dias={diasDiario} />
            </TabsContent>

            {/* Tab: Mensual */}
            <TabsContent value="monthly" className="mt-6">
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-medium">Mostrar últimos:</label>
                <div className="flex gap-2">
                  <Button
                    variant={mesesMensual === 6 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMesesMensual(6)}
                  >
                    6 meses
                  </Button>
                  <Button
                    variant={mesesMensual === 12 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMesesMensual(12)}
                  >
                    12 meses
                  </Button>
                  <Button
                    variant={mesesMensual === 24 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMesesMensual(24)}
                  >
                    24 meses
                  </Button>
                </div>
              </div>
              <RainfallMonthlyChart
                data={datosDistribucionMensual}
                promedioHistorico={promedioHistorico}
                meses={mesesMensual}
              />
            </TabsContent>

            {/* Tab: Comparación */}
            <TabsContent value="comparison" className="mt-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Las campañas agrícolas se miden de Julio a Junio del año siguiente.
                  La comparación incluye las últimas 3 campañas y el promedio histórico.
                </p>
              </div>
              <RainfallComparisonChart data={datosComparacion} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resumen estadístico */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Estadístico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Acumulado 30 días</p>
              <p className="text-2xl font-bold text-blue-700">
                {acumuladoMensual?.acumulado?.toFixed(1) || '0.0'} mm
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Promedio histórico</p>
              <p className="text-2xl font-bold text-green-700">
                {promedioHistorico?.toFixed(1) || '0.0'} mm
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 font-medium mb-1">
                Registros {selectedCampaign !== 'all' ? 'filtrados' : 'totales'}
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {registrosFiltrados?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-600 font-medium mb-1">Días sin lluvia</p>
              <p className="text-2xl font-bold text-amber-700">
                {/* Este valor vendría del hook useRainfallData */}
                {registros && registros.length > 0 ? '-' : '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
