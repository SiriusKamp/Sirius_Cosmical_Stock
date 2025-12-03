-- =============================================
-- Schema do Inventário - Supabase
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Tabela de Tipos de Produto
CREATE TABLE public.product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de Produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  is_kit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de Preços de Concorrentes
CREATE TABLE public.competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de Relacionamento Kit-Produtos (para kits compostos)
CREATE TABLE public.kit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(kit_id, product_id)
);

-- =============================================
-- Índices para melhor performance
-- =============================================
CREATE INDEX idx_products_type_id ON public.products(type_id);
CREATE INDEX idx_competitor_prices_product_id ON public.competitor_prices(product_id);
CREATE INDEX idx_kit_products_kit_id ON public.kit_products(kit_id);
CREATE INDEX idx_kit_products_product_id ON public.kit_products(product_id);

-- =============================================
-- Habilitar Row Level Security (RLS)
-- Por enquanto, permite acesso público para teste
-- =============================================
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_products ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para acesso público (desenvolvimento)
CREATE POLICY "Allow public read access on product_types" 
  ON public.product_types FOR SELECT USING (true);

CREATE POLICY "Allow public insert on product_types" 
  ON public.product_types FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on product_types" 
  ON public.product_types FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on product_types" 
  ON public.product_types FOR DELETE USING (true);

CREATE POLICY "Allow public read access on products" 
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Allow public insert on products" 
  ON public.products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on products" 
  ON public.products FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on products" 
  ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on competitor_prices" 
  ON public.competitor_prices FOR SELECT USING (true);

CREATE POLICY "Allow public insert on competitor_prices" 
  ON public.competitor_prices FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on competitor_prices" 
  ON public.competitor_prices FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on competitor_prices" 
  ON public.competitor_prices FOR DELETE USING (true);

CREATE POLICY "Allow public read access on kit_products" 
  ON public.kit_products FOR SELECT USING (true);

CREATE POLICY "Allow public insert on kit_products" 
  ON public.kit_products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on kit_products" 
  ON public.kit_products FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on kit_products" 
  ON public.kit_products FOR DELETE USING (true);

-- =============================================
-- View útil para análise de dados
-- =============================================
CREATE VIEW public.products_with_types AS
SELECT 
  p.*,
  pt.name AS type_name
FROM public.products p
LEFT JOIN public.product_types pt ON p.type_id = pt.id;

-- View de análise de margem
CREATE VIEW public.product_margins AS
SELECT 
  p.id,
  p.name,
  pt.name AS type_name,
  p.cost_price,
  p.sale_price,
  p.profit_rate,
  (p.sale_price - p.cost_price) AS profit_margin,
  CASE 
    WHEN p.cost_price > 0 THEN ROUND(((p.sale_price - p.cost_price) / p.cost_price * 100)::numeric, 2)
    ELSE 0 
  END AS margin_percentage,
  p.quantity,
  (p.quantity * p.sale_price) AS total_stock_value
FROM public.products p
LEFT JOIN public.product_types pt ON p.type_id = pt.id
WHERE p.is_kit = FALSE;

-- View de análise de concorrência
CREATE VIEW public.competitor_analysis AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sale_price AS our_price,
  cp.competitor_name,
  cp.price AS competitor_price,
  (p.sale_price - cp.price) AS price_difference,
  CASE 
    WHEN cp.price > 0 THEN ROUND(((p.sale_price - cp.price) / cp.price * 100)::numeric, 2)
    ELSE 0 
  END AS price_diff_percentage
FROM public.products p
JOIN public.competitor_prices cp ON p.id = cp.product_id;
