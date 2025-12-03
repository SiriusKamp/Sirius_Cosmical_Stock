import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExcelImportProps {
  onImport: (data: any[]) => Promise<void>;
  columns: {
    key: string;
    label: string;
    required: boolean;
    type?: "string" | "number";
  }[];
  title: string;
  templateFileName: string;
}

export function ExcelImport({ onImport, columns, title, templateFileName }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = columns.filter((c) => c.required).map((c) => c.label);

  const resetForNewAttempt = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setError("O arquivo está vazio ou não contém dados além do cabeçalho.");
        resetForNewAttempt();
        return;
      }

      const headers = jsonData[0] as string[];
      
      // Validate required columns
      const missingColumns = requiredColumns.filter(
        (col) => !headers.some((h) => h?.toLowerCase().trim() === col.toLowerCase())
      );

      if (missingColumns.length > 0) {
        setError(`Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`);
        resetForNewAttempt();
        return;
      }

      // Map data to objects and track row numbers
      const mappedData = jsonData.slice(1)
        .map((row, index) => ({ row, originalIndex: index + 2 })) // +2 because Excel is 1-indexed and we skip header
        .filter(({ row }) => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map(({ row, originalIndex }) => {
          const obj: any = { _rowNumber: originalIndex };
          columns.forEach((col) => {
            const headerIndex = headers.findIndex(
              (h) => h?.toLowerCase().trim() === col.label.toLowerCase()
            );
            if (headerIndex !== -1) {
              let value = row[headerIndex];
              if (col.type === "number" && value !== undefined && value !== null && value !== '') {
                value = parseFloat(String(value).replace(',', '.')) || 0;
              }
              obj[col.key] = value;
            }
          });
          return obj;
        });

      // Validate required fields in each row and collect detailed errors
      const rowErrors: { row: number; missingColumns: string[] }[] = [];
      
      mappedData.forEach((item) => {
        const missing = columns
          .filter((c) => c.required)
          .filter((c) => item[c.key] === undefined || item[c.key] === null || item[c.key] === '')
          .map((c) => c.label);
        
        if (missing.length > 0) {
          rowErrors.push({ row: item._rowNumber, missingColumns: missing });
        }
      });

      if (rowErrors.length > 0) {
        // Build detailed error message
        const maxErrorsToShow = 5;
        const errorDetails = rowErrors.slice(0, maxErrorsToShow).map(
          (e) => `Linha ${e.row}: falta ${e.missingColumns.join(", ")}`
        ).join("; ");
        
        const moreErrors = rowErrors.length > maxErrorsToShow 
          ? ` (+${rowErrors.length - maxErrorsToShow} linhas com erros)`
          : "";
        
        setError(`Campos obrigatórios vazios: ${errorDetails}${moreErrors}`);
        resetForNewAttempt();
        return;
      }

      // Remove internal row number before setting preview
      const cleanData = mappedData.map(({ _rowNumber, ...rest }) => rest);
      setPreview(cleanData);
    } catch (err) {
      setError("Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.");
      resetForNewAttempt();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    setIsLoading(true);
    setError(null);

    try {
      await onImport(preview);
      setSuccess(`${preview.length} item(s) importado(s) com sucesso!`);
      setPreview(null);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao importar dados.");
      resetForNewAttempt();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="card-gradient p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              O arquivo Excel deve conter as seguintes colunas:
            </p>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <span
                  key={col.key}
                  className={`px-2 py-1 rounded text-xs ${
                    col.required
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {col.label} {col.required && "*"}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">* Campos obrigatórios</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Baixar Modelo
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Selecionar Arquivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">{success}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Prévia: {preview.length} item(s) encontrado(s)
              </p>
              <div className="max-h-60 overflow-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className="px-3 py-2 text-left font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {columns.map((col) => (
                          <td key={col.key} className="px-3 py-2">
                            {col.type === "number"
                              ? row[col.key]?.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })
                              : row[col.key] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando 10 de {preview.length} itens
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleConfirmImport}
                  disabled={isLoading}
                >
                  {isLoading ? "Importando..." : "Confirmar Importação"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
