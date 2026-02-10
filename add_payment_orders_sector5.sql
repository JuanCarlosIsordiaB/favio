-- Sector 5 - Pagos: fecha de pago planificada
alter table if exists payment_orders
  add column if not exists planned_payment_date date;

update payment_orders
set planned_payment_date = order_date
where planned_payment_date is null;
