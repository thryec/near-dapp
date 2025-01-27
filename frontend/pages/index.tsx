import Head from 'next/head';
import { WalletSelectorContextProvider } from '@/contexts/WalletSelectorContext';
import Content from '@/components/Content';

export default function Home() {
  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex w-1/2 mx-auto my-4">
        <WalletSelectorContextProvider>
          <Content />
        </WalletSelectorContextProvider>
      </main>
    </>
  );
}
