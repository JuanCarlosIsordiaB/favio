/**
 * RemittanceFormModal.jsx
 * Modal para crear/editar remitos
 *
 * Funcionalidades:
 * - Crear nuevo remito
 * - Cargar desde orden de compra
 * - Gestión dinámica de ítems
 * - Validaciones en tiempo real
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Label } from "../ui/label";
import { Plus, Trash2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  validarRemito,
  validarItemRemito,
  validarFormularioCompleto,
} from "../../lib/validations/remittanceValidations";
import { supabase } from "../../lib/supabase";

export default function RemittanceFormModal({
  isOpen,
  onClose,
  onSubmit,
  selectedFirm,
  selectedPremise,
  currentUser,
}) {
  // ===========================
  // ESTADO
  // ===========================

  const [formData, setFormData] = useState({
    remittance_number: "",
    remittance_date: new Date().toISOString().split("T")[0],
    status: "pending",
    purchase_order_id: "",
    invoice_id: "",
    supplier_name: "",
    supplier_rut: "",
    transport_company: "",
    driver_name: "",
    vehicle_plate: "",
    delivery_address: "",
    received_by: currentUser || "",
    premise_id: selectedPremise?.id || "",
    depot_id: "",
    notes: "",
  });

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    item_description: "",
    input_id: null, // Nuevo: vinculación a insumo existente
    category: "",
    unit: "kg",
    quantity_ordered: "",
    quantity_received: "",
  });

  const [inputs, setInputs] = useState([]); // Nuevo: lista de insumos existentes
  const [searchInput, setSearchInput] = useState(""); // Nuevo: búsqueda
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [depots, setDepots] = useState([]);
  const [depotLots, setDepotLots] = useState([]);
  const [premisses, setPremisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [showNewDepotInput, setShowNewDepotInput] = useState(false);
  const [newDepotName, setNewDepotName] = useState("");

  // ===========================
  // EFECTOS
  // ===========================

  useEffect(() => {
    if (isOpen) {
      loadDepots();
      loadPremisses();
      loadInputs(); // Nuevo: cargar insumos existentes
      loadPurchaseOrders();
      loadInvoices();
      // Pre-llenar predio si está seleccionado
      if (selectedPremise?.id) {
        setFormData((prev) => ({
          ...prev,
          premise_id: selectedPremise.id,
        }));
      }
    }
  }, [isOpen, selectedPremise]);

  // ===========================
  // FUNCIONES
  // ===========================

  /**
   * Cargar depósitos
   * IMPORTANTE: remittances.depot_id referencia a lots.id, no a depots.id
   * Por lo tanto, solo cargamos lotes marcados como depósito
   */
  const loadDepots = async () => {
    try {
      // Cargar lotes marcados como depósito (estos son los que se pueden usar en remittances)
      const { data: depotsMarked } = await supabase
        .from("lots")
        .select("id, name")
        .eq("is_depot", true)
        .eq("firm_id", selectedFirm.id)
        .order("name");

      setDepotLots(depotsMarked || []);

      // También cargamos depots de la tabla depots para referencia (pero no los usamos en remittances)
      const { data: depotsData } = await supabase
        .from("depots")
        .select("id, name")
        .eq("firm_id", selectedFirm.id)
        .order("name");

      setDepots(depotsData || []);
    } catch (err) {
      console.error("Error cargando depósitos:", err);
      toast.error("Error cargando depósitos");
    }
  };

  /**
   * Crear nuevo depósito
   * Nota: Los remittances.depot_id referencia a lots.id, no a depots.id
   * Por lo tanto, creamos un lote con is_depot = true
   */
  const handleCreateNewDepot = async () => {
    if (!newDepotName.trim()) {
      toast.error("Debes ingresar un nombre para el depósito");
      return;
    }

    if (!formData.premise_id) {
      toast.error("Debes seleccionar primero un predio de entrega");
      return;
    }

    try {
      // Crear un lote con is_depot = true (ya que remittances.depot_id referencia a lots)
      const { data: newLot, error } = await supabase
        .from("lots")
        .insert([
          {
            name: newDepotName.trim(),
            firm_id: selectedFirm.id,
            premise_id: formData.premise_id,
            is_depot: true,
          },
        ])
        .select("id, name")
        .single();

      if (error) throw error;

      // Agregar el nuevo lote-depósito a la lista
      setDepotLots((prev) => [...prev, newLot]);

      // Seleccionar el nuevo depósito
      setFormData((prev) => ({ ...prev, depot_id: newLot.id }));

      // Limpiar y cerrar el input
      setNewDepotName("");
      setShowNewDepotInput(false);

      toast.success(`Depósito "${newLot.name}" creado exitosamente`);
    } catch (err) {
      console.error("Error creando depósito:", err);
      toast.error(
        "Error al crear el depósito: " + (err.message || "Error desconocido"),
      );
    }
  };

  /**
   * Cargar predios
   */
  const loadPremisses = async () => {
    try {
      const { data } = await supabase
        .from("premises")
        .select("*")
        .eq("firm_id", selectedFirm.id);
      setPremisses(data || []);
    } catch (err) {
      console.error("Error cargando predios:", err);
      toast.error("Error cargando predios");
    }
  };

  /**
   * Cargar insumos existentes - Nuevo
   */
  const loadInputs = async () => {
    try {
      const { data } = await supabase
        .from("inputs")
        .select("id, name, unit, category")
        .eq("firm_id", selectedFirm.id)
        .order("name");
      setInputs(data || []);
    } catch (err) {
      console.error("Error cargando insumos:", err);
      toast.error("Error cargando insumos");
    }
  };

  /**
   * Cargar órdenes de compra
   */
  const loadPurchaseOrders = async () => {
    try {
      const { data } = await supabase
        .from("purchase_orders")
        .select(
          `
            id,
            order_number,
            supplier_name,
            supplier_rut,
            delivery_address,
            order_date,
            status,
            purchase_order_items (
              id,
              item_description,
              quantity,
              unit,
              input_id
            )
          `,
        )
        .eq("firm_id", selectedFirm.id)
        .order("order_date", { ascending: false });

      setPurchaseOrders(data || []);
    } catch (err) {
      console.error("Error cargando órdenes de compra:", err);
      toast.error("Error cargando órdenes de compra");
    }
  };

  /**
   * Cargar facturas de compra
   */
  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from("expenses")
        .select(
          "id, invoice_number, invoice_series, invoice_date, provider_name, purchase_order_id",
        )
        .eq("firm_id", selectedFirm.id)
        .order("invoice_date", { ascending: false });

      setInvoices(data || []);
    } catch (err) {
      console.error("Error cargando facturas:", err);
      toast.error("Error cargando facturas");
    }
  };

  /**
   * Manejar cambio en campos de formulario
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar error cuando usuario escribe
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /**
   * Seleccionar orden de compra y cargar sus ítems
   */
  const handlePurchaseOrderChange = (purchaseOrderId) => {
    if (!purchaseOrderId) {
      setFormData((prev) => ({
        ...prev,
        purchase_order_id: "",
        invoice_id: "",
        supplier_name: "",
        supplier_rut: "",
        delivery_address: "",
      }));
      if (errors.purchase_order_id || errors.invoice_id) {
        setErrors((prev) => ({
          ...prev,
          purchase_order_id: "",
          invoice_id: "",
        }));
      }
      setItems([]);
      return;
    }

    const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
    if (!po) return;

    const inputCategoryMap = new Map(
      inputs.map((input) => [input.id, input.category || ""]),
    );

    const itemsFromPO = (po.purchase_order_items || []).map((item) => ({
      id: item.id,
      purchase_order_item_id: item.id,
      input_id: item.input_id || null,
      item_description: item.item_description,
      category: item.input_id ? inputCategoryMap.get(item.input_id) || "" : "",
      unit: item.unit,
      quantity_ordered: item.quantity,
      quantity_received: item.quantity,
    }));

    setFormData((prev) => ({
      ...prev,
      purchase_order_id: po.id,
      invoice_id: "",
      supplier_name: po.supplier_name || "",
      supplier_rut: po.supplier_rut || "",
      delivery_address: po.delivery_address || "",
    }));

    if (errors.purchase_order_id || errors.invoice_id) {
      setErrors((prev) => ({
        ...prev,
        purchase_order_id: "",
        invoice_id: "",
      }));
    }

    setItems(itemsFromPO);
  };

  /**
   * Manejar selección de insumo existente - Nuevo
   */
  const handleSelectInput = (inputId) => {
    const selectedInput = inputs.find((i) => i.id === inputId);
    if (selectedInput) {
      console.log("✅ [handleSelectInput] Insumo seleccionado:", {
        id: selectedInput.id,
        name: selectedInput.name,
        unit: selectedInput.unit,
      });
      setCurrentItem((prev) => {
        const updated = {
          ...prev,
          input_id: selectedInput.id,
          item_description: selectedInput.name,
          category: selectedInput.category || "",
          unit: selectedInput.unit || "kg",
        };
        console.log(
          "✅ [handleSelectInput] currentItem actualizado:",
          JSON.stringify(updated, null, 2),
        );
        return updated;
      });
      setSearchInput(""); // Limpiar búsqueda
    }
  };

  /**
   * Filtrar insumos por búsqueda - Nuevo
   */
  const filteredInputs = inputs.filter((i) =>
    i.name.toLowerCase().includes(searchInput.toLowerCase()),
  );

  /**
   * Manejar cambio en campos de ítem actual
   */
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));

    if (itemErrors[name]) {
      setItemErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /**
   * Agregar ítem a la tabla
   */
  const handleAddItem = () => {
    // Validar ítem
    const validacion = validarItemRemito(currentItem);
    if (!validacion.valido) {
      setItemErrors(validacion.errores);
      toast.error("Complete los campos requeridos del ítem");
      return;
    }

    // Agregar a tabla
    const nuevoItem = {
      ...currentItem,
      id: Date.now().toString(),
      quantity_ordered: parseFloat(currentItem.quantity_ordered),
      quantity_received: currentItem.quantity_received
        ? parseFloat(currentItem.quantity_received)
        : 0,
    };

    // 🔍 DEBUG: Log detallado de lo que se está agregando
    console.log(
      "📌 [handleAddItem] currentItem ANTES de spread:",
      JSON.stringify(currentItem, null, 2),
    );
    console.log(
      "📌 [handleAddItem] nuevoItem DESPUÉS de spread:",
      JSON.stringify(nuevoItem, null, 2),
    );
    console.log(
      "📌 [handleAddItem] input_id en nuevoItem:",
      nuevoItem.input_id,
    );

    setItems((prev) => {
      const updated = [...prev, nuevoItem];
      console.log(
        "📌 [handleAddItem] Items array DESPUÉS de agregar:",
        JSON.stringify(updated, null, 2),
      );
      return updated;
    });

    // Limpiar formulario de ítem
    setCurrentItem({
      item_description: "",
      input_id: null, // Actualizado: limpiar input_id
      category: "",
      unit: "kg",
      quantity_ordered: "",
      quantity_received: "",
    });
    setSearchInput(""); // Nuevo: limpiar búsqueda
    setItemErrors({});

    toast.success("Ítem agregado");
  };

  /**
   * Eliminar ítem de la tabla
   */
  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success("Ítem eliminado");
  };

  /**
   * Enviar formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación completa
    const validacion = validarFormularioCompleto(formData, items);
    if (!validacion.valido) {
      setErrors(validacion.errores);
      toast.error("Complete los campos requeridos");
      return;
    }

    if (validacion.warnings.length > 0) {
      validacion.warnings.forEach((w) => toast.warning(w));
    }

    // 🔍 DEBUG: Log items antes de enviar
    console.log(
      "🚀 [handleSubmit] Items a enviar:",
      JSON.stringify(items, null, 2),
    );
    console.log("🚀 [handleSubmit] Items count:", items.length);
    items.forEach((item, idx) => {
      console.log(
        `🚀 [handleSubmit] Item ${idx} - input_id:`,
        item.input_id,
        "| item_description:",
        item.item_description,
      );
    });

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        firm_id: selectedFirm.id,
        // NOTA: created_by se maneja desde el contexto de autenticación
        // No incluir currentUser aquí si es un string (no es UUID válido)
      };

      console.log("🚀 [handleSubmit] Llamando onSubmit con submitData y items");
      await onSubmit(submitData, items);

      // Limpiar formulario
      setFormData({
        remittance_number: "",
        remittance_date: new Date().toISOString().split("T")[0],
        status: "pending",
        purchase_order_id: "",
        invoice_id: "",
        supplier_name: "",
        supplier_rut: "",
        transport_company: "",
        driver_name: "",
        vehicle_plate: "",
        delivery_address: "",
        received_by: currentUser || "",
        premise_id: selectedPremise?.id || "",
        depot_id: "",
        notes: "",
      });
      setItems([]);
      setErrors({});
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // RENDER
  // ===========================

  const categoryOptions = Array.from(
    new Set(inputs.map((input) => input.category).filter(Boolean)),
  );

  const filteredInvoices = formData.purchase_order_id
    ? invoices.filter(
        (invoice) => invoice.purchase_order_id === formData.purchase_order_id,
      )
    : invoices;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Remito de Recepción</DialogTitle>
          <DialogDescription>
            Registra la recepción física de mercadería. Es el único mecanismo
            para crear insumos y actualizar stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-4">
          {/* ===== SECCIÓN: INFORMACIÓN DEL REMITO ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Remito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="remittance_number">Nº de Remito *</Label>
                  <Input
                    id="remittance_number"
                    name="remittance_number"
                    value={formData.remittance_number}
                    onChange={handleFormChange}
                    placeholder="Ej: REM-001-2026"
                    className={errors.remittance_number ? "border-red-500" : ""}
                  />
                  {errors.remittance_number && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.remittance_number}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="remittance_date">Fecha *</Label>
                  <Input
                    id="remittance_date"
                    name="remittance_date"
                    type="date"
                    value={formData.remittance_date}
                    onChange={handleFormChange}
                    className={errors.remittance_date ? "border-red-500" : ""}
                  />
                  {errors.remittance_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.remittance_date}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Estado *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, status: value }));
                      if (errors.status) {
                        setErrors((prev) => ({ ...prev, status: "" }));
                      }
                    }}
                  >
                    <SelectTrigger
                      className={errors.status ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="received">Recibido</SelectItem>
                      <SelectItem value="partially_received">
                        Parcial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-xs text-red-500 mt-1">{errors.status}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="purchase_order_id">Nº de Orden (OC) *</Label>
                  <Select
                    value={formData.purchase_order_id}
                    onValueChange={handlePurchaseOrderChange}
                  >
                    <SelectTrigger
                      className={
                        errors.purchase_order_id ? "border-red-500" : ""
                      }
                    >
                      <SelectValue placeholder="Selecciona OC" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.order_number} - {po.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.purchase_order_id && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.purchase_order_id}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="invoice_id">Nº de Factura *</Label>
                <Select
                  value={formData.invoice_id}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, invoice_id: value }));
                    if (errors.invoice_id) {
                      setErrors((prev) => ({ ...prev, invoice_id: "" }));
                    }
                  }}
                >
                  <SelectTrigger
                    className={errors.invoice_id ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Selecciona factura" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {(invoice.invoice_series
                          ? `${invoice.invoice_series}-`
                          : "") + (invoice.invoice_number || "S/N")}{" "}
                        - {invoice.provider_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.invoice_id && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.invoice_id}
                  </p>
                )}
                {formData.purchase_order_id &&
                  filteredInvoices.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      No hay facturas asociadas a esta OC.
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="premise_id">Predio de Entrega *</Label>
                  <Select
                    value={formData.premise_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, premise_id: value }))
                    }
                  >
                    <SelectTrigger
                      className={errors.premise_id ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Selecciona predio" />
                    </SelectTrigger>
                    <SelectContent>
                      {premisses.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.premise_id && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.premise_id}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="depot_id">Depósito de Destino *</Label>
                  {!showNewDepotInput ? (
                    <>
                      <Select
                        value={formData.depot_id}
                        onValueChange={(value) => {
                          if (value === "new_depot") {
                            setShowNewDepotInput(true);
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              depot_id: value,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger
                          className={errors.depot_id ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Selecciona depósito" />
                        </SelectTrigger>
                        <SelectContent>
                          {depotLots.length > 0 &&
                            depotLots.map((l) => (
                              <SelectItem key={`lot-${l.id}`} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                          <SelectItem
                            value="new_depot"
                            className="text-blue-600 font-medium"
                          >
                            + Crear Nuevo Depósito
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.depot_id && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.depot_id}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {depotLots.length === 0
                          ? "No hay depósitos. Crea uno nuevo o marca un lote como depósito en la gestión de lotes."
                          : "Selecciona un depósito existente o crea uno nuevo"}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nombre del nuevo depósito"
                        value={newDepotName}
                        onChange={(e) => setNewDepotName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateNewDepot();
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCreateNewDepot}
                          size="sm"
                          className="flex-1"
                        >
                          Crear Depósito
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewDepotInput(false);
                            setNewDepotName("");
                          }}
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== SECCIÓN: PROVEEDOR ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Información del Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Nombre del Proveedor *</Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleFormChange}
                    placeholder="Ej: Proveedor S.A."
                    className={errors.supplier_name ? "border-red-500" : ""}
                  />
                  {errors.supplier_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.supplier_name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supplier_rut">RUT del Proveedor</Label>
                  <Input
                    id="supplier_rut"
                    name="supplier_rut"
                    value={formData.supplier_rut}
                    onChange={handleFormChange}
                    placeholder="Ej: 20.123.456-7"
                    className={errors.supplier_rut ? "border-red-500" : ""}
                  />
                  {errors.supplier_rut && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.supplier_rut}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== SECCIÓN: TRANSPORTE ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Información de Transporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="transport_company">
                    Empresa de Transporte
                  </Label>
                  <Input
                    id="transport_company"
                    name="transport_company"
                    value={formData.transport_company}
                    onChange={handleFormChange}
                    placeholder="Ej: Transportes XYZ"
                  />
                </div>

                <div>
                  <Label htmlFor="driver_name">Chofer</Label>
                  <Input
                    id="driver_name"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleFormChange}
                    placeholder="Nombre del chofer"
                  />
                </div>

                <div>
                  <Label htmlFor="vehicle_plate">Patente</Label>
                  <Input
                    id="vehicle_plate"
                    name="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={handleFormChange}
                    placeholder="Ej: ABC-1234"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_address">Dirección de Entrega</Label>
                <Input
                  id="delivery_address"
                  name="delivery_address"
                  value={formData.delivery_address}
                  onChange={handleFormChange}
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <Label htmlFor="received_by">Recibido por *</Label>
                <Input
                  id="received_by"
                  name="received_by"
                  value={formData.received_by}
                  onChange={handleFormChange}
                  placeholder="Nombre de quien recibe"
                />
              </div>
            </CardContent>
          </Card>

          {/* ===== SECCIÓN: ÍTEMS ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ítems del Remito</CardTitle>
              <CardDescription>
                Agrega los productos/insumos que incluye este remito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para agregar ítem */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                {/* Búsqueda de insumos existentes - Nuevo */}
                <div>
                  <Label htmlFor="search_input">
                    Buscar insumo existente (Opcional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="search_input"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Ej: Urea 46%, Fertilizante..."
                      className="mb-2"
                    />
                    {searchInput && filteredInputs.length > 0 && (
                      <div className="absolute top-10 left-0 right-0 border border-slate-300 bg-white rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {filteredInputs.map((input) => (
                          <button
                            key={input.id}
                            type="button"
                            onClick={() => handleSelectInput(input.id)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b border-slate-200 last:border-0"
                          >
                            <div className="font-medium">{input.name}</div>
                            <div className="text-xs text-slate-500">
                              {input.unit} • {input.category || "Sin categoría"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {currentItem.input_id && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Insumo seleccionado: {currentItem.item_description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="item_description">Descripción *</Label>
                    <Input
                      id="item_description"
                      name="item_description"
                      value={currentItem.item_description}
                      onChange={handleItemChange}
                      placeholder="Ej: Semilla de soja variedad X"
                      className={
                        itemErrors.item_description ? "border-red-500" : ""
                      }
                    />
                    {itemErrors.item_description && (
                      <p className="text-xs text-red-500 mt-1">
                        {itemErrors.item_description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {currentItem.input_id
                        ? "(Vinculado a insumo existente)"
                        : "(Nuevo insumo → se creará al recibir)"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="unit">Unidad *</Label>
                    <Select
                      value={currentItem.unit}
                      onValueChange={(value) =>
                        setCurrentItem((prev) => ({ ...prev, unit: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="l">Litros</SelectItem>
                        <SelectItem value="un">Unidades</SelectItem>
                        <SelectItem value="t">Toneladas</SelectItem>
                        <SelectItem value="m3">M³</SelectItem>
                        <SelectItem value="other">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoría *</Label>
                    <Input
                      id="category"
                      name="category"
                      value={currentItem.category}
                      onChange={handleItemChange}
                      placeholder="Ej: Fertilizantes"
                      list="category-options"
                      className={itemErrors.category ? "border-red-500" : ""}
                    />
                    <datalist id="category-options">
                      {categoryOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    {itemErrors.category && (
                      <p className="text-xs text-red-500 mt-1">
                        {itemErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="quantity_ordered">
                      Cantidad Ordenada *
                    </Label>
                    <Input
                      id="quantity_ordered"
                      name="quantity_ordered"
                      type="number"
                      step="0.01"
                      value={currentItem.quantity_ordered}
                      onChange={handleItemChange}
                      placeholder="0"
                      className={
                        itemErrors.quantity_ordered ? "border-red-500" : ""
                      }
                    />
                    {itemErrors.quantity_ordered && (
                      <p className="text-xs text-red-500 mt-1">
                        {itemErrors.quantity_ordered}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity_received">
                      Cantidad Entregada *
                    </Label>
                    <Input
                      id="quantity_received"
                      name="quantity_received"
                      type="number"
                      step="0.01"
                      value={currentItem.quantity_received}
                      onChange={handleItemChange}
                      placeholder="0"
                      className={
                        itemErrors.quantity_received ? "border-red-500" : ""
                      }
                    />
                    {itemErrors.quantity_received && (
                      <p className="text-xs text-red-500 mt-1">
                        {itemErrors.quantity_received}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Ítem
                </Button>
              </div>

              {/* Tabla de ítems */}
              {items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Descripción</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-right">
                          Cantidad Ordenada
                        </TableHead>
                        <TableHead className="text-right">
                          Cantidad Entregada
                        </TableHead>
                        <TableHead className="text-right">Unidad</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_description}</TableCell>
                          <TableCell>{item.category || "-"}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${item.input_id ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {item.input_id ? "Existente" : "Nuevo"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity_ordered}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity_received || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unit}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay ítems. Agrega al menos uno</p>
                </div>
              )}

              {errors.items && (
                <p className="text-sm text-red-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {Array.isArray(errors.items)
                    ? errors.items.join(", ")
                    : errors.items}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ===== SECCIÓN: NOTAS ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comentarios y Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes">
                Comentarios / observaciones (opcional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                placeholder="Ej: Daños observados, faltantes, etc."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* ===== BOTONES ===== */}
          <div className="flex justify-between gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || items.length === 0}
            >
              {loading ? "Guardando..." : "Guardar Remito"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
