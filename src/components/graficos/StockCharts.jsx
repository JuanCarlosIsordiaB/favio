/**
 * StockCharts.jsx
 * Componentes de gráficos para visualización de datos de stock
 */

import React, { useMemo } from 'react';
import {
  BarChart, Bar,
  PieChart, Pie,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Package } from 'lucide-react';

const COLORS = {
  primary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6'
};

/**
 * Gráfico de Stock por Categoría
 */
export function StockByCategory({ insumos = [] }) {
  const data = useMemo(() => {
    const grouped = {};

    insumos.forEach(insumo => {
      if (!grouped[insumo.category]) {
        grouped[insumo.category] = { category: insumo.category, stock: 0, items: 0 };
      }
      grouped[insumo.category].stock += insumo.current_stock || 0;
      grouped[insumo.category].items += 1;
    });

    return Object.values(grouped).sort((a, b) => b.stock - a.stock).slice(0, 8);
  }, [insumos]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Stock por Categoría</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip formatter={(value) => `${value} unidades`} />
          <Legend />
          <Bar dataKey="stock" fill={COLORS.primary} name="Stock Total" />
          <Bar dataKey="items" fill={COLORS.info} name="Items" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico de Stock por Depósito
 */
export function StockByDepot({ insumos = [], depots = [] }) {
  const data = useMemo(() => {
    const grouped = {};

    // Agrupar por depósito
    depots.forEach(depot => {
      grouped[depot.id] = {
        name: depot.name,
        stock: 0,
        valor: 0
      };
    });

    // Contar stock por depósito
    insumos.forEach(insumo => {
      const depotId = insumo.depot_id || 'sin-deposito';
      if (!grouped[depotId]) {
        grouped[depotId] = { name: 'Sin Depósito', stock: 0, valor: 0 };
      }
      grouped[depotId].stock += insumo.current_stock || 0;
      grouped[depotId].valor += ((insumo.current_stock || 0) * (insumo.cost_per_unit || 0));
    });

    return Object.values(grouped).filter(d => d.stock > 0);
  }, [insumos, depots]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin depósitos configurados</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Stock por Depósito</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, stock }) => `${name}: ${stock}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="stock"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.keys(COLORS).length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} unidades`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico de Estado de Stock (Donut Chart)
 */
export function StockStatus({ insumos = [] }) {
  const data = useMemo(() => {
    const stats = {
      ok: 0,
      bajo: 0,
      sinStock: 0
    };

    insumos.forEach(insumo => {
      const stock = insumo.current_stock || 0;
      const min = insumo.min_stock_alert || 0;

      if (stock === 0) {
        stats.sinStock += 1;
      } else if (stock < min) {
        stats.bajo += 1;
      } else {
        stats.ok += 1;
      }
    });

    return [
      { name: 'Stock OK', value: stats.ok, color: COLORS.primary },
      { name: 'Stock Bajo', value: stats.bajo, color: COLORS.warning },
      { name: 'Sin Stock', value: stats.sinStock, color: COLORS.danger }
    ].filter(d => d.value > 0);
  }, [insumos]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Estado de Stock</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} insumos`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico de Consumo por Período
 */
export function ConsumptionTrend({ movimientos = [] }) {
  const data = useMemo(() => {
    const grouped = {};

    movimientos
      .filter(m => m.type === 'exit' || m.type === 'entry')
      .forEach(mov => {
        const date = new Date(mov.date).toLocaleDateString('es-UY');
        if (!grouped[date]) {
          grouped[date] = { date, ingresos: 0, egresos: 0 };
        }

        if (mov.type === 'entry') {
          grouped[date].ingresos += mov.quantity;
        } else if (mov.type === 'exit') {
          grouped[date].egresos += mov.quantity;
        }
      });

    return Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Últimos 30 días
  }, [movimientos]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin movimientos en este período</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Consumo/Ingresos (Últimos 30 días)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip formatter={(value) => `${value} unidades`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="ingresos"
            stroke={COLORS.primary}
            name="Ingresos"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="egresos"
            stroke={COLORS.danger}
            name="Egresos"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico de Próximos a Vencer
 */
export function ExpirationTrend({ insumos = [] }) {
  const data = useMemo(() => {
    const grouped = {
      '0-7d': 0,
      '8-15d': 0,
      '16-30d': 0,
      '30d+': 0,
      'vencido': 0
    };

    const today = new Date();

    insumos.forEach(insumo => {
      if (!insumo.expiration_date) return;

      const expirationDate = new Date(insumo.expiration_date);
      const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        grouped['vencido'] += 1;
      } else if (daysLeft <= 7) {
        grouped['0-7d'] += 1;
      } else if (daysLeft <= 15) {
        grouped['8-15d'] += 1;
      } else if (daysLeft <= 30) {
        grouped['16-30d'] += 1;
      } else {
        grouped['30d+'] += 1;
      }
    });

    return Object.entries(grouped)
      .map(([range, count]) => ({ range, count }))
      .filter(d => d.count > 0);
  }, [insumos]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin insumos vencibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Próximos a Vencer</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip formatter={(value) => `${value} insumos`} />
          <Bar dataKey="count" fill={COLORS.warning} name="Insumos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Gráfico de Alertas Activas
 */
export function ActiveAlerts({ alerts = [] }) {
  const data = useMemo(() => {
    const grouped = {
      'Stock Bajo': 0,
      'Vencimiento': 0,
      'Otras': 0
    };

    alerts.forEach(alert => {
      const tipo = (alert.tipo || alert.type || '').toLowerCase();

      if (tipo.includes('stock')) {
        grouped['Stock Bajo'] += 1;
      } else if (tipo.includes('vencimiento') || tipo.includes('expiration')) {
        grouped['Vencimiento'] += 1;
      } else {
        grouped['Otras'] += 1;
      }
    });

    return [
      { name: 'Stock Bajo', value: grouped['Stock Bajo'], color: COLORS.warning },
      { name: 'Vencimiento', value: grouped['Vencimiento'], color: COLORS.danger },
      { name: 'Otras', value: grouped['Otras'], color: COLORS.info }
    ].filter(d => d.value > 0);
  }, [alerts]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">Sin alertas activas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Alertas Activas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => `${value} alertas`} />
          <Bar dataKey="value" fill={COLORS.warning}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Panel de Gráficos completo
 */
export function ChartsPanel({ insumos = [], depots = [], movimientos = [], alerts = [] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockByCategory insumos={insumos} />
        <StockByDepot insumos={insumos} depots={depots} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockStatus insumos={insumos} />
        <ActiveAlerts alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpirationTrend insumos={insumos} />
        <ConsumptionTrend movimientos={movimientos} />
      </div>
    </div>
  );
}
