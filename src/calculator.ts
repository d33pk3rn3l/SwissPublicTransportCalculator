import type { TravelCard, TravelRoute, CardCalculationResult, CalculationSummary } from './types';

// Simple CSV Parser that handles basic CSV formatting, spaces, and brackets
export function parseCsvCards(csvText: string): TravelCard[] {
  const lines = csvText.split(/\r?\n/);
  const cards: TravelCard[] = [];
  
  // Find headers
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('travel card') || lines[i].toLowerCase().includes('cost')) {
      headerIndex = i;
      break;
    }
  }
  
  const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple split by comma (not inside brackets/quotes)
    const parts = splitCsvLine(line);
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const costStr = parts[1].replace(/[^\d.]/g, ''); // strip currency symbol/spaces
      const cost = parseFloat(costStr);
      if (name && !isNaN(cost)) {
        cards.push({ name, cost });
      }
    }
  }
  
  return cards;
}

export function parseCsvRoutes(csvText: string): TravelRoute[] {
  const lines = csvText.split(/\r?\n/);
  const routes: TravelRoute[] = [];
  
  // Find headers
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('destination')) {
      headerIndex = i;
      break;
    }
  }
  
  const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = splitCsvLine(line);
    if (parts.length >= 4) {
      const destination = parts[0].trim();
      const includedStr = parts[1].trim();
      const costsStr = parts[2].trim();
      const frequencyStr = parts[3].trim();
      
      const id = `route-${i}-${destination}`;
      
      // Parse included cards, e.g. [GA; ZVV 9-Pass Zürich]
      const includedCards = parseBrackettedList(includedStr);
      
      // Parse costs dict, e.g. [Half-Fare: 38.00; ZVV 9-Pass: 23.80]
      const costs = parseCostsDict(costsStr);
      
      const timesPerMonth = parseFloat(frequencyStr);
      
      if (destination && !isNaN(timesPerMonth)) {
        routes.push({
          id,
          destination,
          includedCards,
          costs,
          timesPerMonth
        });
      }
    }
  }
  
  return routes;
}

