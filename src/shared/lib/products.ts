/**
 * Product utilities for loading and accessing product data.
 * Products are loaded from the static products.json file.
 */

import productsData from "../../../products.json";

/**
 * Product component types for materials, trims, and components
 */
interface ProductComponent {
  type: "material" | "trim" | "component";
  name: string;
  supplier?: string;
  composition?: string;
  position?: string;
  color?: string;
  code?: string;
  size?: string;
  material?: string;
  weight?: string;
  function?: string;
  description?: string;
}

/**
 * Product interface representing a footwear product
 */
export interface Product {
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  targetFob: number;
  categoryPath: string;
  htsCode?: string;
  components: ProductComponent[];
}

/**
 * Product quantity for quote requests
 */
export interface ProductQuantity {
  productId: string;
  quantity: number;
}

/**
 * Default quantities for quote requests
 * Pulse Pro High-Top: 10,000 units
 * All other products: 5,000 units
 */
const DEFAULT_QUANTITIES: Record<string, number> = {
  FSH013: 10000, // Pulse Pro High-Top
  FSH014: 5000, // Drift Aero High-Top
  FSH016: 5000, // Vibe City High-Top
  FSH019: 5000, // Edge Urban High-Top
  FSH021: 5000, // City Rise High-Top
};

/**
 * Get all products from the static JSON file
 */
export function getProducts(): Product[] {
  return productsData.products as Product[];
}

/**
 * Get a product by its code (ID)
 * @param code - Product code (e.g., "FSH013")
 * @returns Product or undefined if not found
 */
export function getProductById(code: string): Product | undefined {
  return getProducts().find((product) => product.code === code);
}

/**
 * Get a product by its name
 * @param name - Product name (e.g., "Pulse Pro High-Top")
 * @returns Product or undefined if not found
 */
export function getProductByName(name: string): Product | undefined {
  return getProducts().find(
    (product) => product.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get default quantities for all products
 * Returns an object mapping product codes to default quantities
 */
export function getDefaultQuantities(): Record<string, number> {
  return { ...DEFAULT_QUANTITIES };
}

/**
 * Get default product quantities as an array for quote creation
 */
export function getDefaultProductQuantities(): ProductQuantity[] {
  return getProducts().map((product) => ({
    productId: product.code,
    quantity: DEFAULT_QUANTITIES[product.code] ?? 5000,
  }));
}

/**
 * Validate that at least one product has quantity > 0
 * @param quantities - Array of product quantities
 * @returns true if valid, false otherwise
 */
export function validateProductQuantities(
  quantities: ProductQuantity[]
): boolean {
  return quantities.some((q) => q.quantity > 0);
}

/**
 * Calculate total units across all products
 * @param quantities - Array of product quantities
 * @returns Total number of units
 */
export function calculateTotalUnits(quantities: ProductQuantity[]): number {
  return quantities.reduce((total, q) => total + q.quantity, 0);
}

/**
 * Get product names from quantity array
 * @param quantities - Array of product quantities
 * @returns Array of product names with quantities
 */
export function getProductSummary(
  quantities: ProductQuantity[]
): Array<{ name: string; quantity: number }> {
  return quantities
    .filter((q) => q.quantity > 0)
    .map((q) => {
      const product = getProductById(q.productId);
      return {
        name: product?.name ?? q.productId,
        quantity: q.quantity,
      };
    });
}

