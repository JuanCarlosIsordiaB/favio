/**
 * rainfallCalculations.js
 *
 * Utilidades puras para cálculos de lluvia
 * Sin dependencias de Supabase - funciones puras de JavaScript
 */

import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';

/**
 * Calcula el acumulado total de un array de registros de lluvia
 * @param {Array} registros - Array de objetos con propiedad 'mm'
 * @returns {number} Acumulado en mm
 */
export function calcularAcumulado(registros) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return 0;
  }

  return registros.reduce((total, registro) => {
    const mm = parseFloat(registro.mm) || 0;
    return total + mm;
  }, 0);
}

/**
 * Agrupa registros por mes
 * @param {Array} registros - Array de registros con 'fecha' y 'mm'
 * @returns {Object} Objeto con formato { 'YYYY-MM': { mes, anio, registros, acumulado } }
 */
export function agruparPorMes(registros) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return {};
  }

  const agrupados = {};

  registros.forEach(registro => {
    if (!registro.fecha) return;

    const fecha = new Date(registro.fecha + 'T00:00:00');
    const mesKey = format(fecha, 'yyyy-MM');
    const mes = format(fecha, 'MM');
    const anio = format(fecha, 'yyyy');

    if (!agrupados[mesKey]) {
      agrupados[mesKey] = {
        mes,
        anio,
        mesNombre: format(fecha, 'MMMM'),
        registros: [],
        acumulado: 0
      };
    }

    agrupados[mesKey].registros.push(registro);
    agrupados[mesKey].acumulado += parseFloat(registro.mm) || 0;
  });

  return agrupados;
}

/**
 * Agrupa registros por año
 * @param {Array} registros - Array de registros con 'fecha' y 'mm'
 * @returns {Object} Objeto con formato { 'YYYY': { anio, registros, acumulado } }
 */
export function agruparPorAnio(registros) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return {};
  }

  const agrupados = {};

  registros.forEach(registro => {
    if (!registro.fecha) return;

    const fecha = new Date(registro.fecha + 'T00:00:00');
    const anio = format(fecha, 'yyyy');

    if (!agrupados[anio]) {
      agrupados[anio] = {
        anio,
        registros: [],
        acumulado: 0
      };
    }

    agrupados[anio].registros.push(registro);
    agrupados[anio].acumulado += parseFloat(registro.mm) || 0;
  });

  return agrupados;
}

/**
 * Calcula el promedio de un array de valores numéricos
 * @param {Array<number>} valores - Array de números
 * @returns {number} Promedio
 */
export function calcularPromedio(valores) {
  if (!Array.isArray(valores) || valores.length === 0) {
    return 0;
  }

  const valoresFiltrados = valores.filter(v => typeof v === 'number' && !isNaN(v));

  if (valoresFiltrados.length === 0) {
    return 0;
  }

  const suma = valoresFiltrados.reduce((acc, val) => acc + val, 0);
  return suma / valoresFiltrados.length;
}

/**
 * Calcula la desviación estándar de un array de valores
 * @param {Array<number>} valores - Array de números
 * @returns {number} Desviación estándar
 */
export function calcularDesviacionEstandar(valores) {
  if (!Array.isArray(valores) || valores.length === 0) {
    return 0;
  }

  const valoresFiltrados = valores.filter(v => typeof v === 'number' && !isNaN(v));

  if (valoresFiltrados.length === 0) {
    return 0;
  }

  const promedio = calcularPromedio(valoresFiltrados);
  const varianza = valoresFiltrados.reduce((acc, val) => {
    return acc + Math.pow(val - promedio, 2);
  }, 0) / valoresFiltrados.length;

  return Math.sqrt(varianza);
}

/**
 * Determina la clasificación de una campaña basada en el acumulado
 * @param {number} acumuladoMm - Acumulado de lluvia en mm
 * @param {number} promedioHistorico - Promedio histórico en mm
 * @returns {Object} { clasificacion: string, descripcion: string, color: string }
 */
export function clasificarCampania(acumuladoMm, promedioHistorico) {
  if (!acumuladoMm || !promedioHistorico) {
    return {
      clasificacion: 'SIN_DATOS',
      descripcion: 'Sin datos suficientes para clasificar',
      color: 'gray'
    };
  }

  const porcentaje = (acumuladoMm / promedioHistorico) * 100;

  if (porcentaje >= 110) {
    return {
      clasificacion: 'HUMEDA',
      descripcion: 'Campaña húmeda (>110% del promedio)',
      color: 'blue',
      porcentaje: Math.round(porcentaje)
    };
  } else if (porcentaje >= 90) {
    return {
      clasificacion: 'NORMAL',
      descripcion: 'Campaña normal (90-110% del promedio)',
      color: 'green',
      porcentaje: Math.round(porcentaje)
    };
  } else if (porcentaje >= 70) {
    return {
      clasificacion: 'SECA',
      descripcion: 'Campaña seca (70-90% del promedio)',
      color: 'yellow',
      porcentaje: Math.round(porcentaje)
    };
  } else {
    return {
      clasificacion: 'MUY_SECA',
      descripcion: 'Campaña muy seca (<70% del promedio)',
      color: 'red',
      porcentaje: Math.round(porcentaje)
    };
  }
}

/**
 * Obtiene el rango de fechas para una campaña agrícola (julio-junio)
 * @param {number} anioInicio - Año de inicio de la campaña (ej: 2024 para campaña 2024/2025)
 * @returns {Object} { fechaInicio: Date, fechaFin: Date, nombre: string }
 */
