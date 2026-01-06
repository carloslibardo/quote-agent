/**
 * Workflow Exports
 *
 * This file exports all Mastra workflows for registration with the Mastra instance.
 * Workflows are implemented in separate files for maintainability.
 */

import { negotiationWorkflow } from "./negotiation-workflow";

/**
 * All workflows for Mastra registration
 */
export const workflows = {
  negotiationWorkflow,
};

// Re-export individual workflows
export { negotiationWorkflow, workflowSteps } from "./negotiation-workflow";

