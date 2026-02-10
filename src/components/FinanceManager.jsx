import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ExpenseListView } from "./vistas/ExpenseListView";
import { IncomeListView } from "./vistas/IncomeListView";
import { PaymentOrderListView } from "./vistas/PaymentOrderListView";
import { AccountsPayableView } from "./vistas/AccountsPayableView";
import { AccountsReceivableView } from "./vistas/AccountsReceivableView";
import { FinancialAccountsListView } from "./vistas/FinancialAccountsListView";
import { PaymentOrderFormModal } from "./modales/PaymentOrderFormModal";
import PurchaseOrders from "./PurchaseOrders";
import EventCostConfigManager from "./EventCostConfigManager";
import EventCostsViewer from "./EventCostsViewer";
import { useExpenses } from "../hooks/useExpenses";
import { useIncome } from "../hooks/useIncome";
import { useFinancialAccounts } from "../hooks/useFinancialAccounts";
import { usePaymentOrders } from "../hooks/usePaymentOrders";
import { crearOrdenPago } from "../services/paymentOrders";
import {
  verificarAlertasFacturas,
  verificarAlertasIngresos,
  verificarPagosProgramadosProximos,
  verificarOrdenesPagoPendientes,
} from "../services/financeAlerts";
import { withPermission } from "./guards/PermissionGuard";
import { FINANCIAL_PERMISSIONS } from "../lib/permissions";
import { supabase } from "../lib/supabase";
import {
  DollarSign,
  FileText,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Landmark,
  ShoppingCart,
  Settings,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Manager principal del Módulo 08: Ingresos y Gastos Financieros
 * @component
 */
function FinanceManagerContent({ firmId, premiseId, initialTab = "expenses" }) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [showPaymentOrderModal, setShowPaymentOrderModal] = useState(false);
  const [selectedExpensesForPayment, setSelectedExpensesForPayment] = useState(
    [],
  );
  const [paymentOrderRefreshKey, setPaymentOrderRefreshKey] = useState(0);
  const [metrics, setMetrics] = useState({
    totalCuentasPorPagar: 0,
    totalCuentasPorCobrar: 0,
    facturasVencidas: 0,
    pagosDelMes: 0,
    ingresosDelMes: 0,
    totalAccountsBalance: 0,
  });

  // Hooks
  const { expenses, loadExpenses: loadExpensesData } = useExpenses();
  const { incomes, loadIncomes: loadIncomesData } = useIncome();
  const { accounts, loadAccounts } = useFinancialAccounts();
  const { loadOrders: loadPaymentOrders } = usePaymentOrders();

  /**
   * Cargar datos iniciales cuando cambia la firma
   */
  useEffect(() => {
    if (firmId) {
      loadExpensesData(firmId, {});
      loadIncomesData(firmId, {});
      loadAccounts(firmId, {});

      // Verificar alertas inmediatamente
      checkFinanceAlerts();
    }
  }, [firmId]);

  /**
   * ❌ DESACTIVADO: Recargar cuentas cuando cambias de tab
   * RAZÓN: Esto hacía ~100 requests CADA VEZ que cambias de tab = 3k+ al día
   * SOLUCIÓN: Las cuentas se cargan UNA VEZ en useEffect principal (línea 63-72)
   * Para actualizar después de crear cuenta, usar invalidación selectiva
   */
  // useEffect(() => {
  //   if (firmId) {
  //     console.log('🔄 Recargando cuentas financieras (currentTab cambió a ' + currentTab + ')');
  //     loadAccounts(firmId, {});
  //   }
  // }, [currentTab, firmId]);

  /**
   * Verificar alertas financieras
   * Se ejecuta periódicamente y también cuando hay cambios en expenses/incomes
   */
  const checkFinanceAlerts = useCallback(async () => {
    if (!firmId) return;

    try {
      console.log("🔔 Verificando alertas financieras...");

      // Verificar alertas de facturas vencidas
      await verificarAlertasFacturas(firmId);

      // Verificar alertas de ingresos
      await verificarAlertasIngresos(firmId);

      // Verificar pagos programados próximos (generados automáticamente desde purchase orders)
      await verificarPagosProgramadosProximos(firmId);

      // Verificar órdenes de pago pendientes de pago
      await verificarOrdenesPagoPendientes(firmId);

      console.log("✅ Verificación de alertas completada");
    } catch (err) {
      console.error("Error al verificar alertas financieras:", err);
    }
  }, [firmId]);

  /**
   * Configurar verificación periódica de alertas (cada 5 minutos)
   */
  useEffect(() => {
    if (!firmId) return;

    // Ejecutar verificación inmediata
    checkFinanceAlerts();

    // Configurar intervalo de 5 minutos
    const alertInterval = setInterval(
      () => {
        checkFinanceAlerts();
      },
      5 * 60 * 1000,
    ); // 5 minutos

    // Limpiar intervalo al desmontar
    return () => clearInterval(alertInterval);
  }, [firmId]);

  /**
   * Suscribirse en tiempo real a cambios en la tabla expenses
   * Esto permite que cuando el trigger de BD sincroniza expenses,
   * se actualicen automáticamente las métricas del dashboard
   * ADEMÁS, triggerea verificación de alertas cuando hay cambios
   *
   * IMPORTANTE: Solo depende de [firmId] para mantener la suscripción estable
   */
  useEffect(() => {
    if (!firmId) return;

    console.log("🔔 Configurando suscripción en tiempo real para expenses...");

    // Crear canal de Realtime
    const channel = supabase
      .channel(`expenses-${firmId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchar INSERT, UPDATE, DELETE
          schema: "public",
          table: "expenses",
          filter: `firm_id=eq.${firmId}`,
        },
        (payload) => {
          console.log(
            "📡 Cambio detectado en expenses:",
            payload.eventType,
            payload.new?.id,
          );
          // Refrescar expenses cuando hay cambios en la BD
          // Nota: loadExpensesData es estable (useCallback), así que es seguro usarlo aquí
          loadExpensesData(firmId, {});

          // ✨ NUEVO: Triggear verificación de alertas inmediatamente
          // Especialmente importante para alertas de pagos programados
          console.log(
            "🔔 Triggereando verificación de alertas por cambio en expenses",
          );
          checkFinanceAlerts();
        },
      )
      .subscribe((status) => {
        console.log("🔌 Estado de suscripción expenses:", status);
      });

    // Limpiar suscripción al desmontar
    return () => {
      console.log("🔌 Limpiando suscripción en tiempo real para expenses");
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]); // ✅ SOLO firmId (loadExpensesData es estable via useCallback)

  /**
   * Suscribirse en tiempo real a cambios en la tabla incomes
   * ADEMÁS, triggerea verificación de alertas cuando hay cambios
   *
   * IMPORTANTE: Solo depende de [firmId] para mantener la suscripción estable
   */
  useEffect(() => {
    if (!firmId) return;

    console.log("🔔 Configurando suscripción en tiempo real para incomes...");

    // Crear canal de Realtime
    const channel = supabase
      .channel(`incomes-${firmId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchar INSERT, UPDATE, DELETE
          schema: "public",
          table: "incomes",
          filter: `firm_id=eq.${firmId}`,
        },
        (payload) => {
          console.log(
            "📡 Cambio detectado en incomes:",
            payload.eventType,
            payload.new?.id,
          );
          // Refrescar incomes cuando hay cambios en la BD
          // Nota: loadIncomesData es estable (useCallback), así que es seguro usarlo aquí
          loadIncomesData(firmId, {});

          // ✨ NUEVO: Triggear verificación de alertas inmediatamente
          console.log(
            "🔔 Triggereando verificación de alertas por cambio en incomes",
          );
          checkFinanceAlerts();
        },
      )
      .subscribe((status) => {
        console.log("🔌 Estado de suscripción incomes:", status);
      });

    // Limpiar suscripción al desmontar
    return () => {
      console.log("🔌 Limpiando suscripción en tiempo real para incomes");
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]); // ✅ SOLO firmId (loadIncomesData es estable via useCallback)

  /**
   * Calcular métricas
   */
  /**
   * Calcular métricas cuando cambian expenses, incomes, accounts o cuando se ejecuta una orden
   */
  useEffect(() => {
    const calculateMetrics = async () => {
      const now = new Date();

      const totalCuentasPorPagar = expenses
        .filter(
          (e) =>
            ["pendiente", "APPROVED", "PAID_PARTIAL"].includes(e.status) &&
            e.balance > 0,
        )
        .reduce((sum, e) => sum + (e.balance || 0), 0);

      const totalCuentasPorCobrar = incomes
        .filter(
          (i) =>
            ["CONFIRMED", "COLLECTED_PARTIAL"].includes(i.status) &&
            i.balance > 0,
        )
        .reduce((sum, i) => sum + (i.balance || 0), 0);

      const facturasVencidas = expenses.filter((e) => {
        if (!e.due_date || ["PAID", "CANCELLED"].includes(e.status))
          return false;
        const dueDate = new Date(e.due_date);
        return dueDate < now && e.balance > 0;
      }).length;

      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Obtener pagos del mes desde payment_orders ejecutadas
      let pagosDelMes = 0;
      try {
        const { data: paymentOrders } = await supabase
          .from("payment_orders")
          .select("amount, executed_at")
          .eq("firm_id", firmId)
          .eq("status", "EXECUTED");

        if (paymentOrders && paymentOrders.length > 0) {
          pagosDelMes = paymentOrders
            .filter((po) => {
              if (!po.executed_at) return false;
              const execDate = new Date(po.executed_at);
              return (
                execDate.getMonth() === currentMonth &&
                execDate.getFullYear() === currentYear
              );
            })
            .reduce((sum, po) => sum + (po.amount || 0), 0);
        }
      } catch (err) {
        console.error("Error obteniendo pagos del mes:", err);
      }

      const ingresosDelMes = incomes
        .filter((i) => {
          if (!i.invoice_date) return false;
          const invDate = new Date(i.invoice_date);
          return (
            invDate.getMonth() === currentMonth &&
            invDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, i) => sum + (i.total_amount || 0), 0);

      const totalAccountsBalance = accounts.reduce(
        (sum, acc) => sum + (acc.current_balance || 0),
        0,
      );

      setMetrics({
        totalCuentasPorPagar,
        totalCuentasPorCobrar,
        facturasVencidas,
        pagosDelMes,
        ingresosDelMes,
        totalAccountsBalance,
      });

      console.log("📊 Métricas actualizadas:", {
        pagosDelMes,
        totalCuentasPorPagar,
        totalCuentasPorCobrar,
        ingresosDelMes,
      });
    };

    calculateMetrics();
  }, [expenses, incomes, accounts, firmId]);

  // DEBUG: Log de cuentas cargadas
  useEffect(() => {
    console.log("💰 Cuentas cargadas en FinanceManager:", {
      cantidad: accounts.length,
      datos: accounts.map((a) => ({
        name: a.name,
        current_balance: a.current_balance,
        type: typeof a.current_balance,
      })),
      totalCalculado: accounts.reduce(
        (sum, a) => sum + (a.current_balance || 0),
        0,
      ),
    });
  }, [accounts]);

  /**
   * Handler para cuando se actualiza una cuenta financiera
   * Recarga las cuentas para actualizar las métricas
   */
  const handleAccountUpdated = () => {
    if (firmId) {
      loadAccounts(firmId, {});
    }
  };

  const handleCreatePaymentOrder = (selectedExpenses) => {
    // Recargar cuentas antes de abrir modal (por si se crearon nuevas)
    if (firmId) {
      loadAccounts(firmId, {});
    }
    setSelectedExpensesForPayment(selectedExpenses);
    setShowPaymentOrderModal(true);
  };

  const handlePaymentOrderSubmit = async (orderData, expensesWithAmounts) => {
    try {
      // Agregar datos adicionales requeridos (created_by se usa para auditoría)
      const userId = localStorage.getItem("currentUserId") || "sistema";
      const dataToSubmit = {
        ...orderData,
        firm_id: firmId,
        created_by: userId,
      };

      // 1. Crear la orden de pago
      const { data: nuevaOrden, error } = await crearOrdenPago(
        dataToSubmit,
        expensesWithAmounts,
      );

      if (error) throw error;
      if (!nuevaOrden) throw new Error("No se pudo crear la orden de pago");

      console.log("✅ Orden de pago creada:", nuevaOrden.id);
      toast.success("Orden de pago creada");

      // Guardar relaciones de facturas en localStorage para que ejecutarOrdenPago() las pueda acceder
      // Convertir array a objeto para acceso directo
      const amountsMap = Object.fromEntries(
        expensesWithAmounts.map((e) => [e.id, e.amount_paid]),
      );
      const relaciones = selectedExpensesForPayment.map((expense) => ({
        expense_id: expense.id,
        amount_paid: amountsMap[expense.id] || expense.balance,
      }));
      localStorage.setItem(
        `paymentOrder_${nuevaOrden.id}`,
        JSON.stringify(relaciones),
      );
      console.log(
        `💾 Relaciones guardadas en localStorage para orden ${nuevaOrden.id}`,
      );

      setShowPaymentOrderModal(false);
      setSelectedExpensesForPayment([]);

      // Refresco automático
      handlePaymentOrderSuccess();
    } catch (err) {
      console.error("Error al procesar orden de pago:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const handlePaymentOrderSuccess = async () => {
    // Refresco de datos después de crear/ejecutar orden de pago
    if (firmId) {
      // Recargar órdenes de pago
      await loadPaymentOrders(firmId, {});

      // Recargar expenses (para actualizar "Cuentas por Pagar")
      await loadExpensesData(firmId, {});

      // Recargar incomes (para actualizar "Cuentas por Cobrar")
      await loadIncomesData(firmId, {});

      // Recargar cuentas financieras (para actualizar "Balance Cuentas")
      await loadAccounts(firmId, {});

      // Trigger a refresh en PaymentOrderListView
      setPaymentOrderRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Ingresos y Gastos
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión completa de finanzas y facturas
          </p>
        </div>
      </div>

      {/* Dashboard - Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cuentas por Pagar */}
        <Card
          className="border-l-4 border-l-red-500"
          data-testid="metric-accounts-payable"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Cuentas por Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-red-600"
              data-testid="metric-accounts-payable-amount"
            >
              UYU{" "}
              {metrics.totalCuentasPorPagar.toLocaleString("es-UY", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Facturas pendientes de pago
            </p>
          </CardContent>
        </Card>

        {/* Cuentas por Cobrar */}
        <Card
          className="border-l-4 border-l-green-500"
          data-testid="metric-accounts-receivable"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Cuentas por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-green-600"
              data-testid="metric-accounts-receivable-amount"
            >
              UYU{" "}
              {metrics.totalCuentasPorCobrar.toLocaleString("es-UY", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ingresos pendientes de cobro
            </p>
          </CardContent>
        </Card>

        {/* Facturas Vencidas */}
        <Card
          className="border-l-4 border-l-orange-500"
          data-testid="metric-overdue-invoices"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Facturas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-orange-600"
              data-testid="metric-overdue-count"
            >
              {metrics.facturasVencidas}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        {/* Pagos del Mes */}
        <Card
          className="border-l-4 border-l-blue-500"
          data-testid="metric-payments-month"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pagos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-blue-600"
              data-testid="metric-payments-month-amount"
            >
              UYU{" "}
              {metrics.pagosDelMes.toLocaleString("es-UY", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pagos realizados este mes
            </p>
          </CardContent>
        </Card>

        {/* Ingresos del Mes */}
        <Card
          className="border-l-4 border-l-emerald-500"
          data-testid="metric-income-month"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-emerald-600"
              data-testid="metric-income-month-amount"
            >
              UYU{" "}
              {metrics.ingresosDelMes.toLocaleString("es-UY", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ingresos registrados este mes
            </p>
          </CardContent>
        </Card>

        {/* Balance Total Cuentas */}
        <Card
          className="border-l-4 border-l-purple-500"
          data-testid="metric-accounts-balance"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Balance Cuentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-purple-600"
              data-testid="metric-accounts-balance-amount"
            >
              UYU{" "}
              {metrics.totalAccountsBalance.toLocaleString("es-UY", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saldo total en cuentas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      {!firmId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-800">
            Selecciona una firma para ver la información financiera
          </p>
        </div>
      ) : (
        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
          data-testid="finance-tabs"
        >
          <TabsList
            className="grid w-full grid-cols-9"
            data-testid="finance-tabs-list"
          >
            <TabsTrigger
              value="expenses"
              className="flex items-center gap-2"
              data-testid="tab-expenses"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Facturas</span>
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="flex items-center gap-2"
              data-testid="tab-income"
            >
              <TrendingUp size={16} />
              <span className="hidden sm:inline">Ingresos</span>
            </TabsTrigger>
            <TabsTrigger
              value="purchase_orders"
              className="flex items-center gap-2"
              data-testid="tab-purchase-orders"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger
              value="payment_orders"
              className="flex items-center gap-2"
              data-testid="tab-payment-orders"
            >
              <CreditCard size={16} />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger
              value="accounts_payable"
              className="flex items-center gap-2"
              data-testid="tab-accounts-payable"
            >
              <AlertTriangle size={16} />
              <span className="hidden sm:inline">Por Pagar</span>
            </TabsTrigger>
            <TabsTrigger
              value="accounts_receivable"
              className="flex items-center gap-2"
              data-testid="tab-accounts-receivable"
            >
              <DollarSign size={16} />
              <span className="hidden sm:inline">Por Cobrar</span>
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="flex items-center gap-2"
              data-testid="tab-accounts"
            >
              <Landmark size={16} />
              <span className="hidden sm:inline">Cuentas</span>
            </TabsTrigger>
            <TabsTrigger
              value="cost-config"
              className="flex items-center gap-2"
              data-testid="tab-cost-config"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Config. Costos</span>
            </TabsTrigger>
            <TabsTrigger
              value="event-costs"
              className="flex items-center gap-2"
              data-testid="tab-event-costs"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Costos Eventos</span>
            </TabsTrigger>
          </TabsList>

          {/* Facturas de Compra */}
          <TabsContent
            value="expenses"
            className="mt-6"
            data-testid="tab-content-expenses"
          >
            <ExpenseListView firmId={firmId} onAdd={() => {}} />
          </TabsContent>

          {/* Ingresos Financieros */}
          <TabsContent
            value="income"
            className="mt-6"
            data-testid="tab-content-income"
          >
            <IncomeListView firmId={firmId} onAdd={() => {}} />
          </TabsContent>

          {/* Órdenes de Compra */}
          <TabsContent
            value="purchase_orders"
            className="mt-6"
            data-testid="tab-content-purchase-orders"
          >
            <PurchaseOrders firmId={firmId} premiseId={premiseId} />
          </TabsContent>

          {/* Órdenes de Pago */}
          <TabsContent
            value="payment_orders"
            className="mt-6"
            data-testid="tab-content-payment-orders"
          >
            <PaymentOrderListView
              key={paymentOrderRefreshKey}
              firmId={firmId}
              onAdd={() => setShowPaymentOrderModal(true)}
              onExecuteOrder={() => {}}
            />
          </TabsContent>

          {/* Cuentas por Pagar */}
          <TabsContent
            value="accounts_payable"
            className="mt-6"
            data-testid="tab-content-accounts-payable"
          >
            <AccountsPayableView
              firmId={firmId}
              onCreatePaymentOrder={handleCreatePaymentOrder}
            />
          </TabsContent>

          {/* Cuentas por Cobrar */}
          <TabsContent
            value="accounts_receivable"
            className="mt-6"
            data-testid="tab-content-accounts-receivable"
          >
            <AccountsReceivableView firmId={firmId} />
          </TabsContent>

          {/* Cuentas Financieras */}
          <TabsContent
            value="accounts"
            className="mt-6"
            data-testid="tab-content-accounts"
          >
            <FinancialAccountsListView
              firmId={firmId}
              onAccountUpdated={handleAccountUpdated}
            />
          </TabsContent>

          {/* Configuración de Costos Automáticos */}
          <TabsContent
            value="cost-config"
            className="mt-6"
            data-testid="tab-content-cost-config"
          >
            <EventCostConfigManager firmId={firmId} />
          </TabsContent>

          {/* Costos de Eventos - Generados y Conversión a Facturas */}
          <TabsContent
            value="event-costs"
            className="mt-6"
            data-testid="tab-content-event-costs"
          >
            <EventCostsViewer firmId={firmId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Order Modal */}
      <PaymentOrderFormModal
        isOpen={showPaymentOrderModal}
        firmId={firmId}
        availableExpenses={selectedExpensesForPayment}
        financialAccounts={accounts}
        onSubmit={handlePaymentOrderSubmit}
        onSuccess={handlePaymentOrderSuccess}
        onCancel={() => {
          setShowPaymentOrderModal(false);
          setSelectedExpensesForPayment([]);
        }}
      />
    </div>
  );
}

// Exportar envuelto con protección de permisos
// Solo administradores pueden ver el módulo de finanzas
export default withPermission(
  FinanceManagerContent,
  FINANCIAL_PERMISSIONS.VIEW_FULL,
  {
    message: "El módulo de Finanzas solo está disponible para administradores.",
  },
);
