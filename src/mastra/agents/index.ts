/**
 * Agent Exports
 *
 * This file exports all agents for registration with the Mastra instance.
 * Agents are implemented in separate files for maintainability.
 */

import { brandAgent } from "./brand-agent";
import {
  supplierAgent1,
  supplierAgent2,
  supplierAgent3,
} from "./supplier-agent";

/**
 * All agents for Mastra registration
 */
export const agents = {
  brandAgent,
  supplierAgent1,
  supplierAgent2,
  supplierAgent3,
};

// Re-export individual agents and factories
export { brandAgent, createBrandAgentWithContext } from "./brand-agent";
export {
  createSupplierAgent,
  supplierAgent1,
  supplierAgent2,
  supplierAgent3,
  getAllSupplierAgents,
  getSupplierCharacteristics,
  SUPPLIER_CHARACTERISTICS,
} from "./supplier-agent";
export type { SupplierId, SupplierCharacteristics } from "./supplier-agent";

