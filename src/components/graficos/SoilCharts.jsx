/**
 * SoilCharts.jsx
 *
 * Contenedor principal de gráficos de análisis de suelo
 * Integra SoilNutrientChart y SoilHistoryChart con tabs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader, RefreshCw, AlertCircle, FlaskConical, TrendingUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import SoilNutrientChart from './SoilNutrientChart';
import SoilHistoryChart from './SoilHistoryChart';
import { useSoilAnalysis } from '../../hooks/useSoilAnalysis';
import { supabase } from '../../lib/supabase';

export default function SoilCharts({ premiseId, initialLotId = null }) {
  const [selectedLotId, setSelectedLotId] = useState(initialLotId);
  const [lotes, setLotes] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [activeTab, setActiveTab] = useState('nutrient');

  const {
    analisis,
    deficits,
    evolucionHistorica,
    loading,
    error,
    refetch
  } = useSoilAnalysis(selectedLotId);

  // Cargar lotes del predio
  useEffect(() => {
    const fetchLotes = async () => {
      if (!premiseId) {
        setLoadingLotes(false);
        return;
      }

      setLoadingLotes(true);
      try {
        const { data, error } = await supabase
          .from('lots')
          .select('id, name, area_hectares')
          .eq('premise_id', premiseId)
          .order('name');

        if (error) throw error;
        setLotes(data || []);

        // Auto-seleccionar primer lote si no hay uno seleccionado
        if (!selectedLotId && data && data.length > 0) {
          setSelectedLotId(data[0].id);
        }
      } catch (err) {
        console.error('Error cargando lotes:', err);
      } finally {
        setLoadingLotes(false);
      }
    };

    fetchLotes();
  }, [premiseId, selectedLotId]);

  // Si no hay predio seleccionado
  if (!premiseId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Suelo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FlaskConical className="w-12 h-12 mb-3 opacity-50" />
            <p>Selecciona un predio para ver los análisis de suelo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading lotes
  if (loadingLotes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Suelo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-muted-foreground">Cargando lotes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sin lotes en el predio
  if (lotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Suelo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FlaskConical className="w-12 h-12 mb-3 opacity-50" />
            <p className="mb-2">No hay lotes registrados en este predio</p>
            <p className="text-sm">Crea lotes para comenzar a registrar análisis de suelo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loteSeleccionado = lotes.find(l => l.id === selectedLotId);

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-amber-600" />
                Análisis de Suelo {loteSeleccionado && `- ${loteSeleccionado.name}`}
              </CardTitle>
              <CardDescription>
                Seguimiento de nutrientes y evolución histórica por lote
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedLotId || ''} onValueChange={setSelectedLotId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map(lote => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.name} ({lote.area} ha)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Resumen de déficits */}
          {deficits.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <p className="font-semibold text-orange-900">
                  {deficits.length} déficit{deficits.length > 1 ? 's' : ''} detectado{deficits.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {deficits.map((deficit, idx) => (
                  <Badge
                    key={idx}
                    variant={deficit.severidad === 'critica' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {deficit.parametro === 'P' && 'Fósforo'}
                    {deficit.parametro === 'K' && 'Potasio'}
                    {deficit.parametro === 'N' && 'Nitrógeno'}
                    {deficit.parametro === 'S' && 'Azufre'}
                    {deficit.parametro === 'MO' && 'Materia Orgánica'}
                    {deficit.parametro === 'pH' && 'pH'}
                    {' - '}
                    {deficit.severidad === 'critica' ? 'Crítico' : 'Moderado'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Sin lote seleccionado */}
      {!selectedLotId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FlaskConical className="w-12 h-12 mb-3 opacity-50" />
              <p>Selecciona un lote para ver los análisis de suelo</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {selectedLotId && error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
              <p className="text-red-600 font-semibold mb-2">Error cargando análisis</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={refetch} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {selectedLotId && loading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-muted-foreground">Cargando análisis de suelo...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin datos */}
      {selectedLotId && !loading && !error && analisis.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FlaskConical className="w-12 h-12 mb-3 opacity-50" />
              <p className="mb-2">No hay análisis de suelo para este lote</p>
              <p className="text-sm">Registra el primer análisis para comenzar el seguimiento</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs con gráficos */}
      {selectedLotId && !loading && !error && analisis.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nutrient" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Por Nutriente
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nutrient" className="mt-6">
            <SoilNutrientChart analisis={analisis[0]} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <SoilHistoryChart evolucionHistorica={evolucionHistorica} />
          </TabsContent>
        </Tabs>
      )}

      {/* Información adicional */}
      {selectedLotId && !loading && !error && analisis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información del Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Nombre</p>
                <p className="font-bold text-lg">{loteSeleccionado?.name}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Área</p>
                <p className="font-bold text-lg">{loteSeleccionado?.area} ha</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Análisis totales</p>
                <p className="font-bold text-lg">{analisis.length}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Último análisis</p>
                <p className="font-bold text-lg">
                  {analisis[0]?.fecha ? new Date(analisis[0].fecha).toLocaleDateString('es-AR') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
