import { AppProps } from 'next/app';
import { ScriptProvider } from '@/context/ScriptContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ScriptProvider>
      <Component {...pageProps} />
    </ScriptProvider>
  );
}

export default MyApp;