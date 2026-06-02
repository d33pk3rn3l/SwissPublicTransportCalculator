import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FileSpreadsheet, Info } from 'lucide-react';
import type { TravelCard } from '../types';
import { cardTemplates } from '../data/cardTemplates';

interface CardManagerProps {
  cards: TravelCard[];
  onUpdateCards: (newCards: TravelCard[]) => void;
}

export const CardManager: React.FC<CardManagerProps> = ({ cards, onUpdateCards }) => {
  const [newCardName, setNewCardName] = useState('');
  const [newCardCost, setNewCardCost] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCost, setEditingCost] = useState('');

  // Templates Selection State
  const [templateCategory, setTemplateCategory] = useState('Half-Fare');

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim() || !newCardCost.trim()) return;
    const cost = parseFloat(newCardCost);
    if (isNaN(cost)) return;

    if (cards.some(c => c.name.toLowerCase() === newCardName.trim().toLowerCase())) {
      alert('Card name already exists.');
      return;
    }

    onUpdateCards([...cards, { name: newCardName.trim(), cost }]);
    setNewCardName('');
    setNewCardCost('');
  };

  const handleDeleteCard = (index: number) => {
    if (confirm(`Are you sure you want to delete "${cards[index].name}"?`)) {
      const updated = cards.filter((_, i) => i !== index);
      onUpdateCards(updated);
    }
  };

  const handleStartEdit = (index: number, currentCost: number) => {
    setEditingIndex(index);
    setEditingCost(currentCost.toString());
  };

  const handleSaveEdit = (index: number) => {
    const cost = parseFloat(editingCost);
    if (isNaN(cost)) return;
    const updated = [...cards];
    updated[index] = { ...updated[index], cost };
    onUpdateCards(updated);
    setEditingIndex(null);
  };

  // Get filtered templates based on category
  const filteredTemplates = cardTemplates.filter(t => t.category === templateCategory);

  const handleCategoryChange = (cat: string) => {
    setTemplateCategory(cat);
  };

  return (
    <div className="swiss-card">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h3>Base Travel Cards</h3>
        <span className="text-muted font-mono" style={{ fontSize: '0.85rem' }}>
          {cards.length} Cards Loaded
        </span>
      </div>

      <div className="table-container">
        <table className="swiss-table">
          <thead>
            <tr>
              <th>Travel Card Name</th>
              <th>Annual Cost (CHF)</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card, idx) => (
              <tr key={card.name}>
                <td style={{ fontWeight: 600 }}>{card.name}</td>
                <td>
                  {editingIndex === idx ? (
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100px', padding: '0.3rem 0.5rem' }}
                      value={editingCost}
                      onChange={(e) => setEditingCost(e.target.value)}
                    />
                  ) : (
                    <span className="font-mono">CHF {card.cost.toFixed(2)}</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {editingIndex === idx ? (
                      <>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => handleSaveEdit(idx)}
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => setEditingIndex(null)}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleStartEdit(idx, card.cost)}
                          title="Edit Annual Cost"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteCard(idx)}
                          title="Delete Card"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SBB / ZVV Templates Picker */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <FileSpreadsheet size={16} className="text-red" />
          Add from SBB / ZVV Template (Prices 2026 Beginning)
        </h4>
        
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { value: 'Half-Fare', label: 'Half-Fare' },
            { value: 'GA Travelcard', label: 'GA' },
            { value: 'ZVV NetworkPass', label: 'ZVV NetworkPass' },
            { value: "ZVV 9 O'Clock Pass", label: "ZVV 9 O'Clock" }
          ].map(cat => (
            <button
              key={cat.value}
              type="button"
              className="btn btn-small"
              onClick={() => handleCategoryChange(cat.value)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                backgroundColor: templateCategory === cat.value ? 'var(--sbb-red)' : 'transparent',
                color: templateCategory === cat.value ? 'var(--sbb-white)' : 'var(--text-color)',
                border: templateCategory === cat.value ? 'none' : '1.5px solid var(--border-color)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scrollable Card List */}
        <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
          {filteredTemplates.map(t => {
            const alreadyAdded = cards.some(c => c.name.toLowerCase() === t.name.toLowerCase());
            return (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  opacity: alreadyAdded ? 0.45 : 1,
                  gap: '0.75rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', lineHeight: 1.3 }}>
                    {t.name}
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--sbb-black)' }}>
                  CHF {t.cost.toFixed(0)}
                </span>
                {alreadyAdded ? (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: '52px', textAlign: 'center' }}>
                    Added
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={() => {
                      onUpdateCards([...cards, { name: t.name, cost: t.cost }]);
                    }}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap', minWidth: '52px' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-center gap-1 text-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem', justifyContent: 'flex-start' }}>
          <Info size={12} />
          <span>Note: Prices represent baseline tariffs starting from beginning of 2026.</span>
        </div>
      </div>

      {/* Manual Add Form */}
      <form onSubmit={handleAddCard} className="grid-3" style={{ marginTop: '1.5rem', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Custom Card Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. GA Family 2nd"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Annual Cost (CHF)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="e.g. 2600"
            value={newCardCost}
            onChange={(e) => setNewCardCost(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ height: '36px', fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
          <Plus size={14} /> Add Custom
        </button>
      </form>
    </div>
  );
};
