import React, { useState } from 'react';
import type { CardCalculationResult } from '../types';

interface ChartsProps {
  results: CardCalculationResult[];
}

export const Charts: React.FC<ChartsProps> = ({ results }) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'cumulative' | 'routes'>('comparison');
  const [hoveredRoute, setHoveredRoute] = useState<{
    cardName: string;
    destName: string;
    cost: number;
    x: number;
    y: number;
  } | null>(null);

  if (results.length === 0) {
    return <div className="swiss-card">No data for charts.</div>;
  }

  // 1. Stacked Bar Chart Settings (Annual Cost Comparison)
  const sortedByCost = [...results].sort((a, b) => a.totalCost - b.totalCost);
  const maxCost = Math.max(...results.map(r => r.totalCost), 1);
  
  // Padding and dimensions
  const barChartHeight = 350;
  const barChartWidth = 600;
  const barPaddingTop = 40;
  const barPaddingBottom = 60;
  const barPaddingLeft = 80;
  const barPaddingRight = 40;
  const chartInnerHeight = barChartHeight - barPaddingTop - barPaddingBottom;
  const chartInnerWidth = barChartWidth - barPaddingLeft - barPaddingRight;
  const barWidth = Math.min(60, chartInnerWidth / (sortedByCost.length || 1) - 15);

  // 2. Cumulative Line Chart Settings (12 Months Trend)
  const lineChartHeight = 350;
  const lineChartWidth = 600;
  const linePaddingTop = 40;
  const linePaddingBottom = 60;
  const linePaddingLeft = 80;
  const linePaddingRight = 120;
  const lineInnerHeight = lineChartHeight - linePaddingTop - linePaddingBottom;
  const lineInnerWidth = lineChartWidth - linePaddingLeft - linePaddingRight;

  const allCumulativeVals = results.flatMap(r => r.cumulativeCosts);
  const maxCumulativeVal = Math.max(...allCumulativeVals, 1);

  // Helper for line chart scaling
  const getLineX = (monthIndex: number) => {
    return linePaddingLeft + (monthIndex / 11) * lineInnerWidth;
  };
  const getLineY = (value: number) => {
    return linePaddingTop + lineInnerHeight - (value / maxCumulativeVal) * lineInnerHeight;
  };

  // 3. Route Breakdown Stacked Bar Chart
  // Collect all unique destinations to map colors
  const destinations = Array.from(
    new Set(results.flatMap(r => Object.keys(r.routeBreakdown)))
  );

  // Swiss-style red/black/gray palette for destinations
  const getDestColor = (index: number) => {
    const colors = [
      '#eb0000', // SBB Red
      '#111111', // SBB Black
      '#555555', // Charcoal
      '#999999', // Muted Gray
      '#d30107', // Darker Red
      '#222222', // Light Black
      '#777777', // Gray
      '#cccccc', // Light Gray
      '#8b0000'  // Deep Maroon
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="swiss-card">
      <div className="flex-between" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('comparison')}
            className="btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'comparison' ? 'var(--sbb-red)' : 'transparent',
              color: activeTab === 'comparison' ? 'var(--sbb-white)' : 'var(--text-color)',
              border: activeTab === 'comparison' ? 'none' : '1px solid var(--border-color)'
            }}
          >
            Annual Cost Breakdown
          </button>
          <button
            onClick={() => setActiveTab('cumulative')}
            className="btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'cumulative' ? 'var(--sbb-red)' : 'transparent',
              color: activeTab === 'cumulative' ? 'var(--sbb-white)' : 'var(--text-color)',
              border: activeTab === 'cumulative' ? 'none' : '1px solid var(--border-color)'
            }}
          >
            12-Month Cumulative Spent
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className="btn"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'routes' ? 'var(--sbb-red)' : 'transparent',
              color: activeTab === 'routes' ? 'var(--sbb-white)' : 'var(--text-color)',
              border: activeTab === 'routes' ? 'none' : '1px solid var(--border-color)'
            }}
          >
            Route Contribution
          </button>
        </div>
        <span className="text-muted font-mono" style={{ fontSize: '0.85rem' }}>
          Visualisations
        </span>
      </div>

      {/* Comparison Tab: Stacked Bar Chart */}
      {activeTab === 'comparison' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This chart compares the base card costs (dark columns) with the accumulated ticket costs (red columns) to show the total annual expenditure.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} style={{ width: '100%', maxWidth: '600px', height: 'auto' }}>
              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const val = ratio * maxCost;
                const y = barPaddingTop + chartInnerHeight * (1 - ratio);
                return (
                  <g key={ratio} style={{ opacity: 0.15 }}>
                    <line x1={barPaddingLeft} y1={y} x2={barChartWidth - barPaddingRight} y2={y} stroke="var(--text-color)" strokeWidth="1" />
                    <text x={barPaddingLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fontFamily="var(--font-sans)" fill="var(--text-color)">
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bars */}
              {sortedByCost.map((card, idx) => {
                const colWidth = chartInnerWidth / sortedByCost.length;
                const x = barPaddingLeft + colWidth * idx + (colWidth - barWidth) / 2;
                
                // Scale factor
                const baseHeight = (card.baseCost / maxCost) * chartInnerHeight;
                const ticketHeight = (card.ticketCost / maxCost) * chartInnerHeight;
                
                const baseY = barPaddingTop + chartInnerHeight - baseHeight;
                const ticketY = baseY - ticketHeight;
                
                const isHovered = hoveredCard === card.cardName;

                return (
                  <g
                    key={card.cardName}
                    onMouseEnter={() => setHoveredCard(card.cardName)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Background indicator bar on hover */}
                    {isHovered && (
                      <rect
                        x={x - 10}
                        y={barPaddingTop}
                        width={barWidth + 20}
                        height={chartInnerHeight}
                        fill="var(--sbb-red)"
                        opacity="0.05"
                      />
                    )}

                    {/* Stack 1: Card Base Cost */}
                    <rect
                      x={x}
                      y={baseY}
                      width={barWidth}
                      height={baseHeight}
                      fill="var(--sbb-black)"
                      opacity={isHovered ? 0.9 : 0.8}
                    />

                    {/* Stack 2: Ticket Cost */}
                    <rect
                      x={x}
                      y={ticketY}
                      width={barWidth}
                      height={ticketHeight}
                      fill="var(--sbb-red)"
                      opacity={isHovered ? 1 : 0.85}
                    />

                    {/* X Axis Label */}
                    <text
                      x={x + barWidth / 2}
                      y={barPaddingTop + chartInnerHeight + 20}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="var(--font-heading)"
                      fill="var(--text-color)"
                      transform={`rotate(15, ${x + barWidth / 2}, ${barPaddingTop + chartInnerHeight + 20})`}
                    >
                      {card.cardName.length > 15 ? `${card.cardName.substring(0, 13)}...` : card.cardName}
                    </text>

                    {/* Value Label above bar */}
                    <text
                      x={x + barWidth / 2}
                      y={ticketY - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="var(--font-sans)"
                      fill={isHovered ? 'var(--sbb-red)' : 'var(--text-color)'}
                    >
                      CHF {Math.round(card.totalCost)}
                    </text>
                  </g>
                );
              })}

              {/* Bottom Baseline */}
              <line
                x1={barPaddingLeft}
                y1={barPaddingTop + chartInnerHeight}
                x2={barChartWidth - barPaddingRight}
                y2={barPaddingTop + chartInnerHeight}
                stroke="var(--text-color)"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-center gap-1" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--sbb-black)' }} />
              <strong>Base Travel Card Price</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--sbb-red)' }} />
              <strong>Annual Ticket Cost (after discount)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Cumulative Trend Tab: Line Chart */}
      {activeTab === 'cumulative' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Monthly cumulative spent. Follow the lines to see where different cards break even and intersect.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} style={{ width: '100%', maxWidth: '600px', height: 'auto' }}>
              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const val = ratio * maxCumulativeVal;
                const y = linePaddingTop + lineInnerHeight * (1 - ratio);
                return (
                  <g key={ratio} style={{ opacity: 0.15 }}>
                    <line x1={linePaddingLeft} y1={y} x2={lineChartWidth - linePaddingRight} y2={y} stroke="var(--text-color)" strokeWidth="1" />
                    <text x={linePaddingLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fontFamily="var(--font-sans)" fill="var(--text-color)">
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Month Labels */}
              {Array.from({ length: 12 }).map((_, m) => {
                const x = getLineX(m);
                return (
                  <g key={m}>
                    <line
                      x1={x}
                      y1={linePaddingTop}
                      x2={x}
                      y2={linePaddingTop + lineInnerHeight}
                      stroke="var(--text-color)"
                      strokeWidth="1"
                      opacity={hoveredMonth === m ? 0.25 : 0.05}
                    />
                    <text
                      x={x}
                      y={linePaddingTop + lineInnerHeight + 20}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="var(--font-sans)"
                      fill={hoveredMonth === m ? 'var(--sbb-red)' : 'var(--text-color)'}
                      fontWeight={hoveredMonth === m ? '700' : '400'}
                    >
                      M{m + 1}
                    </text>
                  </g>
                );
              })}

              {/* Hover Interaction Box */}
              {Array.from({ length: 12 }).map((_, m) => {
                const x = getLineX(m);
                const stepX = lineInnerWidth / 11;
                return (
                  <rect
                    key={`hit-${m}`}
                    x={x - stepX / 2}
                    y={linePaddingTop}
                    width={stepX}
                    height={lineInnerHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    style={{ cursor: 'crosshair' }}
                  />
                );
              })}

              {/* Lines */}
              {results.map((card, cardIdx) => {
                const pathCoords = card.cumulativeCosts.map((val, m) => {
                  return `${getLineX(m)},${getLineY(val)}`;
                }).join(' L ');
                
                const isCardHovered = hoveredCard === card.cardName;
                const pathD = `M ${pathCoords}`;

                // Cycle colors (SBB Red, SBB Black, Grays)
                const colors = ['#eb0000', '#111111', '#555555', '#999999', '#777777', '#333333'];
                const color = colors[cardIdx % colors.length];

                return (
                  <g key={card.cardName}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={isCardHovered ? 4 : 2}
                      opacity={hoveredCard ? (isCardHovered ? 1 : 0.25) : 0.85}
                      style={{ transition: 'stroke-width 0.1s ease' }}
                    />

                    {/* Dots for the hovered month */}
                    {hoveredMonth !== null && (
                      <circle
                        cx={getLineX(hoveredMonth)}
                        cy={getLineY(card.cumulativeCosts[hoveredMonth])}
                        r={4}
                        fill={color}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip / Legend */}
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            {results.map((card, cardIdx) => {
              const colors = ['#eb0000', '#111111', '#555555', '#999999', '#777777', '#333333'];
              const color = colors[cardIdx % colors.length];
              const isHovered = hoveredCard === card.cardName;
              return (
                <div
                  key={card.cardName}
                  onMouseEnter={() => setHoveredCard(card.cardName)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    opacity: hoveredCard ? (isHovered ? 1 : 0.4) : 1,
                    backgroundColor: isHovered ? 'var(--bg-panel)' : 'transparent',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '2px'
                  }}
                >
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: color }} />
                  <span>{card.cardName}</span>
                  {hoveredMonth !== null && (
                    <strong className="font-mono">
                      (CHF {Math.round(card.cumulativeCosts[hoveredMonth])})
                    </strong>
                  )}
                </div>
              );
            })}
          </div>
          {hoveredMonth !== null && (
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }} className="text-red">
              Hovering Month <strong>{hoveredMonth + 1}</strong> values shown above
            </div>
          )}
        </div>
      )}

      {/* Routes Contribution Tab */}
      {activeTab === 'routes' && (
        <div>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            A detailed breakdown of how much each travel destination contributes to your annual costs under each travel card option.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <svg viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} style={{ width: '100%', maxWidth: '600px', height: 'auto' }}>
              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const val = ratio * maxCost;
                const y = barPaddingTop + chartInnerHeight * (1 - ratio);
                return (
                  <g key={ratio} style={{ opacity: 0.15 }}>
                    <line x1={barPaddingLeft} y1={y} x2={barChartWidth - barPaddingRight} y2={y} stroke="var(--text-color)" strokeWidth="1" />
                    <text x={barPaddingLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fontFamily="var(--font-sans)" fill="var(--text-color)">
                      {Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Stacked Route Bars */}
              {sortedByCost.map((card, idx) => {
                const colWidth = chartInnerWidth / sortedByCost.length;
                const x = barPaddingLeft + colWidth * idx + (colWidth - barWidth) / 2;
                
                // Draw card baseline cost
                const cardBaseHeight = (card.baseCost / maxCost) * chartInnerHeight;
                let currentY = barPaddingTop + chartInnerHeight - cardBaseHeight;

                const isCardHovered = hoveredCard === card.cardName;

                // Compute scale factor: if HFP discount applied, routeBreakdown sum != ticketCost
                const rawBreakdownSum = Object.values(card.routeBreakdown).reduce((s, v) => s + v, 0);
                const scaleFactor = rawBreakdownSum > 0 ? card.ticketCost / rawBreakdownSum : 1;

                return (
                  <g key={card.cardName} onMouseEnter={() => setHoveredCard(card.cardName)} onMouseLeave={() => setHoveredCard(null)}>
                    {/* Base Cost Block (rendered in Black) */}
                    <rect
                      x={x}
                      y={currentY}
                      width={barWidth}
                      height={cardBaseHeight}
                      fill="#111111"
                      opacity={isCardHovered ? 0.95 : 0.8}
                      onMouseMove={(e) => {
                        const svg = e.currentTarget.closest('svg');
                        if (svg) {
                          const rect = svg.getBoundingClientRect();
                          const xPos = e.clientX - rect.left;
                          const yPos = e.clientY - rect.top;
                          setHoveredRoute({
                            cardName: card.cardName,
                            destName: 'Base Travel Card Fee',
                            cost: card.baseCost,
                            x: xPos + 15,
                            y: yPos - 45
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredRoute(null)}
                      style={{ cursor: 'pointer' }}
                    />

                    {/* Stack Route ticket Costs (scaled to match actual ticketCost) */}
                    {Object.entries(card.routeBreakdown).map(([destName, routeCost]) => {
                      const scaledCost = routeCost * scaleFactor;
                      const routeHeight = (scaledCost / maxCost) * chartInnerHeight;
                      currentY -= routeHeight; // move up
                      const destColor = getDestColor(destinations.indexOf(destName));

                      return (
                        <rect
                          key={destName}
                          x={x}
                          y={currentY}
                          width={barWidth}
                          height={routeHeight}
                          fill={destColor}
                          opacity={isCardHovered ? 1 : 0.8}
                          onMouseMove={(e) => {
                            const svg = e.currentTarget.closest('svg');
                            if (svg) {
                              const rect = svg.getBoundingClientRect();
                              const xPos = e.clientX - rect.left;
                              const yPos = e.clientY - rect.top;
                              setHoveredRoute({
                                cardName: card.cardName,
                                destName,
                                cost: scaledCost,
                                x: xPos + 15,
                                y: yPos - 45
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredRoute(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}

                    {/* X Axis Label */}
                    <text
                      x={x + barWidth / 2}
                      y={barPaddingTop + chartInnerHeight + 20}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="var(--font-heading)"
                      fill="var(--text-color)"
                      transform={`rotate(15, ${x + barWidth / 2}, ${barPaddingTop + chartInnerHeight + 20})`}
                    >
                      {card.cardName.length > 15 ? `${card.cardName.substring(0, 13)}...` : card.cardName}
                    </text>

                    {/* Total cost tag above bar */}
                    <text
                      x={x + barWidth / 2}
                      y={currentY - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="var(--font-sans)"
                      fill="var(--text-color)"
                    >
                      CHF {Math.round(card.totalCost)}
                    </text>
                  </g>
                );
              })}

              {/* Bottom Baseline */}
              <line
                x1={barPaddingLeft}
                y1={barPaddingTop + chartInnerHeight}
                x2={barChartWidth - barPaddingRight}
                y2={barPaddingTop + chartInnerHeight}
                stroke="var(--text-color)"
                strokeWidth="2"
              />
            </svg>

            {/* Instant Floating Tooltip */}
            {hoveredRoute && (
              <div style={{
                position: 'absolute',
                left: `${hoveredRoute.x}px`,
                top: `${hoveredRoute.y}px`,
                backgroundColor: '#ffffff',
                border: '2px solid var(--sbb-black)',
                color: '#111111',
                padding: '0.4rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {hoveredRoute.cardName}
                </div>
                <div>
                  {hoveredRoute.destName}: <span style={{ color: 'var(--sbb-red)' }}>CHF {hoveredRoute.cost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Destinations Legend */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h5 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Legend</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#111111' }} />
                <span>Base Travel Card Fee</span>
              </div>
              {destinations.map((dest, idx) => (
                <div key={dest} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: getDestColor(idx) }} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{dest}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
