/**
 * ProductQuantitySelector Component
 *
 * Allows users to select quantities for each product in the catalog.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
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

export function ProductQuantitySelector({
  value,
  onChange,
  error,
}: ProductQuantitySelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  // Initialize with default quantities if empty
  useEffect(() => {
    if (value.length === 0 && products.length > 0) {
      const defaults = getDefaultQuantities();
      const initialQuantities = products.map((product) => ({
        productId: product.code,
        quantity: defaults[product.code] ?? 0,
      }));
      onChange(initialQuantities);
    }
  }, [products, value.length, onChange]);

  const handleQuantityChange = (productId: string, quantity: number) => {
    const updatedQuantities = value.map((q) =>
      q.productId === productId ? { ...q, quantity: Math.max(0, quantity) } : q
    );

    // Add if not exists
    if (!updatedQuantities.find((q) => q.productId === productId)) {
      updatedQuantities.push({ productId, quantity: Math.max(0, quantity) });
    }

    onChange(updatedQuantities);
  };

  const getQuantityForProduct = (productId: string): number => {
    return value.find((q) => q.productId === productId)?.quantity ?? 0;
  };

  const totalUnits = calculateTotalUnits(value);
  const selectedCount = value.filter((q) => q.quantity > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Product Quantities</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
            </Badge>
            <Badge variant="outline">
              {totalUnits.toLocaleString()} total units
            </Badge>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => {
            const quantity = getQuantityForProduct(product.code);
            const isSelected = quantity > 0;

            return (
              <div
                key={product.code}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{product.name}</h4>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {product.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Target FOB:{" "}
                    <span className="font-medium">
                      ${product.targetFob.toFixed(2)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 w-32">
                  <Label htmlFor={`qty-${product.code}`} className="sr-only">
                    Quantity for {product.name}
                  </Label>
                  <Input
                    id={`qty-${product.code}`}
                    type="number"
                    min={0}
                    step={1000}
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(
                        product.code,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    placeholder="0"
                    className="text-right"
                    aria-label={`Quantity for ${product.name}`}
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    units
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

