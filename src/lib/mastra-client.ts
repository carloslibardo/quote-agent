/**
 * Mastra Client
 *
 * Connects the React frontend to the Mastra server for calling
 * agents and workflows via HTTP REST API.
 */

import { MastraClient } from "@mastra/client-js";

/**
 * Singleton MastraClient instance
 *
 * Uses VITE_MASTRA_API_URL environment variable or defaults to localhost:4111
 */
export const mastraClient = new MastraClient({
  baseUrl: import.meta.env.VITE_MASTRA_API_URL || "http://localhost:4111",
});

/**
 * Get a workflow client by ID
 */
export function getWorkflowClient(workflowId: string) {
  return mastraClient.getWorkflow(workflowId);
}

/**
 * Get an agent client by ID
 */
export function getAgentClient(agentId: string) {
  return mastraClient.getAgent(agentId);
}