export function obtenerRangoCampania(anioInicio) {
  const fechaInicio = new Date(anioInicio, 6, 1); // Julio (mes 6, 0-indexed)
  const fechaFin = new Date(anioInicio + 1, 5, 30); // Junio del año siguiente

  return {
    fechaInicio,
    fechaFin,
    nombre: `${anioInicio}/${anioInicio + 1}`,
    anioInicio,
    anioFin: anioInicio + 1
  };
}

/**
 * Determina en qué campaña cae una fecha dada
 * @param {Date|string} fecha - Fecha a evaluar
 * @returns {Object} Objeto con info de campaña { anioInicio, anioFin, nombre }
 */
export function obtenerCampaniaDeUnaFecha(fecha) {
  const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
  const mes = date.getMonth(); // 0-indexed (0 = Enero, 6 = Julio)
  const anio = date.getFullYear();

  // Si estamos entre julio y diciembre, la campaña inicia este año
  // Si estamos entre enero y junio, la campaña inició el año anterior
  const anioInicioCampania = mes >= 6 ? anio : anio - 1;

  return {
    anioInicio: anioInicioCampania,
    anioFin: anioInicioCampania + 1,
    nombre: `${anioInicioCampania}/${anioInicioCampania + 1}`
  };
}

/**
 * Filtra registros dentro de un rango de fechas
 * @param {Array} registros - Array de registros con 'fecha'
 * @param {Date|string} fechaInicio - Fecha de inicio
 * @param {Date|string} fechaFin - Fecha de fin
 * @returns {Array} Registros filtrados
 */
export function filtrarPorRangoFechas(registros, fechaInicio, fechaFin) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return [];
  }

  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio + 'T00:00:00') : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin + 'T00:00:00') : fechaFin;

  return registros.filter(registro => {
    if (!registro.fecha) return false;
    const fechaRegistro = new Date(registro.fecha + 'T00:00:00');
    return fechaRegistro >= inicio && fechaRegistro <= fin;
  });
}

/**
 * Calcula días sin lluvia consecutivos
 * @param {Array} registros - Array de registros ordenados por fecha DESC
 * @param {number} umbralMm - Umbral mínimo para considerar "con lluvia" (default: 1mm)
 * @returns {number} Cantidad de días sin lluvia desde el último registro
 */
export function calcularDiasSinLluvia(registros, umbralMm = 1) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return 0;
  }

  // Ordenar por fecha descendente (más reciente primero)
  const registrosOrdenados = [...registros].sort((a, b) => {
    const fechaA = new Date(a.fecha + 'T00:00:00');
    const fechaB = new Date(b.fecha + 'T00:00:00');
    return fechaB - fechaA;
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Encontrar el último registro con lluvia significativa
  const ultimaLluviaSig = registrosOrdenados.find(r => parseFloat(r.mm) >= umbralMm);

  if (!ultimaLluviaSig) {
    // Si no hay registros con lluvia significativa, retornar desde el primer registro
    const primerRegistro = registrosOrdenados[registrosOrdenados.length - 1];
    const fechaPrimer = new Date(primerRegistro.fecha + 'T00:00:00');
    return differenceInDays(hoy, fechaPrimer);
  }

  const fechaUltimaLluvia = new Date(ultimaLluviaSig.fecha + 'T00:00:00');
  return differenceInDays(hoy, fechaUltimaLluvia);
}

/**
 * Obtiene estadísticas mensuales de lluvia
 * @param {Object} registrosPorMes - Resultado de agruparPorMes()
 * @returns {Array} Array con estadísticas por mes [{ mes, anio, acumulado, dias, promedioDiario }]
 */
export function obtenerEstadisticasMensuales(registrosPorMes) {
  return Object.values(registrosPorMes).map(mes => ({
    mes: mes.mes,
    anio: mes.anio,
    mesNombre: mes.mesNombre,
    acumulado: Math.round(mes.acumulado * 10) / 10,
    dias: mes.registros.length,
    promedioDiario: mes.registros.length > 0
      ? Math.round((mes.acumulado / mes.registros.length) * 10) / 10
      : 0
  }));
}

/**
 * Calcula el balance hídrico simple
 * @param {number} precipitacion - Precipitación en mm
 * @param {number} evapotranspiracion - Evapotranspiración estimada en mm (default: 5mm/día)
 * @param {number} dias - Cantidad de días del período
 * @returns {Object} { balance, clasificacion, descripcion }
 */
export function calcularBalanceHidrico(precipitacion, evapotranspiracion = 5, dias = 30) {
  const evapoTotal = evapotranspiracion * dias;
  const balance = precipitacion - evapoTotal;

  let clasificacion, descripcion, color;

  if (balance > 50) {
    clasificacion = 'EXCESO';
    descripcion = `Exceso hídrico de ${Math.round(balance)}mm`;
    color = 'blue';
  } else if (balance >= -20) {
    clasificacion = 'EQUILIBRIO';
    descripcion = `Balance equilibrado (${Math.round(balance)}mm)`;
    color = 'green';
  } else if (balance >= -50) {
    clasificacion = 'DEFICIT_LEVE';
    descripcion = `Déficit leve de ${Math.abs(Math.round(balance))}mm`;
    color = 'yellow';
  } else {
    clasificacion = 'DEFICIT_SEVERO';
    descripcion = `Déficit severo de ${Math.abs(Math.round(balance))}mm`;
    color = 'red';
  }

  return {
    balance: Math.round(balance * 10) / 10,
    precipitacion: Math.round(precipitacion * 10) / 10,
    evapotranspiracion: Math.round(evapoTotal * 10) / 10,
    clasificacion,
    descripcion,
    color
  };
}
