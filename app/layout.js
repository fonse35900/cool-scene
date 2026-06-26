import './globals.css';

export const metadata = {
  title: 'Gestão de Viaturas',
  description: 'Aplicação de gestão de vendas de viaturas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
