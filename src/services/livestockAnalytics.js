/**
 * livestockAnalytics.js
 *
 * Servicio para análisis de datos de monitoreo de pasturas
 * Cálculos de tendencias, proyecciones y recomendaciones de manejo
 */

import { supabase } from '../lib/supabase';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Obtiene registros de monitoreo de pasturas para un lote
 * @param {string} lotId - ID del lote
 * @param {number} diasHistorico - Cantidad de días hacia atrás (default: 90)
 * @returns {Promise<Array>} Array de registros ordenados por fecha DESC
 */
export async function obtenerRegistrosPastura(lotId, diasHistorico = 90) {
  try {
    const fechaInicio = subDays(new Date(), diasHistorico);
    const fechaInicioStr = format(fechaInicio, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('monitoreo_pasturas')
      .select(`
        *,
        lots (
          id,
          name,
          area_hectares
        )
      `)
      .eq('lot_id', lotId)
      .gte('fecha', fechaInicioStr)
      .order('fecha', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo registros de pasturas:', error);
    throw error;
  }
}

/**
 * Obtiene todos los registros de pasturas para un predio
 * @param {string} premiseId - ID del predio
 * @param {number} diasHistorico - Cantidad de días hacia atrás
 * @returns {Promise<Array>} Array de registros con info del lote
 */
export async function obtenerRegistrosPasturasPredio(premiseId, diasHistorico = 90) {
  try {
    const fechaInicio = subDays(new Date(), diasHistorico);
    const fechaInicioStr = format(fechaInicio, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('monitoreo_pasturas')
      .select(`
        *,
        lots (
          id,
          name,
          area_hectares,
          premise_id
        )
      `)
      .eq('premise_id', premiseId)
      .gte('fecha', fechaInicioStr)
      .order('fecha', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo registros de pasturas del predio:', error);
    throw error;
  }
}

/**
 * Calcula la velocidad de crecimiento de pastura en cm/día
 * @param {string} lotId - ID del lote
 * @param {number} diasAAnalizar - Cantidad de días a analizar (default: 30)
 * @returns {Promise<Object>} Velocidad de crecimiento y datos relacionados
 */
export async function calcularVelocidadCrecimiento(lotId, diasAAnalizar = 30) {
  try {
    const registros = await obtenerRegistrosPastura(lotId, diasAAnalizar);

    if (registros.length < 2) {
      return {
        velocidad: null,
        tendencia: 'SIN_DATOS',
        mensaje: 'Se necesitan al menos 2 mediciones para calcular velocidad',
        registrosAnalizados: registros.length
      };
    }

    // Ordenar por fecha ascendente para cálculo
    const registrosOrdenados = [...registros].sort((a, b) => {
      const fechaA = new Date(a.fecha + 'T00:00:00');
      const fechaB = new Date(b.fecha + 'T00:00:00');
      return fechaA - fechaB;
    });

    // Calcular velocidad entre cada par de mediciones consecutivas
    const velocidades = [];

    for (let i = 1; i < registrosOrdenados.length; i++) {
      const anterior = registrosOrdenados[i - 1];
      const actual = registrosOrdenados[i];

      // Usar altura promedio calculada o calcular manualmente
      const alturaAnterior = anterior.altura_promedio_cm || calcularAlturaPromedio(
        anterior.altura_lugar1_cm,
        anterior.altura_lugar2_cm,
        anterior.altura_lugar3_cm
      );

      const alturaActual = actual.altura_promedio_cm || calcularAlturaPromedio(
        actual.altura_lugar1_cm,
        actual.altura_lugar2_cm,
        actual.altura_lugar3_cm
      );

      if (alturaAnterior && alturaActual) {
        const fechaAnterior = parseISO(anterior.fecha);
        const fechaActual = parseISO(actual.fecha);
        const diasEntreMediciones = differenceInDays(fechaActual, fechaAnterior);

        if (diasEntreMediciones > 0) {
          const diferencia = alturaActual - alturaAnterior;
          const velocidad = diferencia / diasEntreMediciones;
          velocidades.push({
            velocidad,
            diferencia,
            dias: diasEntreMediciones,
            fechaInicio: anterior.fecha,
            fechaFin: actual.fecha
          });
        }
      }
    }

    if (velocidades.length === 0) {
      return {
        velocidad: null,
        tendencia: 'SIN_DATOS',
        mensaje: 'No se pudieron calcular velocidades con los datos disponibles',
        registrosAnalizados: registros.length
      };
    }

    // Calcular velocidad promedio
    const velocidadPromedio = velocidades.reduce((sum, v) => sum + v.velocidad, 0) / velocidades.length;

    // Determinar tendencia
    let tendencia, color, descripcion;

    if (velocidadPromedio > 0.5) {
      tendencia = 'RECUPERACION';
      color = 'green';
      descripcion = `Pastura en recuperación (${velocidadPromedio.toFixed(2)} cm/día)`;
    } else if (velocidadPromedio >= -0.2) {
      tendencia = 'ESTABLE';
      color = 'blue';
      descripcion = `Pastura estable (${velocidadPromedio.toFixed(2)} cm/día)`;
    } else if (velocidadPromedio >= -0.5) {
      tendencia = 'DEGRADACION_LEVE';
      color = 'yellow';
      descripcion = `Degradación leve (${velocidadPromedio.toFixed(2)} cm/día)`;
    } else {
      tendencia = 'DEGRADACION_SEVERA';
      color = 'red';
      descripcion = `Degradación severa (${velocidadPromedio.toFixed(2)} cm/día)`;
    }

    return {
      velocidad: Math.round(velocidadPromedio * 100) / 100,
      tendencia,
      color,
      descripcion,
      registrosAnalizados: registros.length,
      medicionesUtilizadas: velocidades.length,
      velocidadMaxima: Math.max(...velocidades.map(v => v.velocidad)),
      velocidadMinima: Math.min(...velocidades.map(v => v.velocidad)),
      detalleVelocidades: velocidades
    };
  } catch (error) {
    console.error('Error calculando velocidad de crecimiento:', error);
    throw error;
  }
}

/**
 * Proyecta días hasta alcanzar el remanente crítico
 * @param {string} lotId - ID del lote
 * @param {number} remanenteCritico - Altura crítica en cm (opcional)
 * @returns {Promise<Object>} Proyección de días y recomendaciones
 */
export async function proyectarDiasHastaRemanente(lotId, remanenteCritico = null) {
  try {
    const registros = await obtenerRegistrosPastura(lotId, 60);

    if (registros.length === 0) {
      return {
        diasHastaRemanente: null,
        mensaje: 'No hay registros disponibles',
        estado: 'SIN_DATOS'
      };
    }

    // Obtener última medición
    const ultimoRegistro = registros[0];
    const alturaActual = ultimoRegistro.altura_promedio_cm || calcularAlturaPromedio(
      ultimoRegistro.altura_lugar1_cm,
      ultimoRegistro.altura_lugar2_cm,
      ultimoRegistro.altura_lugar3_cm
    );

    // Usar remanente del último registro o el proporcionado
    const remanente = remanenteCritico || ultimoRegistro.remanente_objetivo_cm;

    if (!remanente || !alturaActual) {
      return {
        diasHastaRemanente: null,
        mensaje: 'Falta información de altura o remanente objetivo',
        estado: 'SIN_DATOS'
      };
    }

    // Si ya estamos por debajo del remanente
    if (alturaActual <= remanente) {
      return {
        diasHastaRemanente: 0,
        alturaActual,
        remanente,
        diferencia: alturaActual - remanente,
        estado: 'CRITICO',
        color: 'red',
        mensaje: `¡CRÍTICO! La altura actual (${alturaActual}cm) está por debajo del remanente (${remanente}cm)`,
        recomendacion: 'Mover animales inmediatamente o suplementar con forraje'
      };
    }

    // Calcular velocidad de crecimiento
    const velocidadInfo = await calcularVelocidadCrecimiento(lotId, 30);

    if (!velocidadInfo.velocidad) {
      return {
        diasHastaRemanente: null,
        alturaActual,
        remanente,
        mensaje: 'No se puede proyectar sin datos de velocidad de crecimiento',
        estado: 'SIN_DATOS'
      };
    }

    const velocidad = velocidadInfo.velocidad;
    const diferencia = alturaActual - remanente;

    // Si la pastura está creciendo, no alcanzará el remanente
    if (velocidad >= 0) {
      return {
        diasHastaRemanente: Infinity,
        alturaActual,
        remanente,
        diferencia,
        velocidad,
        estado: 'SEGURO',
        color: 'green',
        mensaje: `Pastura en crecimiento (${velocidad.toFixed(2)} cm/día). No alcanzará remanente`,
        recomendacion: 'Monitoreo normal. Considerar aumentar carga si supera umbral óptimo'
      };
    }

    // Calcular días hasta remanente (velocidad negativa)
    const diasHastaRemanente = Math.ceil(diferencia / Math.abs(velocidad));

    let estado, color, mensaje, recomendacion;

    if (diasHastaRemanente <= 7) {
      estado = 'URGENTE';
      color = 'red';
      mensaje = `¡URGENTE! Quedan ${diasHastaRemanente} días hasta remanente crítico`;
      recomendacion = 'Planificar movimiento de animales o suplementación en menos de 1 semana';
    } else if (diasHastaRemanente <= 14) {
      estado = 'ATENCION';
      color = 'orange';
      mensaje = `Atención: Quedan ${diasHastaRemanente} días hasta remanente crítico`;
      recomendacion = 'Preparar lote alternativo o plan de suplementación';
    } else if (diasHastaRemanente <= 30) {
      estado = 'PRECAUCION';
      color = 'yellow';
      mensaje = `Precaución: Quedan ${diasHastaRemanente} días hasta remanente crítico`;
      recomendacion = 'Monitorear semanalmente y planificar con anticipación';
    } else {
      estado = 'NORMAL';
      color = 'green';
      mensaje = `Normal: Quedan ${diasHastaRemanente} días hasta remanente crítico`;
      recomendacion = 'Continuar con monitoreo rutinario';
    }

    return {
      diasHastaRemanente,
      alturaActual,
      remanente,
      diferencia,
      velocidad,
      estado,
      color,
      mensaje,
      recomendacion,
      fechaProyectada: format(new Date(Date.now() + diasHastaRemanente * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    };
  } catch (error) {
    console.error('Error proyectando días hasta remanente:', error);
    throw error;
  }
}

/**
 * Calcula la altura promedio de 3 mediciones
 * @param {number} altura1 - Altura lugar 1
 * @param {number} altura2 - Altura lugar 2
 * @param {number} altura3 - Altura lugar 3
 * @returns {number|null} Altura promedio o null
 */
function calcularAlturaPromedio(altura1, altura2, altura3) {
  const alturas = [altura1, altura2, altura3].filter(a => a !== null && a !== undefined && a > 0);

  if (alturas.length === 0) return null;

  return alturas.reduce((sum, a) => sum + a, 0) / alturas.length;
}

/**
 * Calcula la altura promedio histórica para un lote
 * @param {string} lotId - ID del lote
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<Object>} Altura promedio y estadísticas
 */
export async function calcularAlturaPromedioHistorica(lotId, fechaInicio, fechaFin) {
  try {
    const fechaInicioStr = format(fechaInicio, 'yyyy-MM-dd');
    const fechaFinStr = format(fechaFin, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('monitoreo_pasturas')
      .select('altura_promedio_cm, altura_lugar1_cm, altura_lugar2_cm, altura_lugar3_cm')
      .eq('lot_id', lotId)
      .gte('fecha', fechaInicioStr)
      .lte('fecha', fechaFinStr);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        promedio: null,
        registros: 0,
        mensaje: 'No hay registros en el período especificado'
      };
    }

    // Calcular promedio usando altura_promedio_cm si existe, sino calcular
    const alturas = data.map(r => {
      return r.altura_promedio_cm || calcularAlturaPromedio(
        r.altura_lugar1_cm,
        r.altura_lugar2_cm,
        r.altura_lugar3_cm
      );
    }).filter(a => a !== null);

    if (alturas.length === 0) {
      return {
        promedio: null,
        registros: data.length,
        mensaje: 'No se pudieron calcular alturas'
      };
    }

    const promedio = alturas.reduce((sum, a) => sum + a, 0) / alturas.length;
    const maximo = Math.max(...alturas);
    const minimo = Math.min(...alturas);

    return {
      promedio: Math.round(promedio * 10) / 10,
      maximo: Math.round(maximo * 10) / 10,
      minimo: Math.round(minimo * 10) / 10,
      registros: alturas.length,
      periodo: {
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr
      }
    };
  } catch (error) {
    console.error('Error calculando altura promedio histórica:', error);
    throw error;
  }
}

/**
 * Detecta la tendencia de la pastura (recuperación vs degradación)
 * @param {string} lotId - ID del lote
 * @param {number} diasAAnalizar - Cantidad de días a analizar (default: 30)
 * @returns {Promise<Object>} Información de tendencia
 */
export async function detectarTendencia(lotId, diasAAnalizar = 30) {
  try {
    const velocidadInfo = await calcularVelocidadCrecimiento(lotId, diasAAnalizar);

    if (!velocidadInfo.velocidad) {
      return {
        tendencia: 'SIN_DATOS',
        color: 'gray',
        mensaje: 'No hay suficientes datos para determinar tendencia',
        confianza: 0
      };
    }

    // Calcular confianza basada en cantidad de mediciones
    const confianza = Math.min(100, (velocidadInfo.medicionesUtilizadas / 5) * 100);

    return {
      tendencia: velocidadInfo.tendencia,
      color: velocidadInfo.color,
      descripcion: velocidadInfo.descripcion,
      velocidad: velocidadInfo.velocidad,
      confianza: Math.round(confianza),
      registrosAnalizados: velocidadInfo.registrosAnalizados,
      recomendacion: obtenerRecomendacionPorTendencia(velocidadInfo.tendencia, velocidadInfo.velocidad)
    };
  } catch (error) {
    console.error('Error detectando tendencia:', error);
    throw error;
  }
}

/**
 * Obtiene recomendación de manejo según tendencia
 * @param {string} tendencia - Tipo de tendencia
 * @param {number} velocidad - Velocidad en cm/día
 * @returns {string} Recomendación
 */
function obtenerRecomendacionPorTendencia(tendencia, velocidad) {
  switch (tendencia) {
    case 'RECUPERACION':
      return 'Pastura en buen estado. Considerar aumentar carga animal si supera altura óptima.';
    case 'ESTABLE':
      return 'Mantener carga actual y continuar monitoreo.';
    case 'DEGRADACION_LEVE':
      return 'Reducir carga animal o rotar a otro lote en los próximos 7-10 días.';
    case 'DEGRADACION_SEVERA':
      return 'Acción urgente: Mover animales o suplementar inmediatamente para evitar sobrepastoreo.';
    default:
      return 'Realizar mediciones adicionales para determinar estado.';
  }
}

/**
 * Calcula la carga animal recomendada basada en disponibilidad forrajera
 * @param {string} lotId - ID del lote
 * @param {number} consumoDiarioPorAnimal - Consumo en kg MS/día (default: 10)
 * @param {number} eficienciaUtilizacion - Eficiencia de utilización % (default: 70)
 * @returns {Promise<Object>} Carga recomendada
 */
export async function calcularCargaRecomendada(lotId, consumoDiarioPorAnimal = 10, eficienciaUtilizacion = 70) {
  try {
    const registros = await obtenerRegistrosPastura(lotId, 30);

    if (registros.length === 0) {
      return {
        cargaRecomendada: null,
        mensaje: 'No hay registros disponibles',
        estado: 'SIN_DATOS'
      };
    }

    const ultimoRegistro = registros[0];
    const alturaActual = ultimoRegistro.altura_promedio_cm || calcularAlturaPromedio(
      ultimoRegistro.altura_lugar1_cm,
      ultimoRegistro.altura_lugar2_cm,
      ultimoRegistro.altura_lugar3_cm
    );

    const remanente = ultimoRegistro.remanente_objetivo_cm;
    const hectareas = ultimoRegistro.hectareas || ultimoRegistro.lots?.area_hectares;

    if (!alturaActual || !remanente || !hectareas) {
      return {
        cargaRecomendada: null,
        mensaje: 'Falta información de altura, remanente o hectáreas',
        estado: 'SIN_DATOS'
      };
    }

    // Calcular forraje disponible
    // Fórmula simplificada: (altura_actual - remanente) * hectáreas * factor_conversión
    // Factor conversión aproximado: 1cm = 200 kg MS/ha
    const alturaDisponible = Math.max(0, alturaActual - remanente);
    const forrajeDisponibleKgMS = alturaDisponible * hectareas * 200;

    // Aplicar eficiencia de utilización
    const forrajeUtilizable = forrajeDisponibleKgMS * (eficienciaUtilizacion / 100);

    // Calcular días de pastoreo para 1 animal
    const diasPorAnimal = forrajeUtilizable / consumoDiarioPorAnimal;

    // Calcular animales para 7 días de pastoreo
    const diasObjetivo = 7;
    const cargaRecomendada = diasPorAnimal / diasObjetivo;

    let estado, color, mensaje;

    if (cargaRecomendada < 1) {
      estado = 'INSUFICIENTE';
      color = 'red';
      mensaje = 'Forraje insuficiente. No se recomienda pastoreo.';
    } else if (cargaRecomendada < 5) {
      estado = 'BAJA';
      color = 'yellow';
      mensaje = `Carga baja: ${Math.floor(cargaRecomendada)} animales por ${diasObjetivo} días`;
    } else if (cargaRecomendada < 20) {
      estado = 'MODERADA';
      color = 'green';
      mensaje = `Carga moderada: ${Math.floor(cargaRecomendada)} animales por ${diasObjetivo} días`;
    } else {
      estado = 'ALTA';
      color = 'blue';
      mensaje = `Carga alta disponible: ${Math.floor(cargaRecomendada)} animales por ${diasObjetivo} días`;
    }

    return {
      cargaRecomendada: Math.floor(cargaRecomendada),
      forrajeDisponibleKgMS: Math.round(forrajeDisponibleKgMS),
      forrajeUtilizableKgMS: Math.round(forrajeUtilizable),
      alturaActual,
      remanente,
      alturaDisponible,
      hectareas,
      diasObjetivo,
      estado,
      color,
      mensaje,
      parametros: {
        consumoDiarioPorAnimal,
        eficienciaUtilizacion
      }
    };
  } catch (error) {
    console.error('Error calculando carga recomendada:', error);
    throw error;
  }
}

/**
 * Compara lotes por oferta forrajera
 * @param {string} premiseId - ID del predio
 * @returns {Promise<Array>} Array de lotes ordenados por disponibilidad
 */
export async function compararLotesPorOferta(premiseId) {
  try {
    // Obtener últimas mediciones de cada lote
    const { data: lotes, error: lotesError } = await supabase
      .from('lots')
      .select('id, name, area_hectares')
      .eq('premise_id', premiseId);

    if (lotesError) throw lotesError;

    if (!lotes || lotes.length === 0) {
      return [];
    }

    const comparaciones = [];

    for (const lote of lotes) {
      try {
        const registros = await obtenerRegistrosPastura(lote.id, 30);

        if (registros.length > 0) {
          const ultimoRegistro = registros[0];
          const alturaActual = ultimoRegistro.altura_promedio_cm || calcularAlturaPromedio(
            ultimoRegistro.altura_lugar1_cm,
            ultimoRegistro.altura_lugar2_cm,
            ultimoRegistro.altura_lugar3_cm
          );

          const remanente = ultimoRegistro.remanente_objetivo_cm;

          if (alturaActual && remanente) {
            const alturaDisponible = Math.max(0, alturaActual - remanente);
            const forrajeDisponibleKgMS = alturaDisponible * (lote.area_hectares || ultimoRegistro.hectareas || 1) * 200;

            // Determinar estado
            let estado, color;
            if (alturaActual <= remanente) {
              estado = 'CRITICO';
              color = 'red';
            } else if (alturaActual <= remanente + 3) {
              estado = 'BAJO';
              color = 'orange';
            } else if (alturaActual <= remanente + 7) {
              estado = 'MODERADO';
              color = 'yellow';
            } else {
              estado = 'BUENO';
              color = 'green';
            }

            comparaciones.push({
              loteId: lote.id,
              loteNombre: lote.name,
              alturaActual,
              remanente,
              alturaDisponible,
              forrajeDisponibleKgMS: Math.round(forrajeDisponibleKgMS),
              hectareas: lote.area_hectares || ultimoRegistro.hectareas,
              fechaMedicion: ultimoRegistro.fecha,
              estado,
              color
            });
          }
        }
      } catch (error) {
        console.warn(`Error procesando lote ${lote.name}:`, error);
      }
    }

    // Ordenar por forraje disponible (mayor a menor)
    comparaciones.sort((a, b) => b.forrajeDisponibleKgMS - a.forrajeDisponibleKgMS);

    return comparaciones;
  } catch (error) {
    console.error('Error comparando lotes por oferta:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas completas de un lote
 * @param {string} lotId - ID del lote
 * @returns {Promise<Object>} Estadísticas completas del lote
 */
export async function obtenerEstadisticasCompletasLote(lotId) {
  try {
    const [
      registros,
      velocidadInfo,
      proyeccionRemanente,
      tendenciaInfo,
      cargaRecomendada
    ] = await Promise.all([
      obtenerRegistrosPastura(lotId, 90),
      calcularVelocidadCrecimiento(lotId, 30),
      proyectarDiasHastaRemanente(lotId),
      detectarTendencia(lotId, 30),
      calcularCargaRecomendada(lotId)
    ]);

    const ultimoRegistro = registros[0] || null;

    return {
      ultimoRegistro,
      velocidadCrecimiento: velocidadInfo,
      proyeccionRemanente,
      tendencia: tendenciaInfo,
      cargaRecomendada,
      totalRegistros: registros.length,
      fechaConsulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas completas del lote:', error);
    throw error;
  }
}
