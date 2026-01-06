/**
 * Message Converter Utility
 *
 * Converts between workflow messages and AI SDK message formats
 * for agent communication.
 */

import type { CoreMessage } from "ai";

/**
 * Workflow message format used in the negotiation system
 */
export interface WorkflowMessage {
  sender: "brand" | "supplier" | "user";
  content: string;
  timestamp: number;
  metadata?: {
    toolCalls?: string[];
    model?: string;
  };
}

/**
 * Agent response containing text and optional tool calls
 */
export interface AgentResponse {
  text: string;
  toolCalls?: ToolCallResult[];
  messages?: CoreMessage[];
}

/**
 * Tool call result structure
 */
export interface ToolCallResult {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

/**
 * Convert workflow messages to agent-compatible CoreMessage format
 *
 * For brand agent perspective:
 * - brand messages → assistant (agent's own messages)
 * - supplier/user messages → user (incoming messages)
 *
 * For supplier agent perspective:
 * - supplier messages → assistant
 * - brand/user messages → user
 */
export function toAgentMessages(
  workflowMessages: WorkflowMessage[],
  perspective: "brand" | "supplier"
): CoreMessage[] {
  return workflowMessages.map((msg) => {
    const isOwnMessage = msg.sender === perspective;

    return {
      role: isOwnMessage ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    };
  });
}

/**
 * Create an initial user message for starting a negotiation
 */
export function createInitialMessage(
  productSummary: string,
  totalQuantity: number,
  priorities: {
    quality: number;
    cost: number;
    leadTime: number;
    paymentTerms: number;
  }
): CoreMessage {
  const priorityFocus: string[] = [];
  if (priorities.cost >= 30) priorityFocus.push("competitive pricing");
  if (priorities.quality >= 30) priorityFocus.push("high quality");
  if (priorities.leadTime >= 25) priorityFocus.push("fast delivery");
  if (priorities.paymentTerms >= 20) priorityFocus.push("favorable payment terms");

  return {
    role: "user" as const,
    content: `Please negotiate for the following order:

Products: ${productSummary}
Total Quantity: ${totalQuantity.toLocaleString()} units

Our key priorities are: ${priorityFocus.join(", ") || "balanced across all criteria"}.

Please reach out to the supplier and negotiate the best possible terms.`,
  };
}

/**
 * Create a message prompting the brand agent to respond to a supplier offer
 */
export function createSupplierOfferMessage(
  supplierName: string,
  supplierMessage: string,
  currentOffer: {
    avgPrice: number;
    leadTime: number;
    paymentTerms: string;
  },
  round: number,
  maxRounds: number
): CoreMessage {
  const isLastRound = round === maxRounds - 1;

  return {
    role: "user" as const,
    content: `${supplierName} responded:

"${supplierMessage}"

Current offer details:
- Price: $${currentOffer.avgPrice.toFixed(2)}/unit
- Lead Time: ${currentOffer.leadTime} days
- Payment: ${currentOffer.paymentTerms}

${isLastRound ? "This is the final round. Make your decision - accept, counter, or conclude the negotiation." : "Evaluate this offer and respond appropriately - accept if terms are good, or counter for better terms."}`,
  };
}

/**
 * Create a message prompting the supplier agent to respond to brand
 */
export function createBrandRequestMessage(
  brandMessage: string,
  productOffers: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>,
  volumeDiscount: { percent: number; description: string },
  round: number,
  maxRounds: number
): CoreMessage {
  const isLastRound = round === maxRounds - 1;
  const totalValue = productOffers.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0
  );
  const totalQuantity = productOffers.reduce((sum, p) => sum + p.quantity, 0);

  return {
    role: "user" as const,
    content: `The buyer says:

"${brandMessage}"

Order Summary:
${productOffers.map((p) => `- ${p.productName}: ${p.quantity.toLocaleString()} units`).join("\n")}

Total Quantity: ${totalQuantity.toLocaleString()} units
Estimated Order Value: $${totalValue.toLocaleString()}
${volumeDiscount.percent > 0 ? `Volume Discount: ${volumeDiscount.description}` : ""}

${isLastRound ? "This is your final opportunity. Make your best offer to close this deal." : "Respond professionally and make your offer using the propose-offer or counter-offer tool."}`,
  };
}

/**
 * Convert agent response to workflow message
 */
export function fromAgentResponse(
  response: AgentResponse,
  sender: "brand" | "supplier"
): WorkflowMessage {
  const toolCallNames = response.toolCalls?.map((tc) => tc.toolName) ?? [];

  return {
    sender,
    content: response.text,
    timestamp: Date.now(),
    metadata:
      toolCallNames.length > 0
        ? {
            toolCalls: toolCallNames,
          }
        : undefined,
  };
}

/**
 * Build conversation history for agent context
 */
export function buildConversationHistory(
  messages: WorkflowMessage[],
  perspective: "brand" | "supplier",
  systemContext?: string
): CoreMessage[] {
  const agentMessages = toAgentMessages(messages, perspective);

  if (systemContext) {
    return [
      { role: "system" as const, content: systemContext },
      ...agentMessages,
    ];
  }

  return agentMessages;
}

/**
 * Append user guidance to messages if present
 */
export function appendUserGuidance(
  messages: CoreMessage[],
  userGuidance?: string
): CoreMessage[] {
  if (!userGuidance) return messages;

  return [
    ...messages,
    {
      role: "system" as const,
      content: `--- User Guidance ---\n${userGuidance}\n\nIncorporate this guidance into your negotiation strategy.`,
    },
  ];
}

