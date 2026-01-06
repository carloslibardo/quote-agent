/**
 * Tool Exports
 *
 * This file exports all Mastra tools for use by agents.
 * Tools are implemented in separate files for maintainability.
 */

import {
  proposeTool,
  counterOfferTool,
  acceptOfferTool,
  rejectOfferTool,
} from "./negotiation-tools";
import {
  materialSubstitutionTool,
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
} from "./material-substitution-tool";
import { scoringTool, generateDecisionTool } from "./scoring-tool";

/**
 * All tools for Mastra registration
 */
export const tools = {
  proposeTool,
  counterOfferTool,
  acceptOfferTool,
  rejectOfferTool,
  materialSubstitutionTool,
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
  scoringTool,
  generateDecisionTool,
};

// Re-export individual tools
export {
  proposeTool,
  counterOfferTool,
  acceptOfferTool,
  rejectOfferTool,
  negotiationTools,
  offerSchema,
} from "./negotiation-tools";
export type { Offer } from "./negotiation-tools";

export {
  materialSubstitutionTool,
  suggestSubstitutionTool,
  acceptSubstitutionTool,
  rejectSubstitutionTool,
  materialSubstitutionTools,
  getMaterialsForCategory,
  calculateCostImpact,
  substitutionProposalSchema,
} from "./material-substitution-tool";
export type {
  MaterialCategory,
  SubstitutionProposal,
  RejectionReason,
} from "./material-substitution-tool";

export {
  scoringTool,
  generateDecisionTool,
  scoringTools,
  scoringUtils,
  prioritiesSchema,
  supplierOfferSchema,
  evaluationScoreSchema,
} from "./scoring-tool";
export type {
  DecisionPriorities,
  SupplierOffer,
  EvaluationScore,
} from "./scoring-tool";

