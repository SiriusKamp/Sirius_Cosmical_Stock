import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, ProductType, CompetitorPrice } from '@/types/inventory';

interface InventoryState {
  products: Product[];
  productTypes: ProductType[];
  
  // Product Types
  addProductType: (name: string) => void;
  updateProductType: (id: string, name: string) => void;
  deleteProductType: (id: string) => void;
  
  // Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  
  // Kits
  createKit: (productIds: string[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: [],
      productTypes: [],

      addProductType: (name) => {
        set((state) => ({
          productTypes: [
            ...state.productTypes,
            { id: generateId(), name, createdAt: new Date() },
          ],
        }));
      },

      updateProductType: (id, name) => {
        set((state) => ({
          productTypes: state.productTypes.map((type) =>
            type.id === id ? { ...type, name } : type
          ),
          products: state.products.map((product) =>
            product.typeId === id ? { ...product, typeName: name } : product
          ),
        }));
      },

      deleteProductType: (id) => {
        set((state) => ({
          productTypes: state.productTypes.filter((type) => type.id !== id),
        }));
      },

      addProduct: (product) => {
        const type = get().productTypes.find((t) => t.id === product.typeId);
        set((state) => ({
          products: [
            ...state.products,
            {
              ...product,
              id: generateId(),
              typeName: type?.name,
              createdAt: new Date(),
            },
          ],
        }));
      },

      updateProduct: (id, updates) => {
        const type = updates.typeId
          ? get().productTypes.find((t) => t.id === updates.typeId)
          : null;
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? {
                  ...product,
                  ...updates,
                  typeName: type?.name ?? product.typeName,
                }
              : product
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }));
      },

      updateQuantity: (id, delta) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? { ...product, quantity: Math.max(0, product.quantity + delta) }
              : product
          ),
        }));
      },

      createKit: (productIds) => {
        const products = get().products.filter((p) => productIds.includes(p.id));
        if (products.length === 0) return;

        const kitName = products.map((p) => p.name).join(' + ');
        const totalCost = products.reduce((sum, p) => sum + p.costPrice, 0);
        const totalSale = products.reduce((sum, p) => sum + p.salePrice, 0);
        const profitRate = totalCost > 0 ? ((totalSale / totalCost) * 100 - 100) : 0;

        set((state) => ({
          products: [
            ...state.products,
            {
              id: generateId(),
              name: kitName,
              typeId: '',
              typeName: 'Kit',
              costPrice: totalCost,
              profitRate: Math.round(profitRate * 100) / 100,
              salePrice: totalSale,
              quantity: 0,
              competitorPrices: [],
              isKit: true,
              kitProductIds: productIds,
              createdAt: new Date(),
            },
          ],
        }));
      },
    }),
    {
      name: 'inventory-storage',
    }
  )
);
