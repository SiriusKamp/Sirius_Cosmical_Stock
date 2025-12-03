import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface QuantityControlProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  disabled?: boolean;
  debounceMs?: number;
}

export function QuantityControl({ 
  value, 
  onChange, 
  min = 0, 
  disabled = false,
  debounceMs = 800
}: QuantityControlProps) {
  const [localValue, setLocalValue] = useState(value);
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<number | null>(null);

  // Sync local value with prop when not pending changes
  useEffect(() => {
    if (pendingValueRef.current === null && !isEditing) {
      setLocalValue(value);
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  // Debounced save to database
  const debouncedSave = useCallback((newValue: number) => {
    pendingValueRef.current = newValue;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
      pendingValueRef.current = null;
    }, debounceMs);
  }, [onChange, debounceMs]);

  const handleIncrement = () => {
    const newValue = localValue + 1;
    setLocalValue(newValue);
    setInputValue(newValue.toString());
    debouncedSave(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, localValue - 1);
    if (newValue !== localValue) {
      setLocalValue(newValue);
      setInputValue(newValue.toString());
      debouncedSave(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
    setInputValue(localValue.toString());
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const newValue = parseInt(inputValue, 10);
    if (!isNaN(newValue) && newValue >= min && newValue !== localValue) {
      setLocalValue(newValue);
      debouncedSave(newValue);
    } else {
      setInputValue(localValue.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setInputValue(localValue.toString());
      e.currentTarget.blur();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleDecrement}
        disabled={disabled || localValue <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-16 h-7 text-center text-sm tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleIncrement}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}