import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { validarDatosPersonal } from '../../lib/validations/personnelValidations';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function PersonnelFormModal({
  firmId,
  personnelId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    full_name: '',
    document_id: '',
    email: '',
    phone: '',
    address: '',
    position_title: '',
    role: 'operator',
    hire_date: new Date().toISOString().split('T')[0],
    salary_amount: '',
    cost_per_hour: '',
    status: 'ACTIVE'
  });

  const roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'engineer', label: 'Ingeniero' },
    { value: 'director', label: 'Director' },
    { value: 'manager', label: 'Gerente' },
    { value: 'field_supervisor', label: 'Capataz' },
    { value: 'operator', label: 'Operario' }
  ];

  useEffect(() => {
    if (personnelId) {
      loadPersonnel();
    }
  }, [personnelId]);

  const loadPersonnel = async () => {
    try {
      const { data } = await supabase
        .from('personnel')
        .select('*')
        .eq('id', personnelId)
        .single();

      if (data) {
        setFormData(data);
      }
    } catch (err) {
      toast.error('Error al cargar personal');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación
    const validation = validarDatosPersonal(formData, !!personnelId);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Por favor completa los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      if (personnelId) {
        // Actualizar
        await supabase
          .from('personnel')
          .update({
            ...formData,
            firm_id: firmId,
            updated_by: currentUser || 'sistema'
          })
          .eq('id', personnelId);

        toast.success('Personal actualizado correctamente');
      } else {
        // Crear
        await supabase
          .from('personnel')
          .insert([{
            ...formData,
            firm_id: firmId,
            created_by: currentUser || 'sistema'
          }]);

        toast.success('Personal creado correctamente');
      }

      onSave?.();
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>
            {personnelId ? 'Editar Personal' : 'Nuevo Personal'}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos Personales */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Datos Personales</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                <Input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={errors.full_name ? 'border-red-500' : ''}
                  placeholder="Ej: Juan Pérez García"
                />
                {errors.full_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.full_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cédula de Identidad *</label>
                  <Input
                    type="text"
                    name="document_id"
                    value={formData.document_id}
                    onChange={handleChange}
                    className={errors.document_id ? 'border-red-500' : ''}
                    placeholder="Ej: 12345678-9"
                  />
                  {errors.document_id && (
                    <p className="text-red-600 text-xs mt-1">{errors.document_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'border-red-500' : ''}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? 'border-red-500' : ''}
                    placeholder="+598 9 XXXX XXXX"
                  />
                  {errors.phone && (
                    <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <Input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Calle y número"
                  />
                </div>
              </div>
            </div>

            {/* Datos Laborales */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Datos Laborales</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cargo *</label>
                  <Input
                    type="text"
                    name="position_title"
                    value={formData.position_title}
                    onChange={handleChange}
                    className={errors.position_title ? 'border-red-500' : ''}
                    placeholder="Ej: Operario Agrícola"
                  />
                  {errors.position_title && (
                    <p className="text-red-600 text-xs mt-1">{errors.position_title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Rol *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {roles.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Ingreso *</label>
                  <Input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleChange}
                    className={errors.hire_date ? 'border-red-500' : ''}
                  />
                  {errors.hire_date && (
                    <p className="text-red-600 text-xs mt-1">{errors.hire_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="ON_LEAVE">En Licencia</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Costos */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Costos</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Salario Mensual ($)</label>
                  <Input
                    type="number"
                    name="salary_amount"
                    value={formData.salary_amount}
                    onChange={handleChange}
                    className={errors.salary_amount ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.salary_amount && (
                    <p className="text-red-600 text-xs mt-1">{errors.salary_amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Costo por Hora ($)</label>
                  <Input
                    type="number"
                    name="cost_per_hour"
                    value={formData.cost_per_hour}
                    onChange={handleChange}
                    className={errors.cost_per_hour ? 'border-red-500' : ''}
                    placeholder="0.00"
                    step="0.01"
                  />
                  {errors.cost_per_hour && (
                    <p className="text-red-600 text-xs mt-1">{errors.cost_per_hour}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-6 border-t">
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
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
