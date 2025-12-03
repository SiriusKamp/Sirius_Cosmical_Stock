import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GradientCard } from "@/components/shared/GradientCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useProducts, Product, KitProductItem } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Boxes, Minus, Package, Loader2, Search, ArrowUpDown, Filter, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { normalizedIncludes } from "@/lib/textUtils";

type SortKey = "name" | "type_name" | "cost_price" | "sale_price" | "profit_rate";
type SortDirection = "asc" | "desc";

export default function Kits() {
  const { products, isLoading, createKit, updateProduct, deleteProduct } = useProducts();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Product | null>(null);
  const [selectedKitItems, setSelectedKitItems] = useState<Record<string, number>>({});
  const [editKitItems, setEditKitItems] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [editSearchTerm, setEditSearchTerm] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [editFilterTypes, setEditFilterTypes] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editFormData, setEditFormData] = useState({
    name: "",
    costPrice: 0,
    profitRate: 0,
    salePrice: 0,
    kitSalePrice: 0,
  });
  const [newKitSalePrice, setNewKitSalePrice] = useState(0);

  const kits = products.filter((p) => p.is_kit);
  const regularProducts = products.filter((p) => !p.is_kit);

  const productTypes = useMemo(() => {
    const types = new Set(regularProducts.map((p) => p.type_name).filter(Boolean));
    return Array.from(types).sort();
  }, [regularProducts]);

  const toggleFilterType = (typeName: string) => {
    setFilterTypes((prev) =>
      prev.includes(typeName)
        ? prev.filter((t) => t !== typeName)
        : [...prev, typeName]
    );
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = regularProducts.filter((p) =>
      normalizedIncludes(p.name, searchTerm)
    );
    
    if (filterTypes.length > 0) {
      filtered = filtered.filter((p) => filterTypes.includes(p.type_name || ""));
    }
    
    return filtered.sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? "";
      let bVal: string | number = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [regularProducts, searchTerm, filterTypes, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedKitItems((prev) => {
      if (prev[productId] !== undefined) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: 1 };
    });
  };

  const updateKitItemQty = (productId: string, qty: number) => {
    if (qty < 1) {
      setSelectedKitItems((prev) => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setSelectedKitItems((prev) => ({ ...prev, [productId]: qty }));
    }
  };

  const selectedProductIds = Object.keys(selectedKitItems);

  const getSelectedSummary = () => {
    const items = Object.entries(selectedKitItems);
    let totalCost = 0;
    let totalSale = 0;
    const names: string[] = [];
    
    items.forEach(([id, qty]) => {
      const p = regularProducts.find((pr) => pr.id === id);
      if (p) {
        totalCost += p.cost_price * qty;
        totalSale += p.sale_price * qty;
        names.push(qty > 1 ? `${qty}x ${p.name}` : p.name);
      }
    });
    
    const profitRate = totalCost > 0 ? ((totalSale / totalCost) * 100 - 100) : 0;
    return { totalCost, totalSale, names: names.join(" + "), profitRate, count: items.length };
  };

  const handleCreateKit = async () => {
    const items = Object.entries(selectedKitItems);
    if (items.length < 2) {
      toast.error("Selecione pelo menos 2 produtos para criar um kit");
      return;
    }
    try {
      const kitItems: KitProductItem[] = items.map(([product_id, quantity]) => ({ product_id, quantity }));
      await createKit.mutateAsync({ items: kitItems, kitSalePrice: newKitSalePrice || undefined });
      setSelectedKitItems({});
      setNewKitSalePrice(0);
      setIsAddOpen(false);
      toast.success("Kit criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar kit");
    }
  };

  const openEditDialog = (kit: Product) => {
    setEditingKit(kit);
    // Initialize edit kit items from kit_products
    const items: Record<string, number> = {};
    kit.kit_products?.forEach((kp) => {
      items[kp.product_id] = kp.quantity;
    });
    setEditKitItems(items);
    setEditSearchTerm("");
    setEditFilterTypes([]);
    setEditFormData({
      name: kit.name,
      costPrice: kit.cost_price,
      profitRate: kit.profit_rate,
      salePrice: kit.sale_price,
      kitSalePrice: kit.sale_price || 0,
    });
  };

  const toggleEditFilterType = (typeName: string) => {
    setEditFilterTypes((prev) =>
      prev.includes(typeName) ? prev.filter((t) => t !== typeName) : [...prev, typeName]
    );
  };

  const toggleEditProduct = (productId: string) => {
    setEditKitItems((prev) => {
      if (prev[productId] !== undefined) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: 1 };
    });
  };

  const updateEditKitItemQty = (productId: string, qty: number) => {
    if (qty < 1) {
      setEditKitItems((prev) => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setEditKitItems((prev) => ({ ...prev, [productId]: qty }));
    }
  };

  const editProductIds = Object.keys(editKitItems);

  const getEditSummary = () => {
    const items = Object.entries(editKitItems);
    let totalCost = 0;
    let totalSale = 0;
    const names: string[] = [];
    
    items.forEach(([id, qty]) => {
      const p = regularProducts.find((pr) => pr.id === id);
      if (p) {
        totalCost += p.cost_price * qty;
        totalSale += p.sale_price * qty;
        names.push(qty > 1 ? `${qty}x ${p.name}` : p.name);
      }
    });
    
    const profitRate = totalCost > 0 ? ((totalSale / totalCost) * 100 - 100) : 0;
    return { totalCost, totalSale, names: names.join(" + "), profitRate, count: items.length };
  };

  const filteredEditProducts = useMemo(() => {
    let filtered = regularProducts.filter((p) =>
      normalizedIncludes(p.name, editSearchTerm)
    );
    
    if (editFilterTypes.length > 0) {
      filtered = filtered.filter((p) => editFilterTypes.includes(p.type_name || ""));
    }
    
    return filtered.sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? "";
      let bVal: string | number = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [regularProducts, editSearchTerm, editFilterTypes, sortKey, sortDirection]);

  const handleUpdateKit = async () => {
    if (!editingKit) return;
    const items = Object.entries(editKitItems);
    if (items.length < 2) {
      toast.error("O kit precisa ter pelo menos 2 produtos");
      return;
    }
    
    const editSummary = getEditSummary();
    try {
      const kitItems: KitProductItem[] = items.map(([product_id, quantity]) => ({ product_id, quantity }));
      await updateProduct.mutateAsync({
        id: editingKit.id,
        updates: {
          name: editFormData.name,
          cost_price: editSummary.totalCost,
          profit_rate: editSummary.profitRate,
          sale_price: editFormData.kitSalePrice || editSummary.totalSale,
        },
        kit_products: kitItems,
      });
      setEditingKit(null);
      toast.success("Kit atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar kit");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja excluir o kit "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync(id);
        toast.success("Kit excluído!");
      } catch (error) {
        toast.error("Erro ao excluir kit");
      }
    }
  };

  const summary = getSelectedSummary();

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
      <PageHeader title="Kits" description="Crie kits combinando produtos">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient-secondary" disabled={regularProducts.length < 2}>
              <Plus className="h-4 w-4" />
              Novo Kit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
            <DialogHeader>
              <DialogTitle className="gradient-text-secondary">Criar Novo Kit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Tipos
                      {filterTypes.length > 0 && (
                        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {filterTypes.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 bg-popover border-border z-50" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Filtrar por tipo</p>
                        {filterTypes.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setFilterTypes([])} className="h-6 px-2 text-xs">
                            <X className="h-3 w-3 mr-1" />
                            Limpar
                          </Button>
                        )}
                      </div>
                      <div className="max-h-[200px] overflow-auto custom-scrollbar space-y-1">
                        {productTypes.map((typeName) => (
                          <div
                            key={typeName}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleFilterType(typeName as string)}
                          >
                            <Checkbox
                              checked={filterTypes.includes(typeName as string)}
                              onCheckedChange={() => toggleFilterType(typeName as string)}
                            />
                            <span className="text-sm">{typeName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {selectedProductIds.length} selecionado(s)
                </span>
              </div>

              <div className="border rounded-lg max-h-[40vh] overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-1">
                          Produto
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hidden sm:table-cell" onClick={() => handleSort("type_name")}>
                        <div className="flex items-center gap-1">
                          Tipo
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right hidden md:table-cell" onClick={() => handleSort("cost_price")}>
                        <div className="flex items-center justify-end gap-1">
                          Custo
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort("sale_price")}>
                        <div className="flex items-center justify-end gap-1">
                          Venda
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right hidden md:table-cell">Estoque</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProducts.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      const kitQty = selectedKitItems[product.id] || 0;
                      return (
                        <TableRow
                          key={product.id}
                          className={isSelected ? "bg-primary/10" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-[120px] truncate">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{product.type_name}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">R$ {product.cost_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">R$ {product.sale_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{product.quantity}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); updateKitItemQty(product.id, kitQty - 1); }}
                                disabled={kitQty === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={kitQty || ""}
                                onChange={(e) => updateKitItemQty(product.id, parseInt(e.target.value) || 0)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-12 h-6 text-center text-sm px-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); updateKitItemQty(product.id, kitQty + 1); }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedProductIds.length > 0 && (
                <GradientCard gradient="secondary">
                  <h4 className="font-semibold mb-2">Resumo do Kit</h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{summary.names || "Nenhum produto selecionado"}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Custo Total</p>
                      <p className="font-medium">R$ {summary.totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vlr Venda Varejo</p>
                      <p className="font-medium">R$ {summary.totalSale.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxa de Lucro</p>
                      <p className="font-medium">{summary.profitRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Vlr Venda Kit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newKitSalePrice || ""}
                        onChange={(e) => setNewKitSalePrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>
                </GradientCard>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setSelectedKitItems({}); setSearchTerm(""); setFilterTypes([]); setNewKitSalePrice(0); }}>
                  Cancelar
                </Button>
                <Button
                  variant="gradient-secondary"
                  onClick={handleCreateKit}
                  disabled={selectedProductIds.length < 2 || createKit.isPending}
                >
                  {createKit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Criar Kit (${summary.count} produtos)`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {regularProducts.length < 2 && (
        <GradientCard gradient="warm" className="mb-6">
          <p className="text-sm">
            ⚠️ Cadastre pelo menos 2 produtos para poder criar kits.
          </p>
        </GradientCard>
      )}

      {kits.length === 0 ? (
        <GradientCard gradient="secondary" className="text-center py-12">
          <Boxes className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum kit cadastrado</h3>
          <p className="mt-2 text-muted-foreground">
            Clique em "Novo Kit" para criar uma combinação de produtos
          </p>
        </GradientCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kits.map((kit, index) => (
            <GradientCard
              key={kit.id}
              gradient={index % 3 === 0 ? "secondary" : index % 3 === 1 ? "accent" : "primary"}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="gradient-bg-secondary rounded-lg p-2">
                      <Boxes className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{kit.name}</h3>
                      <p className="text-xs text-muted-foreground">Kit</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(kit)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(kit.id, kit.name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Custo</p>
                    <p className="font-medium">R$ {kit.cost_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vlr Venda Varejo</p>
                    <p className="font-medium">R$ {(kit.kit_products?.reduce((sum, kp) => {
                      const p = products.find((pr) => pr.id === kp.product_id);
                      return sum + (p?.sale_price || 0) * kp.quantity;
                    }, 0) || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vlr Venda Kit</p>
                    <p className="font-medium gradient-text-secondary">R$ {kit.sale_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa de Lucro</p>
                    <p className="font-medium">{kit.profit_rate.toFixed(1)}%</p>
                  </div>
                </div>

                {kit.kit_products && kit.kit_products.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Produtos no kit:</p>
                    <div className="space-y-2">
                      {kit.kit_products.map((kp) => {
                        const p = products.find((pr) => pr.id === kp.product_id);
                        return p ? (
                          <div key={kp.product_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs bg-muted rounded p-2 gap-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Package className="h-3 w-3 shrink-0" />
                              <span className="font-medium truncate">{kp.quantity > 1 ? `${kp.quantity}x ` : ""}{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground text-[10px] sm:text-xs pl-5 sm:pl-0">
                              <span>C: R${p.cost_price.toFixed(2)}</span>
                              <span>V: R${p.sale_price.toFixed(2)}</span>
                              <span className="hidden sm:inline">Est: {p.quantity}</span>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </GradientCard>
          ))}
        </div>
      )}

      <Dialog open={!!editingKit} onOpenChange={() => setEditingKit(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text-secondary">Editar Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do Kit</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>

            {/* Produtos no Kit */}
            {editProductIds.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos no Kit ({editProductIds.length})
                </Label>
                <div className="border rounded-lg max-h-[25vh] overflow-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Custo</TableHead>
                        <TableHead className="text-right">Venda</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Estoque</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editProductIds.map((productId) => {
                        const product = regularProducts.find((p) => p.id === productId);
                        const kitQty = editKitItems[productId] || 0;
                        if (!product) return null;
                        return (
                          <TableRow key={productId} className="bg-primary/5">
                            <TableCell className="font-medium max-w-[100px] truncate">{product.name}</TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">{product.type_name}</TableCell>
                            <TableCell className="text-right hidden md:table-cell">R$ {product.cost_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">R$ {product.sale_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right hidden md:table-cell">{product.quantity}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateEditKitItemQty(productId, kitQty - 1)}
                                  disabled={kitQty <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={kitQty}
                                  onChange={(e) => updateEditKitItemQty(productId, Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-12 h-6 text-center text-sm px-1"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateEditKitItemQty(productId, kitQty + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => toggleEditProduct(productId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Resumo do Kit */}
            {editProductIds.length > 0 && (
              <GradientCard gradient="secondary">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Custo Total</p>
                    <p className="font-medium">R$ {getEditSummary().totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vlr Venda Varejo</p>
                    <p className="font-medium">R$ {getEditSummary().totalSale.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa de Lucro</p>
                    <p className="font-medium">{getEditSummary().profitRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vlr Venda Kit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.kitSalePrice || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, kitSalePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-8 mt-1"
                    />
                  </div>
                </div>
              </GradientCard>
            )}

            {/* Adicionar Produtos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produtos
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={editSearchTerm}
                    onChange={(e) => setEditSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Tipos
                      {editFilterTypes.length > 0 && (
                        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {editFilterTypes.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 bg-popover border-border z-50" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Filtrar por tipo</p>
                        {editFilterTypes.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setEditFilterTypes([])} className="h-6 px-2 text-xs">
                            <X className="h-3 w-3 mr-1" />
                            Limpar
                          </Button>
                        )}
                      </div>
                      <div className="max-h-[200px] overflow-auto custom-scrollbar space-y-1">
                        {productTypes.map((typeName) => (
                          <div
                            key={typeName}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleEditFilterType(typeName as string)}
                          >
                            <Checkbox
                              checked={editFilterTypes.includes(typeName as string)}
                              onCheckedChange={() => toggleEditFilterType(typeName as string)}
                            />
                            <span className="text-sm">{typeName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="border rounded-lg max-h-[20vh] overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Custo</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Estoque</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEditProducts
                      .filter((p) => !editProductIds.includes(p.id))
                      .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium max-w-[100px] truncate">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{product.type_name}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">R$ {product.cost_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">R$ {product.sale_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right hidden md:table-cell">{product.quantity}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-primary hover:text-primary"
                              onClick={() => toggleEditProduct(product.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditingKit(null)}>
                Cancelar
              </Button>
              <Button 
                variant="gradient-secondary" 
                onClick={handleUpdateKit} 
                disabled={updateProduct.isPending || editProductIds.length < 2}
              >
                {updateProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Salvar (${editProductIds.length} produtos)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
