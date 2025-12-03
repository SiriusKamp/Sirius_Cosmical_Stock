import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductType {
  id: string;
  name: string;
  created_at: string;
}

export function useProductTypes() {
  const queryClient = useQueryClient();

  const { data: productTypes = [], isLoading, error } = useQuery({
    queryKey: ['product_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductType[];
    },
  });

  const addProductType = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('product_types')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_types'] });
    },
  });

  const updateProductType = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('product_types')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_types'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProductType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_types'] });
    },
  });

  return {
    productTypes,
    isLoading,
    error,
    addProductType,
    updateProductType,
    deleteProductType,
  };
}
