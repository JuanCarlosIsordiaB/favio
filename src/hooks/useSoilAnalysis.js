/**
 * useSoilAnalysis.js
 *
 * Hook personalizado para análisis de suelo
 * Abstrae la lógica de análisis de suelo y alertas
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { differenceInDays } from 'date-fns';

/**
 * Hook para gestionar análisis de suelo de un lote
 * @param {string} lotId - ID del lote
 * @returns {Object} Datos y análisis de suelo
 */
export function useSoilAnalysis(lotId) {
  const [analisis, setAnalisis] = useState([]);
  const [ultimoAnalisis, setUltimoAnalisis] = useState(null);
  const [deficits, setDeficits] = useState([]);
  const [evolucionHistorica, setEvolucionHistorica] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Obtiene análisis de suelo del lote
   */
  const loadData = useCallback(async () => {
    if (!lotId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener análisis ordenados por fecha (más reciente primero)
      const { data: analisisData, error: analisisError } = await supabase
        .from('analisis_suelo')
        .select('*')
        .eq('lot_id', lotId)
        .order('fecha', { ascending: false });

      if (analisisError) throw analisisError;

      setAnalisis(analisisData || []);

      // Último análisis
      if (analisisData && analisisData.length > 0) {
        setUltimoAnalisis(analisisData[0]);

        // Calcular déficits del último análisis
        const deficitsDetectados = calcularDeficits(analisisData[0]);
        setDeficits(deficitsDetectados);
      }

      // Calcular evolución histórica por parámetro
      if (analisisData && analisisData.length > 0) {
        const evolucion = calcularEvolucionHistorica(analisisData);
        setEvolucionHistorica(evolucion);
      }

    } catch (err) {
      console.error('Error cargando análisis de suelo:', err);
      setError(err.message || 'Error al cargar análisis de suelo');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  /**
   * Recarga los datos
   */
  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Obtiene análisis por rango de fechas
   */
  const getAnalisisByDateRange = useCallback(async (fechaInicio, fechaFin) => {
    if (!lotId) return [];

    try {
      const { data, error } = await supabase
        .from('analisis_suelo')
        .select('*')
        .eq('lot_id', lotId)
        .gte('fecha', fechaInicio.toISOString())
        .lte('fecha', fechaFin.toISOString())
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error obteniendo análisis por rango:', err);
      return [];
    }
  }, [lotId]);

  /**
   * Marca un análisis como aplicado
   */
  const marcarComoAplicado = useCallback(async (analisisId) => {
    try {
      const { error } = await supabase
        .from('analisis_suelo')
        .update({ aplicado: true })
        .eq('id', analisisId);

      if (error) throw error;

      // Recargar datos
      await refetch();

      return true;
    } catch (err) {
      console.error('Error marcando como aplicado:', err);
      return false;
    }
  }, [refetch]);

  // Cargar datos al montar o cuando cambia lotId
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Datos
    analisis,
    ultimoAnalisis,
    deficits,
    evolucionHistorica,

    // Estado
    loading,
    error,

    // Funciones
    refetch,
    getAnalisisByDateRange,
    marcarComoAplicado
  };
}

/**
 * Hook para análisis de suelo de múltiples lotes (predio completo)
 * @param {string} premiseId - ID del predio
 * @returns {Object} Análisis por lote
 */
export function usePremiseSoilAnalysis(premiseId) {
  const [analisisPorLote, setAnalisisPorLote] = useState([]);
  const [totalDeficits, setTotalDeficits] = useState(0);
  const [lotesConDeficit, setLotesConDeficit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!premiseId) {
      setLoading(false);
      return;
    }

    const loadPremiseAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener lotes del predio
        const { data: lotes, error: lotesError } = await supabase
          .from('lots')
          .select('id, name, area_hectares')
          .eq('premise_id', premiseId);

        if (lotesError) throw lotesError;

        // Obtener último análisis de cada lote
        const analisisPromises = (lotes || []).map(async (lote) => {
          const { data: analisis, error } = await supabase
            .from('analisis_suelo')
            .select('*')
            .eq('lot_id', lote.id)
            .order('fecha', { ascending: false })
            .limit(1);

          if (error) {
            console.error(`Error obteniendo análisis de lote ${lote.id}:`, error);
            return null;
          }

          if (analisis && analisis.length > 0) {
            const deficits = calcularDeficits(analisis[0]);
            return {
              lote,
              analisis: analisis[0],
              deficits,
              tieneDeficit: deficits.length > 0
            };
          }

          return null;
        });

        const resultados = await Promise.all(analisisPromises);
        const analisisValidos = resultados.filter(r => r !== null);

        setAnalisisPorLote(analisisValidos);

        // Calcular totales
        const lotesConDef = analisisValidos.filter(a => a.tieneDeficit);
        setLotesConDeficit(lotesConDef);

        const totalDef = lotesConDef.reduce((sum, a) => sum + a.deficits.length, 0);
        setTotalDeficits(totalDef);

      } catch (err) {
        console.error('Error cargando análisis del predio:', err);
        setError(err.message || 'Error al cargar análisis del predio');
      } finally {
        setLoading(false);
      }
    };

    loadPremiseAnalysis();
  }, [premiseId]);

  return {
    analisisPorLote,
    totalDeficits,
    lotesConDeficit,
    loading,
    error
  };
}

