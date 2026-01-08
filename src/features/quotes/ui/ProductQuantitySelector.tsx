/**
 * ProductQuantitySelector Component
 *
 * Allows users to select which products to quote and set quantities.
 * Users can explicitly select/deselect products with checkboxes.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Package, CheckSquare, Square } from "lucide-react";
import {
  getProducts,
  getDefaultQuantities,
  calculateTotalUnits,
  type Product,
  type ProductQuantity,
} from "@/shared/lib/products";

interface ProductQuantitySelectorProps {
  value: ProductQuantity[];
  onChange: (quantities: ProductQuantity[]) => void;
  error?: string;
}

/** Tracks which products are explicitly selected */
type SelectedProducts = Set<string>;

const DEFAULT_QUANTITY = 5000;

export function ProductQuantitySelector({
  value,
  onChange,
  error,
}: ProductQuantitySelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(new Set());

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  // Initialize selections from value prop (products with quantity > 0 are selected)
  useEffect(() => {
    if (value.length > 0 && selectedProducts.size === 0) {
      const initialSelected = new Set(
        value.filter((q) => q.quantity > 0).map((q) => q.productId)
      );
      if (initialSelected.size > 0) {
        setSelectedProducts(initialSelected);
      }
    }
  }, [value, selectedProducts.size]);

  // Initialize with default quantities on first load (no products selected by default)
  useEffect(() => {
    if (value.length === 0 && products.length > 0) {
      const defaults = getDefaultQuantities();
      const initialQuantities = products.map((product) => ({
        productId: product.code,
        quantity: defaults[product.code] ?? DEFAULT_QUANTITY,
      }));
      onChange(initialQuantities);
      // Start with no products selected - user must choose
      setSelectedProducts(new Set());
    }
  }, [products, value.length, onChange]);

  const handleProductToggle = useCallback((productId: string, checked: boolean) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });

    // Update quantities: set to default if selecting, set to 0 if deselecting
    const defaults = getDefaultQuantities();
    const updatedQuantities = value.map((q) =>
      q.productId === productId
        ? { ...q, quantity: checked ? (defaults[productId] ?? DEFAULT_QUANTITY) : 0 }
        : q
    );

    // Add if not exists
    if (!updatedQuantities.find((q) => q.productId === productId)) {
      updatedQuantities.push({
        productId,
        quantity: checked ? (defaults[productId] ?? DEFAULT_QUANTITY) : 0,
      });
    }

    onChange(updatedQuantities);
  }, [value, onChange]);

  const handleQuantityChange = useCallback((productId: string, quantity: number) => {
    const clampedQuantity = Math.max(0, quantity);
    
    const updatedQuantities = value.map((q) =>
      q.productId === productId ? { ...q, quantity: clampedQuantity } : q
    );

    // Add if not exists
    if (!updatedQuantities.find((q) => q.productId === productId)) {
      updatedQuantities.push({ productId, quantity: clampedQuantity });
    }

    // If quantity is set to 0, deselect the product
    if (clampedQuantity === 0) {
      setSelectedProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } else if (!selectedProducts.has(productId)) {
      // If quantity is set > 0 and not selected, select it
      setSelectedProducts((prev) => new Set(prev).add(productId));
    }

    onChange(updatedQuantities);
  }, [value, onChange, selectedProducts]);

  const handleSelectAll = useCallback(() => {
    const allProductIds = products.map((p) => p.code);
    setSelectedProducts(new Set(allProductIds));
    
    const defaults = getDefaultQuantities();
    const updatedQuantities = products.map((product) => ({
      productId: product.code,
      quantity: defaults[product.code] ?? DEFAULT_QUANTITY,
    }));
    onChange(updatedQuantities);
  }, [products, onChange]);

  const handleDeselectAll = useCallback(() => {
    setSelectedProducts(new Set());
    
    const updatedQuantities = products.map((product) => ({
      productId: product.code,
      quantity: 0,
    }));
    onChange(updatedQuantities);
  }, [products, onChange]);

  const getQuantityForProduct = (productId: string): number => {
    return value.find((q) => q.productId === productId)?.quantity ?? 0;
  };

  const isProductSelected = (productId: string): boolean => {
    return selectedProducts.has(productId);
  };

  const selectedValue = value.filter((q) => selectedProducts.has(q.productId) && q.quantity > 0);
  const totalUnits = calculateTotalUnits(selectedValue);
  const selectedCount = selectedProducts.size;
  const allSelected = selectedCount === products.length;
  const noneSelected = selectedCount === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Products to Quote
            </CardTitle>
            <CardDescription className="mt-1">
              Choose which products you want to include in this quote request
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
              {selectedCount} of {products.length} selected
            </Badge>
            {selectedCount > 0 && (
              <Badge variant="outline">
                {totalUnits.toLocaleString()} total units
              </Badge>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        {/* Bulk selection controls */}
        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
            className="text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={noneSelected}
            className="text-xs"
          >
            <Square className="w-3.5 h-3.5 mr-1.5" />
            Deselect All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product) => {
            const quantity = getQuantityForProduct(product.code);
            const isSelected = isProductSelected(product.code);

            return (
              <div
                key={product.code}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-muted hover:border-muted-foreground/30 opacity-75"
                }`}
              >
                {/* Checkbox for selection */}
                <div className="pt-1">
                  <Checkbox
                    id={`select-${product.code}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleProductToggle(product.code, checked === true)
                    }
                    aria-label={`Select ${product.name}`}
                  />
                </div>

                {/* Product info */}
                <Label
                  htmlFor={`select-${product.code}`}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{product.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {product.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2 font-normal">
                    {product.description}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 font-normal">
                    Target FOB:{" "}
                    <span className="font-medium text-foreground">
                      ${product.targetFob.toFixed(2)}
                    </span>
                  </p>
                </Label>

                {/* Quantity input - only enabled when selected */}
                <div className={`shrink-0 w-32 transition-opacity ${isSelected ? "opacity-100" : "opacity-40"}`}>
                  <Label htmlFor={`qty-${product.code}`} className="sr-only">
                    Quantity for {product.name}
                  </Label>
                  <Input
                    id={`qty-${product.code}`}
                    type="number"
                    min={0}
                    step={1000}
                    value={isSelected ? quantity : ""}
                    onChange={(e) =>
                      handleQuantityChange(
                        product.code,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    placeholder={isSelected ? "0" : "-"}
                    className="text-right"
                    aria-label={`Quantity for ${product.name}`}
                    disabled={!isSelected}
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    units
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state hint */}
        {noneSelected && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Select at least one product to continue with your quote request.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

