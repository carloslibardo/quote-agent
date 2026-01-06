/**
 * Mastra Instance
 *
 * Central Mastra configuration that registers all agents, tools, and workflows
 * for the quote negotiation platform.
 */

import { Mastra } from "@mastra/core";

import { agents } from "./agents";
import { workflows } from "./workflows";

/**
 * Main Mastra instance for the Quote Agent application.
 * Registers all agents, tools, and workflows.
 */
export const mastra = new Mastra({
  agents,
  workflows,
});

export { mastra as default };
