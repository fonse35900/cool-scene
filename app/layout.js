import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'OCTANE - Car Dealer & Collector',
  description: 'Gestão de viaturas OCTANE',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className="bg-octane-black min-h-screen text-octane-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
