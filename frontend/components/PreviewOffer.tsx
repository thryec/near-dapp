import { Offer } from '@/types/Offer';
import React, { useCallback } from 'react';
import { AccountId } from './AccountId';
import { formatNearAmount } from 'near-api-js/lib/utils/format';
import { useWalletSelector } from '@/contexts/WalletSelectorContext';
import { utils } from 'near-api-js';
import { CONTRACT_ID } from '@/constants';

interface PreviewOfferProps {
  offer: Offer;
}

const PLENTY_OF_GAS = utils.format.parseNearAmount('0.00000000003')!;

export const PreviewOffer: React.FC<PreviewOfferProps> = ({ offer }) => {
  const { selector } = useWalletSelector();

  const acceptOffer = useCallback(async () => {
    const wallet = await selector.wallet();
    wallet.signAndSendTransaction({
      receiverId: CONTRACT_ID,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            deposit: offer.amount,
            gas: PLENTY_OF_GAS,
            args: { offer_id: offer.id },
            methodName: 'accept_offer',
          },
        },
      ],
    });
  }, [offer, selector]);

  return (
    <div
      tabIndex={-1}
      onClick={acceptOffer}
      className="cursor-pointer rounded flex flex-col gap-1 bg-orange-200 shadow-sm px-6 py-4 w-64"
    >
      <div>
        From: <AccountId>{offer.account_id}</AccountId>
      </div>
      <div>Amount: {formatNearAmount(offer.amount)} NEAR</div>
    </div>
  );
};
