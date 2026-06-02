import { describe, test, expect } from 'vitest';
import {
  parseCsvCards,
  parseCsvRoutes,
  calculateHfpRealistic,
  applyNotebookHfp,
  calculateCosts,
  generateSummary
} from './calculator';
import type { TravelCard, TravelRoute } from './types';

describe('CSV Parsers', () => {
  test('parseCsvCards should correctly parse travel card CSV string', () => {
    const csv = `Travel Card,Cost (CHF)
Half-Fare, 152
GA, 2900
ZVV 9-Pass Zürich, 827.00`;
    const cards = parseCsvCards(csv);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toEqual({ name: 'Half-Fare', cost: 152 });
    expect(cards[1]).toEqual({ name: 'GA', cost: 2900 });
    expect(cards[2]).toEqual({ name: 'ZVV 9-Pass Zürich', cost: 827 });
  });

  test('parseCsvRoutes should correctly parse travel routes CSV string', () => {
    const csv = `Destination,Included in Travel Card,Costs,How many times per month
Home,[GA; bla],[Half-Fare: 38.00; ZVV 9-Pass (alle Zonen): 23.80],1
Ferienhaus Süd,[GA],[Half-Fare: 70.80],0.25
In Zürich,[GA; ZVV 1-2 Zone],[Half-Fare: 6.20],20`;
    const routes = parseCsvRoutes(csv);
    
    expect(routes).toHaveLength(3);
    
    // Check first route
    expect(routes[0].destination).toBe('Home');
    expect(routes[0].includedCards).toEqual(['GA', 'bla']);
    expect(routes[0].costs).toEqual({
      'Half-Fare': 38.00,
      'ZVV 9-Pass (alle Zonen)': 23.80
    });
    expect(routes[0].timesPerMonth).toBe(1);
    
    // Check second route
    expect(routes[1].destination).toBe('Ferienhaus Süd');
    expect(routes[1].includedCards).toEqual(['GA']);
    expect(routes[1].costs).toEqual({
      'Half-Fare': 70.80
    });
    
    // Check third route
    expect(routes[2].destination).toBe('In Zürich');
    expect(routes[2].includedCards).toEqual(['GA', 'ZVV 1-2 Zone']);
    expect(routes[2].timesPerMonth).toBe(20);
  });
});

describe('Half-Fare Plus Models', () => {
  test('calculateHfpRealistic should return refund if cost is less than deposit', () => {
    const cost = 500;
    const result = calculateHfpRealistic(cost);
    expect(result.packageName).toBe('None');
    expect(result.totalSpent).toBe(500);
    expect(result.savings).toBe(0);
  });

  test('calculateHfpRealistic should return deposit if in sweet spot', () => {
    // HFP 1000 has deposit 800, credit 1000
    // If ticket costs are 900, we should only pay 800
    const cost = 900;
    const result = calculateHfpRealistic(cost);
    expect(result.packageName).toBe('Half-Fare Plus 1000');
    expect(result.depositPaid).toBe(800);
    expect(result.totalSpent).toBe(800);
    expect(result.savings).toBe(100);
  });

  test('calculateHfpRealistic should calculate excess correctly', () => {
    // If tickets are 1100, we use HFP 1000: pay 800 for first 1000, and 100 for excess. Total 900.
    const cost = 1100;
    const result = calculateHfpRealistic(cost);
    expect(result.packageName).toBe('Half-Fare Plus 1000');
    expect(result.depositPaid).toBe(800);
    expect(result.totalSpent).toBe(900);
    expect(result.savings).toBe(200);
  });

  test('calculateHfpRealistic should recommend HFP 2000 for higher costs', () => {
    // HFP 2000 has deposit 1500, credit 2000
    // At 1800 cost, it should pay 1500
    const cost = 1800;
    const result = calculateHfpRealistic(cost);
    expect(result.packageName).toBe('Half-Fare Plus 2000');
    expect(result.depositPaid).toBe(1500);
    expect(result.totalSpent).toBe(1500);
    expect(result.savings).toBe(300);
  });

  test('applyNotebookHfp should follow notebook rules', () => {
    expect(applyNotebookHfp(500)).toBe((500 * 800) / 1000);
    expect(applyNotebookHfp(1500)).toBe((1500 * 1500) / 2000);
    expect(applyNotebookHfp(2500)).toBe((2500 * 2100) / 3000);
  });
});

