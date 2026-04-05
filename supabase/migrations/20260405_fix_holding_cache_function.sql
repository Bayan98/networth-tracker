-- Fix: create recalculate_holding_cache(uuid) that trg_holding_cache trigger calls.
--
-- Recalculates three cached columns on holdings from transactions:
--   quantity            — net position (buys/deposits/splits/transfers minus sells/withdrawals)
--   average_cost_basis  — weighted average price of buy transactions
--   total_income_earned — total cash received from income-type transactions

CREATE OR REPLACE FUNCTION public.recalculate_holding_cache(p_holding_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quantity           numeric;
  v_total_buy_value    numeric;
  v_total_buy_qty      numeric;
  v_avg_cost           numeric;
  v_total_income       numeric;
BEGIN
  -- Net quantity: inflows minus outflows
  SELECT COALESCE(SUM(
    CASE transaction_type
      WHEN 'buy'      THEN quantity
      WHEN 'deposit'  THEN quantity
      WHEN 'split'    THEN quantity
      WHEN 'transfer' THEN quantity
      WHEN 'sell'     THEN -quantity
      WHEN 'withdrawal' THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO v_quantity
  FROM public.transactions
  WHERE holding_id = p_holding_id;

  -- Weighted average cost basis (buy transactions only)
  SELECT
    COALESCE(SUM(quantity * price), 0),
    COALESCE(SUM(quantity), 0)
  INTO v_total_buy_value, v_total_buy_qty
  FROM public.transactions
  WHERE holding_id = p_holding_id
    AND transaction_type = 'buy';

  IF v_total_buy_qty > 0 THEN
    v_avg_cost := v_total_buy_value / v_total_buy_qty;
  ELSE
    v_avg_cost := 0;
  END IF;

  -- Total income earned from income-type transactions
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO v_total_income
  FROM public.transactions
  WHERE holding_id = p_holding_id
    AND transaction_type IN ('dividend', 'interest', 'coupon', 'rental_income', 'salary');

  -- Write back to holding
  UPDATE public.holdings
  SET
    quantity            = v_quantity,
    average_cost_basis  = v_avg_cost,
    total_income_earned = v_total_income
  WHERE id = p_holding_id;
END;
$$;

-- Trigger function (recreate to ensure it calls the correct function)
CREATE OR REPLACE FUNCTION public.trg_holding_cache_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.holding_id IS NOT NULL THEN
      PERFORM public.recalculate_holding_cache(OLD.holding_id);
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE: recalculate for new holding_id
  IF NEW.holding_id IS NOT NULL THEN
    PERFORM public.recalculate_holding_cache(NEW.holding_id);
  END IF;

  -- UPDATE where holding_id changed: also recalculate old holding
  IF TG_OP = 'UPDATE'
     AND OLD.holding_id IS NOT NULL
     AND OLD.holding_id IS DISTINCT FROM NEW.holding_id THEN
    PERFORM public.recalculate_holding_cache(OLD.holding_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS trg_holding_cache ON public.transactions;

CREATE TRIGGER trg_holding_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_holding_cache_fn();
