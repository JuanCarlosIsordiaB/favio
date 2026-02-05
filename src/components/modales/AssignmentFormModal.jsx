import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { validarAsignacion } from '../../lib/validations/personnelValidations';
import { crearAsignacion } from '../../services/assignments';
import { supabase } from '../../lib/supabase';
import { usePersonnel } from '../../hooks/usePersonnel';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function AssignmentFormModal({
  firmId,
  onClose,
  onSave,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [personnel, setPersonnel] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [agriculturalWorks, setAgriculturalWorks] = useState([]);
  const [formData, setFormData] = useState({
    personnel_id: '',
    assignment_type: 'work',
    agricultural_work_id: null,
    livestock_work_id: null,
    machinery_id: null,
    assignment_date: new Date().toISOString().split('T')[0],
    start_date: null,
    end_date: null,
    hours_assigned: '',
    status: 'assigned',
    is_primary_responsible: false
  });

  const { personnel: personnelList } = usePersonnel(firmId);

  useEffect(() => {
    if (personnelList) {
      setPersonnel(personnelList);
    }
  }, [personnelList]);

  // Cargar maquinaria disponible
  useEffect(() => {
    if (firmId && formData.assignment_type === 'machinery') {
      loadMachinery();
    }
  }, [firmId, formData.assignment_type]);

  // Cargar trabajos agrícolas disponibles
  useEffect(() => {
    if (firmId && formData.assignment_type === 'work') {
      loadAgriculturalWorks();
    }
  }, [firmId, formData.assignment_type]);

  const loadMachinery = async () => {
    try {
      const { data } = await supabase
        .from('machinery')
        .select('id, name, code, type')
        .eq('firm_id', firmId)
        .eq('status', 'ACTIVE')
        .order('name');

      if (data) {
        setMachinery(data);
      }
    } catch (err) {
      console.error('Error al cargar maquinaria:', err);
      toast.error('Error al cargar maquinaria');
    }
  };

  const loadAgriculturalWorks = async () => {
    try {
      const { data } = await supabase
        .from('agricultural_works')
        .select('id, work_type, hectares, created_at')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      if (data) {
        setAgriculturalWorks(data);
      }
    } catch (err) {
      console.error('Error al cargar trabajos agrícolas:', err);
      toast.error('Error al cargar trabajos agrícolas');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Convertir strings vacíos a null para campos DATE opcionales
      if (['start_date', 'end_date'].includes(name) && value === '') {
        updated[name] = null;
      }

      // Cuando cambia el tipo de asignación, limpiar los campos UUID no relevantes
      if (name === 'assignment_type') {
        if (value === 'machinery') {
          // Para maquinaria, solo machinery_id es relevante
          updated.agricultural_work_id = null;
          updated.livestock_work_id = null;
        } else if (value === 'work') {
          // Para trabajo, solo agricultural/livestock son relevantes
          updated.machinery_id = null;
        } else {
          // Para otros tipos, limpiar todos
          updated.agricultural_work_id = null;
          updated.livestock_work_id = null;
          updated.machinery_id = null;
        }
      }

      return updated;
    });

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

    const validation = validarAsignacion(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      // Mostrar errores específicos del campo que falló
      const errorKeys = Object.keys(validation.errors);
      if (errorKeys.length > 0) {
        toast.error(`Error: ${validation.errors[errorKeys[0]]}`);
      } else {
        toast.error('Por favor completa los campos correctamente');
      }
      return;
    }

    setLoading(true);
    try {
      await crearAsignacion({
        ...formData,
        firm_id: firmId
      }, currentUser);

      toast.success('Asignación creada correctamente');
      onSave?.();
      onClose?.();
    } catch (err) {
      console.error('Error al crear asignación:', err);
      toast.error(err.message || 'Error al guardar asignación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Nueva Asignación</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal */}
            <div>
              <label className="block text-sm font-medium mb-1">Personal *</label>
              <select
                name="personnel_id"
                value={formData.personnel_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${errors.personnel_id ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccionar personal...</option>
                {personnel.filter(p => p.status === 'ACTIVE').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} - {p.position_title}
                  </option>
                ))}
              </select>
              {errors.personnel_id && (
                <p className="text-red-600 text-xs mt-1">{errors.personnel_id}</p>
              )}
            </div>

            {/* Tipo de asignación */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Asignación *</label>
              <select
                name="assignment_type"
                value={formData.assignment_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="work">Trabajo</option>
                <option value="machinery">Maquinaria</option>
                <option value="project">Proyecto</option>
                <option value="supervision">Supervisión</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Referencias (según tipo) */}
            {formData.assignment_type === 'work' && (
              <div>
                <label className="block text-sm font-medium mb-1">Trabajo Agrícola o Ganadero *</label>
                <select
                  name="agricultural_work_id"
                  value={formData.agricultural_work_id || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.agricultural_work_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Seleccionar trabajo...</option>
                  {agriculturalWorks.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.work_type} - {w.hectares} ha
                    </option>
                  ))}
                </select>
                {errors.agricultural_work_id && (
                  <p className="text-red-600 text-xs mt-1">{errors.agricultural_work_id}</p>
                )}
              </div>
            )}

            {formData.assignment_type === 'machinery' && (
              <div>
                <label className="block text-sm font-medium mb-1">Maquinaria *</label>
                <select
                  name="machinery_id"
                  value={formData.machinery_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.machinery_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Seleccionar máquina...</option>
                  {machinery.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.code && `(${m.code})`} - {m.type}
                    </option>
                  ))}
                </select>
                {errors.machinery_id && (
                  <p className="text-red-600 text-xs mt-1">{errors.machinery_id}</p>
                )}
              </div>
            )}

            {/* Fechas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Período</h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Asignación</label>
                  <Input
                    type="date"
                    name="assignment_date"
                    value={formData.assignment_date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Inicio</label>
                  <Input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fin</label>
                  <Input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleChange}
                    className={errors.end_date ? 'border-red-500' : ''}
                  />
                  {errors.end_date && (
                    <p className="text-red-600 text-xs mt-1">{errors.end_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Horas */}
            <div>
              <label className="block text-sm font-medium mb-1">Horas Asignadas</label>
              <Input
                type="number"
                name="hours_assigned"
                value={formData.hours_assigned}
                onChange={handleChange}
                className={errors.hours_assigned ? 'border-red-500' : ''}
                placeholder="0.00"
                step="0.5"
              />
              {errors.hours_assigned && (
                <p className="text-red-600 text-xs mt-1">{errors.hours_assigned}</p>
              )}
            </div>

            {/* Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="assigned">Asignado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_primary_responsible"
                    checked={formData.is_primary_responsible}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Responsable Principal</span>
                </label>
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
