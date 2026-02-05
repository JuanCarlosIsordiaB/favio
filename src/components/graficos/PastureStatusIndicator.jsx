/**
 * PastureStatusIndicator.jsx
 *
 * Indicador visual tipo "semáforo" para estado de pastura
 * Muestra estado crítico/urgente/atención/normal con colores y recomendaciones
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '../ui/badge';

export default function PastureStatusIndicator({
  alturaActual,
  remanente,
  tendencia = null,
  diasHastaRemanente = null
}) {
  // Calcular estado basado en altura actual vs remanente
  const calcularEstado = () => {
    if (!alturaActual || !remanente) {
      return {
        estado: 'SIN_DATOS',
        color: 'gray',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        textColor: 'text-gray-700',
        icon: Minus,
        titulo: 'Sin Datos',
        descripcion: 'No hay mediciones de pastura disponibles',
        recomendacion: 'Realizar medición de altura de pastura',
        prioridad: 'baja'
      };
    }

    const altura = parseFloat(alturaActual);
    const rem = parseFloat(remanente);
    const diferencia = altura - rem;

    // CRÍTICO: Altura < remanente objetivo
    if (diferencia < 0) {
      return {
        estado: 'CRITICO',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        textColor: 'text-red-700',
        icon: AlertTriangle,
        titulo: 'Estado CRÍTICO',
        descripcion: `Altura actual: ${altura.toFixed(1)} cm está ${Math.abs(diferencia).toFixed(1)} cm POR DEBAJO del remanente objetivo (${rem.toFixed(1)} cm)`,
        recomendacion: '🚨 ACCIÓN URGENTE: Mover animales inmediatamente a lote alternativo o reducir carga. Riesgo de sobrepastoreo y degradación del lote.',
        prioridad: 'alta'
      };
    }

    // URGENTE: Altura entre remanente y remanente + 2cm
    if (diferencia < 2) {
      return {
        estado: 'URGENTE',
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-700',
        icon: AlertCircle,
        titulo: 'Estado URGENTE',
        descripcion: `Altura actual: ${altura.toFixed(1)} cm está CERCA del remanente objetivo (${rem.toFixed(1)} cm). Margen: solo ${diferencia.toFixed(1)} cm`,
        recomendacion: '⚠️ Planificar movimiento de animales en los próximos 2-3 días. Monitorear diariamente.',
        prioridad: 'alta'
      };
    }

    // ATENCIÓN: Altura entre remanente + 2cm y remanente + 5cm
    if (diferencia < 5) {
      return {
        estado: 'ATENCION',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-700',
        icon: AlertCircle,
        titulo: 'Requiere Atención',
        descripcion: `Altura actual: ${altura.toFixed(1)} cm. Margen sobre remanente: ${diferencia.toFixed(1)} cm`,
        recomendacion: '⚡ Estar preparado para mover animales pronto. Monitorear evolución cada 2-3 días.',
        prioridad: 'media'
      };
    }

    // NORMAL: Altura > remanente + 5cm
    return {
      estado: 'NORMAL',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
      icon: CheckCircle,
      titulo: 'Estado Normal',
      descripcion: `Altura actual: ${altura.toFixed(1)} cm. Margen sobre remanente: ${diferencia.toFixed(1)} cm`,
      recomendacion: '✅ Pastura en buen estado. Continuar con manejo habitual.',
      prioridad: 'baja'
    };
  };

  const estadoInfo = calcularEstado();
  const IconComponent = estadoInfo.icon;

  // Determinar ícono y color de tendencia
  const getTendenciaInfo = () => {
    if (!tendencia) return null;

    switch (tendencia.tendencia) {
      case 'RECUPERACION':
        return {
          icon: TrendingUp,
          color: 'text-green-600',
          texto: 'En recuperación',
          descripcion: `+${tendencia.velocidad.toFixed(2)} cm/día`
        };
      case 'ESTABLE':
        return {
          icon: Minus,
          color: 'text-blue-600',
          texto: 'Estable',
          descripcion: `${tendencia.velocidad.toFixed(2)} cm/día`
        };
      case 'DEGRADACION_LEVE':
        return {
          icon: TrendingDown,
          color: 'text-orange-600',
          texto: 'Degradación leve',
          descripcion: `${tendencia.velocidad.toFixed(2)} cm/día`
        };
      case 'DEGRADACION_SEVERA':
        return {
          icon: TrendingDown,
          color: 'text-red-600',
          texto: 'Degradación severa',
          descripcion: `${tendencia.velocidad.toFixed(2)} cm/día`
        };
      default:
        return null;
    }
  };

  const tendenciaInfo = getTendenciaInfo();
  const TendenciaIcon = tendenciaInfo?.icon;

  return (
    <Card className={`${estadoInfo.borderColor} border-2`}>
      <CardHeader className={estadoInfo.bgColor}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-white`}>
              <IconComponent className={`w-8 h-8 ${estadoInfo.textColor}`} />
            </div>
            <div>
              <CardTitle className={`${estadoInfo.textColor} text-xl`}>
                {estadoInfo.titulo}
              </CardTitle>
              <Badge variant={estadoInfo.prioridad === 'alta' ? 'destructive' : 'secondary'} className="mt-1">
                Prioridad {estadoInfo.prioridad}
              </Badge>
            </div>
          </div>

          {/* Tendencia */}
          {tendenciaInfo && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <TendenciaIcon className={`w-5 h-5 ${tendenciaInfo.color}`} />
                <span className={`text-sm font-semibold ${tendenciaInfo.color}`}>
                  {tendenciaInfo.texto}
                </span>
              </div>
              <span className="text-xs text-gray-500">{tendenciaInfo.descripcion}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Descripción */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Situación Actual:</p>
            <p className="text-sm text-gray-600">{estadoInfo.descripcion}</p>
          </div>

          {/* Días hasta remanente */}
          {diasHastaRemanente !== null && diasHastaRemanente.diasHastaRemanente !== null && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-700 mb-1">
                Proyección:
              </p>
              <p className="text-sm text-blue-600">
                {diasHastaRemanente.diasHastaRemanente === 0 ? (
                  <span className="font-bold text-red-600">Ya alcanzó el remanente crítico</span>
                ) : diasHastaRemanente.diasHastaRemanente < 0 ? (
                  <span>En recuperación, alejándose del remanente</span>
                ) : (
                  <>
                    Alcanzará remanente en aproximadamente{' '}
                    <span className="font-bold">
                      {diasHastaRemanente.diasHastaRemanente} días
                    </span>
                    {diasHastaRemanente.fechaProyectada && (
                      <> ({new Date(diasHastaRemanente.fechaProyectada).toLocaleDateString('es-AR')})</>
                    )}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Recomendación */}
          <div className={`p-3 rounded-lg border ${estadoInfo.borderColor} ${estadoInfo.bgColor}`}>
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <span className={estadoInfo.textColor}>Recomendación:</span>
            </p>
            <p className="text-sm">{estadoInfo.recomendacion}</p>
          </div>

          {/* Barra visual de estado */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Remanente: {remanente ? `${parseFloat(remanente).toFixed(1)} cm` : '-'}</span>
              <span>Actual: {alturaActual ? `${parseFloat(alturaActual).toFixed(1)} cm` : '-'}</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
              {/* Zona roja (por debajo de remanente) */}
              <div className="bg-red-500 flex-1"></div>
              {/* Zona amarilla (remanente a remanente + 5cm) */}
              <div className="bg-yellow-500 flex-1"></div>
              {/* Zona verde (> remanente + 5cm) */}
              <div className="bg-green-500 flex-[2]"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Crítico</span>
              <span>Atención</span>
              <span>Normal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
