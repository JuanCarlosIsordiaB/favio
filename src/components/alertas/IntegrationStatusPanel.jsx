import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function IntegrationStatusPanel({
  estado = null,
  integraciones = [],
  onRefresh
}) {
  if (!estado) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Cargando estado...</p>
      </Card>
    );
  }

  const tasaSalud = estado.activas / estado.total_integraciones * 100;
  const urgente = estado.en_error > 0;

  return (
    <div className="space-y-4">
      {/* Alerta si hay errores */}
      {urgente && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atención Requerida</AlertTitle>
          <AlertDescription>
            {estado.en_error} integración{estado.en_error > 1 ? 'es' : ''} con error{estado.en_error > 1 ? 'es' : ''}.
            Verifica la configuración y prueba la conexión.
          </AlertDescription>
        </Alert>
      )}

      {/* Indicador de salud general */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Salud del Sistema</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {estado.activas} de {estado.total_integraciones} integraciones operativas
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {Math.round(tasaSalud)}%
            </div>
            <div className={`h-2 w-20 rounded-full mt-2 ${
              tasaSalud >= 80 ? 'bg-green-500' :
              tasaSalud >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
          </div>
        </div>
      </Card>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-2">{estado.total_integraciones}</p>
        </Card>

        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-sm text-green-700">Activas</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {estado.activas}
          </p>
        </Card>

        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-700">Pausadas</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {estado.pausadas}
          </p>
        </Card>

        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">Errores</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {estado.en_error}
          </p>
        </Card>
      </div>

      {/* Detalles de cada integración */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Detalles por Integración</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {integraciones.map((integracion) => (
          <Card key={integracion.id} className="p-4">
            <div className="flex items-start justify-between">
              {/* Información de la integración */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    {integracion.provider_name.toUpperCase()}
                  </h4>
                  {integracion.status === 'active' ? (
                    <Badge className="bg-green-100 text-green-800">Activa</Badge>
                  ) : integracion.status === 'paused' ? (
                    <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>
                  ) : integracion.status === 'error' ? (
                    <Badge className="bg-red-100 text-red-800">Error</Badge>
                  ) : integracion.status === 'testing' ? (
                    <Badge className="bg-blue-100 text-blue-800">Prueba</Badge>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  {integracion.api_endpoint}
                </p>

                {/* Información de sincronización */}
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Última Sync</p>
                    <p className="text-sm font-medium">
                      {integracion.last_sync_timestamp ? (
                        format(
                          new Date(integracion.last_sync_timestamp),
                          'PPP p',
                          { locale: es }
                        )
                      ) : (
                        'Nunca'
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Frecuencia</p>
                    <p className="text-sm font-medium">
                      Cada {integracion.sync_frequency_minutes} min
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Estado Sync</p>
                    <p className="text-sm font-medium">
                      {integracion.sync_enabled ? (
                        <span className="text-green-600">Habilitada</span>
                      ) : (
                        <span className="text-yellow-600">Deshabilitada</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Error message si existe */}
                {integracion.error_message && (
                  <Alert className="mt-3 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {integracion.error_message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Indicador visual de estado */}
              <div className="ml-4">
                {integracion.status === 'active' ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <span className="text-xs text-green-600 font-semibold mt-1">OK</span>
                  </div>
                ) : integracion.status === 'error' ? (
                  <div className="flex flex-col items-center">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <span className="text-xs text-red-600 font-semibold mt-1">ERROR</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <TrendingUp className="w-12 h-12 text-gray-400" />
                    <span className="text-xs text-gray-600 font-semibold mt-1">
                      {integracion.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recomendaciones */}
      {integraciones.length === 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">
            Comienza a sincronizar
          </h4>
          <p className="text-sm text-blue-800">
            Aún no hay integraciones configuradas. Ve a la pestaña "Integraciones"
            para crear una nueva conexión con tu sistema de RR.HH.
          </p>
        </Card>
      )}

      {/* Recomendaciones si hay errores */}
      {estado.en_error > 0 && (
        <Card className="p-6 bg-orange-50 border-orange-200">
          <h4 className="font-semibold text-orange-900 mb-2">
            Pasos para resolver errores
          </h4>
          <ol className="text-sm text-orange-800 space-y-2 list-decimal list-inside">
            <li>Verifica que las credenciales (API Key/Token) sean válidas</li>
            <li>Comprueba que el endpoint sea accesible desde tu red</li>
            <li>Prueba la conexión desde la pestaña "Integraciones"</li>
            <li>Consulta el historial de sincronizaciones para más detalles</li>
          </ol>
        </Card>
      )}
    </div>
  );
}
