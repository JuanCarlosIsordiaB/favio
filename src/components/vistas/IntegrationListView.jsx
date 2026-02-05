import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '../ui/alert-dialog';
import {
  Edit2,
  Play,
  Pause,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const PROVIDER_LABELS = {
  bamboohr: 'BambooHR',
  workday: 'Workday',
  adp: 'ADP Workforce',
  custom_api: 'API Personalizado'
};

const PROVIDER_COLORS = {
  bamboohr: 'bg-green-100 text-green-800',
  workday: 'bg-blue-100 text-blue-800',
  adp: 'bg-purple-100 text-purple-800',
  custom_api: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  active: 'Activa',
  paused: 'Pausada',
  testing: 'Prueba',
  error: 'Error',
  inactive: 'Inactiva',
  deprecated: 'Deprecada'
};

const STATUS_ICONS = {
  active: <CheckCircle className="w-4 h-4 text-green-500" />,
  paused: <Clock className="w-4 h-4 text-yellow-500" />,
  testing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  inactive: <Clock className="w-4 h-4 text-gray-500" />,
  deprecated: <AlertCircle className="w-4 h-4 text-red-400" />
};

export default function IntegrationListView({
  integraciones = [],
  loading = false,
  syncing = false,
  onEdit,
  onSync,
  onProbarConexion,
  onActivar,
  onDesactivar,
  onRefresh
}) {
  const [syncingId, setSyncingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [showConfirmSync, setShowConfirmSync] = useState(null);

  const handleProbarConexion = async (integracion) => {
    setTestingId(integracion.id);
    try {
      const resultado = await onProbarConexion(integracion.id, integracion.provider_name);
      if (resultado.success) {
        toast.success('✓ Conexión exitosa');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setTestingId(null);
    }
  };

  const handleSincronizar = async (integracion) => {
    setSyncingId(integracion.id);
    try {
      await onSync(integracion.id, integracion.provider_name, 'incremental');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSyncingId(null);
      setShowConfirmSync(null);
    }
  };

  const handleActivar = async (integracion) => {
    try {
      await onActivar(integracion.id);
      toast.success('Integración activada');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDesactivar = async (integracion) => {
    try {
      await onDesactivar(integracion.id);
      toast.success('Integración pausada');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando integraciones...</p>
      </Card>
    );
  }

  if (integraciones.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No hay integraciones configuradas</p>
        <p className="text-sm text-muted-foreground mt-2">
          Crea una nueva para comenzar a sincronizar datos
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última Sincronización</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integraciones.map((integracion) => (
              <TableRow key={integracion.id} className="hover:bg-muted/50">
                {/* Proveedor */}
                <TableCell>
                  <div className="space-y-2">
                    <Badge className={PROVIDER_COLORS[integracion.provider_name]}>
                      {PROVIDER_LABELS[integracion.provider_name]}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {integracion.api_endpoint}
                    </p>
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[integracion.status]}
                    <span className="text-sm">{STATUS_LABELS[integracion.status]}</span>
                  </div>
                  {integracion.error_message && (
                    <p className="text-xs text-red-600 mt-1">
                      {integracion.error_message}
                    </p>
                  )}
                </TableCell>

                {/* Última Sincronización */}
                <TableCell>
                  {integracion.last_sync_timestamp ? (
                    <div className="space-y-1">
                      <p className="text-sm">
                        {format(
                          new Date(integracion.last_sync_timestamp),
                          "PPP p",
                          { locale: es }
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {integracion.next_sync_timestamp && (
                          <>
                            Próxima:{' '}
                            {format(
                              new Date(integracion.next_sync_timestamp),
                              "p",
                              { locale: es }
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nunca</p>
                  )}
                </TableCell>

                {/* Frecuencia */}
                <TableCell>
                  <p className="text-sm">
                    Cada {integracion.sync_frequency_minutes} min
                  </p>
                  {!integracion.sync_enabled && (
                    <Badge variant="outline" className="mt-1">
                      Deshabilitada
                    </Badge>
                  )}
                </TableCell>

                {/* Acciones */}
                <TableCell>
                  <div className="flex gap-2">
                    {/* Probar Conexión */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProbarConexion(integracion)}
                      disabled={testingId === integracion.id}
                      title="Probar conexión"
                    >
                      {testingId === integracion.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Sincronizar */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowConfirmSync(integracion)}
                      disabled={
                        syncingId === integracion.id ||
                        integracion.status !== 'active'
                      }
                      title="Sincronizar ahora"
                    >
                      {syncingId === integracion.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Editar */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(integracion)}
                      title="Editar configuración"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    {/* Activar/Desactivar */}
                    {integracion.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDesactivar(integracion)}
                        title="Pausar"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : integracion.status !== 'error' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivar(integracion)}
                        title="Activar"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogo de confirmación de sincronización */}
      <AlertDialog open={!!showConfirmSync} onOpenChange={(open) => {
        if (!open) setShowConfirmSync(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>Sincronizar Ahora</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Ejecutar sincronización incremental desde {PROVIDER_LABELS[showConfirmSync?.provider_name]}?
            <br />
            Esto traerá solo los cambios desde la última sincronización.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSincronizar(showConfirmSync)}
              disabled={syncingId === showConfirmSync?.id}
              className="gap-2"
            >
              {syncingId === showConfirmSync?.id && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Sincronizar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
