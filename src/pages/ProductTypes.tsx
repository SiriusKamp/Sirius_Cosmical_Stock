import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { GradientCard } from "@/components/shared/GradientCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExcelImport } from "@/components/shared/ExcelImport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductTypes } from "@/hooks/useProductTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tags, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProductTypes() {
  const { productTypes, isLoading, addProductType, updateProductType, deleteProductType } = useProductTypes();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [newTypeName, setNewTypeName] = useState("");

  const handleAdd = async () => {
    if (!newTypeName.trim()) {
      toast.error("Digite o nome do tipo");
      return;
    }
    try {
      await addProductType.mutateAsync(newTypeName.trim());
      setNewTypeName("");
      setIsAddOpen(false);
      toast.success("Tipo de produto cadastrado!");
    } catch (error) {
      toast.error("Erro ao cadastrar tipo de produto");
    }
  };

  const handleUpdate = async () => {
    if (!editingType || !editingType.name.trim()) {
      toast.error("Digite o nome do tipo");
      return;
    }
    try {
      await updateProductType.mutateAsync({ id: editingType.id, name: editingType.name.trim() });
      setEditingType(null);
      toast.success("Tipo de produto atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar tipo de produto");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja excluir o tipo "${name}"?`)) {
      try {
        await deleteProductType.mutateAsync(id);
        toast.success("Tipo de produto excluído!");
      } catch (error) {
        toast.error("Erro ao excluir tipo de produto");
      }
    }
  };

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
        title="Tipos de Produto"
        description="Gerencie as categorias dos seus produtos"
      >
        <div className="flex gap-2">
          <ExcelImport
            title="Importar Tipos de Produto"
            templateFileName="modelo_tipos_produto"
            columns={[
              { key: "name", label: "Nome", required: true, type: "string" },
            ]}
            onImport={async (data) => {
              for (const item of data) {
                await addProductType.mutateAsync(item.name);
              }
              toast.success(`${data.length} tipo(s) importado(s) com sucesso!`);
            }}
          />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4" />
                Novo Tipo
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-card border-border w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="gradient-text">Novo Tipo de Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Nome do tipo"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="gradient" onClick={handleAdd} disabled={addProductType.isPending}>
                  {addProductType.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {productTypes.length === 0 ? (
        <GradientCard gradient="secondary" className="text-center py-12">
          <Tags className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum tipo cadastrado</h3>
          <p className="mt-2 text-muted-foreground">
            Clique em "Novo Tipo" para começar
          </p>
        </GradientCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productTypes.map((type, index) => (
            <GradientCard
              key={type.id}
              gradient={index % 4 === 0 ? "primary" : index % 4 === 1 ? "secondary" : index % 4 === 2 ? "accent" : "warm"}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`rounded-lg p-2 shrink-0 ${
                    index % 4 === 0 ? "gradient-bg-primary" :
                    index % 4 === 1 ? "gradient-bg-secondary" :
                    index % 4 === 2 ? "gradient-bg-accent" :
                    "gradient-bg-warm"
                  }`}>
                    <Tags className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-medium truncate">{type.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingType({ id: type.id, name: type.name })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(type.id, type.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </GradientCard>
          ))}
        </div>
      )}

      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text">Editar Tipo de Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Nome do tipo"
              value={editingType?.name || ""}
              onChange={(e) =>
                setEditingType((prev) => prev ? { ...prev, name: e.target.value } : null)
              }
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingType(null)}>
                Cancelar
              </Button>
              <Button variant="gradient" onClick={handleUpdate} disabled={updateProductType.isPending}>
                {updateProductType.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