/**
 * Hook simplificado para obtener estado de un parámetro específico
 * @param {string} lotId - ID del lote
 * @param {string} parametro - Parámetro a analizar ('P', 'K', 'MO', 'pH', 'N', 'S')
 * @returns {Object} Estado del parámetro
 */
export function useSoilParameter(lotId, parametro) {
  const [resultado, setResultado] = useState(null);
  const [objetivo, setObjetivo] = useState(null);
  const [deficit, setDeficit] = useState(0);
  const [estado, setEstado] = useState('normal'); // 'normal', 'bajo', 'critico'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lotId || !parametro) {
      setLoading(false);
      return;
    }

    const loadParameter = async () => {
      try {
        setLoading(true);

        // Obtener último análisis
        const { data, error } = await supabase
          .from('analisis_suelo')
          .select('*')
          .eq('lot_id', lotId)
          .order('fecha', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const analisis = data[0];

          // Mapear parámetro a columnas
          const paramMap = {
            P: { resultado: 'p_resultado', objetivo: 'p_objetivo' },
            K: { resultado: 'k_resultado', objetivo: 'k_objetivo' },
            MO: { resultado: 'mo', objetivo: null }, // MO no tiene objetivo en DB
            pH: { resultado: 'ph', objetivo: null },
            N: { resultado: 'n_resultado', objetivo: 'n_objetivo' },
            S: { resultado: 's_resultado', objetivo: 's_objetivo' }
          };

          const columns = paramMap[parametro];
          if (columns) {
            const res = analisis[columns.resultado];
            const obj = columns.objetivo ? analisis[columns.objetivo] : null;

            setResultado(res);
            setObjetivo(obj);

            // Calcular déficit y estado
            if (res && obj) {
              const def = parseFloat(obj) - parseFloat(res);
              setDeficit(def);

              const porcentaje = (parseFloat(res) / parseFloat(obj)) * 100;
              if (porcentaje < 50) {
                setEstado('critico');
              } else if (porcentaje < 70) {
                setEstado('bajo');
              } else {
                setEstado('normal');
              }
            } else if (parametro === 'MO' && res) {
              // Materia orgánica: < 3% es bajo
              if (parseFloat(res) < 2) {
                setEstado('critico');
              } else if (parseFloat(res) < 3) {
                setEstado('bajo');
              } else {
                setEstado('normal');
              }
            } else if (parametro === 'pH' && res) {
              // pH: fuera de rango 6.0-7.5
              const ph = parseFloat(res);
              if (ph < 5.5 || ph > 8.0) {
                setEstado('critico');
              } else if (ph < 6.0 || ph > 7.5) {
                setEstado('bajo');
              } else {
                setEstado('normal');
              }
            }
          }
        }

      } catch (err) {
        console.error('Error cargando parámetro de suelo:', err);
      } finally {
        setLoading(false);
      }
    };

    loadParameter();
  }, [lotId, parametro]);

  return {
    resultado,
    objetivo,
    deficit,
    estado,
    loading
  };
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Calcula déficits de un análisis de suelo
 * @param {Object} analisis - Análisis de suelo
 * @returns {Array} Array de déficits detectados
 */
