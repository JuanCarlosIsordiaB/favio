-- ============================================
-- REESTRUCTURACIÓN DE ÓRDENES DE COMPRA (OC)
-- ============================================
-- Este script modifica la estructura de purchase_orders y purchase_order_items
-- para cumplir con los requerimientos del SECTOR 1 - ORDEN DE COMPRA
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase: https://app.supabase.com
-- 2. Ve a SQL Editor (menú lateral izquierdo)
-- 3. Crea una nueva consulta
-- 4. Copia y pega TODO este contenido
-- 5. Haz clic en "Run" o presiona Ctrl+Enter
-- 6. Verifica que todas las operaciones se ejecuten correctamente
--
-- ============================================

-- PASO 1: Agregar premise_id a purchase_orders
-- Esto permite asociar la OC con un predio específico
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS premise_id UUID REFERENCES premises(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_orders_premise_id 
ON purchase_orders(premise_id);

-- PASO 2: Agregar category a purchase_order_items
-- Esto permite categorizar cada producto/insumo
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_category 
ON purchase_order_items(category);

-- PASO 3: Modificar el estado para que solo acepte: pendiente, aprobada, rechazada
-- Primero, actualizar los estados existentes a los nuevos valores
UPDATE purchase_orders
SET status = CASE
  WHEN status = 'draft' THEN 'pendiente'
  WHEN status = 'approved' THEN 'aprobada'
  WHEN status = 'sent' THEN 'aprobada'  -- Los enviados se consideran aprobados
  WHEN status = 'received' THEN 'aprobada'  -- Los recibidos se consideran aprobados
  WHEN status = 'cancelled' THEN 'rechazada'
  ELSE 'pendiente'  -- Cualquier otro estado se convierte en pendiente
END
WHERE status IS NOT NULL;

-- Crear un tipo ENUM para los estados (opcional, pero más seguro)
-- Si ya existe, eliminarlo primero
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    DROP TYPE purchase_order_status CASCADE;
  END IF;
END $$;

CREATE TYPE purchase_order_status AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- Modificar la columna status para usar el ENUM
-- Primero, cambiar temporalmente a text
ALTER TABLE purchase_orders 
ALTER COLUMN status TYPE VARCHAR(50);

-- Luego, actualizar cualquier valor que no sea válido
UPDATE purchase_orders
SET status = 'pendiente'
WHERE status NOT IN ('pendiente', 'aprobada', 'rechazada');

-- Finalmente, cambiar a usar el ENUM (comentado porque puede causar problemas si hay datos)
-- ALTER TABLE purchase_orders 
-- ALTER COLUMN status TYPE purchase_order_status USING status::purchase_order_status;

-- PASO 4: Agregar constraint CHECK para validar estados
ALTER TABLE purchase_orders
DROP CONSTRAINT IF EXISTS check_purchase_order_status;

ALTER TABLE purchase_orders
ADD CONSTRAINT check_purchase_order_status 
CHECK (status IN ('pendiente', 'aprobada', 'rechazada'));

-- PASO 5: Hacer opcionales los campos que no son requeridos según la especificación
-- Estos campos pueden quedar como están (ya son opcionales en la mayoría de casos)
-- pero los marcamos explícitamente como opcionales si no lo son

-- currency, exchange_rate, delivery_date, delivery_address, payment_terms
-- supplier_rut, supplier_address ya son opcionales

-- PASO 6: Verificar que order_number sea único y se genere automáticamente
-- (Esto debería estar manejado por la función RPC get_next_purchase_order_number)

-- Verificar que existe la función para generar números de orden
-- Si no existe, crearla
CREATE OR REPLACE FUNCTION get_next_purchase_order_number(p_firm_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
  v_order_number TEXT;
BEGIN
  -- Obtener el año actual
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Obtener el último número de orden del año actual para esta firma
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM purchase_orders
  WHERE firm_id = p_firm_id
    AND order_number ~ ('^OC-' || v_year || '-[0-9]+$');
  
  -- Generar número con formato OC-YYYY-NNNNN
  v_order_number := 'OC-' || v_year || '-' || LPAD(v_next_number::TEXT, 5, '0');
  
  RETURN v_order_number;
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_next_purchase_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_purchase_order_number(UUID) TO service_role;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar los cambios:

-- Verificar que premise_id fue agregado
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'purchase_orders' AND column_name = 'premise_id';

-- Verificar que category fue agregado
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'purchase_order_items' AND column_name = 'category';

-- Verificar estados actuales
-- SELECT status, COUNT(*) 
-- FROM purchase_orders 
-- GROUP BY status;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Los campos currency, exchange_rate, delivery_date, delivery_address, 
--    payment_terms, supplier_rut, supplier_address, tax_rate, tax_amount, 
--    subtotal, total_amount NO se eliminan de la base de datos para mantener
--    compatibilidad con datos existentes, pero NO se usarán en el nuevo formulario.
--
-- 2. El componente PurchaseOrders.jsx será modificado para NO mostrar/requerir
--    estos campos en el formulario de creación/edición.
--
-- 3. Los estados antiguos (draft, approved, sent, received, cancelled) han sido
--    convertidos a los nuevos estados (pendiente, aprobada, rechazada).
--
-- 4. El número de orden se genera automáticamente usando la función RPC
--    get_next_purchase_order_number con formato OC-YYYY-NNNNN.