describe('Cost Simulation Engine', () => {
  const mockCards: TravelCard[] = [
    { name: 'Half-Fare', cost: 152 },
    { name: 'GA', cost: 2900 }
  ];

  const mockRoutes: TravelRoute[] = [
    {
      id: 'r1',
      destination: 'Zürich to Bern',
      includedCards: ['GA'],
      costs: { 'Half-Fare': 25.00 },
      timesPerMonth: 4
    },
    {
      id: 'r2',
      destination: 'Zürich City',
      includedCards: ['GA'],
      costs: { 'Half-Fare': 3.10 },
      timesPerMonth: 10
    }
  ];

  test('calculateCosts - Realistic SBB Model', () => {
    const results = calculateCosts(mockCards, mockRoutes, false);
    
    // Half-Fare, GA, and Half-Fare with HFP
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    const gaResult = results.find(r => r.cardName === 'GA');
    const hfResult = results.find(r => r.cardName === 'Half-Fare');
    
    expect(gaResult).toBeDefined();
    expect(hfResult).toBeDefined();
    
    // GA has baseCost 2900, ticketCost 0, totalCost 2900
    expect(gaResult?.baseCost).toBe(2900);
    expect(gaResult?.ticketCost).toBe(0);
    expect(gaResult?.totalCost).toBe(2900);
    
    // Half-Fare ticket cost:
    // Route 1: 25 * 4 * 12 = 1200
    // Route 2: 3.10 * 10 * 12 = 372
    // Total ticket cost = 1572
    expect(hfResult?.ticketCost).toBe(1572);
    expect(hfResult?.baseCost).toBe(152);
    expect(hfResult?.totalCost).toBe(152 + 1572);
    
    // Cumulative costs should cumulative-sum correctly
    expect(hfResult?.cumulativeCosts[11]).toBeCloseTo(152 + 1572, 2);
  });

  test('calculateCosts - Notebook Parity Model', () => {
    // Under notebook model, it applies applyNotebookHfp to each route
    // Route 1 annual cost: 1200 -> applyNotebookHfp(1200) -> 1200 * 1500 / 2000 = 900
    // Route 2 annual cost: 372 -> applyNotebookHfp(372) -> 372 * 800 / 1000 = 297.6
    // Total Ticket Cost under HF: 900 + 297.6 = 1197.6
    // Total Cost: 152 + 1197.6 = 1349.6
    
    const results = calculateCosts(mockCards, mockRoutes, true);
    const hfResult = results.find(r => r.cardName === 'Half-Fare');
    
    expect(hfResult?.ticketCost).toBeCloseTo(1197.6, 1);
    expect(hfResult?.totalCost).toBeCloseTo(1349.6, 1);
  });

  test('generateSummary should choose the cheapest option and give details', () => {
    const results = calculateCosts(mockCards, mockRoutes, false);
    const summary = generateSummary(results);
    
    expect(summary.cheapestCard).toContain('Half-Fare');
    expect(summary.recommendationExplanation).toContain('Cheapest option');
  });

  test('Youth Half-Fare Plus package selection', () => {
    // Under Youth HFP:
    // If ticket costs are 900, Youth HFP 1000 has deposit 600, credit 1000
    // So the cost should be deposit 600, savings 300
    const cost = 900;
    const result = calculateHfpRealistic(cost, true);
    expect(result.packageName).toBe('Half-Fare Plus 1000 (Youth)');
    expect(result.depositPaid).toBe(600);
    expect(result.totalSpent).toBe(600);
    expect(result.savings).toBe(300);
  });

  test('Tie-breaker selects package with higher credit limit', () => {
    // At ticket cost 1700:
    // - HFP 1000: v > 1000 -> 800 + (1700 - 1000) = 1500
    // - HFP 2000: 1500 <= v <= 2000 -> 1500
    // Both result in totalSpent of 1500.
    // The tie-breaker should choose HFP 2000 over HFP 1000.
    const cost = 1700;
    const result = calculateHfpRealistic(cost, false);
    expect(result.packageName).toBe('Half-Fare Plus 2000');
    expect(result.depositPaid).toBe(1500);
    expect(result.totalSpent).toBe(1500);
  });

  test('Card name normalization matches template names to simple route names', () => {
    const cards: TravelCard[] = [
      { name: 'Half Fare Travelcard Adults 25+ (loyalty)', cost: 170 },
      { name: 'GA Travelcard Adults (annual, 2nd class)', cost: 3995 },
      { name: 'ZVV NetworkPass Adult 1-2 Zones (annual, 2nd class)', cost: 813 }
    ];

    const routes: TravelRoute[] = [
      {
        id: 'r1',
        destination: 'Bern to Zürich',
        includedCards: ['GA'],
        costs: { 'Half-Fare': 25.00 },
        timesPerMonth: 4
      },
      {
        id: 'r2',
        destination: 'In Zürich City',
        includedCards: ['GA', 'ZVV 1-2 Zone'],
        costs: { 'Half-Fare': 6.20 },
        timesPerMonth: 10
      }
    ];

    const results = calculateCosts(cards, routes, false);

    const gaResult = results.find(r => r.cardName === 'GA Travelcard Adults (annual, 2nd class)');
    const hfResult = results.find(r => r.cardName === 'Half Fare Travelcard Adults 25+ (loyalty)');
    const zvvResult = results.find(r => r.cardName === 'ZVV NetworkPass Adult 1-2 Zones (annual, 2nd class)');
    const hfpResult = results.find(r => r.cardName.includes('with Half-Fare Plus'));

    expect(gaResult).toBeDefined();
    expect(hfResult).toBeDefined();
    expect(zvvResult).toBeDefined();
    expect(hfpResult).toBeDefined();

    // GA covers all, so ticket cost = 0
    expect(gaResult?.ticketCost).toBe(0);

    // Half Fare should fallback to 'Half-Fare' route costs:
    // Route 1: 25 * 4 * 12 = 1200
    // Route 2: 6.20 * 10 * 12 = 744
    // Total ticket cost = 1944
    expect(hfResult?.ticketCost).toBe(1944);

    // ZVV 1-2 Zone covers Route 2 (so route 2 ticket cost = 0), and falls back to 'Half-Fare' for Route 1 (25 * 4 * 12 = 1200)
    // Total ticket cost = 1200
    expect(zvvResult?.ticketCost).toBe(1200);

    // Half Fare with HFP should be active (since ticket cost is 1944)
    // 1944 is sweet spot for HFP 2000 (adult) since 1500 <= 1944 <= 2000
    // Total spent should be deposit = 1500
    expect(hfpResult?.ticketCost).toBe(1500);
    expect(hfpResult?.cardName).toContain('Half-Fare Plus 2000');
  });
});
