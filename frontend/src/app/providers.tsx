'use client';
import {ThemeProvider} from 'next-themes';
import SessionBootstrap from '@/components/SessionBootstrap';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useCartStore } from '@/store/cart';
export default function Providers({ children }: {
    children: ReactNode;
}) { const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: 1 } } })); useEffect(() => { void useCartStore.persist.rehydrate(); }, []); return <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} storageKey="kateryna-theme" disableTransitionOnChange><QueryClientProvider client={client}><SessionBootstrap />{children}</QueryClientProvider></ThemeProvider>; }
