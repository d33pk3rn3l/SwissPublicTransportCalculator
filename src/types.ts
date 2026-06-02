export interface TravelCard {
  name: string;
  cost: number; // Annual cost in CHF
}

export interface TravelRoute {
  id: string;
  destination: string;
  includedCards: string[]; // List of travel card names where this route is fully included (cost = 0)
  costs: Record<string, number>; // Specific ticket costs for other cards, e.g. {"Half-Fare": 38.00}
  timesPerMonth: number;
}

export interface CardCalculationResult {
  cardName: string;
  baseCost: number; // Card annual fee
  ticketCost: number; // Sum of route ticket costs over the year
  totalCost: number; // baseCost + ticketCost
  monthlyCosts: number[]; // 12 elements representing costs for each month
  cumulativeCosts: number[]; // 12 elements representing cumulative cost over 1 year
  routeBreakdown: Record<string, number>; // destination -> annual cost (CHF)
  hfpDetails?: {
    packageName: string; // e.g. "Half-Fare Plus 1000", "None", etc.
    depositPaid: number;
    totalSpent: number;
    savings: number;
  };
}

export interface CalculationSummary {
  results: CardCalculationResult[];
  cheapestCard: string;
  recommendationExplanation: string;
}
