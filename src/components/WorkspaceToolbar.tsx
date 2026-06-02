import React, { useRef } from 'react';
import { Upload, Download, RefreshCw, Trash2, Database, LogOut } from 'lucide-react';
import type { TravelCard, TravelRoute } from '../types';
import { parseCsvCards, parseCsvRoutes } from '../calculator';

interface WorkspaceToolbarProps {
  cards: TravelCard[];
  routes: TravelRoute[];
  onImportCards: (cards: TravelCard[]) => void;
  onImportRoutes: (routes: TravelRoute[]) => void;
  onResetToDefault: () => void;
  onClearAll: () => void;
  onExit: () => void;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  cards,
  routes,
  onImportCards,
  onImportRoutes,
  onResetToDefault,
  onClearAll,
  onExit
}) => {
  const cardsInputRef = useRef<HTMLInputElement>(null);
  const routesInputRef = useRef<HTMLInputElement>(null);

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
        onImportCards(parsed);
      } catch (err) {
        alert('Failed to parse cards CSV: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset file value
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
        onImportRoutes(parsed);
      } catch (err) {
        alert('Failed to parse routes CSV: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset file value
    e.target.value = '';
  };

  const handleExportCards = () => {
    if (cards.length === 0) return alert('No cards to export.');
    let csv = 'Travel Card,Cost (CHF)\n';
    cards.forEach(c => {
      csv += `"${c.name}",${c.cost}\n`;
    });
    downloadFile(csv, 'Travel_Cards.csv');
  };

  const handleExportRoutes = () => {
    if (routes.length === 0) return alert('No routes to export.');
    let csv = 'Destination,Included in Travel Card,Costs,How many times per month\n';
    routes.forEach(r => {
      const inclusions = `[${r.includedCards.join('; ')}]`;
      const costsStr = `[${Object.entries(r.costs)
        .map(([cardName, value]) => `${cardName}: ${value.toFixed(2)}`)
        .join('; ')}]`;
      csv += `"${r.destination}",${inclusions},${costsStr},${r.timesPerMonth}\n`;
    });
    downloadFile(csv, 'Travel_routes.csv');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="swiss-card flex-between" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: 'var(--sbb-off-white)' }}>
      {/* Hidden file inputs */}
      <input type="file" ref={cardsInputRef} onChange={handleCardsUpload} accept=".csv" style={{ display: 'none' }} />
      <input type="file" ref={routesInputRef} onChange={handleRoutesUpload} accept=".csv" style={{ display: 'none' }} />

      {/* Workspace Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={16} className="text-red" />
        <span style={{ fontSize: '0.85rem' }}>
          Workspace: <strong>{cards.length} Cards</strong>, <strong>{routes.length} Routes</strong> active
        </span>
      </div>

      {/* Action Row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Reset / Demo Data */}
        <button
          className="btn btn-secondary btn-small"
          onClick={onResetToDefault}
          title="Reset to demo SBB travel dataset"
        >
          <RefreshCw size={12} /> Load Demo
        </button>

        {/* Clear workspace */}
        <button
          className="btn btn-danger btn-small"
          onClick={onClearAll}
          title="Clear all data and start from scratch"
          style={{ textTransform: 'uppercase' }}
        >
          <Trash2 size={12} /> Clear All
        </button>

        <div style={{ width: '1px', backgroundColor: 'var(--sbb-light-gray)', marginInline: '0.25rem' }} />

        {/* Import dropdown-like triggers */}
        <button
          className="btn btn-secondary btn-small"
          onClick={() => cardsInputRef.current?.click()}
          title="Upload Travel_Cards.csv"
        >
          <Upload size={12} /> Cards CSV
        </button>

        <button
          className="btn btn-secondary btn-small"
          onClick={() => routesInputRef.current?.click()}
          title="Upload Travel_routes.csv"
        >
          <Upload size={12} /> Routes CSV
        </button>

        {/* Export triggers */}
        <button
          className="btn btn-secondary btn-small"
          onClick={handleExportCards}
          disabled={cards.length === 0}
          title="Download Travel_Cards.csv"
          style={{ opacity: cards.length === 0 ? 0.4 : 1 }}
        >
          <Download size={12} /> Save Cards
        </button>

        <button
          className="btn btn-secondary btn-small"
          onClick={handleExportRoutes}
          disabled={routes.length === 0}
          title="Download Travel_routes.csv"
          style={{ opacity: routes.length === 0 ? 0.4 : 1 }}
        >
          <Download size={12} /> Save Routes
        </button>

        <div style={{ width: '1px', backgroundColor: 'var(--sbb-light-gray)', marginInline: '0.25rem' }} />

        {/* Exit Workspace */}
        <button
          className="btn btn-secondary btn-small"
          onClick={onExit}
          title="Exit active workspace to welcome screen"
          style={{ borderColor: 'var(--text-color)' }}
        >
          <LogOut size={12} /> Exit
        </button>
      </div>
    </div>
  );
};
