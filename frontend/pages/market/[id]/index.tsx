import { Button } from '@/components/Button';
import { PreviewMarket } from '@/components/PreviewMarket';
import { CONTRACT_ID } from '@/constants';
import {
  WalletSelectorContextProvider,
  useWalletSelector,
} from '@/contexts/WalletSelectorContext';
import ViewMarket from '@/types/ViewMarket';
import { providers } from 'near-api-js';
import { CodeResult } from 'near-api-js/lib/providers/provider';
import Head from 'next/head';
import { Router, useRouter } from 'next/router';
import React, { useCallback, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Offer } from '@/types/Offer';
import { PreviewOffer } from '@/components/PreviewOffer';

export default function Market() {
  const router = useRouter();
  const { id: routerId } = router.query;
  const { selector, modal, accountId, accounts } = useWalletSelector();

  const [market, setMarket] = React.useState<ViewMarket | null>(null);

  const getMarket = useCallback(async () => {
    if (typeof routerId !== 'string') {
      return null;
    }

    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const res = await provider.query<CodeResult>({
      request_type: 'call_function',
      account_id: CONTRACT_ID,
      method_name: 'get_market',
      args_base64: Buffer.from(
        JSON.stringify({ market_id: parseInt(routerId) }),
      ).toString('base64'),
      finality: 'optimistic',
    });

    try {
      return JSON.parse(Buffer.from(res.result).toString()) as ViewMarket;
    } catch (e) {
      return null;
    }
  }, [selector, routerId]);

  useEffect(() => {
    getMarket().then(setMarket);
  }, [selector, getMarket]);

  const [offers, setOffers] = React.useState<Offer[]>([]);

  const getOffers = useCallback(async () => {
    if (typeof routerId !== 'string') {
      return [];
    }

    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    const res = await provider.query<CodeResult>({
      request_type: 'call_function',
      account_id: CONTRACT_ID,
      method_name: 'get_offers',
      args_base64: Buffer.from(
        JSON.stringify({ market_id: parseInt(routerId) }),
      ).toString('base64'),
      finality: 'optimistic',
    });

    try {
      return JSON.parse(Buffer.from(res.result).toString()) as Offer[];
    } catch (e) {
      return [];
    }
  }, [selector, routerId]);

  useEffect(() => {
    getOffers().then(setOffers);
  }, [selector, getOffers]);

  return (
    <>
      <Head>
        <title>View Market</title>
      </Head>
      <div className="my-3">
        {market ? <PreviewMarket market={market} /> : 'Could not load market'}
      </div>
      <h3 className="my-3 text-lg font-semibold">Open Offers</h3>
      <div>
        {offers.length
          ? offers.map((offer) => <PreviewOffer key={offer.id} offer={offer} />)
          : 'None'}
      </div>
    </>
  );
}
