/**
 * PastureCharts.jsx
 *
 * Contenedor principal de gráficos y análisis de pasturas
 * Integra indicador de estado, gráfico de evolución y métricas clave
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader, RefreshCw, AlertCircle, Sprout, TrendingUp, Calendar, Activity } from 'lucide-react';
import PastureStatusIndicator from './PastureStatusIndicator';
import PastureEvolutionChart from './PastureEvolutionChart';
import { useLivestockAnalytics } from '../../hooks/useLivestockAnalytics';
import { Badge } from '../ui/badge';

/**
 * Componente de tarjeta de métrica
 */
function MetricCard({ label, value, unit, trend, alert, icon: Icon, description }) {
  return (
    <Card className={alert ? 'border-orange-500 border-2' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="w-4 h-4 text-gray-500" />}
              <p className="text-xs text-gray-600 font-medium">{label}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                {value !== null && value !== undefined ? value : '-'}
              </p>
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
        {alert && (
          <div className="mt-2 pt-2 border-t border-orange-200">
            <Badge variant="destructive" className="text-xs">
              Requiere atención
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PastureCharts({ loteId, loteName }) {
  const [diasHistorial, setDiasHistorial] = useState(60);

  const {
    ultimaMedicion,
    alturaPromedio,
    alturaPromedioHistorica,
    velocidadCrecimiento,
    diasHastaRemanente,
    tendencia,
    cargaRecomendada,
    historial,
    loading,
    error,
    refetch
  } = useLivestockAnalytics(loteId);

  // Si no hay loteId seleccionado
  if (!loteId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Pastura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Sprout className="w-12 h-12 mb-3 opacity-50" />
            <p>Selecciona un lote para ver el análisis de pastura</p>
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
          <CardTitle>Análisis de Pastura {loteName && `- ${loteName}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-muted-foreground">Cargando análisis de pastura...</p>
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
          <CardTitle>Análisis de Pastura {loteName && `- ${loteName}`}</CardTitle>
        </CardHeader>
        <CardContent>
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
    );
  }

  // Sin datos
  if (!ultimaMedicion && (!historial || historial.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Pastura {loteName && `- ${loteName}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Sprout className="w-12 h-12 mb-3 opacity-50" />
            <p className="mb-2">No hay mediciones de pastura para este lote</p>
            <p className="text-sm">Realiza la primera medición para comenzar el seguimiento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const remanente = ultimaMedicion?.remanente_objetivo_cm;

  return (
    <div className="space-y-6">
      {/* Header con info del lote y controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="w-6 h-6 text-green-600" />
                Análisis de Pastura {loteName && `- ${loteName}`}
              </CardTitle>
              <CardDescription>
                Seguimiento de altura de pastura y recomendaciones de manejo
              </CardDescription>
            </div>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Indicador de estado tipo semáforo */}
      <PastureStatusIndicator
        alturaActual={alturaPromedio}
        remanente={remanente}
        tendencia={tendencia}
        diasHastaRemanente={diasHastaRemanente}
      />

      {/* Métricas clave en tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Velocidad de Crecimiento"
          value={velocidadCrecimiento?.velocidad?.toFixed(2)}
          unit="cm/día"
          icon={Activity}
          trend={
            velocidadCrecimiento?.velocidad > 0 ? 'up' :
            velocidadCrecimiento?.velocidad < 0 ? 'down' :
            'neutral'
          }
          description={
            velocidadCrecimiento?.velocidad > 0 ? 'Pastura en recuperación' :
            velocidadCrecimiento?.velocidad < 0 ? 'Pastura en degradación' :
            'Pastura estable'
          }
        />

        <MetricCard
          label="Días hasta Remanente"
          value={
            diasHastaRemanente?.diasHastaRemanente === 0 ? 'HOY' :
            diasHastaRemanente?.diasHastaRemanente < 0 ? '∞' :
            diasHastaRemanente?.diasHastaRemanente
          }
          unit={diasHastaRemanente?.diasHastaRemanente > 0 ? 'días' : ''}
          icon={Calendar}
          alert={diasHastaRemanente?.diasHastaRemanente >= 0 && diasHastaRemanente?.diasHastaRemanente <= 7}
          description={
            diasHastaRemanente?.estado === 'CRITICO' ? 'Ya en remanente crítico' :
            diasHastaRemanente?.estado === 'URGENTE' ? 'Acción urgente requerida' :
            diasHastaRemanente?.estado === 'ATENCION' ? 'Monitorear de cerca' :
            diasHastaRemanente?.estado === 'PRECAUCION' ? 'Planificar movimiento' :
            'Estado normal'
          }
        />

        <MetricCard
          label="Carga Recomendada"
          value={cargaRecomendada?.cargaRecomendada?.toFixed(2)}
          unit="cab/ha"
          icon={Sprout}
          description={
            cargaRecomendada?.forrajeDisponibleKgMS
              ? `${cargaRecomendada.forrajeDisponibleKgMS.toFixed(0)} kg MS disponible`
              : 'Forraje disponible'
          }
        />
      </div>

      {/* Gráfico de evolución */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Evolución de Altura</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Mostrar últimos:</label>
            <Select value={diasHistorial.toString()} onValueChange={(v) => setDiasHistorial(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="60">60 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <PastureEvolutionChart
          data={historial}
          remanente={remanente}
          dias={diasHistorial}
        />
      </div>

      {/* Información adicional */}
      {alturaPromedioHistorica && alturaPromedioHistorica.promedio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos Históricos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Altura promedio (12 meses)</p>
                <p className="font-bold text-lg">{alturaPromedioHistorica.promedio.toFixed(1)} cm</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Mediciones totales</p>
                <p className="font-bold text-lg">{historial?.length || 0}</p>
              </div>
              {tendencia && (
                <>
                  <div>
                    <p className="text-gray-600 mb-1">Tendencia (30 días)</p>
                    <p className={`font-bold text-lg ${
                      tendencia.tendencia === 'RECUPERACION' ? 'text-green-600' :
                      tendencia.tendencia === 'ESTABLE' ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {tendencia.tendencia}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Velocidad promedio</p>
                    <p className="font-bold text-lg">
                      {tendencia.velocidad > 0 ? '+' : ''}{tendencia.velocidad.toFixed(2)} cm/día
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
