/**
 * Substitution Tracker
 *
 * Tracks material substitution proposals and their acceptance/rejection
 * during negotiation. Calculates total savings from accepted substitutions.
 */

import type { SubstitutionProposal } from "../tools/material-substitution-tool";

// ============================================================================
// Types
// ============================================================================

/**
 * Status of a substitution proposal
 */
export type SubstitutionStatus = "pending" | "accepted" | "rejected";

/**
 * Response details for a substitution
 */
export interface SubstitutionResponse {
  timestamp: number;
  reason?: string;
  conditions?: string;
}

/**
 * Record of a substitution proposal and its outcome
 */
export interface SubstitutionRecord {
  substitutionId: string;
  productId: string;
  proposal: SubstitutionProposal;
  status: SubstitutionStatus;
  response?: SubstitutionResponse;
}

// ============================================================================
// Substitution Tracker Class
// ============================================================================

/**
 * Track material substitutions during negotiation
 */
export class SubstitutionTracker {
  private substitutions: Map<string, SubstitutionRecord> = new Map();
  private supplierId: number;

  constructor(supplierId: number) {
    this.supplierId = supplierId;
  }

  /**
   * Record a new substitution proposal
   */
  propose(proposal: SubstitutionProposal, substitutionId: string): SubstitutionRecord {
    const record: SubstitutionRecord = {
      substitutionId,
      productId: proposal.productId,
      proposal,
      status: "pending",
    };
    this.substitutions.set(substitutionId, record);
    return record;
  }

  /**
   * Accept a substitution proposal
   */
  accept(substitutionId: string, conditions?: string): SubstitutionRecord | null {
    const record = this.substitutions.get(substitutionId);
    if (!record) return null;

    record.status = "accepted";
    record.response = {
      timestamp: Date.now(),
      conditions,
    };
    return record;
  }

  /**
   * Reject a substitution proposal
   */
  reject(substitutionId: string, reason: string): SubstitutionRecord | null {
    const record = this.substitutions.get(substitutionId);
    if (!record) return null;

    record.status = "rejected";
    record.response = {
      timestamp: Date.now(),
      reason,
    };
    return record;
  }

  /**
   * Get a specific substitution by ID
   */
  get(substitutionId: string): SubstitutionRecord | undefined {
    return this.substitutions.get(substitutionId);
  }

  /**
   * Get all accepted substitutions
   */
  getAcceptedSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values()).filter(
      (s) => s.status === "accepted"
    );
  }

  /**
   * Get all pending substitutions
   */
  getPendingSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values()).filter(
      (s) => s.status === "pending"
    );
  }

  /**
   * Get all rejected substitutions
   */
  getRejectedSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values()).filter(
      (s) => s.status === "rejected"
    );
  }

  /**
   * Get all substitutions
   */
  getAllSubstitutions(): SubstitutionRecord[] {
    return Array.from(this.substitutions.values());
  }

  /**
   * Calculate total cost reduction percentage from accepted substitutions
   */
  calculateTotalSavings(): number {
    return this.getAcceptedSubstitutions().reduce(
      (total, sub) => total + sub.proposal.costReductionPercent,
      0
    );
  }

  /**
   * Calculate average quality impact from accepted substitutions
   */
  calculateQualityImpact(): string {
    const accepted = this.getAcceptedSubstitutions();
    if (accepted.length === 0) return "none";

    const impactLevels = {
      none: 0,
      minor: 1,
      moderate: 2,
      significant: 3,
    };

    const avgImpact =
      accepted.reduce(
        (sum, sub) => sum + impactLevels[sub.proposal.qualityImpact],
        0
      ) / accepted.length;

    if (avgImpact < 0.5) return "none";
    if (avgImpact < 1.5) return "minor";
    if (avgImpact < 2.5) return "moderate";
    return "significant";
  }

  /**
   * Get total lead time change from accepted substitutions
   */
  calculateLeadTimeChange(): number {
    return this.getAcceptedSubstitutions().reduce(
      (total, sub) => total + (sub.proposal.leadTimeChange ?? 0),
      0
    );
  }

  /**
   * Generate human-readable summary of substitutions
   */
  getSubstitutionSummary(): string {
    const accepted = this.getAcceptedSubstitutions();
    const rejected = this.getRejectedSubstitutions();
    const pending = this.getPendingSubstitutions();

    if (accepted.length === 0 && rejected.length === 0 && pending.length === 0) {
      return "No material substitutions proposed.";
    }

    const parts: string[] = [];

    if (accepted.length > 0) {
      const lines = accepted.map(
        (sub) =>
          `  - ${sub.proposal.originalMaterial} → ${sub.proposal.suggestedMaterial} ` +
          `(${sub.proposal.costReductionPercent}% savings, ${sub.proposal.qualityImpact} quality impact)`
      );
      parts.push(`Accepted (${accepted.length}):\n${lines.join("\n")}`);
    }

    if (rejected.length > 0) {
      const lines = rejected.map(
        (sub) =>
          `  - ${sub.proposal.originalMaterial} → ${sub.proposal.suggestedMaterial} ` +
          `(Reason: ${sub.response?.reason ?? "unspecified"})`
      );
      parts.push(`Rejected (${rejected.length}):\n${lines.join("\n")}`);
    }

    if (pending.length > 0) {
      const lines = pending.map(
        (sub) =>
          `  - ${sub.proposal.originalMaterial} → ${sub.proposal.suggestedMaterial}`
      );
      parts.push(`Pending (${pending.length}):\n${lines.join("\n")}`);
    }

    return parts.join("\n\n");
  }

  /**
   * Get supplier ID for this tracker
   */
  getSupplierId(): number {
    return this.supplierId;
  }

  /**
   * Check if any substitutions have been proposed
   */
  hasSubstitutions(): boolean {
    return this.substitutions.size > 0;
  }

  /**
   * Check if any substitutions were accepted
   */
  hasAcceptedSubstitutions(): boolean {
    return this.getAcceptedSubstitutions().length > 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new substitution tracker for a supplier
 */
export function createSubstitutionTracker(supplierId: number): SubstitutionTracker {
  return new SubstitutionTracker(supplierId);
}

/**
 * Merge substitution records from multiple trackers
 */
export function mergeSubstitutionRecords(
  trackers: SubstitutionTracker[]
): SubstitutionRecord[] {
  return trackers.flatMap((t) => t.getAllSubstitutions());
}

/**
 * Calculate combined savings from multiple trackers
 */
export function calculateCombinedSavings(trackers: SubstitutionTracker[]): number {
  return trackers.reduce((total, tracker) => total + tracker.calculateTotalSavings(), 0);
}

