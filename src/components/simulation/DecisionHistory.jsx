/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * DecisionHistory.jsx - Historial de Decisiones Tomadas
 *
 * Funcionalidad:
 * - Timeline de decisiones tomadas
 * - Evaluación de resultados (Positivo/Neutral/Negativo)
 * - Lecciones aprendidas
 * - Filtros por tipo y resultado
 * - Estadísticas de efectividad
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import {
  TrendingUp, TrendingDown, Clock, BookOpen, Filter, BarChart3, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

const DECISION_TYPES = {
  EJECUTAR_PROYECCION: {
    label: 'Ejecutar Proyección',
    icon: '▶️',
    color: 'bg-blue-50'
  },
  MODIFICAR_CARGA: {
    label: 'Modificar Carga',
    icon: '🐄',
    color: 'bg-green-50'
  },
  CAMBIAR_ESTRATEGIA: {
    label: 'Cambiar Estrategia',
    icon: '🎯',
    color: 'bg-purple-50'
  },
  CANCELAR_ACTIVIDAD: {
    label: 'Cancelar Actividad',
    icon: '⛔',
    color: 'bg-red-50'
  },
  OTRO: {
    label: 'Otro',
    icon: '📝',
    color: 'bg-slate-50'
  }
};

const OUTCOME_COLORS = {
  POSITIVE: {
    label: '✅ Positivo',
    bg: 'bg-green-50',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  NEUTRAL: {
    label: '➡️ Neutral',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    color: 'text-yellow-600'
  },
  NEGATIVE: {
    label: '❌ Negativo',
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    icon: TrendingDown,
    color: 'text-red-600'
  },
  PENDING: {
    label: '⏳ Pendiente',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    badge: 'bg-slate-100 text-slate-800',
    icon: Clock,
    color: 'text-slate-600'
  }
};

export default function DecisionHistory({ selectedFirmId }) {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    decisionType: null,
    outcome: null
  });
  const [expandedId, setExpandedId] = useState(null);

  // Cargar historial de decisiones
  const loadDecisions = React.useCallback(async () => {
    if (!selectedFirmId) return;

    setLoading(true);

    try {
      let query = supabase
        .from('decision_history')
        .select('*')
        .eq('firm_id', selectedFirmId)
        .order('decided_at', { ascending: false });

      // Aplicar filtros
      if (filters.decisionType) {
        query = query.eq('decision_type', filters.decisionType);
      }

      if (filters.outcome) {
        query = query.eq('outcome_evaluation', filters.outcome);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDecisions(data || []);
    } catch (error) {
      toast.error('Error cargando historial: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFirmId, filters]);

  // Cargar decisiones al montar
  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  // Evaluar una decisión
  const evaluateDecision = async (decisionId, outcome, lessonsLearned) => {
    try {
      const { error } = await supabase
        .from('decision_history')
        .update({
          outcome_evaluation: outcome,
          lessons_learned: lessonsLearned,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', decisionId);

      if (error) throw error;

      toast.success('Decisión evaluada');
      loadDecisions();
    } catch (error) {
      toast.error('Error evaluando decisión');
      console.error('Error:', error);
    }
  };

  // Cambiar filtros
  const handleFilterChange = (filterName, filterValue) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: prev[filterName] === filterValue ? null : filterValue
    }));
  };

  // Estadísticas
  const stats = {
    total: decisions.length,
    positive: decisions.filter(d => d.outcome_evaluation === 'POSITIVE').length,
    neutral: decisions.filter(d => d.outcome_evaluation === 'NEUTRAL').length,
    negative: decisions.filter(d => d.outcome_evaluation === 'NEGATIVE').length,
    pending: decisions.filter(d => d.outcome_evaluation === 'PENDING').length,
    effectiveness:
      decisions.length > 0
        ? (
            (decisions.filter(d => d.outcome_evaluation === 'POSITIVE').length /
              decisions.length) *
            100
          ).toFixed(1)
        : 0
  };

  // Componente de decisión en timeline
  const DecisionItem = ({ decision, onExpand, isExpanded }) => {
    const decisionType = DECISION_TYPES[decision.decision_type];
    const outcomeData = OUTCOME_COLORS[decision.outcome_evaluation || 'PENDING'];
    const OutcomeIcon = outcomeData.icon;

    return (
      <div className={`relative pl-8 pb-8 ${isExpanded ? outcomeData.bg : ''} rounded-lg p-4 mb-3`}>
        {/* Timeline indicator */}
        <div className={`absolute left-0 top-5 w-6 h-6 rounded-full border-2 ${outcomeData.color} bg-white flex items-center justify-center`}>
          <div className={`w-3 h-3 rounded-full ${outcomeData.color}`} />
        </div>

        {/* Timeline line */}
        <div className="absolute left-2 top-12 w-0.5 h-20 bg-slate-300" />

        {/* Content */}
        <button
          onClick={() => onExpand(isExpanded ? null : decision.id)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{decisionType?.icon}</span>
                <h3 className="font-semibold text-slate-900">
                  {decision.decision_description}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${outcomeData.badge}`}
                >
                  {outcomeData.label}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {decisionType?.label}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-xs text-slate-500">
                {new Date(decision.decided_at).toLocaleDateString('es-ES')}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(decision.decided_at).toLocaleTimeString('es-ES')}
              </p>
            </div>
          </div>

          {/* Razón de decisión */}
          <p className="text-sm text-slate-700 mt-2 ml-9">
            {decision.decision_rationale}
          </p>
        </button>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="mt-4 space-y-4 ml-9">
            {/* Resultados esperados vs reales */}
            {decision.outcome_evaluation !== 'PENDING' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-100 rounded">
                  <p className="text-xs font-bold text-blue-900 mb-2">
                    Esperado
                  </p>
                  <pre className="text-xs text-blue-800 font-mono overflow-auto max-h-32">
                    {JSON.stringify(decision.expected_results, null, 2)}
                  </pre>
                </div>

                <div className="p-3 bg-green-100 rounded">
                  <p className="text-xs font-bold text-green-900 mb-2">
                    Real
                  </p>
                  <pre className="text-xs text-green-800 font-mono overflow-auto max-h-32">
                    {JSON.stringify(decision.actual_results, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Lecciones aprendidas */}
            {decision.lessons_learned && (
              <div className="p-3 bg-purple-100 rounded">
                <div className="flex items-start gap-2">
                  <BookOpen size={16} className="text-purple-900 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-purple-900 mb-1">
                      Lección Aprendida
                    </p>
                    <p className="text-sm text-purple-800">
                      {decision.lessons_learned}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Si no ha sido evaluada, mostrar form de evaluación */}
            {decision.outcome_evaluation === 'PENDING' && (
              <EvaluationForm
                decisionId={decision.id}
                onSubmit={(outcome, lessons) =>
                  evaluateDecision(decision.id, outcome, lessons)
                }
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // Componente de formulario de evaluación
  const EvaluationForm = ({ decisionId, onSubmit }) => {
    const [outcome, setOutcome] = React.useState('POSITIVE');
    const [lessons, setLessons] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit = async () => {
      if (!lessons.trim()) {
        toast.error('Por favor escribe las lecciones aprendidas');
        return;
      }

      setSubmitting(true);
      await onSubmit(outcome, lessons);
      setSubmitting(false);
    };

    return (
      <div className="space-y-3 p-4 bg-slate-50 rounded border border-slate-300">
        <h4 className="font-semibold text-slate-900">Evaluar Decisión</h4>

        <div>
          <label className="text-sm font-medium text-slate-900 block mb-2">
            Resultado
          </label>
          <div className="flex gap-2">
            {Object.entries(OUTCOME_COLORS).map(([key, val]) => (
              key !== 'PENDING' && (
                <button
                  key={key}
                  onClick={() => setOutcome(key)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                    outcome === key
                      ? `${val.badge} ring-2 ring-offset-2 ring-slate-400`
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {val.label}
                </button>
              )
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-900 block mb-2">
            Lecciones Aprendidas
          </label>
          <textarea
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="¿Qué lecciones sacas de esta decisión?"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Guardar Evaluación'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          📖 Historial de Decisiones
        </h1>
        <p className="text-slate-600 mt-1">
          Registro de decisiones tomadas, sus resultados y lecciones aprendidas
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Positivas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.positive}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Neutrales</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.neutral}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Negativas</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats.negative}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 font-medium">Efectividad</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats.effectiveness}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Indicador de efectividad */}
      {stats.total > 0 && (
        <Card className={`border-l-4 ${
          stats.effectiveness >= 70
            ? 'border-l-green-500 bg-green-50'
            : stats.effectiveness >= 40
            ? 'border-l-yellow-500 bg-yellow-50'
            : 'border-l-red-500 bg-red-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {stats.effectiveness >= 70 ? '✅' : stats.effectiveness >= 40 ? '⚠️' : '❌'} Tasa de Éxito
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {stats.effectiveness >= 70
                    ? 'Excelente desempeño en la toma de decisiones'
                    : stats.effectiveness >= 40
                    ? 'Hay oportunidades de mejora en decisiones futuras'
                    : 'Necesitas revisar tu proceso de toma de decisiones'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {stats.effectiveness}%
                </p>
                <p className="text-xs text-slate-600">
                  {stats.positive} de {stats.total} positivas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <h3 className="font-semibold text-slate-900">Filtros</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de decisión */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                Tipo de Decisión
              </label>
              <select
                value={filters.decisionType || ''}
                onChange={(e) =>
                  handleFilterChange('decisionType', e.target.value)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(DECISION_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resultado */}
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                Resultado
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(OUTCOME_COLORS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleFilterChange('outcome', key)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                      filters.outcome === key
                        ? `${val.badge} ring-2 ring-offset-2 ring-slate-400`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de decisiones */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Clock className="animate-spin text-blue-600" size={40} />
          <p className="ml-4 text-slate-600">Cargando decisiones...</p>
        </div>
      ) : decisions.length === 0 ? (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-12 text-center">
            <BarChart3 className="text-slate-400 mx-auto mb-3" size={48} />
            <p className="text-slate-600 font-semibold">
              No hay decisiones registradas
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Aquí aparecerán tus decisiones conforme las registres en simulaciones
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Timeline</h2>
          <div className="relative">
            {decisions.map((decision) => (
              <DecisionItem
                key={decision.id}
                decision={decision}
                onExpand={setExpandedId}
                isExpanded={expandedId === decision.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insights y tendencias */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle size={20} />
              Insights
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.positive > stats.negative ? (
              <p className="text-green-700">
                ✅ Tienes más decisiones positivas que negativas. ¡Continúa con esta tendencia!
              </p>
            ) : stats.positive === stats.negative ? (
              <p className="text-yellow-700">
                ➡️ Tienes un equilibrio entre decisiones positivas y negativas. Analiza qué hace fallar las decisiones negativas.
              </p>
            ) : (
              <p className="text-red-700">
                ⚠️ Tienes más decisiones negativas. Revisa el proceso de toma de decisiones y aprende de los errores.
              </p>
            )}

            {decisions.filter(d => d.outcome_evaluation === 'PENDING').length > 0 && (
              <p className="text-blue-700">
                📋 Tienes {decisions.filter(d => d.outcome_evaluation === 'PENDING').length} decisión(es) pendiente(s) de evaluar.
              </p>
            )}

            {stats.total >= 10 && (
              <p className="text-slate-700">
                📊 Con {stats.total} decisiones registradas, puedes hacer análisis significativos de tu desempeño.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
