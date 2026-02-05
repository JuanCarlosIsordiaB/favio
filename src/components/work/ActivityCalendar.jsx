/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Componente para visualizar calendario de actividades planificadas y ejecutadas
 *
 * Funcionalidad:
 * - Vista calendárica del mes actual con actividades
 * - Indicadores visuales: proyecciones vs trabajos ejecutados
 * - Navegación entre meses
 * - Detalles de actividades por día
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Tractor, PawPrint, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../ui/card';

export default function ActivityCalendar({ activeTab = 'agricultural' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDayActivities, setSelectedDayActivities] = useState(null);

  useEffect(() => {
    loadActivities();
  }, [currentDate, activeTab]);

  async function loadActivities() {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Cargar proyecciones
      const projectionsTable = activeTab === 'agricultural' ? 'proyecciones_agricolas' : 'proyecciones_ganaderas';
      const dateField = 'fecha_tentativa';

      // Seleccionar solo los campos que existen en cada tabla
      const projectionFields = activeTab === 'agricultural'
        ? 'id, fecha_tentativa, cultivo_proyectado, estado'
        : 'id, fecha_tentativa, tipo_evento, cantidad, estado';

      const { data: projections, error: projError } = await supabase
        .from(projectionsTable)
        .select(projectionFields)
        .gte(dateField, startDate)
        .lte(dateField, endDate);

      if (projError) throw projError;

      // Cargar trabajos ejecutados
      const worksTable = activeTab === 'agricultural' ? 'agricultural_works' : 'livestock_works';
      // Seleccionar solo los campos que existen en cada tabla
      const workFields = activeTab === 'agricultural'
        ? 'id, date, work_type, status, detail'
        : 'id, date, event_type, status, detail';

      const { data: works, error: worksError } = await supabase
        .from(worksTable)
        .select(workFields)
        .gte('date', startDate)
        .lte('date', endDate);

      if (worksError) throw worksError;

      // Combinar actividades
      const combined = [];

      // Agregar proyecciones
      projections?.forEach(p => {
        const dateStr = p[dateField].split('T')[0];
        combined.push({
          id: p.id,
          date: dateStr,
          type: 'projection',
          title: p.cultivo_proyectado || p.tipo_evento || 'Proyección',
          status: p.estado,
          detail: p.cantidad || null
        });
      });

      // Agregar trabajos
      works?.forEach(w => {
        const dateStr = w.date.split('T')[0];
        combined.push({
          id: w.id,
          date: dateStr,
          type: 'work',
          title: w.work_type || w.event_type || 'Trabajo',
          status: w.status,
          detail: w.detail
        });
      });

      setActivities(combined);
    } catch (err) {
      console.error('Error loading activities:', err);
      toast.error('Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  }

  // Función para obtener días del mes
  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // Función para obtener el primer día de la semana
  function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  // Obtener actividades de un día específico
  function getActivitiesForDay(day) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activities.filter(a => a.date === dateStr);
  }

  // Determinar color de actividad
  function getActivityColor(activity) {
    if (activity.type === 'projection') {
      return 'bg-blue-100 border-l-4 border-blue-500';
    } else {
      switch (activity.status) {
        case 'APPROVED':
        case 'CLOSED':
          return 'bg-green-100 border-l-4 border-green-500';
        case 'PENDING_APPROVAL':
          return 'bg-yellow-100 border-l-4 border-yellow-500';
        case 'REJECTED':
        case 'CANCELLED':
          return 'bg-red-100 border-l-4 border-red-500';
        default:
          return 'bg-slate-100 border-l-4 border-slate-500';
      }
    }
  }

  // Renderizar celda del calendario
  function renderCalendarDay(day) {
    const dayActivities = getActivitiesForDay(day);
    const hasActivities = dayActivities.length > 0;

    return (
      <div
        key={day}
        onClick={() => hasActivities && setSelectedDayActivities(dayActivities)}
        className={`p-2 min-h-24 border border-slate-200 rounded-lg cursor-pointer transition-colors ${
          hasActivities ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white hover:bg-slate-50'
        }`}
      >
        <div className="font-semibold text-sm text-slate-900 mb-2">{day}</div>
        <div className="space-y-1">
          {dayActivities.slice(0, 2).map(activity => (
            <div
              key={activity.id}
              className={`text-xs p-1 rounded truncate ${getActivityColor(activity)}`}
            >
              {activity.type === 'projection' ? (
                <span className="font-medium">📅 {activity.title}</span>
              ) : (
                <span className="font-medium">✓ {activity.title}</span>
              )}
            </div>
          ))}
          {dayActivities.length > 2 && (
            <div className="text-xs text-slate-500 font-medium p-1">
              +{dayActivities.length - 2} más
            </div>
          )}
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = [];

  // Agregar espacios en blanco antes del primer día
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Agregar días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-4">
        <Loader className="animate-spin" size={32} />
        <span className="text-slate-600">Cargando calendario...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 capitalize">{monthName}</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Proyección</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Ejecutado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Rechazado</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Encabezados de días de semana */}
        <div className="grid grid-cols-7 gap-0 bg-slate-100 border-b border-slate-200">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-slate-700 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, idx) => (
            <div key={idx} className="border-r border-b border-slate-200 last:border-r-0">
              {day ? renderCalendarDay(day) : <div className="p-2 min-h-24 bg-slate-50"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Actividades del día seleccionado */}
      {selectedDayActivities && (
        <Card className="bg-slate-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Actividades del día {selectedDayActivities[0]?.date}
              </h3>
              <button
                onClick={() => setSelectedDayActivities(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDayActivities.map(activity => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg ${getActivityColor(activity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {activity.type === 'projection' ? 'Proyección' : 'Trabajo Ejecutado'}
                    </p>
                    {activity.detail && (
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">{activity.detail}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      activity.status === 'COMPLETADA' || activity.status === 'CLOSED'
                        ? 'bg-green-200 text-green-800'
                        : activity.status === 'PENDIENTE' || activity.status === 'PENDING_APPROVAL'
                        ? 'bg-yellow-200 text-yellow-800'
                        : activity.status === 'CANCELADA' || activity.status === 'REJECTED'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <h4 className="font-semibold text-slate-900">Proyecciones</h4>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {activities.filter(a => a.type === 'projection').length}
            </p>
            <p className="text-sm text-slate-600 mt-1">actividades planificadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h4 className="font-semibold text-slate-900">Ejecutados</h4>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {activities.filter(a => a.type === 'work' && (a.status === 'APPROVED' || a.status === 'CLOSED')).length}
            </p>
            <p className="text-sm text-slate-600 mt-1">trabajos completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h4 className="font-semibold text-slate-900">Ejecución</h4>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-600">
              {activities.filter(a => a.type === 'projection').length > 0
                ? Math.round(
                    (activities.filter(a => a.type === 'work' && (a.status === 'APPROVED' || a.status === 'CLOSED')).length /
                      activities.filter(a => a.type === 'projection').length) *
                      100
                  )
                : 0}
              %
            </p>
            <p className="text-sm text-slate-600 mt-1">de lo planificado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