// Split CSV line correctly respecting quotes and brackets
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let bracketDepth = 0;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === '[') {
      bracketDepth++;
      current += char;
    } else if (char === ']') {
      bracketDepth--;
      current += char;
    } else if (char === ',' && !inQuotes && bracketDepth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Parse bracketed lists: [GA; ZVV 9-Pass Zürich] -> ["GA", "ZVV 9-Pass Zürich"]
function parseBrackettedList(text: string): string[] {
  const cleaned = text.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(';').map(item => item.trim()).filter(Boolean);
}

// Parse bracketed costs map: [Half-Fare: 38.00; ZVV 9-Pass: 23.80] -> {"Half-Fare": 38.00, "ZVV 9-Pass": 23.80}
function parseCostsDict(text: string): Record<string, number> {
  const cleaned = text.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return {};
  
  const dict: Record<string, number> = {};
  const items = cleaned.split(';');
  
  for (const item of items) {
    const parts = item.split(':');
    if (parts.length === 2) {
      const cardName = parts[0].trim().replace(/^['"]|['"]$/g, '');
      const costValue = parseFloat(parts[1].trim());
      if (cardName && !isNaN(costValue)) {
        dict[cardName] = costValue;
      }
    }
  }
  
  return dict;
}

// Standardize/normalize card names for comparison
export function normalizeCardName(name: string): string {
  const n = name.toLowerCase().trim();
  
  // Replace Half-Fare variants
  if (n.includes('half-fare') || n.includes('half fare') || n.includes('halbtax')) {
    return 'half-fare';
  }
  
  // Replace GA variants
  if (n.startsWith('ga') || n.includes('generalabonnement') || n.includes('ga travelcard')) {
    return 'ga';
  }
  
  // Check ZVV passes
  if (n.includes('zvv')) {
    let zones = '';
    if (n.includes('all') || n.includes('alle')) {
      zones = 'all';
    } else if (n.includes('local') || n.includes('lokal')) {
      zones = 'local';
    } else if (n.includes('zurich') || n.includes('zürich')) {
      zones = 'zurich';
    } else if (n.includes('winterthur')) {
      zones = 'winterthur';
    } else {
      // Extract numbers like 1-2 or 3 or 4
      const match = n.match(/(\d+)[\s-]*(\d+)?/);
      if (match) {
        zones = match[2] ? `${match[1]}-${match[2]}` : match[1];
      }
    }
    
    let type = 'pass';
    if (n.includes('9-pass') || n.includes("9 o'clock") || n.includes("9 o’clock")) {
      type = '9-pass';
    }
    
    return `zvv-${type}-${zones}`;
  }
  
  // Fallback: clean non-alphanumeric characters and keep it
  return n.replace(/[^a-z0-9]/g, '');
}

// SBB Half-Fare Plus Realistic Model
// Deposit, Credit, and refund/excess logic supporting Adults (25+) and Youth (6-24)
export function calculateHfpRealistic(halfFareTicketCost: number, isYouth: boolean = false): {
  packageName: string;
  depositPaid: number;
  totalSpent: number;
  savings: number;
} {
  const v = halfFareTicketCost;
  
  // Package definitions
  const packages = isYouth
    ? [
        { name: 'Half-Fare Plus 1000 (Youth)', deposit: 600, credit: 1000 },
        { name: 'Half-Fare Plus 2000 (Youth)', deposit: 1125, credit: 2000 },
        { name: 'Half-Fare Plus 3000 (Youth)', deposit: 1575, credit: 3000 }
      ]
    : [
        { name: 'Half-Fare Plus 1000', deposit: 800, credit: 1000 },
        { name: 'Half-Fare Plus 2000', deposit: 1500, credit: 2000 },
        { name: 'Half-Fare Plus 3000', deposit: 2100, credit: 3000 }
      ];
  
  let bestCost = v; // Baseline: pay full price (no HFP package)
  let bestPackageName = 'None';
  let bestDeposit = 0;
  
  for (const pkg of packages) {
    let cost = 0;
    if (v < pkg.deposit) {
      // Refund unused deposit: net cost is just v
      cost = v;
    } else if (v <= pkg.credit) {
      // Sweet spot: you only pay the deposit amount
      cost = pkg.deposit;
    } else {
      // Excess: you pay deposit plus full excess
      cost = pkg.deposit + (v - pkg.credit);
    }
    
    // We only recommend a package if it strictly saves money compared to not having a package (v)
    if (cost < v) {
      if (bestPackageName === 'None' || cost < bestCost) {
        bestCost = cost;
        bestPackageName = pkg.name;
        bestDeposit = pkg.deposit;
      } else if (cost === bestCost) {
        // Tie-breaker: prefer the package with higher credit limit (higher tier)
        const currentBestPkg = packages.find(p => p.name === bestPackageName);
        if (currentBestPkg && pkg.credit > currentBestPkg.credit) {
          bestCost = cost;
          bestPackageName = pkg.name;
          bestDeposit = pkg.deposit;
        }
      }
    }
  }
  
  return {
    packageName: bestPackageName,
    depositPaid: bestDeposit,
    totalSpent: bestCost,
    savings: v - bestCost
  };
}

// Jupyter Notebook piecewise scaling function for Half-Fare Plus
export function applyNotebookHfp(cost: number): number {
  if (cost < 1000) {
    return (cost * 800) / 1000;
  } else if (cost < 2000) {
    return (cost * 1500) / 2000;
  } else {
    return (cost * 2100) / 3000;
  }
}

// Core cost calculation engine
export function calculateCosts(
  cards: TravelCard[],
  routes: TravelRoute[],
  useNotebookModel: boolean
): CardCalculationResult[] {
  const results: CardCalculationResult[] = [];

  for (const card of cards) {
    const cardName = card.name;
    const baseCost = card.cost;
    const monthlyCosts = Array(12).fill(0);
    const routeBreakdown: Record<string, number> = {};

    const normCardName = normalizeCardName(cardName);

    // 1. Calculate base ticket costs per month and route
    for (const route of routes) {
      const timesPerMonth = route.timesPerMonth;
      const included = route.includedCards;
      const routeCosts = route.costs;

      const isIncluded = included.some(inc => normalizeCardName(inc) === normCardName);

      let singleCost = 0;
      
      // Jupyter Notebook Logic Parity
      if (isIncluded) {
        singleCost = 0;
      } else if (included.length === 1 && normalizeCardName(included[0]) === 'ga') {
        // Find half-fare cost fallback
        const hfKey = Object.keys(routeCosts).find(k => normalizeCardName(k) === 'half-fare');
        singleCost = hfKey !== undefined ? routeCosts[hfKey] : 0;
      } else {
        // Find matching key in routeCosts
        const matchingCostKey = Object.keys(routeCosts).find(k => normalizeCardName(k) === normCardName);
        if (matchingCostKey !== undefined) {
          singleCost = routeCosts[matchingCostKey];
        } else {
          // Fall back to Half-Fare cost if available
          const hfKey = Object.keys(routeCosts).find(k => normalizeCardName(k) === 'half-fare');
          singleCost = hfKey !== undefined ? routeCosts[hfKey] : 0;
        }
      }

      // Add to monthly spending
      const monthlySpent = singleCost * timesPerMonth;
      for (let m = 0; m < 12; m++) {
        monthlyCosts[m] += monthlySpent;
      }

      // Track route breakdown
      const annualRouteCost = monthlySpent * 12;
      routeBreakdown[route.destination] = annualRouteCost;
    }

    // 2. Add baseline card cardCost / 12 to each month
    for (let m = 0; m < 12; m++) {
      monthlyCosts[m] += baseCost / 12;
    }

    // 3. Calculate total ticket and total overall costs
    let ticketCost = 0;
    for (const route of routes) {
      ticketCost += routeBreakdown[route.destination];
    }
    let totalCost = baseCost + ticketCost;

    // 4. Calculate cumulative costs
    const cumulativeCosts: number[] = [];
    let currentSum = 0;
    for (let m = 0; m < 12; m++) {
      currentSum += monthlyCosts[m];
      cumulativeCosts.push(currentSum);
    }

    results.push({
      cardName,
      baseCost,
      ticketCost,
      totalCost,
      monthlyCosts,
      cumulativeCosts,
      routeBreakdown
    });
  }

  // 5. Apply Half-Fare Plus optimizations
  if (useNotebookModel) {
    // Notebook applies piece-wise formula directly to individual destination costs for ALL cards
    return results.map(res => {
      const updatedBreakdown: Record<string, number> = {};
      let updatedTicketCost = 0;
      
      for (const [dest, cost] of Object.entries(res.routeBreakdown)) {
        const scaled = applyNotebookHfp(cost);
        updatedBreakdown[dest] = scaled;
        updatedTicketCost += scaled;
      }
      
      const newTotal = res.baseCost + updatedTicketCost;
      
      // Recalculate monthly costs using scaled breakdown
      const updatedMonthlyCosts = Array(12).fill(res.baseCost / 12);
      for (let m = 0; m < 12; m++) {
        updatedMonthlyCosts[m] += updatedTicketCost / 12;
      }
      
      const updatedCumulativeCosts: number[] = [];
      let sum = 0;
      for (let m = 0; m < 12; m++) {
        sum += updatedMonthlyCosts[m];
        updatedCumulativeCosts.push(sum);
      }

      return {
        ...res,
        ticketCost: updatedTicketCost,
        totalCost: newTotal,
        monthlyCosts: updatedMonthlyCosts,
        cumulativeCosts: updatedCumulativeCosts,
        routeBreakdown: updatedBreakdown
      };
    });
  } else {
    // Realistic SBB Model
    // Apply Half-Fare Plus to ANY Half-Fare matching card, creating optimized card results
    const halfFareResults = results.filter(r => normalizeCardName(r.cardName) === 'half-fare');
    const hfpResults: CardCalculationResult[] = [];

    for (const hfResult of halfFareResults) {
      const isYouth = hfResult.cardName.toLowerCase().includes('youth') || hfResult.cardName.toLowerCase().includes('16-24');
      const hfpStats = calculateHfpRealistic(hfResult.ticketCost, isYouth);
      
      if (hfpStats.packageName !== 'None') {
        const hfpResult: CardCalculationResult = {
          cardName: `${hfResult.cardName} (with ${hfpStats.packageName})`,
          baseCost: hfResult.baseCost,
          ticketCost: hfpStats.totalSpent,
          totalCost: hfResult.baseCost + hfpStats.totalSpent,
          routeBreakdown: { ...hfResult.routeBreakdown }, // breakdown remains identical but total is scaled
          monthlyCosts: Array(12).fill(0),
          cumulativeCosts: [],
          hfpDetails: hfpStats
        };

        // Distribute the HFP cost over months
        const monthlyTotal = hfpResult.baseCost / 12 + hfpResult.ticketCost / 12;
        for (let m = 0; m < 12; m++) {
          hfpResult.monthlyCosts[m] = monthlyTotal;
        }
        
        let sum = 0;
        for (let m = 0; m < 12; m++) {
          sum += monthlyTotal;
          hfpResult.cumulativeCosts.push(sum);
        }

        hfpResults.push(hfpResult);
      }
    }
    
    return [...results, ...hfpResults];
  }
}

// Generate recommendation explanation
export function generateSummary(results: CardCalculationResult[]): CalculationSummary {
  if (results.length === 0) {
    return {
      results: [],
      cheapestCard: '',
      recommendationExplanation: 'No data.'
    };
  }

  const sorted = [...results].sort((a, b) => a.totalCost - b.totalCost);
  const cheapest = sorted[0];
  
  let explanation = `Cheapest option is **${cheapest.cardName}** at **CHF ${cheapest.totalCost.toFixed(2)} / year**.`;

  if (sorted.length > 1) {
    const secondCheapest = sorted[1];
    const savings = secondCheapest.totalCost - cheapest.totalCost;
    explanation += ` Saves **CHF ${savings.toFixed(2)} / year** compared to **${secondCheapest.cardName}**.`;
  }

  const ga = results.find(r => r.cardName.toLowerCase() === 'ga');
  const hf = results.find(r => r.cardName.toLowerCase() === 'half-fare');
  
  if (ga && hf) {
    if (ga.totalCost < hf.totalCost) {
      explanation += `\n\nGA Travelcard is more economical than Half-Fare and offers full coverage.`;
    } else {
      const diff = ga.totalCost - hf.totalCost;
      explanation += `\n\nGA costs **CHF ${diff.toFixed(2)}** more annually than Half-Fare.`;
    }
  }

  const hasHfpResult = results.some(r => r.hfpDetails !== undefined && r.hfpDetails.packageName !== 'None');
  if (hasHfpResult) {
    const bestHfp = results.find(r => r.hfpDetails !== undefined && r.hfpDetails.packageName !== 'None' && r.totalCost === cheapest.totalCost);
    if (bestHfp && bestHfp.hfpDetails) {
      explanation += `\n\nSBB **${bestHfp.hfpDetails.packageName}** saves an extra **CHF ${bestHfp.hfpDetails.savings.toFixed(2)}** over standard Half-Fare.`;
    }
  }

  return {
    results: sorted,
    cheapestCard: cheapest.cardName,
    recommendationExplanation: explanation
  };
}
