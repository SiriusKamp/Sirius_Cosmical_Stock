import { MainLayout } from "@/components/layout/MainLayout";
import { GradientCard } from "@/components/shared/GradientCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { useProducts } from "@/hooks/useProducts";
import { useProductTypes } from "@/hooks/useProductTypes";
import { Package, Tags, Boxes, TrendingUp, DollarSign, Archive, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { products, isLoading: productsLoading } = useProducts();
  const { productTypes, isLoading: typesLoading } = useProductTypes();

  const isLoading = productsLoading || typesLoading;

  const totalProducts = products.filter((p) => !p.is_kit).length;
  const totalKits = products.filter((p) => p.is_kit).length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + p.sale_price * p.quantity, 0);
  const totalCost = products.reduce((sum, p) => sum + p.cost_price * p.quantity, 0);
  const potentialProfit = totalValue - totalCost;

  const stats = [
    {
      label: "Tipos de Produto",
      value: productTypes.length,
      icon: Tags,
      gradient: "primary" as const,
    },
    {
      label: "Produtos",
      value: totalProducts,
      icon: Package,
      gradient: "secondary" as const,
    },
    {
      label: "Kits",
      value: totalKits,
      icon: Boxes,
      gradient: "accent" as const,
    },
    {
      label: "Total em Estoque",
      value: totalStock,
      icon: Archive,
      gradient: "warm" as const,
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu estoque"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GradientCard key={stat.label} gradient={stat.gradient}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${
                  stat.gradient === "primary" ? "gradient-bg-primary" :
                  stat.gradient === "secondary" ? "gradient-bg-secondary" :
                  stat.gradient === "accent" ? "gradient-bg-accent" :
                  "gradient-bg-warm"
                }`}>
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <GradientCard gradient="primary">
          <div className="flex items-center gap-4">
            <div className="gradient-bg-primary rounded-xl p-4">
              <DollarSign className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total em Estoque</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold break-all">
                R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GradientCard>

        <GradientCard gradient="accent">
          <div className="flex items-center gap-4">
            <div className="gradient-bg-accent rounded-xl p-4">
              <TrendingUp className="h-8 w-8 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lucro Potencial</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold break-all">
                R$ {potentialProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </GradientCard>
      </div>

      {products.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Produtos Recentes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <GradientCard key={product.id} gradient="primary" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.is_kit ? "Kit" : product.type_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold gradient-text">
                      R$ {product.sale_price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qtd: {product.quantity}
                    </p>
                  </div>
                </div>
              </GradientCard>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="mt-8">
          <GradientCard gradient="secondary" className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
            <p className="mt-2 text-muted-foreground">
              Comece cadastrando tipos de produtos e depois adicione seus produtos.
            </p>
          </GradientCard>
        </div>
      )}
    </MainLayout>
  );
}
