-- Fix: ensure expenses.amount is set when creating invoices from purchase orders
-- Run this in your DB to update the RPC and add a safe default.

alter table if exists expenses
  alter column amount set default 0;

update expenses
set amount = 0
where amount is null;

create or replace function create_invoice_from_purchase_order(
    p_purchase_order_id uuid,
    p_invoice_date date default current_date,
    p_invoice_number varchar(100) default null,
    p_payment_condition varchar(20) default 'credito'
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_po record;
    v_expense_id uuid;
    v_item record;
begin
    select * into v_po
    from purchase_orders
    where id = p_purchase_order_id;

    if not found then
        raise exception 'Orden de compra no encontrada: %', p_purchase_order_id;
    end if;

    if p_payment_condition not in ('credito', 'contado') then
        raise exception 'Condicion de pago invalida: %. Debe ser "credito" o "contado"', p_payment_condition;
    end if;

    insert into expenses (
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
    ) values (
        v_po.firm_id,
        v_po.premise_id,
        v_po.id,
        p_invoice_date,
        p_invoice_number,
        null,
        v_po.supplier_name,
        v_po.supplier_rut,
        v_po.supplier_phone,
        v_po.supplier_email,
        'Insumos',
        concat('Factura desde OC: ', v_po.order_number),
        'UYU',
        0,
        'pendiente',
        p_payment_condition,
        concat('Factura generada automaticamente desde orden de compra ', v_po.order_number),
        null,
        now()
    ) returning id into v_expense_id;

    for v_item in
        select * from purchase_order_items
        where purchase_order_id = p_purchase_order_id
    loop
        insert into expense_items (
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
        ) values (
            v_expense_id,
            v_item.id,
            v_item.item_description,
            v_item.category,
            v_item.quantity,
            v_item.unit,
            0,
            0,
            0,
            0
        );
    end loop;

    return v_expense_id;
end;
$$;

grant execute on function create_invoice_from_purchase_order(uuid, date, varchar, varchar) to authenticated;
grant execute on function create_invoice_from_purchase_order(uuid, date, varchar, varchar) to service_role;
