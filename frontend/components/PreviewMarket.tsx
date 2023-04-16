import ViewMarket from '@/types/ViewMarket';
import React from 'react';
import { AccountId } from './AccountId';
import { Button } from './Button';
import Link from 'next/link';

interface MarketProps {
  market: ViewMarket;
}

export const PreviewMarket: React.FC<MarketProps> = ({ market }) => {
  return (
    <Link
      href={`/market/${market.id}`}
    >
      <div className="rounded flex flex-col gap-1 bg-slate-200 shadow-sm px-6 py-4 w-64">
        <header className="font-bold text-lg">{market.description}</header>
        <div>
          {market.is_open ? (
            <strong className="text-green-800">Open</strong>
          ) : (
            <strong className="text-red-800">Closed</strong>
          )}
        </div>
        <div>
          Owner: <AccountId>{market.owner}</AccountId>
        </div>
        <div>Shares: {market.shares}</div>
      </div>
    </Link>
  );
};
