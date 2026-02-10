-- ============================================
-- REESTRUCTURACIÓN DE FACTURAS - SECTOR 2
-- ============================================
-- Este script modifica la estructura de expenses para cumplir
-- con los requerimientos del SECTOR 2 - FACTURA
--
-- INSTRUCCIONES:
-- 1. Ejecuta primero analyze_expenses_structure.sql para ver qué existe
-- 2. Luego ejecuta este script
-- 3. Verifica que todos los cambios se aplicaron correctamente
--
-- ============================================

-- ============================================
-- PARTE 1: CREAR TABLA expense_items
-- ============================================
-- Esta tabla guarda los items individuales de cada factura
-- Permite mantener la integridad con los items de la OC

CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    
    -- Datos pre-cargados desde OC
    item_description TEXT NOT NULL,
    category VARCHAR(100),
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    
    -- Datos financieros adicionales (completados después)
    unit_price NUMERIC(10, 2) DEFAULT 0,
    supplier_item_code VARCHAR(100), -- Código del ítem del proveedor
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    subtotal NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id 
ON expense_items(expense_id);

CREATE INDEX IF NOT EXISTS idx_expense_items_purchase_order_item_id 
ON expense_items(purchase_order_item_id);

CREATE INDEX IF NOT EXISTS idx_expense_items_category 
ON expense_items(category);

-- ============================================
-- PARTE 2: AGREGAR CAMPOS FALTANTES A expenses
-- ============================================

-- Agregar campo para código de ítem del proveedor (si no existe)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS supplier_item_code VARCHAR(100);

-- Agregar campo invoice_date si no existe (fecha de factura)
-- Usar 'date' existente como invoice_date si invoice_date no existe
DO $$
BEGIN
    -- Si NO existe invoice_date, crearlo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'invoice_date'
    ) THEN
        ALTER TABLE expenses ADD COLUMN invoice_date DATE;
        
        -- Si existe 'date', copiar datos
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expenses' AND column_name = 'date'
        ) THEN
            UPDATE expenses 
            SET invoice_date = date::DATE 
            WHERE date IS NOT NULL AND invoice_date IS NULL;
        END IF;
    END IF;
END $$;

-- Agregar campo payment_condition si no existe (Crédito / Contado)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS payment_condition VARCHAR(20) 
CHECK (payment_condition IN ('credito', 'contado') OR payment_condition IS NULL);

-- ============================================
-- PARTE 3: ACTUALIZAR ESTADOS
-- ============================================
-- Cambiar estados de expenses a: pendiente, completada, cancelada

-- Primero, eliminar constraint de estados si existe
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS check_expense_status;

-- Actualizar estados existentes
UPDATE expenses
SET status = CASE
    WHEN LOWER(status) IN ('draft', 'pending', 'registered') THEN 'pendiente'
    WHEN LOWER(status) IN ('approved', 'paid') THEN 'completada'
    WHEN LOWER(status) IN ('cancelled', 'canceled') THEN 'cancelada'
    ELSE 'pendiente'
END
WHERE status IS NOT NULL;

-- Normalizar a minúsculas
UPDATE expenses
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

-- Establecer pendiente para valores NULL
UPDATE expenses
SET status = 'pendiente'
WHERE status IS NULL OR status = '';

-- Crear constraint CHECK para estados
ALTER TABLE expenses
ADD CONSTRAINT check_expense_status 
CHECK (
    status IS NOT NULL 
    AND status IN ('pendiente', 'completada', 'cancelada')
);

-- ============================================
-- PARTE 4: ACTUALIZAR payment_condition DESDE payment_method/payment_terms
-- ============================================

-- Si payment_method o payment_terms existe, mapear a payment_condition
UPDATE expenses
SET payment_condition = CASE
    WHEN payment_method = 'contado' OR payment_terms = 'contado' THEN 'contado'
    WHEN payment_method IS NOT NULL OR payment_terms IS NOT NULL THEN 'credito'
    ELSE NULL
END
WHERE payment_condition IS NULL;

-- ============================================
-- PARTE 5: CREAR FUNCIÓN PARA CREAR FACTURA DESDE OC
-- ============================================

