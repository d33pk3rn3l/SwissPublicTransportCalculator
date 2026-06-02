import { useState, useMemo, useRef } from 'react';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { CardManager } from './components/CardManager';
import { RouteManager } from './components/RouteManager';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { Charts } from './components/Charts';
import { parseCsvCards, parseCsvRoutes, calculateCosts, generateSummary } from './calculator';
import type { TravelCard, TravelRoute } from './types';
import { ShieldCheck, TrendingDown, Train, Database, FileSpreadsheet, ArrowRight, Sparkles, FolderPlus } from 'lucide-react';

const DEFAULT_CARDS_CSV = `Travel Card,Cost (CHF)
Half-Fare, 152
GA, 2900
ZVV 9-Pass Zürich, 827.00
ZVV 1-2 Zone, 809.00
ZVV 3 Zonen, 1189.00
ZVV 4 Zonen, 1596.00
ZVV 9-Pass (alle Zonen), 1282.00`;

const DEFAULT_ROUTES_CSV = `Destination,Included in Travel Card,Costs,How many times per month
Home,[GA; bla],[Half-Fare: 38.00; ZVV 9-Pass (alle Zonen): 23.80],1
Ferienhaus Süd,[GA],[Half-Fare: 70.80],0.25
Ferienhaus West,[GA],[Half-Fare: 72.20],0.25
Westschweiz,[GA],[Half-Fare: 74.00],0.5
Ferienhaus Freund,[GA],[Half-Fare: 62.80],0.16666
Hangar,[GA; ZVV 9-Pass Zürich; ZVV 3 Zonen; ZVV 4 Zonen; ZVV 9-Pass (alle Zonen)],[Half-Fare: 6.80],6
In Zürich,[GA; ZVV 9-Pass Zürich; ZVV 3 Zonen; ZVV 4 Zonen; ZVV 9-Pass (alle Zonen); ZVV 1-2 Zone],[Half-Fare: 6.20],20
Am See,[GA; ZVV 9-Pass (alle Zonen); ZVV 4 Zonen],[Half-Fare: 8.80; ZVV 9-Pass Zürich: 6.20; ZVV 3 Zonen: 6.20; ZVV 1-2 Zone: 6.20],2
Morgenzuschlag bei 9-Pass,[GA; ZVV 3 Zonen; ZVV 4 Zonen; ZVV 1-2 Zone; Half-Fare],[Half-Fare: 3.10; ZVV 9-Pass Zürich: 3.10; ZVV 9-Pass (alle Zonen): 3.10],12`;

