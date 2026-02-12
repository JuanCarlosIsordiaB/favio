import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { AlertCircle } from "lucide-react";

/**
 * Modal para crear órdenes de pago vinculadas a múltiples facturas
 * @component
 */
export function PaymentOrderFormModal({
  isOpen = false,
  firmId = null,
  availableExpenses = [],
  financialAccounts = [],
  onSubmit = () => {},
  onCancel = () => {},
  onSuccess = () => {},
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    firm_id: firmId,
    order_date: new Date().toISOString().split("T")[0],
    planned_payment_date: "",
    payment_method: "transfer",
    beneficiary_name: "",
    beneficiary_rut: "",
    beneficiary_bank: "",
    beneficiary_account: "",
    account_id: null,
    currency: "UYU",
    concept: "",
    reference_number: "",
    notes: "",
  });

  const [selectedExpenses, setSelectedExpenses] = useState({});
  const [amountsByExpense, setAmountsByExpense] = useState({});
  const [errors, setErrors] = useState({});
  const [loadedExpenses, setLoadedExpenses] = useState(availableExpenses || []);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadedAccounts, setLoadedAccounts] = useState(financialAccounts || []);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const paymentMethods = [
    { id: "transfer", label: "Transferencia Bancaria" },
    { id: "check", label: "Cheque" },
    { id: "cash", label: "Efectivo" },
    { id: "credit_card", label: "Tarjeta de Crédito" },
    { id: "debit_card", label: "Tarjeta de Débito" },
  ];

  /**
   * Cargar facturas APROBADAS y cuentas financieras cuando se abre el modal
   * IMPORTANTE: Las dependencias deben ser SOLO isOpen y firmId para evitar loops infinitos
   */
  useEffect(() => {
    if (isOpen && firmId) {
      // Cargar facturas si no llegan desde props
      if (availableExpenses.length === 0) {
        loadApprovedExpenses();
      } else {
        // Si availableExpenses llega con facturas (desde selección en AccountsPayableView)
        // marcar esas facturas como checked automáticamente
        const newSelected = {};
        const newAmounts = {};
        availableExpenses.forEach((expense) => {
          newSelected[expense.id] = true;
          newAmounts[expense.id] = expense.balance || 0;
        });
        setSelectedExpenses(newSelected);
        setAmountsByExpense(newAmounts);
      }

      // Cargar cuentas si no llegan desde props
      if (financialAccounts.length === 0) {
        loadFinancialAccounts();
      }
    }
  }, [isOpen, firmId]);

  /**
   * Función para cargar cuentas financieras
   */
  const loadFinancialAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("firm_id", firmId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setLoadedAccounts(data || []);
    } catch (err) {
      console.error("Error cargando cuentas financieras:", err);
      setLoadedAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Función para cargar facturas APROBADAS con saldo pendiente
   */
  const loadApprovedExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*, purchase_order:purchase_order_id(order_number)")
        .eq("firm_id", firmId)
        .in("status", ["pendiente", "APPROVED", "PAID_PARTIAL"])
        .gt("balance", 0)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setLoadedExpenses(data || []);
    } catch (err) {
      console.error("Error cargando facturas aprobadas:", err);
      setLoadedExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  /**
   * Inicializar importes por factura cuando se cargan las disponibles
   * SOLO inicializar si amountsByExpense está vacío para no sobrescribir cambios del usuario
   */
  useEffect(() => {
    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;
    // Solo inicializar si tenemos facturas y los montos están vacíos
    if (
      expensesToUse.length > 0 &&
      Object.keys(amountsByExpense).length === 0
    ) {
      const initialAmounts = {};
      expensesToUse.forEach((expense) => {
        initialAmounts[expense.id] = expense.balance || 0;
      });
      setAmountsByExpense(initialAmounts);
    }
  }, [loadedExpenses.length, availableExpenses.length]);

  useEffect(() => {
    if (formData.planned_payment_date) return;
    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;
    const dueDates = expensesToUse
      .map((expense) => expense.due_date)
      .filter(Boolean);
    if (dueDates.length > 0) {
      const earliestDueDate = dueDates.sort()[0];
      setFormData((prev) => ({
        ...prev,
        planned_payment_date: earliestDueDate,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      planned_payment_date: prev.order_date,
    }));
  }, [availableExpenses, loadedExpenses, formData.planned_payment_date]);

  /**
   * Sincronizar moneda del formulario con la de las facturas seleccionadas.
   * Si todas las facturas seleccionadas tienen la misma moneda, se usa esa.
   * Si hay mezcla o ninguna seleccionada, se mantiene la actual (o UYU por defecto).
   */
  useEffect(() => {
    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;
    const selectedIds = Object.entries(selectedExpenses)
      .filter(([, sel]) => sel)
      .map(([id]) => id);
    if (selectedIds.length === 0) return;
    const currencies = [...new Set(
      selectedIds
        .map((id) => expensesToUse.find((e) => e.id === id)?.currency)
        .filter(Boolean),
    )];
    if (currencies.length === 1) {
      setFormData((prev) =>
        prev.currency === currencies[0] ? prev : { ...prev, currency: currencies[0] },
      );
    }
  }, [selectedExpenses, availableExpenses, loadedExpenses]);

  /**
   * Calcular monto total de la orden
   */
  const calculateTotalAmount = () => {
    return Object.entries(selectedExpenses).reduce(
      (sum, [expenseId, isSelected]) => {
        if (!isSelected) return sum;
        return sum + (amountsByExpense[expenseId] || 0);
      },
      0,
    );
  };

  /**
   * Validar formulario
   */
  const validateForm = () => {
    const newErrors = {};
    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;

    const selectedCount =
      Object.values(selectedExpenses).filter(Boolean).length;
    if (selectedCount === 0) {
      newErrors.expenses = "Debe seleccionar al menos una factura para pagar";
    }

    if (!formData.beneficiary_name?.trim()) {
      newErrors.beneficiary_name = "Nombre del beneficiario requerido";
    }

    // Cuenta de origen es opcional

    if (!formData.payment_method) {
      newErrors.payment_method = "Método de pago requerido";
    }

    if (!formData.planned_payment_date) {
      newErrors.planned_payment_date = "Fecha de pago planificada requerida";
    }

    if (!formData.concept?.trim()) {
      newErrors.concept = "Concepto del pago requerido";
    }

    // Validar que los montos no excedan saldo de facturas
    Object.entries(selectedExpenses).forEach(([expenseId, isSelected]) => {
      if (!isSelected) return;
      const expense = expensesToUse.find((e) => e.id === expenseId);
      if (!expense) return; // Si no encuentra la factura, skip
      const amount = amountsByExpense[expenseId];
      if (amount > expense.balance) {
        newErrors[`amount_${expenseId}`] =
          `No puede exceder el saldo de ${expense.balance}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleExpenseToggle = (expenseId) => {
    const isCurrentlySelected = selectedExpenses[expenseId];
    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;
    const expense = expensesToUse.find((e) => e.id === expenseId);

    setSelectedExpenses((prev) => ({
      ...prev,
      [expenseId]: !isCurrentlySelected,
    }));

    // Si se está seleccionando y no tiene monto, asignar el balance completo
    if (!isCurrentlySelected && expense && !amountsByExpense[expenseId]) {
      setAmountsByExpense((prev) => ({
        ...prev,
        [expenseId]: expense.balance,
      }));

      // AUTO-LLENAR DATOS DEL BENEFICIARIO desde la expense seleccionada
      if (expense.provider_name && !formData.beneficiary_name) {
        setFormData((prev) => ({
          ...prev,
          beneficiary_name: expense.provider_name,
          beneficiary_rut: expense.provider_rut || "",
          beneficiary_phone: expense.provider_phone || "",
          beneficiary_email: expense.provider_email || "",
          beneficiary_address: expense.provider_address || "",
        }));
      }
    }

    if (errors.expenses) {
      setErrors((prev) => ({ ...prev, expenses: "" }));
    }
  };

  const handleAmountChange = (expenseId, amount) => {
    setAmountsByExpense((prev) => ({
      ...prev,
      [expenseId]: parseFloat(amount) || 0,
    }));
    if (errors[`amount_${expenseId}`]) {
      setErrors((prev) => ({ ...prev, [`amount_${expenseId}`]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const expensesToUse =
      availableExpenses.length > 0 ? availableExpenses : loadedExpenses;

    // Preparar facturas seleccionadas con montos
    const expensesWithAmounts = Object.entries(selectedExpenses)
      .filter(([_, isSelected]) => isSelected)
      .map(([expenseId, _]) => {
        // Obtener el monto del input o del balance de la factura
        const expense = expensesToUse.find((e) => e.id === expenseId);
        const amount =
          amountsByExpense[expenseId] !== undefined &&
          amountsByExpense[expenseId] !== null
            ? amountsByExpense[expenseId]
            : expense
              ? expense.balance
              : 0;

        console.log(
          `[PaymentOrder] Factura ${expenseId}: amount=${amount}, stored=${amountsByExpense[expenseId]}, expense.balance=${expense?.balance}`,
        );

        return {
          id: expenseId,
          amount_paid: amount,
          balance: expense?.balance,
          purchase_order_id: expense?.purchase_order_id || null,
        };
      });

    console.log("[PaymentOrder] Enviando:", {
      expensesWithAmounts,
      amountsByExpense,
    });

    try {
      await onSubmit(formData, expensesWithAmounts);
      // Llamar a onSuccess después de submit exitoso
      onSuccess();
    } catch (err) {
      // El error ya fue manejado en onSubmit
      console.error("Error en handleSubmit:", err);
    }
  };

  const totalAmount = calculateTotalAmount();
  const accountsToUse =
    financialAccounts.length > 0 ? financialAccounts : loadedAccounts;
  const selectedAccountBalance =
    accountsToUse.find((a) => a.id === formData.account_id)?.current_balance ||
    0;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Pago</DialogTitle>
          <DialogDescription>
            Selecciona facturas y completa los datos de la orden de pago
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Facturas */}
          <div>
            <h3 className="font-semibold mb-3">Facturas a Pagar</h3>
            {errors.expenses && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle size={18} className="text-red-500" />
                <span className="text-red-700 text-sm">{errors.expenses}</span>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">
                      <input type="checkbox" disabled />
                    </th>
                    <th className="px-4 py-2 text-left">OC</th>
                    <th className="px-4 py-2 text-left">Nº Factura</th>
                    <th className="px-4 py-2 text-left">Proveedor</th>
                    <th className="px-4 py-2 text-left">Emisión</th>
                    <th className="px-4 py-2 text-right">Saldo Pendiente</th>
                    <th className="px-4 py-2 text-right">Monto a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingExpenses ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        Cargando facturas...
                      </td>
                    </tr>
                  ) : (availableExpenses.length > 0
                      ? availableExpenses
                      : loadedExpenses
                    ).length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No hay facturas disponibles para pagar
                      </td>
                    </tr>
                  ) : (
                    (availableExpenses.length > 0
                      ? availableExpenses
                      : loadedExpenses
                    ).map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedExpenses[expense.id] || false}
                            onCheckedChange={() =>
                              handleExpenseToggle(expense.id)
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {expense.purchase_order?.order_number || "-"}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {expense.invoice_series}-{expense.invoice_number}
                        </td>
                        <td className="px-4 py-3">{expense.provider_name}</td>
                        <td className="px-4 py-3">{expense.invoice_date}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {expense.currency}{" "}
                          {expense.balance?.toLocaleString("es-UY", {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {selectedExpenses[expense.id] ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-sm text-gray-600 shrink-0">
                                {expense.currency || "UYU"}
                              </span>
                              <Input
                                type="number"
                                value={amountsByExpense[expense.id] || 0}
                                onChange={(e) =>
                                  handleAmountChange(expense.id, e.target.value)
                                }
                                step="0.01"
                                min="0"
                                max={expense.balance}
                                disabled={isLoading}
                                className="w-full text-right max-w-[140px]"
                                aria-invalid={!!errors[`amount_${expense.id}`]}
                                data-testid="input-amount"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {errors[`amount_${expense.id}`] && (
                            <div className="text-xs text-red-500 mt-1">
                              {errors[`amount_${expense.id}`]}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de Monto */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Monto Total a Pagar:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formData.currency}{" "}
                {totalAmount.toLocaleString("es-UY", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Datos de la Orden */}
          <div>
            <h3 className="font-semibold mb-3">Datos de la Orden</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order_date">Fecha de Orden *</Label>
                <Input
                  id="order_date"
                  name="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="planned_payment_date">
                  Fecha de Pago Planificada *
                </Label>
                <Input
                  id="planned_payment_date"
                  name="planned_payment_date"
                  type="date"
                  value={formData.planned_payment_date}
                  onChange={handleChange}
                  disabled={isLoading}
                  aria-invalid={!!errors.planned_payment_date}
                />
                {errors.planned_payment_date && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.planned_payment_date}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="account_id">Cuenta de Origen</Label>
                <Select
                  value={formData.account_id ? String(formData.account_id) : ""}
                  onValueChange={(value) =>
                    handleSelectChange("account_id", value || null)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.account_id}
                    data-testid="select-account"
                  >
                    <SelectValue placeholder="Seleccionar cuenta..." />
                  </SelectTrigger>
                  <SelectContent className="z-[10001] bg-white border border-gray-200 shadow-lg">
                    {accountsToUse && accountsToUse.length > 0 ? (
                      accountsToUse.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name} ({account.currency}:{" "}
                          {account.current_balance.toLocaleString("es-UY", {
                            maximumFractionDigits: 2,
                          })}
                          )
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>
                        No hay cuentas disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.account_id && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.account_id}
                  </div>
                )}
                {formData.account_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo disponible: {formData.currency}{" "}
                    {selectedAccountBalance.toLocaleString("es-UY", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <h3 className="font-semibold mb-3">Método de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Tipo de Pago *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) =>
                    handleSelectChange("payment_method", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.payment_method}
                    data-testid="select-payment-method"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.payment_method && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.payment_method}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reference_number">
                  Referencia (cheque, transferencia, etc)
                </Label>
                <Input
                  id="reference_number"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleChange}
                  placeholder="Nº de cheque, referencia, etc."
                  disabled={isLoading}
                  data-testid="input-reference"
                />
              </div>
            </div>
          </div>

          {/* Datos del Beneficiario */}
          <div>
            <h3 className="font-semibold mb-3">Datos del Beneficiario</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beneficiary_name">Nombre *</Label>
                <Input
                  id="beneficiary_name"
                  name="beneficiary_name"
                  value={formData.beneficiary_name}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  disabled={isLoading}
                  aria-invalid={!!errors.beneficiary_name}
                />
                {errors.beneficiary_name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.beneficiary_name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="beneficiary_rut">RUT</Label>
                <Input
                  id="beneficiary_rut"
                  name="beneficiary_rut"
                  value={formData.beneficiary_rut}
                  onChange={handleChange}
                  placeholder="12345678901-2"
                  disabled={isLoading}
                />
              </div>

              {formData.payment_method === "transfer" && (
                <>
                  <div>
                    <Label htmlFor="beneficiary_bank">Banco</Label>
                    <Input
                      id="beneficiary_bank"
                      name="beneficiary_bank"
                      value={formData.beneficiary_bank}
                      onChange={handleChange}
                      placeholder="Nombre del banco"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="beneficiary_account">Nº de Cuenta</Label>
                    <Input
                      id="beneficiary_account"
                      name="beneficiary_account"
                      value={formData.beneficiary_account}
                      onChange={handleChange}
                      placeholder="Número de cuenta"
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <Label htmlFor="concept">Concepto del Pago *</Label>
            <Input
              id="concept"
              name="concept"
              value={formData.concept}
              onChange={handleChange}
              placeholder="Ej: Pago de facturas vencidas"
              disabled={isLoading}
              aria-invalid={!!errors.concept}
            />
            {errors.concept && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                <AlertCircle size={14} />
                {errors.concept}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="btn-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || totalAmount === 0}
              data-testid="btn-save"
            >
              {isLoading ? "Creando..." : "Crear Orden de Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
