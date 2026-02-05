import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PROVEEDORES = [
  { value: 'bamboohr', label: 'BambooHR' },
  { value: 'workday', label: 'Workday' },
  { value: 'adp', label: 'ADP Workforce Now' },
  { value: 'custom_api', label: 'API Personalizado' }
];

const FRECUENCIAS = [
  { value: 15, label: 'Cada 15 minutos' },
  { value: 30, label: 'Cada 30 minutos' },
  { value: 60, label: 'Cada hora' },
  { value: 240, label: 'Cada 4 horas' },
  { value: 1440, label: 'Diariamente' }
];

const INSTRUCCIONES = {
  bamboohr: (
    <div className="space-y-3 text-sm">
      <h4 className="font-semibold">Configuración BambooHR</h4>
      <ol className="list-decimal list-inside space-y-2">
        <li>Ir a Settings → API Key en BambooHR Admin</li>
        <li>Copiar tu API Key</li>
        <li>En Endpoint, usar: https://[SUBDOMAIN].bamboohr.com</li>
        <li>En API Key, pegar tu clave</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Ejemplo endpoint: https://mycompany.bamboohr.com
      </p>
    </div>
  ),
  workday: (
    <div className="space-y-3 text-sm">
      <h4 className="font-semibold">Configuración Workday</h4>
      <ol className="list-decimal list-inside space-y-2">
        <li>Contactar a tu Workday Implementation Team</li>
        <li>Solicitar credenciales OAuth 2.0</li>
        <li>En API Key, usar formato: CLIENT_ID:CLIENT_SECRET</li>
        <li>En Endpoint, usar: https://wd2-impl-services1.workday.com/ccx/service/</li>
      </ol>
    </div>
  ),
  adp: (
    <div className="space-y-3 text-sm">
      <h4 className="font-semibold">Configuración ADP</h4>
      <ol className="list-decimal list-inside space-y-2">
        <li>Registrar aplicación en ADP Developer Portal</li>
        <li>Crear credenciales OAuth 2.0</li>
        <li>En API Key, usar formato: CLIENT_ID:CLIENT_SECRET</li>
        <li>Configurar Redirect URI en el portal</li>
      </ol>
    </div>
  ),
  custom_api: (
    <div className="space-y-3 text-sm">
      <h4 className="font-semibold">API Personalizado</h4>
      <p>Proporciona los detalles de tu API personalizado:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>URL base del endpoint</li>
        <li>Clave de autenticación (Bearer Token)</li>
        <li>El API debe retornar empleados en formato JSON</li>
      </ul>
    </div>
  )
};

export default function IntegrationConfigModal({
  integracion = null,
  onSave,
  onClose
}) {
  const [formData, setFormData] = useState({
    provider_name: '',
    api_endpoint: '',
    api_key_encrypted: '',
    sync_frequency_minutes: 60,
    sync_enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (integracion) {
      setFormData({
        provider_name: integracion.provider_name,
        api_endpoint: integracion.api_endpoint,
        api_key_encrypted: integracion.api_key_encrypted || '',
        sync_frequency_minutes: integracion.sync_frequency_minutes || 60,
        sync_enabled: integracion.sync_enabled !== false
      });
    }
  }, [integracion]);

  const validar = () => {
    const nuevosErrores = {};

    if (!formData.provider_name) {
      nuevosErrores.provider_name = 'Selecciona un proveedor';
    }

    if (!formData.api_endpoint?.trim()) {
      nuevosErrores.api_endpoint = 'El endpoint es obligatorio';
    } else if (!formData.api_endpoint.startsWith('http')) {
      nuevosErrores.api_endpoint = 'El endpoint debe comenzar con http:// o https://';
    }

    if (!formData.api_key_encrypted?.trim()) {
      nuevosErrores.api_key_encrypted = 'La clave API es obligatoria';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validar()) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {integracion ? 'Editar Integración' : 'Nueva Integración'}
          </DialogTitle>
          <DialogDescription>
            Configura una integración para sincronizar datos de personal automáticamente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label htmlFor="provider">Proveedor</Label>
            <Select
              value={formData.provider_name}
              onValueChange={(value) =>
                setFormData({ ...formData, provider_name: value })
              }
              disabled={!!integracion}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {PROVEEDORES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.provider_name && (
              <p className="text-sm text-red-600">{errors.provider_name}</p>
            )}
          </div>

          {/* Instrucciones */}
          {formData.provider_name && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              {INSTRUCCIONES[formData.provider_name]}
            </Card>
          )}

          {/* Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint API</Label>
            <Input
              id="endpoint"
              placeholder="https://api.ejemplo.com"
              value={formData.api_endpoint}
              onChange={(e) =>
                setFormData({ ...formData, api_endpoint: e.target.value })
              }
            />
            {errors.api_endpoint && (
              <p className="text-sm text-red-600">{errors.api_endpoint}</p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apikey">Clave API / Token</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="Pega tu clave API o token"
              value={formData.api_key_encrypted}
              onChange={(e) =>
                setFormData({ ...formData, api_key_encrypted: e.target.value })
              }
            />
            {errors.api_key_encrypted && (
              <p className="text-sm text-red-600">{errors.api_key_encrypted}</p>
            )}
            <p className="text-xs text-muted-foreground">
              La clave se encriptará al guardar (no se mostrará en futuras ediciones)
            </p>
          </div>

          {/* Frecuencia de sincronización */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frecuencia de Sincronización</Label>
            <Select
              value={formData.sync_frequency_minutes.toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  sync_frequency_minutes: parseInt(value)
                })
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRECUENCIAS.map((f) => (
                  <SelectItem key={f.value} value={f.value.toString()}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advertencia de seguridad */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tus credenciales se almacenan de forma segura. Solo administradores pueden acceder a ellas.
            </AlertDescription>
          </Alert>

          {/* Acciones */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {integracion ? 'Actualizar' : 'Crear'} Integración
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
