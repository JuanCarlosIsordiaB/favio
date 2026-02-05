import React, { useState } from 'react';
import { BarChart3, AlertCircle, CheckCircle2, XCircle, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Progress } from './ui/progress';

export function ActualizarNDVIButton({ premiseId, predioNombre, onComplete }) {
  const [mostrarProgreso, setMostrarProgreso] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleActualizar = async () => {
    if (!premiseId) {
      alert('Debe seleccionar un predio primero');
      return;
    }

    setMostrarProgreso(true);
    setActualizando(true);
    setResultado(null);

    try {
      console.log('[ActualizarNDVIButton] Invocando Edge Function para predio:', premiseId);

      // Invocación a Supabase Edge Function (Serverless)
      const { data, error } = await supabase.functions.invoke('fetch-ndvi-stats', {
        body: { premiseId: premiseId } // Opcional: filtrar por predio si la función lo soporta
      });

      if (error) throw error;

      console.log('[ActualizarNDVIButton] Respuesta Edge Function:', data);

      // Procesar respuesta de la función
      // La función devuelve: { success: true, processed: N, details: [...] }
      const exitosos = data.details.filter(d => d.status !== 'ERROR').length;
      const fallidos = data.details.filter(d => d.status === 'ERROR').length;

      const resumen = {
        total: data.processed,
        exitosos: exitosos,
        fallidos: fallidos,
        resultados: data.details.map(d => ({
          loteNombre: d.lot,
          success: d.status !== 'ERROR',
          stats: { mean: d.ndvi, cloudCoverage: 0 }, // La función simplificada devuelve ndvi directo
          error: d.error
        }))
      };

      setResultado(resumen);

      if (onComplete) {
        onComplete(resumen);
      }

    } catch (error) {
      console.error('[ActualizarNDVIButton] Error:', error);
      setResultado({
        total: 0,
        exitosos: 0,
        fallidos: 0,
        resultados: [],
        error: error.message || 'Error al conectar con el servidor de análisis satelital.',
      });
    } finally {
      setActualizando(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleActualizar}
        disabled={actualizando}
        variant="outline"
        className="border-cyan-500 text-cyan-600 hover:bg-cyan-50"
      >
        <Rocket className={`w-4 h-4 mr-2 ${actualizando ? 'animate-pulse' : ''}`} />
        {actualizando ? 'Analizando Satélite...' : 'Actualizar NDVI (IA)'}
      </Button>

      <Dialog open={mostrarProgreso} onOpenChange={setMostrarProgreso}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actualizando ? 'Procesando Imágenes Satelitales' : 'Análisis Completado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Estado de Carga (Indeterminado porque es Serverless) */}
            {actualizando && (
              <div className="space-y-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="text-gray-600">
                  Contactando con Sentinel Hub y procesando estadísticas históricas...
                  <br/>
                  <span className="text-xs text-gray-400">Esto puede tomar unos segundos.</span>
                </p>
              </div>
            )}

            {/* Resultados */}
            {resultado && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600 font-semibold">Procesados</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{resultado.exitosos}</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-600 font-semibold">Total Lotes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{resultado.total}</p>
                  </div>
                </div>

                {/* Lista de detalles */}
                {resultado.resultados && resultado.resultados.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <div className="space-y-2 p-4">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">
                        Reporte por Lote:
                      </h4>
                      {resultado.resultados.map((r, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border flex items-start gap-3 ${
                            r.success
                              ? 'bg-white border-slate-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          {r.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                {r.loteNombre}
                                </p>
                                {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                            </div>
                            {r.success && (
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                        NDVI: {r.stats?.mean?.toFixed(2)}
                                    </span>
                                </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje de error general */}
                {resultado.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-red-900">Error de Conexión</h4>
                      <p className="text-sm text-red-700 mt-1">{resultado.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMostrarProgreso(false)}
              disabled={actualizando}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