function App() {
  const [cards, setCards] = useState<TravelCard[]>([]);
  const [routes, setRoutes] = useState<TravelRoute[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const cardsInputRef = useRef<HTMLInputElement>(null);
  const routesInputRef = useRef<HTMLInputElement>(null);

  // Perform core calculation whenever inputs change
  const { results, summary } = useMemo(() => {
    const calcResults = calculateCosts(cards, routes, false); // Always SBB Realistic Model
    const summ = generateSummary(calcResults);
    return { results: calcResults, summary: summ };
  }, [cards, routes]);

  const handleResetToDefault = () => {
    if (confirm('Load defaults? This will overwrite your current workspace.')) {
      setCards(parseCsvCards(DEFAULT_CARDS_CSV));
      setRoutes(parseCsvRoutes(DEFAULT_ROUTES_CSV));
    }
  };

  const handleClearAll = () => {
    if (confirm('Delete all cards and routes to start from scratch?')) {
      setCards([]);
      setRoutes([]);
    }
  };

  const handleLoadDemo = () => {
    setCards(parseCsvCards(DEFAULT_CARDS_CSV));
    setRoutes(parseCsvRoutes(DEFAULT_ROUTES_CSV));
    setIsInitialized(true);
  };

  const handleStartScratch = () => {
    setCards([]);
    setRoutes([]);
    setIsInitialized(true);
  };

  const handleExitWorkspace = () => {
    if (confirm('Exit your active workspace? Your changes will remain in memory.')) {
      setIsInitialized(false);
    }
  };

  const handleCardsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCsvCards(text);
        if (parsed.length === 0) {
          alert('No valid travel cards found in CSV. Please check headers: "Travel Card", "Cost (CHF)"');
          return;
        }
        setCards(parsed);
        setIsInitialized(true);
      } catch (err) {
        alert('Failed to parse cards CSV: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRoutesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCsvRoutes(text);
        if (parsed.length === 0) {
          alert('No valid routes found. Check headers: "Destination", "Included in Travel Card", "Costs", "How many times per month"');
          return;
        }
        setRoutes(parsed);
        setIsInitialized(true);
      } catch (err) {
        alert('Failed to parse routes CSV: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Find the cheapest card details for top KPI block
  const bestResult = results.find(r => r.cardName === summary.cheapestCard);

  // Compute second cheapest option for potential savings calculation
  const secondCheapest = useMemo(() => {
    const sorted = [...results].sort((a, b) => a.totalCost - b.totalCost);
    return sorted.length > 1 ? sorted[1] : null;
  }, [results]);

  const potentialSavings = bestResult && secondCheapest
    ? secondCheapest.totalCost - bestResult.totalCost
    : 0;

  const isEmpty = cards.length === 0 && routes.length === 0;

  return (
    <div className="app-wrapper">
      {/* Hidden file inputs for landing page imports */}
      <input type="file" ref={cardsInputRef} onChange={handleCardsUpload} accept=".csv" style={{ display: 'none' }} />
      <input type="file" ref={routesInputRef} onChange={handleRoutesUpload} accept=".csv" style={{ display: 'none' }} />

      <header className="container" style={{ marginBlock: '2.5rem 1.5rem' }}>
        <div className="flex-between">
          <div>
            <span className="text-muted font-mono" style={{ fontSize: '0.85rem', letterSpacing: '0.1em', fontWeight: 600 }}>
              SWISS TRAVEL OPTIMIZER
            </span>
            <h1 style={{ marginTop: '0.5rem', marginBottom: '0.5rem', lineHeight: 1.05 }}>
              Public Transport <br />
              <span className="text-red">Cost Calculator</span>
            </h1>
          </div>
          {/* Simple Train Symbol */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--sbb-off-white)', borderRadius: '50%' }}>
            <Train className="text-red" size={24} />
          </div>
        </div>
      </header>

      <main className="container">
        {!isInitialized ? (
          /* Onboarding / Landing State UX */
          <section style={{ marginTop: '1.5rem' }}>
            <p className="text-muted" style={{ fontSize: '1.05rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
              Optimize your Swiss public transport cards (GA, Half-Fare, Half-Fare Plus, regional passes) to find the most economical option for your trips. Select an entry path to open your workspace:
            </p>

            <div className="grid-3" style={{ gap: '1.5rem', alignItems: 'stretch' }}>
              {/* Option 1: Explore with Demo Data */}
              <div className="swiss-card flex-between" style={{ flexDirection: 'column', alignItems: 'start', justifyContent: 'space-between', minHeight: '280px', border: '1.5px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--sbb-red)' }}>
                    <Sparkles size={20} />
                    <h3 style={{ marginBottom: 0 }}>Explore Demo Data</h3>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Load a pre-configured Swiss travel card database (GA, Half-Fare, ZVV passes) and sample route habits to see the charts and optimization engine in action.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={handleLoadDemo} style={{ width: '100%', marginTop: '1rem' }}>
                  Load Demo Data <ArrowRight size={14} />
                </button>
              </div>

              {/* Option 2: Start from Scratch */}
              <div className="swiss-card flex-between" style={{ flexDirection: 'column', alignItems: 'start', justifyContent: 'space-between', minHeight: '280px', border: '1.5px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <FolderPlus size={20} className="text-red" />
                    <h3 style={{ marginBottom: 0 }}>Start from Scratch</h3>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Initialize an empty workspace. Manually insert your specific travel cards and route frequencies to calculate your personalized optimal transport configuration.
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={handleStartScratch} style={{ width: '100%', marginTop: '1rem' }}>
                  Open Clean Workspace <ArrowRight size={14} />
                </button>
              </div>

              {/* Option 3: Import CSV Tables */}
              <div className="swiss-card flex-between" style={{ flexDirection: 'column', alignItems: 'start', justifyContent: 'space-between', minHeight: '280px', border: '1.5px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <FileSpreadsheet size={20} className="text-red" />
                    <h3 style={{ marginBottom: 0 }}>Import CSV Files</h3>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Restore a previously saved workspace session. Upload your compatible travel cards and route tables to resume your analysis instantly.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                  <button className="btn btn-secondary btn-small" onClick={() => cardsInputRef.current?.click()} style={{ flex: 1 }}>
                    Cards CSV
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => routesInputRef.current?.click()} style={{ flex: 1 }}>
                    Routes CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Threshold Card & FAQ Section */}
            <div className="grid-2" style={{ marginTop: '3rem', gap: '2.5rem', alignItems: 'start', borderTop: '1.5px solid var(--border-color)', paddingTop: '2.5rem' }}>
              
              {/* Threshold Card */}
              <div className="swiss-card" style={{ border: '2px solid var(--sbb-black)', margin: 0 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sbb-red)' }}>
                  <TrendingDown size={20} />
                  Do I Need a Half-Fare Card?
                </h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  The Half-Fare Travelcard offers a <strong>50% discount</strong> on most public transport. It pays for itself once your annual ticket expenditures reach the following thresholds:
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ borderLeft: '3px solid var(--sbb-black)', paddingLeft: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Adults (Aged 25+)</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Ticket Spending &gt; <span className="text-red">CHF 190 / year</span> half-price
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      (Or CHF 380 / year at full price. Based on CHF 190 card cost.)
                    </p>
                  </div>
                  
                  <div style={{ borderLeft: '3px solid var(--sbb-black)', paddingLeft: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Youth (Aged 16–24)</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Ticket Spending &gt; <span className="text-red">CHF 120 / year</span> half-price
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      (Or CHF 240 / year at full price. Based on CHF 120 card cost.)
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div>
                <h3 style={{ borderBottom: '2px solid var(--sbb-black)', paddingBottom: '0.4rem', marginBottom: '1.25rem' }}>
                  Frequently Asked Questions
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', textTransform: 'none', letterSpacing: 'normal' }}>
                      Why can't I automatically import my SBB ticket history or pricing?
                    </h4>
                    <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>
                      SBB APIs are closed and restricted to ticket sales and schedule lookups. No public API exists to fetch your personal purchase history or perform automated pricing lookups. This tool runs entirely in your browser—your travel habits stay completely private.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', textTransform: 'none', letterSpacing: 'normal' }}>
                      Is this tool affiliated with SBB?
                    </h4>
                    <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>
                      No, this is an independent Swiss public transport cost analyzer. We are completely unaffiliated with SBB CFF FFS.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', textTransform: 'none', letterSpacing: 'normal' }}>
                      How does the Half-Fare PLUS calculation work?
                    </h4>
                    <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>
                      We simulate SBB's realistic prepaid model: if you don't spend past your deposit, SBB refunds the remainder at the end of the year. If you spend into the bonus limit, you travel for "free" up to the package credit. The optimizer automatically selects and displays the best PLUS package based on whether you choose an Adult or Youth template.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </section>
        ) : (
          /* Active Workspace Dashboard State UX */
          <>
            {/* Workspace Toolbar (top metadata controls) */}
            <WorkspaceToolbar
              cards={cards}
              routes={routes}
              onImportCards={setCards}
              onImportRoutes={setRoutes}
              onResetToDefault={handleResetToDefault}
              onClearAll={handleClearAll}
              onExit={handleExitWorkspace}
            />

            {isEmpty ? (
              /* Empty State UX Guide */
              <section className="swiss-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', border: '2px dashed var(--border-color)' }}>
                <Database size={48} className="text-red" style={{ marginBottom: '1.25rem', opacity: 0.85 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Your Travel Workspace is Empty</h3>
                <p className="text-muted" style={{ maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  No card details or routes configured. Add your first travel card below or load the Swiss demo data.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={() => {
                    setCards(parseCsvCards(DEFAULT_CARDS_CSV));
                    setRoutes(parseCsvRoutes(DEFAULT_ROUTES_CSV));
                  }}>
                    Load Swiss Demo Data
                  </button>
                  <button className="btn btn-secondary" onClick={() => setCards([{ name: 'Half-Fare', cost: 152 }])}>
                    Add Baseline Card
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* KPI Panel */}
                <section className="grid-3" style={{ marginBottom: '2rem' }}>
                  {/* Recommended Subscription */}
                  <div className="swiss-card recommended" style={{ marginBottom: 0 }}>
                    <span className="text-muted font-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                      Recommended Option
                    </span>
                    <h4 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck className="text-red" size={20} />
                      {summary.cheapestCard || 'No Data'}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Optimal selection
                    </span>
                  </div>

                  {/* Optimized Annual Expenditure */}
                  <div className="swiss-card" style={{ marginBottom: 0 }}>
                    <span className="text-muted font-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                      Annual Cost
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span className="card-cost-value">
                        CHF {bestResult ? Math.round(bestResult.totalCost) : '0'}
                      </span>
                      <span className="card-cost-period">/ year</span>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Combined total
                    </span>
                  </div>

                  {/* Potential Savings */}
                  <div className="swiss-card" style={{ marginBottom: 0 }}>
                    <span className="text-muted font-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                      Potential Savings
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }} className="text-red">
                      <span className="card-cost-value">
                        CHF {Math.round(potentialSavings)}
                      </span>
                      <span className="card-cost-period" style={{ color: 'var(--sbb-red)' }}>/ year</span>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Savings per year
                    </span>
                  </div>
                </section>

                {/* Charts & Recommendation Explanation */}
                <section className="grid-2" style={{ marginBottom: '2rem', alignItems: 'start' }}>
                  {/* Custom SVG Charts */}
                  <Charts results={results} />

                  {/* Analysis & Recommendation Summary */}
                  <div className="swiss-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <TrendingDown className="text-red" size={20} />
                      <h3 style={{ marginBottom: 0 }}>Recommendation Analysis</h3>
                    </div>
                    <div
                      style={{ fontSize: '0.95rem', lineHeight: 1.5 }}
                      dangerouslySetInnerHTML={{
                        __html: summary.recommendationExplanation
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '<br/><br/>')
                      }}
                    />
                    
                    {/* Costs Ranking Table */}
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        All Travel Cards Ranked
                      </h4>
                      <div className="table-container">
                        <table className="swiss-table" style={{ fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Card Option</th>
                              <th>Annual Base (CHF)</th>
                              <th>Total Cost (CHF)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.results.map((res, index) => (
                              <tr key={res.cardName} style={{ backgroundColor: index === 0 ? 'rgba(235,0,0,0.02)' : 'transparent' }}>
                                <td style={{ fontWeight: 700 }}>#{index + 1}</td>
                                <td style={{ fontWeight: 600 }}>
                                  {res.cardName}
                                  {index === 0 && <span className="recommendation-badge" style={{ marginLeft: '0.5rem' }}>Best</span>}
                                </td>
                                <td className="font-mono">CHF {res.baseCost.toFixed(2)}</td>
                                <td className="font-mono" style={{ fontWeight: 700 }}>
                                  CHF {res.totalCost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Route Habits & Card Base editors (rendered always when initialized so they can manage data) */}
            <section style={{ marginBottom: '2rem' }}>
              <RouteManager routes={routes} cards={cards} onUpdateRoutes={setRoutes} />
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <CardManager cards={cards} onUpdateCards={setCards} />
            </section>
          </>
        )}
      </main>

      <footer className="container text-muted" style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', textAlign: 'center', fontSize: '0.85rem' }}>
        <p>© {new Date().getFullYear()} Independent Swiss Travel Cost Analyzer.</p>
        <p style={{ marginTop: '0.5rem' }}>
          This software is licensed under the MIT License and is completely open source. Public transport tariff rates may vary. Verify ticket costs directly on SBB before purchase.
        </p>
      </footer>
      <DisclaimerBanner />
    </div>
  );
}

export default App;
