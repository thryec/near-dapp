import { CONTRACT_ID } from '@/constants';
import { useWalletSelector } from '@/contexts/WalletSelectorContext';
import ViewMarket from '@/types/ViewMarket';
import { providers } from 'near-api-js';
import { CodeResult } from 'near-api-js/lib/providers/provider';
import React, { useCallback, useEffect } from 'react';
import { Button } from './Button';
import { PreviewMarket } from './PreviewMarket';

const Content: React.FC = () => {
  const { selector, modal, accountId, accounts } = useWalletSelector();

  const [markets, setMarkets] = React.useState<ViewMarket[]>([]);

  const getMarkets = useCallback(async () => {
    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const res = await provider.query<CodeResult>({
      request_type: 'call_function',
      account_id: CONTRACT_ID,
      method_name: 'list_markets',
      args_base64: '',
      finality: 'optimistic',
    });

    return JSON.parse(Buffer.from(res.result).toString()) as ViewMarket[];
  }, [selector]);

  useEffect(() => {
    getMarkets().then(setMarkets);
  }, [selector, getMarkets]);

  return (
    <>
      {/* Not signed in */}
      {!accountId && <Button onClick={() => modal.show()}>Sign in</Button>}

      {/* Signed in */}
      {accountId && (
        <>
          <div>Signed in as: {accountId}</div>
          <div className="flex gap-2 mt-4">
            {markets.map((market) => (
              <PreviewMarket key={market.id} market={market} />
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Content;
