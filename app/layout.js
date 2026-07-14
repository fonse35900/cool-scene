import './globals.css';
import Providers from '@/components/Providers';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: BRAND.metaTitle,
  description: BRAND.metaDescription,
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