function calcularDeficits(analisis) {
  const deficits = [];

  // Verificar P (Fósforo)
  if (analisis.p_resultado && analisis.p_objetivo) {
    const porcentaje = (parseFloat(analisis.p_resultado) / parseFloat(analisis.p_objetivo)) * 100;
    if (porcentaje < 70) {
      deficits.push({
        parametro: 'P',
        nombre: 'Fósforo',
        resultado: analisis.p_resultado,
        objetivo: analisis.p_objetivo,
        deficit: parseFloat(analisis.p_objetivo) - parseFloat(analisis.p_resultado),
        porcentaje,
        severidad: porcentaje < 50 ? 'critica' : 'moderada',
        fuente: analisis.p_fuente_recomendada,
        kg_ha: analisis.p_kg_ha,
        kg_total: analisis.p_kg_total
      });
    }
  }

  // Verificar K (Potasio)
  if (analisis.k_resultado && analisis.k_objetivo) {
    const porcentaje = (parseFloat(analisis.k_resultado) / parseFloat(analisis.k_objetivo)) * 100;
    if (porcentaje < 70) {
      deficits.push({
        parametro: 'K',
        nombre: 'Potasio',
        resultado: analisis.k_resultado,
        objetivo: analisis.k_objetivo,
        deficit: parseFloat(analisis.k_objetivo) - parseFloat(analisis.k_resultado),
        porcentaje,
        severidad: porcentaje < 50 ? 'critica' : 'moderada',
        fuente: analisis.k_fuente_recomendada,
        kg_ha: analisis.k_kg_ha,
        kg_total: analisis.k_kg_total
      });
    }
  }

  // Verificar N (Nitrógeno)
  if (analisis.n_resultado && analisis.n_objetivo) {
    const porcentaje = (parseFloat(analisis.n_resultado) / parseFloat(analisis.n_objetivo)) * 100;
    if (porcentaje < 70) {
      deficits.push({
        parametro: 'N',
        nombre: 'Nitrógeno',
        resultado: analisis.n_resultado,
        objetivo: analisis.n_objetivo,
        deficit: parseFloat(analisis.n_objetivo) - parseFloat(analisis.n_resultado),
        porcentaje,
        severidad: porcentaje < 50 ? 'critica' : 'moderada',
        fuente: analisis.n_fuente_recomendada,
        kg_ha: analisis.n_kg_ha,
        kg_total: analisis.n_kg_total
      });
    }
  }

  // Verificar S (Azufre)
  if (analisis.s_resultado && analisis.s_objetivo) {
    const porcentaje = (parseFloat(analisis.s_resultado) / parseFloat(analisis.s_objetivo)) * 100;
    if (porcentaje < 70) {
      deficits.push({
        parametro: 'S',
        nombre: 'Azufre',
        resultado: analisis.s_resultado,
        objetivo: analisis.s_objetivo,
        deficit: parseFloat(analisis.s_objetivo) - parseFloat(analisis.s_resultado),
        porcentaje,
        severidad: porcentaje < 50 ? 'critica' : 'moderada',
        fuente: analisis.s_fuente_recomendada,
        kg_ha: analisis.s_kg_ha,
        kg_total: analisis.s_kg_total
      });
    }
  }

  // Verificar MO (Materia Orgánica)
  if (analisis.mo && parseFloat(analisis.mo) < 3.0) {
    deficits.push({
      parametro: 'MO',
      nombre: 'Materia Orgánica',
      resultado: analisis.mo,
      objetivo: '3.0',
      deficit: 3.0 - parseFloat(analisis.mo),
      porcentaje: (parseFloat(analisis.mo) / 3.0) * 100,
      severidad: parseFloat(analisis.mo) < 2.0 ? 'critica' : 'moderada'
    });
  }

  // Verificar pH
  if (analisis.ph) {
    const ph = parseFloat(analisis.ph);
    if (ph < 6.0 || ph > 7.5) {
      deficits.push({
        parametro: 'pH',
        nombre: 'pH del Suelo',
        resultado: analisis.ph,
        objetivo: '6.0-7.5',
        tipo: ph < 6.0 ? 'ácido' : 'alcalino',
        severidad: (ph < 5.5 || ph > 8.0) ? 'critica' : 'moderada'
      });
    }
  }

  return deficits;
}

/**
 * Calcula evolución histórica de parámetros
 * @param {Array} analisis - Array de análisis ordenados por fecha (más reciente primero)
 * @returns {Object} Evolución por parámetro
 */
function calcularEvolucionHistorica(analisis) {
  const parametros = ['P', 'K', 'MO', 'pH', 'N', 'S'];
  const evolucion = {};

  parametros.forEach(param => {
    const columnMap = {
      P: 'p_resultado',
      K: 'k_resultado',
      MO: 'mo',
      pH: 'ph',
      N: 'n_resultado',
      S: 's_resultado'
    };

    const column = columnMap[param];
    const valores = analisis
      .filter(a => a[column] != null)
      .map(a => ({
        fecha: a.fecha,
        valor: parseFloat(a[column])
      }))
      .reverse(); // Ordenar del más antiguo al más reciente

    if (valores.length > 0) {
      // Calcular tendencia (simple: comparar primero con último)
      let tendencia = 'estable';
      if (valores.length >= 2) {
        const primero = valores[0].valor;
        const ultimo = valores[valores.length - 1].valor;
        const cambio = ((ultimo - primero) / primero) * 100;

        if (cambio > 5) {
          tendencia = 'mejorando';
        } else if (cambio < -5) {
          tendencia = 'empeorando';
        }
      }

      evolucion[param] = {
        valores,
        tendencia,
        ultimoValor: valores[valores.length - 1].valor,
        primerValor: valores[0].valor
      };
    }
  });

  return evolucion;
}
