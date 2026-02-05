import { useEffect, useState } from 'react';

/**
 * Hook para calcular la ocupación y cobertura de un predio
 * Determina qué porcentaje del predio está ocupado por lotes
 *
 * @param {Array} lotes - Array de lotes con superficie_total
 * @param {number} predioSuperficie - Superficie total del predio
 * @returns {Object} - { ocupado, disponible, porcentaje, excedido }
 */
export function usePredioCoverage(lotes = [], predioSuperficie = 0) {
  const [coverage, setCoverage] = useState({
    ocupado: 0,
    disponible: 0,
    porcentaje: 0,
    excedido: false,
  });

  useEffect(() => {
    // Validar inputs
    if (!lotes || !predioSuperficie || predioSuperficie <= 0) {
      setCoverage({
        ocupado: 0,
        disponible: predioSuperficie || 0,
        porcentaje: 0,
        excedido: false,
      });
      return;
    }

    // Calcular total ocupado por lotes
    const totalOcupado = lotes.reduce((sum, lote) => {
      return sum + (lote.superficie_total ? parseFloat(lote.superficie_total) : 0);
    }, 0);

    // Calcular disponible
    const disponible = predioSuperficie - totalOcupado;

    // Calcular porcentaje (máximo 100%)
    const porcentaje = (totalOcupado / predioSuperficie) * 100;

    // Determinar si está excedido
    const excedido = totalOcupado > predioSuperficie;

    setCoverage({
      ocupado: totalOcupado,
      disponible: disponible > 0 ? disponible : 0,
      porcentaje: Math.min(100, Math.max(0, porcentaje)),
      excedido: excedido,
    });
  }, [lotes, predioSuperficie]);

  return coverage;
}
