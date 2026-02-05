/**
 * MonitoringMapOverlay.jsx
 *
 * Visualización geoespacial del estado de monitoreo de lotes
 * Muestra mapa con colores según alertas (pastura crítica, déficit de suelo, etc.)
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, Tooltip } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader, AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import 'leaflet/dist/leaflet.css';

export default function MonitoringMapOverlay({ premiseId }) {
  const [lotes, setLotes] = useState([]);
  const [estadosMonitoreo, setEstadosMonitoreo] = useState({});
  const [loading, setLoading] = useState(true);
  const [centerCoords, setCenterCoords] = useState([-34.0, -64.0]); // Centro de Argentina por defecto
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (premiseId) {
      cargarDatosMonitoreo();
    }
  }, [premiseId]);

  const cargarDatosMonitoreo = async () => {
    try {
      setLoading(true);

      // 1. Cargar lotes con sus polígonos
      const { data: lotesData, error: lotesError } = await supabase
        .from('lots')
        .select('id, name, polygon, area_hectares')
        .eq('premise_id', premiseId)
        .not('polygon', 'is', null);

      if (lotesError) throw lotesError;

      // 2. Para cada lote, obtener última medición de pastura
      const estadosTemp = {};

      for (const lote of lotesData || []) {
        // Última medición de pastura
        const { data: pasturaData, error: pasturaError } = await supabase
          .from('monitoreo_pasturas')
          .select('altura_promedio_cm, remanente_objetivo_cm, fecha, created_at')
          .eq('lot_id', lote.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const pastura = pasturaData && pasturaData.length > 0 ? pasturaData[0] : null;

        // Último análisis de suelo con déficits
        const { data: suelo, error: sueloError } = await supabase
          .from('analisis_suelo')
          .select('parametro, deficit, ya_aplicado, fecha')
          .eq('lot_id', lote.id)
          .eq('ya_aplicado', false)
          .gt('deficit', 0)
          .order('fecha', { ascending: false });

        // Determinar estado del lote
        let estado = 'NORMAL';
        let color = '#22c55e'; // verde
        let prioridad = 'baja';
        let alertas = [];

        // Verificar pastura
        if (pastura) {
          const diferencia = pastura.altura_promedio_cm - pastura.remanente_objetivo_cm;

          if (diferencia < 0) {
            // Altura menor al remanente = CRÍTICO
            estado = 'CRITICO';
            color = '#ef4444'; // rojo
            prioridad = 'alta';
            alertas.push({
              tipo: 'pastura_critica',
              mensaje: `Altura ${pastura.altura_promedio_cm}cm < Remanente ${pastura.remanente_objetivo_cm}cm`,
              icono: AlertTriangle
            });
          } else if (diferencia < 2) {
            // Altura cerca del remanente = ATENCIÓN
            estado = 'ATENCION';
            color = '#f59e0b'; // amarillo/naranja
            prioridad = 'media';
            alertas.push({
              tipo: 'pastura_atencion',
              mensaje: `Pastura en precaución: ${pastura.altura_promedio_cm}cm`,
              icono: AlertCircle
            });
          }
        }

        // Verificar déficit de suelo
        if (suelo && suelo.length > 0) {
          if (estado === 'NORMAL') {
            estado = 'ATENCION';
            color = '#f59e0b';
            prioridad = 'media';
          }
          alertas.push({
            tipo: 'deficit_suelo',
            mensaje: `${suelo.length} nutriente(s) en déficit`,
            icono: AlertCircle
          });
        }

        estadosTemp[lote.id] = {
          estado,
          color,
          prioridad,
          alertas,
          pastura,
          deficitsSuelo: suelo || []
        };
      }

      setEstadosMonitoreo(estadosTemp);
      setLotes(lotesData || []);

      // Calcular centro del mapa (centroide de todos los lotes)
      if (lotesData && lotesData.length > 0) {
        const primeraGeom = lotesData[0].polygon;
        if (primeraGeom) {
          const geojson = typeof primeraGeom === 'string' ? JSON.parse(primeraGeom) : primeraGeom;
          if (geojson.coordinates && geojson.coordinates[0]) {
            const coords = geojson.coordinates[0];
            const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
            const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            setCenterCoords([avgLat, avgLng]);
          }
        }
      }

    } catch (error) {
      console.error('Error cargando datos de monitoreo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Estilo de cada lote según su estado
  const styleFeature = (loteId) => {
    const estado = estadosMonitoreo[loteId];
    if (!estado) {
      return {
        fillColor: '#94a3b8', // gris por defecto
        fillOpacity: 0.4,
        color: '#64748b',
        weight: 2
      };
    }

    return {
      fillColor: estado.color,
      fillOpacity: 0.5,
      color: estado.color,
      weight: 3
    };
  };

  // Contenido del popup de cada lote
  const getLotePopupContent = (lote) => {
    const estado = estadosMonitoreo[lote.id];
    if (!estado) return null;

    return (
      <div className="p-2 min-w-[250px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base">{lote.name}</h3>
          <Badge variant={
            estado.prioridad === 'alta' ? 'destructive' :
            estado.prioridad === 'media' ? 'default' : 'secondary'
          }>
            {estado.estado}
          </Badge>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          {lote.area_hectares} hectáreas
        </p>

        {/* Alertas */}
        {estado.alertas.length > 0 && (
          <div className="space-y-2">
            {estado.alertas.map((alerta, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <alerta.icono className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{alerta.mensaje}</span>
              </div>
            ))}
          </div>
        )}

        {/* Datos de pastura */}
        {estado.pastura && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Última medición de pastura:</p>
            <p className="text-sm">
              <strong>{estado.pastura.altura_promedio_cm} cm</strong>
              {' '}(Objetivo: {estado.pastura.remanente_objetivo_cm} cm)
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(estado.pastura.fecha).toLocaleDateString('es-AR')}
            </p>
          </div>
        )}

        {/* Déficits de suelo */}
        {estado.deficitsSuelo.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Nutrientes en déficit:</p>
            <div className="flex flex-wrap gap-1">
              {estado.deficitsSuelo.map((def, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {def.parametro}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar cada lote como GeoJSON
  const renderLote = (lote) => {
    if (!lote.polygon) return null;

    try {
      const geojson = typeof lote.polygon === 'string' ? JSON.parse(lote.polygon) : lote.polygon;

      return (
        <GeoJSON
          key={lote.id}
          data={geojson}
          style={styleFeature(lote.id)}
        >
          <Popup>
            {getLotePopupContent(lote)}
          </Popup>
          <Tooltip direction="center" permanent={false}>
            {lote.name}
          </Tooltip>
        </GeoJSON>
      );
    } catch (error) {
      console.error('Error renderizando lote:', lote.id, error);
      return null;
    }
  };

  // Resumen de estados
  const resumenEstados = {
    criticos: Object.values(estadosMonitoreo).filter(e => e.estado === 'CRITICO').length,
    atencion: Object.values(estadosMonitoreo).filter(e => e.estado === 'ATENCION').length,
    normales: Object.values(estadosMonitoreo).filter(e => e.estado === 'NORMAL').length,
    total: lotes.length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Cargando mapa de monitoreo...</p>
        </CardContent>
      </Card>
    );
  }

  if (lotes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">No hay lotes con polígonos definidos en este predio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen de estados */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Lotes Críticos</p>
                <p className="text-2xl font-bold text-red-600">{resumenEstados.criticos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Requieren Atención</p>
                <p className="text-2xl font-bold text-amber-600">{resumenEstados.atencion}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Estado Normal</p>
                <p className="text-2xl font-bold text-green-600">{resumenEstados.normales}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Total de Lotes</p>
                <p className="text-2xl font-bold">{resumenEstados.total}</p>
              </div>
              <Button variant="outline" size="sm" onClick={cargarDatosMonitoreo}>
                <RefreshCw size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Estado de Monitoreo</CardTitle>
          <CardDescription>
            Visualización geoespacial del estado de los lotes. Haz clic en cada lote para ver detalles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200">
            <MapContainer
              center={centerCoords}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {lotes.map(lote => renderLote(lote))}
            </MapContainer>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Crítico (Pastura {'<'} Remanente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Atención (Precaución o Déficit)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>Normal (Estado óptimo)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
