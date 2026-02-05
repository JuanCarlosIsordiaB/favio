/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Editor de Umbrales de KPI
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { useKPIThresholds } from '../../hooks/useKPIThresholds';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function KPIThresholdsEditor({ kpi, firmId, open = false, onClose = () => {}, onSave = () => {} }) {
  const { guardarUmbrales, resetearADefaults, validarNuevosUmbrales } = useKPIThresholds(firmId);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Inicializar form con umbrales actuales
  useEffect(() => {
    if (kpi && kpi.umbral) {
      setFormData({
        optimal_min: kpi.umbral.optimal_min,
        optimal_max: kpi.umbral.optimal_max,
        warning_min: kpi.umbral.warning_min,
        warning_max: kpi.umbral.warning_max,
        critical_min: kpi.umbral.critical_min,
        critical_max: kpi.umbral.critical_max
      });
    }
  }, [kpi, open]);

  const handleChange = (field, value) => {
    const newValue = value === '' ? null : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }));

    // Limpiar errores cuando empiezan a editar
    setErrors([]);
  };

  const handleValidar = () => {
    const erroresValidacion = validarNuevosUmbrales(formData);
    if (erroresValidacion.length > 0) {
      setErrors(erroresValidacion);
      return false;
    }
    return true;
  };

  const handleGuardar = async () => {
    if (!handleValidar()) return;

    setSaving(true);
    setSuccess(false);

    try {
      const userId = 'user-id'; // TODO: Obtener del contexto
      const guardado = await guardarUmbrales(kpi.id, formData, userId);

      if (guardado) {
        setSuccess(true);
        setTimeout(() => {
          onSave();
          onClose();
        }, 1500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetear = async () => {
    if (window.confirm('¿Estás seguro de que quieres restaurar los umbrales por defecto?')) {
      setSaving(true);
      try {
        const result = await resetearADefaults(kpi.id);
        if (result) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  if (!kpi || !open || !formData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Umbrales: {kpi.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mensajes */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Umbrales guardados exitosamente
              </AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Rango Óptimo */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm">Rango Óptimo 🟢</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opt_min">Mínimo</Label>
                  <Input
                    id="opt_min"
                    type="number"
                    step="0.01"
                    value={formData.optimal_min || ''}
                    onChange={(e) => handleChange('optimal_min', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opt_max">Máximo</Label>
                  <Input
                    id="opt_max"
                    type="number"
                    step="0.01"
                    value={formData.optimal_max || ''}
                    onChange={(e) => handleChange('optimal_max', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rango Advertencia */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-sm">Rango Advertencia ⚠️</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warn_min">Mínimo</Label>
                  <Input
                    id="warn_min"
                    type="number"
                    step="0.01"
                    value={formData.warning_min || ''}
                    onChange={(e) => handleChange('warning_min', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warn_max">Máximo</Label>
                  <Input
                    id="warn_max"
                    type="number"
                    step="0.01"
                    value={formData.warning_max || ''}
                    onChange={(e) => handleChange('warning_max', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rango Crítico */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-sm">Rango Crítico ❌</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crit_min">Mínimo</Label>
                  <Input
                    id="crit_min"
                    type="number"
                    step="0.01"
                    value={formData.critical_min || ''}
                    onChange={(e) => handleChange('critical_min', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crit_max">Máximo</Label>
                  <Input
                    id="crit_max"
                    type="number"
                    step="0.01"
                    value={formData.critical_max || ''}
                    onChange={(e) => handleChange('critical_max', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetear}
              disabled={saving}
            >
              Restaurar Defaults
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
