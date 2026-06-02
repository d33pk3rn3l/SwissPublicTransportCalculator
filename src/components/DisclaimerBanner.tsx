import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="disclaimer-banner flex-center gap-1" id="sbb-disclaimer">
      <AlertTriangle size={18} className="text-red" />
      <span>
        <strong>NOT AFFILIATED WITH SBB:</strong> This tool is an independent open-source calculator and is not affiliated with, endorsed by, or connected to Schweizerische Bundesbahnen (SBB CFF FFS).
      </span>
    </div>
  );
};
