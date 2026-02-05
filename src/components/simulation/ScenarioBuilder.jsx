/**
 * MÓDULO 14: SIMULACIÓN, PROYECCIONES Y TOMA DE DECISIONES
 * ScenarioBuilder.jsx - Constructor de Escenarios (Wizard)
 *
 * Funcionalidad:
 * - Wizard paso a paso
 * - Paso 1: Tipo de simulación
 * - Paso 2: Base (proyección o desde cero)
 * - Paso 3: Parámetros de entrada
 * - Paso 4: Ejecución y resultados
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ChevronRight, ChevronLeft, Loader, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import useScenarios from '../../hooks/useScenarios';
import { supabase } from '../../lib/supabase';

export default function ScenarioBuilder({
  firmId,
  premiseId,
  lotId,
  onClose,
  onScenarioCreated
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    simulationType: '',
    baseType: 'scratch',
    projectionId: '',
    inputParameters: {}
  });
  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState(null);

  const { createCustomScenario, executeSimulation, generateVariants } = useScenarios(firmId, premiseId);

  // Cargar proyecciones cuando se selecciona "desde proyección"
  const loadProjections = async () => {
    try {
      const { data, error } = await supabase
        .from('proyecciones_agricolas')
        .select('id, cultivo_proyectado, hectareas, fecha_tentativa')
        .eq('firm_id', firmId)
        .eq('estado', 'PENDIENTE')
        .limit(10);

      if (error) throw error;
      setProjections(data || []);
    } catch (error) {
      console.error('Error cargando proyecciones:', error);
      toast.error('Error cargando proyecciones');
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParameterChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      inputParameters: {
        ...prev.inputParameters,
        [field]: value
      }
    }));
  };

  // Validar paso actual
  const validateStep = () => {
    if (step === 1) {
      if (!formData.simulationType) {
        toast.error('Selecciona un tipo de simulación');
        return false;
      }
    } else if (step === 2) {
      if (formData.baseType === 'projection' && !formData.projectionId) {
        toast.error('Selecciona una proyección');
        return false;
      }
    } else if (step === 3) {
      if (!formData.name) {
        toast.error('El nombre del escenario es requerido');
        return false;
      }
    }
    return true;
  };

  // Avanzar al siguiente paso
  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 2 && formData.baseType === 'projection') {
      setLoading(true);
      try {
        await loadProjections();
      } finally {
        setLoading(false);
      }
    }

    setStep(step + 1);
  };

  // Retroceder al paso anterior
  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Ejecutar simulación
  const handleExecute = async () => {
    if (!validateStep()) return;

    setExecuting(true);
    try {
      // Crear escenario
      const scenario = await createCustomScenario(
        {
          firm_id: firmId,
          premise_id: premiseId,
          lot_id: lotId,
          name: formData.name,
          description: formData.description,
          simulation_type: formData.simulationType,
          scenario_type: 'CUSTOM',
          input_parameters: formData.inputParameters
        },
        'current_user'
      );

      if (!scenario) {
        toast.error('Error creando escenario');
        return;
      }

      // Ejecutar simulación
      const executed = await executeSimulation(scenario.id);

      if (executed) {
        setResults(executed);
        setStep(5); // Ir a paso de resultados
        onScenarioCreated?.();
      }
    } catch (error) {
      console.error('Error ejecutando simulación:', error);
      toast.error('Error ejecutando simulación');
    } finally {
      setExecuting(false);
    }
  };

  // ============================================================
  // PASO 1: SELECCIONAR TIPO DE SIMULACIÓN
  // ============================================================
  const Step1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        Paso 1: Tipo de Simulación
      </h2>
      <p className="text-slate-600">
        Selecciona qué tipo de análisis deseas realizar
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          {
            id: 'CARGA_ANIMAL',
            name: 'Carga Animal',
            desc: 'Analiza kg/ha, receptividad y riesgo de sobrepastoreo',
            icon: '🐄'
          },
          {
            id: 'PRODUCCION',
            name: 'Producción',
            desc: 'Proyecta ganancia de peso y kg producidos',
            icon: '📈'
          },
          {
            id: 'ECONOMICO',
            name: 'Económico',
            desc: 'Analiza costos, márgenes, ROI y sensibilidad',
            icon: '💰'
          },
          {
            id: 'INTEGRAL',
            name: 'Integral',
            desc: 'Combina todos los análisis en uno',
            icon: '🎯'
          }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleInputChange('simulationType', option.id)}
            className={`p-4 rounded-lg border-2 transition text-left ${
              formData.simulationType === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-2xl mb-1">{option.icon}</p>
            <h3 className="font-semibold text-slate-900">{option.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{option.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // PASO 2: SELECCIONAR BASE
  // ============================================================
  const Step2 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        Paso 2: Base del Escenario
      </h2>
      <p className="text-slate-600">
        ¿Crear desde una proyección existente o desde cero?
      </p>

      <div className="space-y-3">
        {[
          {
            id: 'scratch',
            name: 'Desde Cero',
            desc: 'Ingresar todos los parámetros manualmente'
          },
          {
            id: 'projection',
            name: 'Desde Proyección',
            desc: 'Usar datos de una proyección existente como base'
          }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => {
              handleInputChange('baseType', option.id);
              if (option.id === 'projection') {
                loadProjections();
              }
            }}
            className={`p-4 rounded-lg border-2 transition text-left ${
              formData.baseType === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <h3 className="font-semibold text-slate-900">{option.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{option.desc}</p>
          </button>
        ))}
      </div>

      {formData.baseType === 'projection' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Seleccionar Proyección
          </label>
          <select
            value={formData.projectionId}
            onChange={(e) => handleInputChange('projectionId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Selecciona una proyección --</option>
            {projections.map(p => (
              <option key={p.id} value={p.id}>
                {p.cultivo_proyectado} ({p.hectareas} ha) - {p.fecha_tentativa}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // ============================================================
  // PASO 3: PARÁMETROS DE ENTRADA
  // ============================================================
  const Step3 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        Paso 3: Parámetros de Entrada
      </h2>

      <div className="space-y-4">
        {/* Nombre y descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1">
            Nombre del Escenario *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ej: Simulación Optimista - Terneros"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe el escenario..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Parámetros según tipo de simulación */}
        {formData.simulationType === 'CARGA_ANIMAL' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Cantidad de Animales
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.animal_count || ''}
                  onChange={(e) => handleParameterChange('animal_count', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Peso Promedio (kg)
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.avg_weight_kg || ''}
                  onChange={(e) => handleParameterChange('avg_weight_kg', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Área (hectáreas)
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.area_hectares || ''}
                  onChange={(e) => handleParameterChange('area_hectares', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Ganancia Diaria (kg/día)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.inputParameters.daily_gain_kg || ''}
                  onChange={(e) => handleParameterChange('daily_gain_kg', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Duración (días)
              </label>
              <input
                type="number"
                value={formData.inputParameters.duration_days || '180'}
                onChange={(e) => handleParameterChange('duration_days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </>
        )}

        {formData.simulationType === 'ECONOMICO' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Costos Insumos
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.input_costs || ''}
                  onChange={(e) => handleParameterChange('input_costs', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Costos Maquinaria
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.machinery_costs || ''}
                  onChange={(e) => handleParameterChange('machinery_costs', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Producción (kg)
                </label>
                <input
                  type="number"
                  value={formData.inputParameters.production_kg || ''}
                  onChange={(e) => handleParameterChange('production_kg', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Precio por kg
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.inputParameters.price_per_kg || ''}
                  onChange={(e) => handleParameterChange('price_per_kg', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ============================================================
  // PASO 4: EJECUCIÓN
  // ============================================================
  const Step4 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        Paso 4: Ejecutar Simulación
      </h2>
      <p className="text-slate-600">
        Resumen de los parámetros ingresados
      </p>

      <Card className="bg-slate-50">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm text-slate-600">Nombre</p>
            <p className="font-medium text-slate-900">{formData.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Tipo de Simulación</p>
            <p className="font-medium text-slate-900">{formData.simulationType}</p>
          </div>
          {formData.description && (
            <div>
              <p className="text-sm text-slate-600">Descripción</p>
              <p className="font-medium text-slate-900">{formData.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          La simulación se ejecutará automáticamente y generará resultados con análisis
          de riesgos y alertas predictivas.
        </AlertDescription>
      </Alert>
    </div>
  );

  // ============================================================
  // PASO 5: RESULTADOS
  // ============================================================
  const Step5 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        ✓ Simulación Completada
      </h2>

      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          La simulación se ejecutó exitosamente.
        </AlertDescription>
      </Alert>

      {results && results.results && (
        <Card className="bg-slate-50">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Margen Esperado</p>
                <p className={`text-2xl font-bold ${
                  (results.results.margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${(results.results.margin || 0).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">ROI</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(results.results.roi_percent || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            {results.results.risk_factors && results.results.risk_factors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded">
                <p className="text-sm font-medium text-yellow-900">
                  Riesgos Identificados:
                </p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                  {results.results.risk_factors.slice(0, 3).map((risk, idx) => (
                    <li key={idx}>• {risk.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Constructor de Escenarios
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Paso {step} de 5
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </CardHeader>

        {/* Barra de progreso */}
        <div className="px-6 py-3 border-b border-slate-200">
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition ${
                  s <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Contenido del paso */}
        <CardContent className="p-6 min-h-80">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
        </CardContent>

        {/* Botones de navegación */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={step === 1 || step === 5}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 rounded-lg transition"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>

            {step < 4 && (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? <Loader className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                Siguiente
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {executing ? <Loader className="animate-spin" size={20} /> : <>
                  <span>Ejecutar Simulación</span>
                </>}
              </button>
            )}

            {step === 5 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
