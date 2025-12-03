import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompetitorPrice {
  id: string;
  product_id: string;
  competitor_name: string;
  price: number;
}

export interface KitProductItem {
  product_id: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  type_id: string | null;
  cost_price: number;
  profit_rate: number;
  sale_price: number;
  quantity: number;
  is_kit: boolean;
  created_at: string;
  type_name?: string;
  competitor_prices?: CompetitorPrice[];
  kit_product_ids?: string[];
  kit_products?: KitProductItem[];
}

interface CreateProductInput {
  name: string;
  type_id: string | null;
  cost_price: number;
  profit_rate: number;
  sale_price: number;
  quantity: number;
  is_kit: boolean;
  competitor_prices?: { competitor_name: string; price: number }[];
  kit_product_ids?: string[];
}

export function useProducts() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // Fetch products with type names
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_types (name)
        `)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;

      // Fetch competitor prices
      const { data: competitorPrices, error: cpError } = await supabase
        .from('competitor_prices')
        .select('*');
      
      if (cpError) throw cpError;

      // Fetch kit products with quantities
      const { data: kitProducts, error: kpError } = await supabase
        .from('kit_products')
        .select('*');
      
      if (kpError) throw kpError;

      // Map products with their related data
      return productsData.map((product: any) => {
        const productKitItems = kitProducts?.filter((kp: any) => kp.kit_id === product.id) || [];
        return {
          id: product.id,
          name: product.name,
          type_id: product.type_id,
          cost_price: Number(product.cost_price),
          profit_rate: Number(product.profit_rate),
          sale_price: Number(product.sale_price),
          quantity: product.quantity,
          is_kit: product.is_kit,
          created_at: product.created_at,
          type_name: product.product_types?.name,
          competitor_prices: competitorPrices?.filter((cp: any) => cp.product_id === product.id) || [],
          kit_product_ids: productKitItems.map((kp: any) => kp.product_id),
          kit_products: productKitItems.map((kp: any) => ({
            product_id: kp.product_id,
            quantity: kp.quantity,
          })),
        };
      }) as Product[];
    },
  });

  const addProduct = useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { competitor_prices, kit_product_ids, ...productData } = input;
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (productError) throw productError;

      // Insert competitor prices if any
      if (competitor_prices && competitor_prices.length > 0) {
        const { error: cpError } = await supabase
          .from('competitor_prices')
          .insert(
            competitor_prices.map((cp) => ({
              product_id: product.id,
              competitor_name: cp.competitor_name,
              price: cp.price,
            }))
          );
        
        if (cpError) throw cpError;
      }

      // Insert kit products if it's a kit
      if (input.is_kit && kit_product_ids && kit_product_ids.length > 0) {
        const { error: kpError } = await supabase
          .from('kit_products')
          .insert(
            kit_product_ids.map((productId) => ({
              kit_id: product.id,
              product_id: productId,
            }))
          );
        
        if (kpError) throw kpError;
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates, competitor_prices, kit_products }: { 
      id: string; 
      updates: Partial<Omit<CreateProductInput, 'competitor_prices' | 'kit_product_ids'>>;
      competitor_prices?: { competitor_name: string; price: number }[];
      kit_products?: KitProductItem[];
    }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Update competitor prices if provided
      if (competitor_prices !== undefined) {
        // Delete existing
        await supabase.from('competitor_prices').delete().eq('product_id', id);
        
        // Insert new ones
        if (competitor_prices.length > 0) {
          const { error: cpError } = await supabase
            .from('competitor_prices')
            .insert(
              competitor_prices.map((cp) => ({
                product_id: id,
                competitor_name: cp.competitor_name,
                price: cp.price,
              }))
            );
          
          if (cpError) throw cpError;
        }
      }

      // Update kit products if provided
      if (kit_products !== undefined) {
        // Delete existing
        await supabase.from('kit_products').delete().eq('kit_id', id);
        
        // Insert new ones
        if (kit_products.length > 0) {
          const { error: kpError } = await supabase
            .from('kit_products')
            .insert(
              kit_products.map((kp) => ({
                kit_id: id,
                product_id: kp.product_id,
                quantity: kp.quantity,
              }))
            );
          
          if (kpError) throw kpError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const product = products.find((p) => p.id === id);
      if (!product) throw new Error('Product not found');
      
      const newQuantity = Math.max(0, product.quantity + delta);
      
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const setQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const newQuantity = Math.max(0, quantity);
      
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const createKit = useMutation({
    mutationFn: async ({ items: kitItems, kitSalePrice }: { items: KitProductItem[]; kitSalePrice?: number }) => {
      const selectedProducts = products.filter((p) => kitItems.some(ki => ki.product_id === p.id));
      if (selectedProducts.length === 0) throw new Error('No products selected');

      const kitName = kitItems.map((ki) => {
        const p = selectedProducts.find(sp => sp.id === ki.product_id);
        return ki.quantity > 1 ? `${ki.quantity}x ${p?.name}` : p?.name;
      }).join(' + ');
      
      const totalCost = kitItems.reduce((sum, ki) => {
        const p = selectedProducts.find(sp => sp.id === ki.product_id);
        return sum + (p?.cost_price || 0) * ki.quantity;
      }, 0);
      
      const totalSale = kitItems.reduce((sum, ki) => {
        const p = selectedProducts.find(sp => sp.id === ki.product_id);
        return sum + (p?.sale_price || 0) * ki.quantity;
      }, 0);
      
      const profitRate = totalCost > 0 ? ((totalSale / totalCost) * 100 - 100) : 0;

      const { data: kit, error: kitError } = await supabase
        .from('products')
        .insert({
          name: kitName,
          type_id: null,
          cost_price: totalCost,
          profit_rate: Math.round(profitRate * 100) / 100,
          sale_price: kitSalePrice || totalSale,
          quantity: 0,
          is_kit: true,
        })
        .select()
        .single();
      
      if (kitError) throw kitError;

      // Insert kit products with quantities
      const { error: kpError } = await supabase
        .from('kit_products')
        .insert(
          kitItems.map((ki) => ({
            kit_id: kit.id,
            product_id: ki.product_id,
            quantity: ki.quantity,
          }))
        );
      
      if (kpError) throw kpError;

      return kit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products,
    isLoading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateQuantity,
    setQuantity,
    createKit,
  };
}
