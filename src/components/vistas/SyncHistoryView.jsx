import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_LABELS = {
  running: 'En Progreso',
  success: 'Éxito',
  partial_success: 'Éxito Parcial',
  failed: 'Fallido'
};

const STATUS_COLORS = {
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  partial_success: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800'
};

const STATUS_ICONS = {
  running: <Loader2 className="w-4 h-4 animate-spin text-blue-600" />,
  success: <Check className="w-4 h-4 text-green-600" />,
  partial_success: <AlertCircle className="w-4 h-4 text-yellow-600" />,
  failed: <AlertCircle className="w-4 h-4 text-red-600" />
};

export default function SyncHistoryView({
  integraciones = [],
  obtenerHistorial
}) {
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (integraciones.length > 0 && !selectedIntegration) {
      setSelectedIntegration(integraciones[0].id);
    }
  }, [integraciones, selectedIntegration]);

  useEffect(() => {
    if (!selectedIntegration) return;

    const cargarHistorial = async () => {
      setLoading(true);
      try {
        const datos = await obtenerHistorial(selectedIntegration, 100);
        setHistorial(datos);
      } catch (err) {
        console.error('Error cargando historial:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarHistorial();
  }, [selectedIntegration, obtenerHistorial]);

  const integracionSeleccionada = integraciones.find(
    (i) => i.id === selectedIntegration
  );

  const calcularDuracion = (inicio, fin) => {
    if (!inicio || !fin) return '-';
    const start = new Date(inicio);
    const end = new Date(fin);
    const minutos = Math.round((end - start) / 60000);
    return `${minutos}m`;
  };

  const calcularTasa = (synced, errors) => {
    if (synced === 0) return '-';
    const tasa = ((synced - errors) / synced * 100).toFixed(0);
    return `${tasa}%`;
  };

  return (
    <div className="space-y-4">
      {/* Selector de integración */}
      <Card className="p-4">
        <label className="text-sm font-medium">Integración</label>
        <Select
          value={selectedIntegration || ''}
          onValueChange={setSelectedIntegration}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {integraciones.map((int) => (
              <SelectItem key={int.id} value={int.id}>
                {int.provider_name.toUpperCase()} - {int.api_endpoint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Estadísticas de la integración seleccionada */}
      {integracionSeleccionada && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Última Sincronización</p>
            <p className="text-lg font-semibold">
              {integracionSeleccionada.last_sync_timestamp
                ? format(
                    new Date(integracionSeleccionada.last_sync_timestamp),
                    'PPP p',
                    { locale: es }
                  )
                : 'Nunca'}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Estado</p>
            <Badge className="mt-2">
              {integracionSeleccionada.status.toUpperCase()}
            </Badge>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Frecuencia</p>
            <p className="text-lg font-semibold">
              {integracionSeleccionada.sync_frequency_minutes}m
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Próxima Sincronización</p>
            <p className="text-lg font-semibold">
              {integracionSeleccionada.next_sync_timestamp
                ? format(
                    new Date(integracionSeleccionada.next_sync_timestamp),
                    'p',
                    { locale: es }
                  )
                : '-'}
            </p>
          </Card>
        </div>
      )}

      {/* Tabla de historial */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando historial...</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="p-12 text-center border-dashed border">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Sin sincronizaciones registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Éxito</TableHead>
                <TableHead className="text-right">Duración</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map((sync) => (
                <React.Fragment key={sync.id}>
                  <TableRow className="hover:bg-muted/50">
                    {/* Fecha */}
                    <TableCell className="font-medium">
                      {format(
                        new Date(sync.started_at),
                        'PPP p',
                        { locale: es }
                      )}
                    </TableCell>

                    {/* Tipo */}
                    <TableCell>
                      <Badge variant="outline">
                        {sync.sync_type === 'full' ? 'Completa' : 'Incremental'}
                      </Badge>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[sync.status]}
                        <span className={`text-sm`}>
                          {STATUS_LABELS[sync.status]}
                        </span>
                      </div>
                    </TableCell>

                    {/* Registros */}
                    <TableCell className="text-right font-medium">
                      {sync.records_synced || 0}
                    </TableCell>

                    {/* Tasa de éxito */}
                    <TableCell className="text-right">
                      <span className={sync.errors === 0 ? 'text-green-600' : 'text-yellow-600'}>
                        {calcularTasa(sync.records_synced, sync.errors)}
                      </span>
                    </TableCell>

                    {/* Duración */}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {calcularDuracion(sync.started_at, sync.completed_at)}
                    </TableCell>

                    {/* Expandir */}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(expandedId === sync.id ? null : sync.id)
                        }
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedId === sync.id ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Detalles expandidos */}
                  {expandedId === sync.id && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan="7">
                        <div className="space-y-3 py-4">
                          {/* Estadísticas */}
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Nuevos</p>
                              <p className="text-sm font-semibold text-green-600">
                                +{sync.records_created || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Actualizados</p>
                              <p className="text-sm font-semibold text-blue-600">
                                ↻{sync.records_updated || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Errores</p>
                              <p className={`text-sm font-semibold ${
                                sync.errors === 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {sync.errors || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Duración</p>
                              <p className="text-sm font-semibold">
                                {calcularDuracion(sync.started_at, sync.completed_at)}
                              </p>
                            </div>
                          </div>

                          {/* Errores si existen */}
                          {sync.error_details && Array.isArray(sync.error_details) && sync.error_details.length > 0 && (
                            <div className="border-t pt-3">
                              <p className="text-sm font-semibold text-red-600 mb-2">
                                Errores ({sync.error_details.length}):
                              </p>
                              <ul className="space-y-1">
                                {sync.error_details.slice(0, 5).map((err, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-muted-foreground bg-red-50 p-2 rounded"
                                  >
                                    {err.nombre || err.empleado_id}: {err.errores || err.error}
                                  </li>
                                ))}
                              </ul>
                              {sync.error_details.length > 5 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  ... y {sync.error_details.length - 5} más
                                </p>
                              )}
                            </div>
                          )}

                          {/* Log si existe */}
                          {sync.sync_log && (
                            <div className="border-t pt-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Log:
                              </p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                {sync.sync_log}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
