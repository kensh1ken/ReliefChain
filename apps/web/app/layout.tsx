import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'ReliefChain — Every rupee, accounted for', description: 'Blockchain-verified Assam flood relief tracking' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
