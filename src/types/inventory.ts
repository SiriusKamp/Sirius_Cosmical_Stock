export interface ProductType {
  id: string;
  name: string;
  createdAt: Date;
}

export interface CompetitorPrice {
  id: string;
  competitorName: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  typeId: string;
  typeName?: string;
  costPrice: number;
  profitRate: number;
  salePrice: number;
  quantity: number;
  competitorPrices: CompetitorPrice[];
  isKit: boolean;
  kitProductIds?: string[];
  createdAt: Date;
}

export type PriceInputMode = 'rate' | 'price';
