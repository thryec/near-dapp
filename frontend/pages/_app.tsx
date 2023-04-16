import { WalletSelectorContextProvider } from '@/contexts/WalletSelectorContext';
import '@/styles/globals.css';
import '@near-wallet-selector/modal-ui/styles.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <main className="w-1/2 mx-auto my-4">
        <WalletSelectorContextProvider>
          <Component {...pageProps} />
        </WalletSelectorContextProvider>
      </main>
    </>
  );
}
