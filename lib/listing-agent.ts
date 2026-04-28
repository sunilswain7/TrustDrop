// Listing Agent — uses Brave Search (via Locus wrapped API) to research pricing
// Actual Brave Search calls deferred until approved (costs ~$0.003/call)

interface PriceSuggestion {
  suggestedPrice: number;
  reasoning: string;
  comparables: string[];
}

// Stub: returns a basic suggestion without calling external APIs
// Will be wired to Brave Search in Phase 5
export async function suggestPrice(params: {
  title: string;
  category: string;
  description?: string;
}): Promise<PriceSuggestion> {
  // Default price ranges by category (fallback when Brave Search not available)
  const defaultRanges: Record<string, [number, number]> = {
    roblox: [1.0, 15.0],
    minecraft: [1.0, 10.0],
    blender: [3.0, 25.0],
    unity: [5.0, 30.0],
    texture: [0.5, 5.0],
    other: [1.0, 10.0],
  };

  const range = defaultRanges[params.category.toLowerCase()] || defaultRanges.other;
  const midpoint = (range[0] + range[1]) / 2;

  return {
    suggestedPrice: Math.round(midpoint * 100) / 100,
    reasoning: `Based on typical ${params.category} asset pricing. Connect Brave Search for market-aware suggestions.`,
    comparables: [],
  };
}

export async function generateDescription(params: {
  title: string;
  category: string;
  sellerNotes?: string;
}): Promise<string> {
  // Simple description template — can be enhanced with AI later
  const desc = params.sellerNotes
    ? `${params.sellerNotes}\n\nCategory: ${params.category} | Listed on TrustDrop — encrypted until verified payment.`
    : `${params.title} — a ${params.category} digital asset.\n\nListed on TrustDrop — encrypted until verified payment.`;

  return desc;
}
