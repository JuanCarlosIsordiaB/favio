import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { LotesList } from './lotes/LotesList';
import { MapaLotes } from './mapas/MapaLotes';
import { SplitMapView } from './mapas/SplitMapView';
import { LoteFormModal } from './lotes/LoteFormModal';
import { LoteDetailModal } from './lotes/LoteDetailModal';
import { ActualizarNDVIButton } from './ActualizarNDVIButton';
import { useLotes } from '@/hooks/useLotes';
import { usePredioCoverage } from '@/hooks/usePredioCoverage';
import { crearRegistro } from '@/services/registros';
import { cargarAlertasPorPredio } from '@/services/alertas';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente principal para gestión de lotes y visualización en mapa
 * Integra la lista de lotes con el mapa geoespacial
 */
export function LotesYMapas({ contexto = {} }) {
  const { user } = useAuth();
  const { lotes, loading, error, loadLotes, addLote } = useLotes();
  const [selectedLote, setSelectedLote] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLote, setDetailLote] = useState(null);
  const [splitViewActive, setSplitViewActive] = useState(false);
  const [alertasPorLote, setAlertasPorLote] = useState({});
  const [cargandoAlertas, setCargandoAlertas] = useState(false);

  // Validar contexto: firma y predio seleccionados
  const predioSeleccionado = contexto?.predioSeleccionado;
  const firmaSeleccionada = contexto?.firmaSeleccionada;

  // Calcular ocupación del predio
  const coverage = usePredioCoverage(lotes, parseFloat(predioSeleccionado?.superficie_total) || 0);

  // Cargar lotes y alertas cuando cambia el predio seleccionado
  useEffect(() => {
    if (predioSeleccionado?.id) {
      loadLotes(predioSeleccionado.id);
      cargarAlertas(predioSeleccionado.id);
    }
  }, [predioSeleccionado?.id, loadLotes]);

  // Función para cargar alertas por predio
  const cargarAlertas = async (premiseId) => {
    if (!premiseId) return;

    setCargandoAlertas(true);
    try {
      const alertas = await cargarAlertasPorPredio(premiseId);
      setAlertasPorLote(alertas);
      console.log('[LotesYMapas] Alertas cargadas:', alertas);
    } catch (err) {
      console.error('[LotesYMapas] Error cargando alertas:', err);
      setAlertasPorLote({});
    } finally {
      setCargandoAlertas(false);
    }
  };

  // Manejar creación de lote
  const handleCreateLote = async (loteData) => {
    setFormError(null);
    setFormLoading(true);

    try {
      const nuevoLote = await addLote({
        ...loteData,
        firma_id: firmaSeleccionada.id,
        predio_id: predioSeleccionado.id,
        activo: true,
      });

      // FASE 2: Integración con auditoría
      try {
        await crearRegistro({
          firmId: firmaSeleccionada.id,
          premiseId: predioSeleccionado.id,
          lotId: nuevoLote.id,
          tipo: 'lote_creado',
          descripcion: `Lote "${loteData.nombre}" creado con ${loteData.superficie_total.toFixed(2)} ha`,
          moduloOrigen: 'lotes_y_mapas',
          usuario: user?.full_name || 'sistema',
          fecha: new Date(),
          referencia: nuevoLote.id,
          metadata: {
            accion: 'crear_lote',
            lote_nombre: loteData.nombre,
            uso_suelo: loteData.uso_suelo,
            superficie_total: loteData.superficie_total,
            cantidad_puntos: loteData.poligono.coordinates[0].length - 1,
            coordenadas_centro: {
              lat: loteData.centro_lat,
              lng: loteData.centro_lng,
            },
            hectareas_agricolas: loteData.hectareas_agricolas,
            cultivo_actual: loteData.cultivo_actual,
            categoria_ganadera: loteData.categoria_ganadera,
            cantidad_animales: loteData.cantidad_animales,
          },
        });
      } catch (auditError) {
        console.warn('Error al crear registro de auditoría:', auditError);
        // No bloqueamos la creación si falla la auditoría
      }

      setShowFormModal(false);
      setSelectedLote(nuevoLote);
      // Recargar alertas después de crear lote
      cargarAlertas(predioSeleccionado.id);
    } catch (err) {
      setFormError(err.message || 'Error al crear lote');
      console.error('Error creating lote:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Manejar vista de detalle
  const handleViewDetail = (lote) => {
    setDetailLote(lote);
    setShowDetailModal(true);
  };

  // Mostrar validación si falta contexto
  if (!firmaSeleccionada || !predioSeleccionado) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lotes y Mapas</h1>
          <p className="text-muted-foreground">
            Gestión geoespacial de lotes productivos
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {!firmaSeleccionada
              ? 'Debes seleccionar una firma para continuar'
              : 'Debes seleccionar un predio para visualizar sus lotes'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lotes y Mapas</h1>
        <p className="text-muted-foreground">
          {firmaSeleccionada?.nombre} → {predioSeleccionado?.nombre}
        </p>
      </div>

      {/* Panel de Ocupación del Predio */}
      <Card className={coverage.excedido ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Ocupación del Predio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ocupado</p>
              <p className="text-2xl font-bold">
                {coverage.ocupado.toFixed(2)}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disponible</p>
              <p className={`text-2xl font-bold ${coverage.disponible <= 0 ? 'text-destructive' : ''}`}>
                {coverage.disponible.toFixed(2)}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                {predioSeleccionado?.superficie_total}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Ocupación</p>
              <Badge
                variant={coverage.excedido ? 'destructive' : coverage.porcentaje > 80 ? 'secondary' : 'default'}
              >
                {coverage.porcentaje.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={coverage.porcentaje} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Mostrar errores si existen */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-2">
        <ActualizarNDVIButton
          premiseId={predioSeleccionado?.id}
          predioNombre={predioSeleccionado?.nombre}
          onComplete={() => {
            // Recargar lotes con nuevos valores NDVI
            loadLotes(predioSeleccionado.id);
          }}
        />

        <Button
          variant={splitViewActive ? 'default' : 'outline'}
          onClick={() => setSplitViewActive(!splitViewActive)}
          size="sm"
        >
          {splitViewActive ? 'Vista Normal' : 'Vista Dividida'}
        </Button>
      </div>

      {/* Vista Dividida */}
      {splitViewActive ? (
        <SplitMapView
          lotes={lotes}
          bounds={
            lotes.length > 0
              ? (() => {
                  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                  lotes.forEach((lote) => {
                    if (lote.poligono?.coordinates) {
                      lote.poligono.coordinates[0].forEach(([lng, lat]) => {
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                        minLng = Math.min(minLng, lng);
                        maxLng = Math.max(maxLng, lng);
                      });
                    }
                  });
                  const latPad = (maxLat - minLat) * 0.1;
                  const lngPad = (maxLng - minLng) * 0.1;
                  return [
                    [minLat - latPad, minLng - lngPad],
                    [maxLat + latPad, maxLng + lngPad],
                  ];
                })()
              : [[-34.9211, -56.1845], [-34.8811, -56.1445]]
          }
          predioUbicacion={predioSeleccionado?.ubicacion}
          onClose={() => setSplitViewActive(false)}
        />
      ) : (
        <>
          {/* Layout: Lista (40%) | Mapa (60%) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[500px]">
            {/* Columna izquierda: Lista de lotes */}
            <div className="lg:col-span-2 overflow-y-auto">
              <LotesList
                lotes={lotes}
                loading={loading}
                onNuevoLote={() => setShowFormModal(true)}
                onSelectLote={setSelectedLote}
                onViewDetail={handleViewDetail}
              />
            </div>

            {/* Columna derecha: Mapa */}
            <div className="lg:col-span-3">
              <MapaLotes
                lotes={lotes}
                selectedLote={selectedLote}
                predioUbicacion={predioSeleccionado?.ubicacion}
                alertasPorLote={alertasPorLote}
                onSelectLote={setSelectedLote}
              />
            </div>
          </div>
        </>
      )}

      {/* Información del lote seleccionado */}
      {selectedLote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedLote.nombre}</CardTitle>
            <CardDescription>
              Información del lote seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Superficie</p>
                <p className="text-lg font-semibold">
                  {selectedLote.superficie_total} ha
                </p>
              </div>

              {selectedLote.uso_suelo && (
                <div>
                  <p className="text-sm text-muted-foreground">Uso de suelo</p>
                  <p className="text-lg font-semibold capitalize">
                    {selectedLote.uso_suelo}
                  </p>
                </div>
              )}

              {selectedLote.hectareas_agricolas > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Hectáreas agrícolas
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedLote.hectareas_agricolas} ha
                  </p>
                </div>
              )}

              {selectedLote.cultivo_actual && (
                <div>
                  <p className="text-sm text-muted-foreground">Cultivo actual</p>
                  <p className="text-lg font-semibold">
                    {selectedLote.cultivo_actual}
                  </p>
                </div>
              )}

              {selectedLote.categoria_ganadera && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Categoría ganadera
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedLote.categoria_ganadera}
                  </p>
                </div>
              )}

              {selectedLote.cantidad_animales > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cantidad de animales
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedLote.cantidad_animales}
                  </p>
                </div>
              )}

              {selectedLote.altura_pastura_cm && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Altura de pastura
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedLote.altura_pastura_cm} cm
                  </p>
                </div>
              )}

              {selectedLote.remanente_objetivo_cm && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Remanente objetivo
                  </p>
                  <p className="text-lg font-semibold">
                    {selectedLote.remanente_objetivo_cm} cm
                  </p>
                </div>
              )}
            </div>

            {selectedLote.notas && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{selectedLote.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de crear lote */}
      <LoteFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSubmit={handleCreateLote}
        loading={formLoading}
        error={formError}
        predioUbicacion={predioSeleccionado?.ubicacion}
        predioSeleccionado={predioSeleccionado}
        lotesExistentes={lotes}
      />

      {/* Modal de detalle de lote */}
      <LoteDetailModal
        lote={detailLote}
        predio={predioSeleccionado}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onEdit={(lote) => {
          // TODO: Implementar edición en FASE 4
          console.log('Editar lote:', lote);
        }}
        onDelete={(lote) => {
          // TODO: Implementar eliminación en FASE 4
          console.log('Eliminar lote:', lote);
        }}
      />
    </div>
  );
}