CREATE OR REPLACE FUNCTION create_invoice_from_purchase_order(
    p_purchase_order_id UUID,
    p_invoice_date DATE DEFAULT CURRENT_DATE,
    p_invoice_number VARCHAR(100) DEFAULT NULL,
    p_payment_condition VARCHAR(20) DEFAULT 'credito'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po RECORD;
    v_expense_id UUID;
    v_item RECORD;
BEGIN
    -- Obtener datos de la orden de compra
    SELECT * INTO v_po
    FROM purchase_orders
    WHERE id = p_purchase_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orden de compra no encontrada: %', p_purchase_order_id;
    END IF;
    
    -- Validar payment_condition
    IF p_payment_condition NOT IN ('credito', 'contado') THEN
        RAISE EXCEPTION 'Condición de pago inválida: %. Debe ser "credito" o "contado"', p_payment_condition;
    END IF;
    
    -- Crear la factura (expense)
    INSERT INTO expenses (
        firm_id,
        premise_id,
        purchase_order_id,
        invoice_date,
        invoice_number,
        invoice_series,
        provider_name,
        provider_rut,
        provider_phone,
        provider_email,
        category,
        concept,
        currency,
        amount,
        status,
        payment_condition,
        description,
        notes,
        created_at
    ) VALUES (
        v_po.firm_id,
        v_po.premise_id,
        v_po.id,
        p_invoice_date,
        p_invoice_number,
        NULL, -- invoice_series se puede agregar después
        v_po.supplier_name,
        v_po.supplier_rut,
        v_po.supplier_phone,
        v_po.supplier_email,
        'Insumos', -- Categoría por defecto
        CONCAT('Factura desde OC: ', v_po.order_number),
        'UYU', -- Moneda por defecto
        0, -- amount requerido (se recalcula luego)
        'pendiente', -- Estado inicial
        p_payment_condition,
        CONCAT('Factura generada automáticamente desde orden de compra ', v_po.order_number),
        NULL,
        NOW()
    ) RETURNING id INTO v_expense_id;
    
    -- Copiar items de la OC a la factura
    FOR v_item IN 
        SELECT * FROM purchase_order_items
        WHERE purchase_order_id = p_purchase_order_id
    LOOP
        INSERT INTO expense_items (
            expense_id,
            purchase_order_item_id,
            item_description,
            category,
            quantity,
            unit,
            unit_price,
            subtotal,
            tax_amount,
            total
        ) VALUES (
            v_expense_id,
            v_item.id,
            v_item.item_description,
            v_item.category,
            v_item.quantity,
            v_item.unit,
            0, -- Precio unitario se completa después
            0, -- Subtotal se calcula después
            0, -- Tax amount se calcula después
            0  -- Total se calcula después
        );
    END LOOP;
    
    RETURN v_expense_id;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION create_invoice_from_purchase_order(UUID, DATE, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_from_purchase_order(UUID, DATE, VARCHAR, VARCHAR) TO service_role;

-- ============================================
-- PARTE 6: CREAR TRIGGER PARA ACTUALIZAR FACTURAS CUANDO OC CAMBIA
-- ============================================

CREATE OR REPLACE FUNCTION sync_invoice_on_po_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si la OC se cancela o rechaza, actualizar facturas relacionadas
    IF NEW.status = 'rechazada' AND OLD.status != 'rechazada' THEN
        UPDATE expenses
        SET status = 'cancelada'
        WHERE purchase_order_id = NEW.id
        AND status = 'pendiente';
    END IF;
    
    -- Si la OC se modifica, las facturas pendientes pueden necesitar actualización
    -- (esto se maneja manualmente o con lógica adicional)
    
    RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_sync_invoice_on_po_change ON purchase_orders;
CREATE TRIGGER trigger_sync_invoice_on_po_change
AFTER UPDATE ON purchase_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_invoice_on_po_change();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que expense_items se creó
SELECT 
    'expense_items creada' AS resultado,
    COUNT(*) as columnas
FROM information_schema.columns
WHERE table_name = 'expense_items';

-- Verificar campos agregados a expenses
SELECT 
    'Campos agregados a expenses' AS resultado,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'expenses'
AND column_name IN ('supplier_item_code', 'invoice_date', 'payment_condition');

-- Verificar estados actuales
SELECT 
    'Estados actuales' AS resultado,
    status,
    COUNT(*) as cantidad
FROM expenses
GROUP BY status
ORDER BY status;

-- Verificar constraint de estados
SELECT 
    'Constraint de estados' AS resultado,
    conname,
    pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'expenses'::regclass
AND conname = 'check_expense_status';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. La tabla expense_items permite guardar múltiples items por factura
-- 2. Los items se copian automáticamente desde purchase_order_items
-- 3. Los precios y totales se completan después cuando se recibe la factura del proveedor
-- 4. Los estados se simplificaron a: pendiente, completada, cancelada
-- 5. La función create_invoice_from_purchase_order() crea facturas automáticamente desde OC
-- 6. El trigger actualiza facturas cuando la OC se cancela/rechaza

