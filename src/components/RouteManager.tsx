import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Info } from 'lucide-react';
import type { TravelRoute, TravelCard } from '../types';
import { normalizeCardName } from '../calculator';

interface RouteManagerProps {
  routes: TravelRoute[];
  cards: TravelCard[];
  onUpdateRoutes: (newRoutes: TravelRoute[]) => void;
}

export const RouteManager: React.FC<RouteManagerProps> = ({ routes, cards, onUpdateRoutes }) => {
  const [newDest, setNewDest] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [newHalfFareCost, setNewHalfFareCost] = useState('');
  const [newInclusions, setNewInclusions] = useState<string[]>([]);
  
  // Custom cost map for specific cards
  const [newCustomCosts, setNewCustomCosts] = useState<Record<string, string>>({});

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDest, setEditDest] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [editInclusions, setEditInclusions] = useState<string[]>([]);
  const [editCosts, setEditCosts] = useState<Record<string, string>>({});

  // Automatically pre-check GA-like cards when the cards list changes
  useEffect(() => {
    const gaCards = cards.filter(c => normalizeCardName(c.name) === 'ga').map(c => c.name);
    setNewInclusions(gaCards);
  }, [cards]);

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDest.trim() || !newFrequency.trim() || !newHalfFareCost.trim()) return;
    
    const freq = parseFloat(newFrequency);
    const hfCost = parseFloat(newHalfFareCost);
    if (isNaN(freq) || isNaN(hfCost)) return;

    const costsRecord: Record<string, number> = {
      'Half-Fare': hfCost
    };

    // Add other custom card costs
    for (const [cardName, costStr] of Object.entries(newCustomCosts)) {
      if (costStr.trim()) {
        const val = parseFloat(costStr);
        if (!isNaN(val)) {
          costsRecord[cardName] = val;
        }
      }
    }

    const newRoute: TravelRoute = {
      id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      destination: newDest.trim(),
      includedCards: [...newInclusions],
      costs: costsRecord,
      timesPerMonth: freq
    };

    onUpdateRoutes([...routes, newRoute]);

    // Reset fields
    setNewDest('');
    setNewFrequency('');
    setNewHalfFareCost('');
    const gaCards = cards.filter(c => normalizeCardName(c.name) === 'ga').map(c => c.name);
    setNewInclusions(gaCards);
    setNewCustomCosts({});
  };

  const handleDeleteRoute = (id: string) => {
    const route = routes.find(r => r.id === id);
    if (route && confirm(`Are you sure you want to delete the route to "${route.destination}"?`)) {
      onUpdateRoutes(routes.filter(r => r.id !== id));
    }
  };

  const handleStartEdit = (route: TravelRoute) => {
    setEditingId(route.id);
    setEditDest(route.destination);
    setEditFrequency(route.timesPerMonth.toString());
    setEditInclusions([...route.includedCards]);
    
    const costsStrRecord: Record<string, string> = {};
    for (const [k, v] of Object.entries(route.costs)) {
      costsStrRecord[k] = v.toString();
    }
    setEditCosts(costsStrRecord);
  };

  const handleSaveEdit = (id: string) => {
    const freq = parseFloat(editFrequency);
    if (isNaN(freq)) return;

    const parsedCosts: Record<string, number> = {};
    for (const [cardName, costStr] of Object.entries(editCosts)) {
      if (costStr.trim()) {
        const val = parseFloat(costStr);
        if (!isNaN(val)) {
          parsedCosts[cardName] = val;
        }
      }
    }

    const updated = routes.map(r => {
      if (r.id === id) {
        return {
          ...r,
          destination: editDest.trim(),
          timesPerMonth: freq,
          includedCards: [...editInclusions],
          costs: parsedCosts
        };
      }
      return r;
    });

    onUpdateRoutes(updated);
    setEditingId(null);
  };

  const toggleInclusion = (cardName: string, isEditing: boolean) => {
    const currentList = isEditing ? editInclusions : newInclusions;
    const setter = isEditing ? setEditInclusions : setNewInclusions;
    
    if (currentList.includes(cardName)) {
      setter(currentList.filter(c => c !== cardName));
    } else {
      setter([...currentList, cardName]);
    }
  };

  return (
    <div className="swiss-card">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h3>Travel Routes &amp; Habits</h3>
        <span className="text-muted font-mono" style={{ fontSize: '0.85rem' }}>
          {routes.length} Routes Configured
        </span>
      </div>

      <div className="table-container">
        <table className="swiss-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th style={{ width: '120px' }}>Trips / Month</th>
              <th>Included In (Cost = 0)</th>
              <th>Ticket Cost (CHF)</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => {
              const isEditing = editingId === route.id;
              return (
                <tr key={route.id}>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={editDest}
                        onChange={(e) => setEditDest(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{route.destination}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        className="form-input font-mono"
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem' }}
                      />
                    ) : (
                      <span className="font-mono">{route.timesPerMonth}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {cards.map(c => {
                        const isIncluded = isEditing 
                          ? editInclusions.includes(c.name) 
                          : route.includedCards.includes(c.name);
                        
                        return (
                          <button
                            key={c.name}
                            type="button"
                            className="btn btn-small"
                            onClick={() => isEditing && toggleInclusion(c.name, true)}
                            style={{
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.75rem',
                              cursor: isEditing ? 'pointer' : 'default',
                              backgroundColor: isIncluded ? 'var(--sbb-red)' : 'var(--sbb-light-gray)',
                              color: isIncluded ? 'var(--sbb-white)' : 'var(--sbb-black)',
                              border: 'none',
                              opacity: isEditing ? 1 : 0.85
                            }}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', minWidth: '80px' }}>Half-Fare:</span>
                          <input
                            type="number"
                            step="0.10"
                            className="form-input font-mono"
                            style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                            value={editCosts['Half-Fare'] || ''}
                            onChange={(e) => setEditCosts({ ...editCosts, 'Half-Fare': e.target.value })}
                          />
                        </div>
                        {/* Custom fields for non-GA/non-Half-Fare cards */}
                        {cards.filter(c => c.name !== 'GA' && c.name !== 'Half-Fare').map(c => (
                          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', minWidth: '80px', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.name}:</span>
                            <input
                              type="number"
                              step="0.10"
                              className="form-input font-mono"
                              style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                              placeholder="Half-Fare"
                              value={editCosts[c.name] || ''}
                              onChange={(e) => setEditCosts({ ...editCosts, [c.name]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>
                          Half-Fare cost: <strong className="font-mono">CHF {(route.costs['Half-Fare'] || 0).toFixed(2)}</strong>
                        </div>
                        {Object.entries(route.costs).filter(([k]) => k !== 'Half-Fare').map(([k, v]) => (
                          <div key={k} className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {k} cost: <span className="font-mono">CHF {v.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {isEditing ? (
                        <>
                          <button
                            className="btn btn-primary btn-small"
                            onClick={() => handleSaveEdit(route.id)}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleStartEdit(route)}
                            title="Edit Route"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeleteRoute(route.id)}
                            title="Delete Route"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Route Form */}
      <form onSubmit={handleAddRoute} className="swiss-card" style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-color)' }}>
        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Add New Travel Route</h4>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Destination Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Bern Hauptbahnhof"
              required
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Trips Per Month</label>
            <input
              type="number"
              step="0.00001"
              className="form-input"
              placeholder="e.g. 4 (once per week)"
              required
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Half-Fare Ticket Cost (CHF)</label>
            <input
              type="number"
              step="0.05"
              className="form-input"
              placeholder="e.g. 25.00"
              required
              value={newHalfFareCost}
              onChange={(e) => setNewHalfFareCost(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Fully Included In (Check all that apply):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {cards.map(c => {
              const isIncluded = newInclusions.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleInclusion(c.name, false)}
                  className="btn btn-secondary btn-small"
                  style={{
                    backgroundColor: isIncluded ? 'var(--sbb-red)' : 'transparent',
                    color: isIncluded ? 'var(--sbb-white)' : 'var(--text-color)',
                    borderColor: isIncluded ? 'var(--sbb-red)' : 'var(--border-color)'
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom costs for specific cards */}
        {cards.filter(c => c.name !== 'GA' && c.name !== 'Half-Fare').length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Custom ticket costs (optional - defaults to Half-Fare):
            </label>
            <div className="grid-3">
              {cards.filter(c => c.name !== 'GA' && c.name !== 'Half-Fare').map(c => (
                <div key={c.name} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>{c.name} cost (CHF)</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input"
                    placeholder="Same as Half-Fare"
                    value={newCustomCosts[c.name] || ''}
                    onChange={(e) => setNewCustomCosts({ ...newCustomCosts, [c.name]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Add Route
          </button>
        </div>
      </form>
      <div className="flex-center gap-1 text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
        <Info size={14} />
        <span>For routes only covered by GA, other cards default to their Half-Fare ticket cost automatically.</span>
      </div>
    </div>
  );
};
