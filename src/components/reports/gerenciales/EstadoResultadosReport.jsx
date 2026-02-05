import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { generarEstadoResultados } from '../../../services/estadoResultadosService';

export default function EstadoResultadosReport({ premiseId, periodo, onClose }) {
  const [estado, setEstado] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (premiseId && periodo) {
      loadData();
    }
  }, [premiseId, periodo]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const datos = await generarEstadoResultados(premiseId, {
        start: periodo?.start,
        end: periodo?.end
      });

      setEstado(datos);
    } catch (err) {
      console.error('Error loading estado resultados:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader size={20} className="animate-spin text-blue-600" />
        <p className="text-slate-600">Generando estado de resultados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Error cargando reporte</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600" />
        <p className="text-sm text-yellow-800">No hay datos disponibles</p>
      </div>
    );
  }

  const esGanancia = estado.resultado_final.valor >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 data-id="report-estado-resultados-title" className="text-2xl font-bold text-slate-800 mb-2">
          Estado de Resultados (P&L)
        </h2>
        <p className="text-slate-600">Análisis de Ingresos, Gastos y Rentabilidad</p>
      </div>

      {/* Resultado Final Summary */}
      <div
        className={`border rounded-lg p-6 ${
          esGanancia
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Resultado Final</p>
            <p
              data-id="report-pl-resultado-final"
              className={`text-4xl font-bold mb-1 ${
                esGanancia ? 'text-green-900' : 'text-red-900'
              }`}
            >
              ${estado.resultado_final.valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
            <p className={`text-sm ${esGanancia ? 'text-green-700' : 'text-red-700'}`}>
              {estado.resultado_final.estado} ({estado.resultado_final.porcentaje.toFixed(1)}%)
            </p>
          </div>
          <div className={`${esGanancia ? 'text-green-600' : 'text-red-600'}`}>
            {esGanancia ? (
              <TrendingUp size={48} />
            ) : (
              <TrendingDown size={48} />
            )}
          </div>
        </div>
      </div>

      {/* Tabla P&L Completa (7 secciones) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Estado de Resultados Detallado</h3>
        </div>

        <div data-id="report-pl-table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {/* SECCIÓN 1: INGRESOS */}
              <tr className="bg-blue-50 font-bold">
                <td colSpan="3" className="px-6 py-3 text-slate-900">
                  1. INGRESOS
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Ventas Principales</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.ingresos.ventas_principales.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600">
                  {((estado.ingresos.ventas_principales / estado.ingresos.total_ingresos) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Otros Ingresos</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.ingresos.otros_ingresos.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600">
                  {((estado.ingresos.otros_ingresos / estado.ingresos.total_ingresos) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr data-id="report-pl-total-ingresos" className="bg-blue-100 font-semibold">
                <td className="px-6 py-2 text-slate-900">TOTAL INGRESOS</td>
                <td className="px-6 py-2 text-right text-blue-900">
                  ${estado.ingresos.total_ingresos.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-blue-900">100%</td>
              </tr>

              {/* SECCIÓN 2: COSTO DE VENTAS */}
              <tr className="bg-orange-50 font-bold">
                <td colSpan="3" className="px-6 py-3 text-slate-900">
                  2. COSTO DE VENTAS
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Inventario Inicial</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.costo_ventas.inventario_inicial.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  (+) Compras</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.costo_ventas.compras.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  (-) Inventario Final</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  (${estado.costo_ventas.inventario_final.toLocaleString('es-AR')})
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr data-id="report-pl-costo-ventas" className="bg-orange-100 font-semibold">
                <td className="px-6 py-2 text-slate-900">COSTO DE VENTAS</td>
                <td className="px-6 py-2 text-right text-orange-900">
                  ${estado.costo_ventas.total_costo_ventas.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-orange-900">
                  {((estado.costo_ventas.total_costo_ventas / estado.ingresos.total_ingresos) * 100).toFixed(1)}%
                </td>
              </tr>

              {/* SECCIÓN 3: MARGEN BRUTO */}
              <tr data-id="report-pl-margen-bruto" className="bg-green-100 font-bold">
                <td className="px-6 py-3 text-slate-900">3. MARGEN BRUTO</td>
                <td className="px-6 py-3 text-right text-green-900">
                  ${estado.margen_bruto.valor.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-green-900">
                  {estado.margen_bruto.porcentaje.toFixed(1)}%
                </td>
              </tr>

              {/* SECCIÓN 4: GASTOS OPERATIVOS */}
              <tr className="bg-purple-50 font-bold">
                <td colSpan="3" className="px-6 py-3 text-slate-900">
                  4. GASTOS OPERATIVOS
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Mano de Obra</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_operativos.mano_obra.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Combustibles</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_operativos.combustibles.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Servicios</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_operativos.servicios.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Mantenimiento</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_operativos.mantenimiento.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Otros Operativos</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_operativos.otros_operativos.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="bg-purple-100 font-semibold">
                <td className="px-6 py-2 text-slate-900">TOTAL GASTOS OPERATIVOS</td>
                <td className="px-6 py-2 text-right text-purple-900">
                  ${estado.gastos_operativos.total_gastos_operativos.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-purple-900">
                  {((estado.gastos_operativos.total_gastos_operativos / estado.ingresos.total_ingresos) * 100).toFixed(1)}%
                </td>
              </tr>

              {/* SECCIÓN 5: RESULTADO OPERATIVO */}
              <tr data-id="report-pl-resultado-operativo" className="bg-yellow-100 font-bold">
                <td className="px-6 py-3 text-slate-900">5. RESULTADO OPERATIVO</td>
                <td className="px-6 py-3 text-right text-yellow-900">
                  ${estado.resultado_operativo.valor.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-3 text-right text-yellow-900">
                  {estado.resultado_operativo.porcentaje.toFixed(1)}%
                </td>
              </tr>

              {/* SECCIÓN 6: GASTOS FINANCIEROS */}
              <tr className="bg-red-50 font-bold">
                <td colSpan="3" className="px-6 py-3 text-slate-900">
                  6. GASTOS FINANCIEROS
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Intereses</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_financieros.intereses.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-slate-600">  Comisiones e Impuestos</td>
                <td className="px-6 py-2 text-right text-slate-600">
                  ${estado.gastos_financieros.comisiones.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-slate-600"></td>
              </tr>
              <tr className="bg-red-100 font-semibold">
                <td className="px-6 py-2 text-slate-900">TOTAL GASTOS FINANCIEROS</td>
                <td className="px-6 py-2 text-right text-red-900">
                  ${estado.gastos_financieros.total_gastos_financieros.toLocaleString('es-AR')}
                </td>
                <td className="px-6 py-2 text-right text-red-900">
                  {((estado.gastos_financieros.total_gastos_financieros / estado.ingresos.total_ingresos) * 100).toFixed(1)}%
                </td>
              </tr>

              {/* SECCIÓN 7: RESULTADO FINAL */}
              <tr className={`font-bold ${esGanancia ? 'bg-green-200' : 'bg-red-200'}`}>
                <td className={`px-6 py-3 ${esGanancia ? 'text-green-900' : 'text-red-900'}`}>
                  7. RESULTADO FINAL
                </td>
                <td className={`px-6 py-3 text-right ${esGanancia ? 'text-green-900' : 'text-red-900'}`}>
                  ${estado.resultado_final.valor.toLocaleString('es-AR')}
                </td>
                <td className={`px-6 py-3 text-right ${esGanancia ? 'text-green-900' : 'text-red-900'}`}>
                  {estado.resultado_final.porcentaje.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs de Rentabilidad */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-600 mb-1">Margen Bruto</p>
          <p className="text-2xl font-bold text-green-700">
            {estado.margen_bruto.porcentaje.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">del total de ingresos</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-600 mb-1">Margen Operativo</p>
          <p className="text-2xl font-bold text-blue-700">
            {estado.resultado_operativo.porcentaje.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">después de gastos operativos</p>
        </div>

        <div className={`border rounded-lg p-4 ${esGanancia ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm font-medium text-slate-600 mb-1">Margen Neto</p>
          <p className={`text-2xl font-bold ${esGanancia ? 'text-green-700' : 'text-red-700'}`}>
            {estado.resultado_final.porcentaje.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">resultado final</p>
        </div>
      </div>

      {/* Period info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <p>
          <strong>Período:</strong> {periodo?.start} a {periodo?.end}
        </p>
        <p className="mt-1">
          <strong>Generado:</strong> {new Date(estado.generado_en).toLocaleString('es-AR')}
        </p>
      </div>
    </div>
  );
}
