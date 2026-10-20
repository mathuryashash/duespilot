export const metadata = { title: 'DuesPilot (sandbox demo)' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{ fontFamily: 'system-ui, sans-serif', margin: 24, color: '#111' }}>{children}</body></html>);
}
