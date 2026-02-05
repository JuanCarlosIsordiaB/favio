import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { validarRemitoSalida } from '../../lib/validations/salesValidations';

export default function SaleRemittanceModal({ sale, onClose, onSave }) {
  const [formData, setFormData] = useState({
    remittance_number: '',
    remittance_date: new Date().toISOString().split('T')[0],
    transport_company: '',
    driver_name: '',
    vehicle_plate: '',
    authorization_number: '',
    delivery_address: sale?.client_address || '',
    delivery_contact: '',
    notes: ''
  });

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar
    const validacion = validarRemitoSalida(formData);
    if (!validacion.valido) {
      setErrores(validacion.errores);
      toast.error('Corrige los errores en el formulario');
      return;
    }

    // Guardar
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error guardando remito:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar Remito de Salida</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-sm space-y-1">
            <div><strong>Cliente:</strong> {sale?.client_name}</div>
            <div><strong>Venta:</strong> {sale?.sale_date} - Total: {sale?.total_amount} {sale?.currency}</div>
            <div><strong>Ítems:</strong> {sale?.items?.length || 0} productos</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número de remito y fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número de Remito *</Label>
              <Input
                value={formData.remittance_number}
                onChange={(e) => {
                  setFormData({...formData, remittance_number: e.target.value});
                  setErrores({...errores, remittance_number: undefined});
                }}
                placeholder="REM-001"
                className={errores.remittance_number ? 'border-red-500' : ''}
              />
              {errores.remittance_number && (
                <span className="text-red-500 text-sm">{errores.remittance_number}</span>
              )}
            </div>

            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formData.remittance_date}
                onChange={(e) => {
                  setFormData({...formData, remittance_date: e.target.value});
                  setErrores({...errores, remittance_date: undefined});
                }}
                className={errores.remittance_date ? 'border-red-500' : ''}
              />
              {errores.remittance_date && (
                <span className="text-red-500 text-sm">{errores.remittance_date}</span>
              )}
            </div>
          </div>

          {/* Transporte */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Información de Transporte</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Empresa de Transporte</Label>
                <Input
                  value={formData.transport_company}
                  onChange={(e) => setFormData({...formData, transport_company: e.target.value})}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div>
                <Label>Chofer</Label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                  placeholder="Nombre del chofer"
                />
              </div>

              <div>
                <Label>Matrícula del Vehículo</Label>
                <Input
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                  placeholder="ABC1234"
                />
              </div>

              <div>
                <Label>Nº Habilitación (Opcional)</Label>
                <Input
                  value={formData.authorization_number}
                  onChange={(e) => setFormData({...formData, authorization_number: e.target.value})}
                  placeholder="Número de habilitación"
                />
              </div>
            </div>
          </div>

          {/* Dirección de entrega y contacto */}
          <div>
            <Label>Dirección de Entrega *</Label>
            <Input
              value={formData.delivery_address}
              onChange={(e) => {
                setFormData({...formData, delivery_address: e.target.value});
                setErrores({...errores, delivery_address: undefined});
              }}
              placeholder="Dirección completa"
              className={errores.delivery_address ? 'border-red-500' : ''}
            />
            {errores.delivery_address && (
              <span className="text-red-500 text-sm">{errores.delivery_address}</span>
            )}
          </div>

          <div>
            <Label>Contacto en Destino</Label>
            <Input
              value={formData.delivery_contact}
              onChange={(e) => setFormData({...formData, delivery_contact: e.target.value})}
              placeholder="Nombre y teléfono"
            />
          </div>

          {/* Notas */}
          <div>
            <Label>Notas</Label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Observaciones adicionales"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Generando...' : 'Generar Remito'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
