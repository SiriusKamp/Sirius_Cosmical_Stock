import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GradientCard } from "@/components/shared/GradientCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExcelImport } from "@/components/shared/ExcelImport";
import { QuantityControl } from "@/components/shared/QuantityControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, Product } from "@/hooks/useProducts";
import { useProductTypes } from "@/hooks/useProductTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package, Minus, PlusCircle, X, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Check } from "lucide-react";
import { toast } from "sonner";
import { PriceInputMode } from "@/types/inventory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ProductFormData {
  name: string;
  typeId: string;
  costPrice: number;
  profitRate: number;
  salePrice: number;
  quantity: number;
  competitorPrices: { id: string; competitorName: string; price: number }[];
}

const initialFormData: ProductFormData = {
  name: "",
  typeId: "",
  costPrice: 0,
  profitRate: 0,
  salePrice: 0,
  quantity: 0,
  competitorPrices: [],
};

type SortField = "name" | "type" | "quantity" | "cost_price" | "sale_price" | "profit_rate";
type SortDirection = "asc" | "desc";

export default function Products() {
  const { products, isLoading, addProduct, updateProduct, deleteProduct, updateQuantity, setQuantity } = useProducts();
  const { productTypes, isLoading: typesLoading } = useProductTypes();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [priceMode, setPriceMode] = useState<PriceInputMode>("rate");

  // Filter & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const regularProducts = products.filter((p) => !p.is_kit);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = regularProducts;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) => 
        p.name.toLowerCase().includes(term) ||
        p.type_name?.toLowerCase().includes(term)
      );
    }

    // Filter by type (multi-select)
    if (filterTypes.length > 0) {
      result = result.filter((p) => p.type_id && filterTypes.includes(p.type_id));
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          comparison = (a.type_name || "").localeCompare(b.type_name || "");
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "cost_price":
          comparison = a.cost_price - b.cost_price;
          break;
        case "sale_price":
          comparison = a.sale_price - b.sale_price;
          break;
        case "profit_rate":
          comparison = a.profit_rate - b.profit_rate;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [regularProducts, searchTerm, filterTypes, sortField, sortDirection]);

  const toggleFilterType = (typeId: string) => {
    setFilterTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const calculateFromRate = (cost: number, rate: number) => {
    return cost * (1 + rate / 100);
  };

  const calculateFromPrice = (cost: number, price: number) => {
    if (cost === 0) return 0;
    return (price / cost) * 100 - 100;
  };

  const handleCostChange = (cost: number) => {
    const newFormData = { ...formData, costPrice: cost };
    if (priceMode === "rate") {
      newFormData.salePrice = calculateFromRate(cost, formData.profitRate);
    } else {
      newFormData.profitRate = calculateFromPrice(cost, formData.salePrice);
    }
    setFormData(newFormData);
  };

  const handleRateChange = (rate: number) => {
    setFormData({
      ...formData,
      profitRate: rate,
      salePrice: calculateFromRate(formData.costPrice, rate),
    });
  };

  const handlePriceChange = (price: number) => {
    setFormData({
      ...formData,
      salePrice: price,
      profitRate: calculateFromPrice(formData.costPrice, price),
    });
  };

  const addCompetitorPrice = () => {
    setFormData({
      ...formData,
      competitorPrices: [
        ...formData.competitorPrices,
        { id: Math.random().toString(36).substr(2, 9), competitorName: "", price: 0 },
      ],
    });
  };

  const removeCompetitorPrice = (id: string) => {
    setFormData({
      ...formData,
      competitorPrices: formData.competitorPrices.filter((cp) => cp.id !== id),
    });
  };

  const updateCompetitorPriceField = (id: string, field: "competitorName" | "price", value: string | number) => {
    setFormData({
      ...formData,
      competitorPrices: formData.competitorPrices.map((cp) =>
        cp.id === id ? { ...cp, [field]: value } : cp
      ),
    });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }
    if (!formData.typeId) {
      toast.error("Selecione o tipo do produto");
      return;
    }

    try {
      await addProduct.mutateAsync({
        name: formData.name,
        type_id: formData.typeId,
        cost_price: formData.costPrice,
        profit_rate: formData.profitRate,
        sale_price: formData.salePrice,
        quantity: formData.quantity,
        is_kit: false,
        competitor_prices: formData.competitorPrices.map((cp) => ({
          competitor_name: cp.competitorName,
          price: cp.price,
        })),
      });
      setFormData(initialFormData);
      setIsAddOpen(false);
      toast.success("Produto cadastrado!");
    } catch (error) {
      toast.error("Erro ao cadastrar produto");
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    if (!formData.name.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        updates: {
          name: formData.name,
          type_id: formData.typeId || null,
          cost_price: formData.costPrice,
          profit_rate: formData.profitRate,
          sale_price: formData.salePrice,
          quantity: formData.quantity,
        },
        competitor_prices: formData.competitorPrices.map((cp) => ({
          competitor_name: cp.competitorName,
          price: cp.price,
        })),
      });
      setEditingProduct(null);
      setFormData(initialFormData);
      toast.success("Produto atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar produto");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja excluir o produto "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync(id);
        toast.success("Produto excluído!");
      } catch (error) {
        toast.error("Erro ao excluir produto");
      }
    }
  };

  const handleQuantityChange = async (id: string, delta: number) => {
    try {
      await updateQuantity.mutateAsync({ id, delta });
    } catch (error) {
      toast.error("Erro ao atualizar quantidade");
    }
  };

  const handleSetQuantity = async (id: string, quantity: number) => {
    try {
      await setQuantity.mutateAsync({ id, quantity });
    } catch (error) {
      toast.error("Erro ao definir quantidade");
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      typeId: product.type_id || "",
      costPrice: product.cost_price,
      profitRate: product.profit_rate,
      salePrice: product.sale_price,
      quantity: product.quantity,
      competitorPrices: product.competitor_prices?.map((cp) => ({
        id: cp.id,
        competitorName: cp.competitor_name,
        price: cp.price,
      })) || [],
    });
  };

  const renderProductForm = (isEdit: boolean) => (
    <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label>Nome do Produto</Label>
        <Input
          placeholder="Ex: Camiseta Básica"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v })}>
          <SelectTrigger className="bg-input border-border">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {productTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Preço de Custo</Label>
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.costPrice || ""}
          onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="space-y-2">
        <Label>Modo de Cálculo</Label>
        <Select value={priceMode} onValueChange={(v) => setPriceMode(v as PriceInputMode)}>
          <SelectTrigger className="bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="rate">Taxa de Lucro (%)</SelectItem>
            <SelectItem value="price">Valor de Venda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {priceMode === "rate" ? (
        <div className="space-y-2">
          <Label>Taxa de Lucro (%)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.profitRate || ""}
            onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
          />
          <p className="text-sm text-muted-foreground">
            Valor de Venda: R$ {formData.salePrice.toFixed(2)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Valor de Venda</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.salePrice || ""}
            onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
          />
          <p className="text-sm text-muted-foreground">
            Taxa de Lucro: {formData.profitRate.toFixed(2)}%
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Quantidade Inicial</Label>
        <Input
          type="number"
          placeholder="0"
          value={formData.quantity || ""}
          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Preços de Concorrentes</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addCompetitorPrice}>
            <PlusCircle className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        {formData.competitorPrices.map((cp) => (
          <div key={cp.id} className="flex gap-2 items-center">
            <Input
              placeholder="Nome do concorrente"
              value={cp.competitorName}
              onChange={(e) => updateCompetitorPriceField(cp.id, "competitorName", e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={cp.price || ""}
              onChange={(e) => updateCompetitorPriceField(cp.id, "price", parseFloat(e.target.value) || 0)}
              className="w-28"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeCompetitorPrice(cp.id)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            isEdit ? setEditingProduct(null) : setIsAddOpen(false);
            setFormData(initialFormData);
          }}
        >
          Cancelar
        </Button>
        <Button 
          type="button"
          variant="gradient" 
          onClick={isEdit ? handleUpdate : handleAdd}
          disabled={addProduct.isPending || updateProduct.isPending}
        >
          {(addProduct.isPending || updateProduct.isPending) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );

  if (isLoading || typesLoading) {
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
      <PageHeader title="Produtos" description="Gerencie seus produtos">
        <div className="flex gap-2">
          <ExcelImport
            title="Importar Produtos"
            templateFileName="modelo_produtos"
            columns={[
              { key: "name", label: "Produto", required: true, type: "string" },
              { key: "type", label: "Tipo", required: true, type: "string" },
              { key: "cost_price", label: "Custo", required: true, type: "number" },
              { key: "profit_rate", label: "Taxa de Lucro", required: true, type: "number" },
              { key: "sale_price", label: "Valor de Venda", required: true, type: "number" },
              { key: "competitor_price", label: "Valor Concorrente", required: false, type: "number" },
              { key: "competitor_name", label: "Nome Concorrente", required: false, type: "string" },
            ]}
            onImport={async (data) => {
              if (productTypes.length === 0) {
                throw new Error("Cadastre pelo menos um tipo de produto antes de importar.");
              }

              for (const item of data) {
                const type = productTypes.find(
                  (t) => t.name.toLowerCase() === item.type?.toLowerCase()
                );
                
                if (!type) {
                  throw new Error(`Tipo "${item.type}" não encontrado. Verifique se o tipo existe.`);
                }

                const competitorPrices = item.competitor_price && item.competitor_name
                  ? [{ competitor_name: item.competitor_name, price: item.competitor_price }]
                  : [];

                await addProduct.mutateAsync({
                  name: item.name,
                  type_id: type.id,
                  cost_price: item.cost_price,
                  profit_rate: item.profit_rate,
                  sale_price: item.sale_price,
                  quantity: 0,
                  is_kit: false,
                  competitor_prices: competitorPrices,
                });
              }
              toast.success(`${data.length} produto(s) importado(s) com sucesso!`);
            }}
          />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" disabled={productTypes.length === 0}>
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg w-[95vw]">
              <DialogHeader>
                <DialogTitle className="gradient-text">Novo Produto</DialogTitle>
              </DialogHeader>
              {renderProductForm(false)}
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {productTypes.length === 0 && (
        <GradientCard gradient="warm" className="mb-6">
          <p className="text-sm">
            ⚠️ Cadastre pelo menos um tipo de produto antes de adicionar produtos.
          </p>
        </GradientCard>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-48 bg-input border-border justify-start">
              <Filter className="h-4 w-4 mr-2" />
              {filterTypes.length === 0 
                ? "Todos os tipos" 
                : filterTypes.length === 1 
                  ? productTypes.find(t => t.id === filterTypes[0])?.name
                  : `${filterTypes.length} tipos`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-popover border-border" align="start">
            <div className="space-y-1">
              {productTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent"
                  onClick={() => toggleFilterType(type.id)}
                >
                  <div className={`h-4 w-4 border rounded flex items-center justify-center ${filterTypes.includes(type.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {filterTypes.includes(type.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">{type.name}</span>
                </div>
              ))}
              {filterTypes.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setFilterTypes([])}
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
        </p>
        {(searchTerm || filterTypes.length > 0) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchTerm(""); setFilterTypes([]); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {regularProducts.length === 0 ? (
        <GradientCard gradient="secondary" className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum produto cadastrado</h3>
          <p className="mt-2 text-muted-foreground">
            Clique em "Novo Produto" para começar
          </p>
        </GradientCard>
      ) : filteredProducts.length === 0 ? (
        <GradientCard gradient="secondary" className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum produto encontrado</h3>
          <p className="mt-2 text-muted-foreground">
            Tente ajustar os filtros
          </p>
        </GradientCard>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  <span className="flex items-center">
                    Produto <SortIcon field="name" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort("type")}
                >
                  <span className="flex items-center">
                    Tipo <SortIcon field="type" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right hidden lg:table-cell"
                  onClick={() => handleSort("quantity")}
                >
                  <span className="flex items-center justify-end">
                    Qtd <SortIcon field="quantity" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("cost_price")}
                >
                  <span className="flex items-center justify-end">
                    Custo <SortIcon field="cost_price" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("sale_price")}
                >
                  <span className="flex items-center justify-end">
                    Venda <SortIcon field="sale_price" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right hidden lg:table-cell"
                  onClick={() => handleSort("profit_rate")}
                >
                  <span className="flex items-center justify-end">
                    Lucro <SortIcon field="profit_rate" />
                  </span>
                </TableHead>
                <TableHead className="text-center hidden md:table-cell">Estoque</TableHead>
                <TableHead className="w-10 md:w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="max-w-[100px] md:max-w-none truncate">
                      {product.name}
                      {product.competitor_prices && product.competitor_prices.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="ml-2 cursor-pointer text-xs hidden sm:inline-flex"
                            >
                              {product.competitor_prices.length} conc.
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 bg-popover border-border">
                            <div className="space-y-1">
                              {product.competitor_prices.map((cp) => (
                                <div key={cp.id} className="text-sm flex justify-between gap-4">
                                  <span className="text-muted-foreground">{cp.competitor_name}:</span>
                                  <span>R$ {cp.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="font-normal">
                      {product.type_name || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">
                    {product.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs md:text-sm">
                    R$ {product.cost_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium gradient-text text-xs md:text-sm">
                    R$ {product.sale_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden lg:table-cell">
                    {product.profit_rate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <QuantityControl
                      value={product.quantity}
                      onChange={(newValue) => handleSetQuantity(product.id, newValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hidden md:flex" onClick={() => handleDelete(product.id, product.name)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="bg-card border-border max-w-lg w-[95vw]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="gradient-text">Editar Produto</DialogTitle>
              {editingProduct && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="sm:hidden text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleDelete(editingProduct.id, editingProduct.name);
                    setEditingProduct(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          </DialogHeader>
          {renderProductForm(true)}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
