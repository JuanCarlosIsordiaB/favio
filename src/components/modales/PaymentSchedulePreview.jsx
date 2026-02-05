import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente que muestra un preview del cronograma de pagos
 * @param {Array} schedule - Array de objetos con installmentNumber, dueDate, amount, percentage
 * @param {string} currency - Moneda ('UYU' o 'USD')
 */
export default function PaymentSchedulePreview({ schedule, currency = 'UYU' }) {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  const currencySymbol = currency === 'USD' ? 'US$' : '$';
  const totalAmount = schedule.reduce((sum, item) => sum + item.amount, 0);

  // Validar que suma = 100%
  const totalPercentage = schedule.reduce((sum, item) => sum + item.percentage, 0);
  const isValidSum = Math.abs(totalPercentage - 100) < 0.1; // Permitir pequeño margen de error por redondeo

  return (
    <div className="sm:col-span-2 border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-blue-600" />
        <h4 className="font-semibold text-slate-900">Cronograma de Pagos</h4>
        <span className="ml-auto text-xs font-medium px-2 py-1 bg-blue-200 text-blue-900 rounded">
          {schedule.length} {schedule.length === 1 ? 'cuota' : 'cuotas'}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-blue-200">
              <th className="text-left py-2 px-2 font-medium text-slate-700">Cuota</th>
              <th className="text-left py-2 px-2 font-medium text-slate-700">Vencimiento</th>
              <th className="text-right py-2 px-2 font-medium text-slate-700">Monto</th>
              <th className="text-right py-2 px-2 font-medium text-slate-700">%</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((cuota, index) => (
              <tr key={index} className="border-b border-blue-100 hover:bg-blue-100 transition-colors">
                <td className="py-2 px-2 font-medium text-slate-900">
                  {cuota.installmentNumber}/{schedule.length}
                </td>
                <td className="py-2 px-2 text-slate-600">
                  {format(cuota.dueDate, 'd MMMM yyyy', { locale: es })}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-blue-600">
                  {currencySymbol}{cuota.amount.toLocaleString('es-UY', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
                <td className="py-2 px-2 text-right text-slate-700">
                  {cuota.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con total */}
      <div className="mt-3 pt-3 border-t-2 border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">TOTAL</p>
            <p className={`text-xs ${isValidSum ? 'text-green-600' : 'text-red-600'}`}>
              {isValidSum ? '✓ Suma válida' : '✗ Suma no válida'} (100%)
            </p>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {currencySymbol}{totalAmount.toLocaleString('es-UY', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      {/* Nota explicativa */}
      <p className="text-xs text-slate-600 mt-3 italic border-t border-blue-200 pt-2">
        📋 Estos pagos se generarán automáticamente al guardar la orden. Puedes aprobarlos desde "Cuentas por Pagar".
      </p>
    </div>
  );
}
