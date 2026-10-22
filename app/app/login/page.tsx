export const metadata = { title: 'DuesPilot: passcode' };
export default async function Login({ searchParams }: { searchParams: Promise<{ bad?: string }> }) {
  const { bad } = await searchParams;
  return (
    <main style={{ maxWidth: 360 }}>
      <h1>DuesPilot (sandbox demo)</h1>
      <p>Enter the demo passcode from the Devpost testing instructions.</p>
      <form method="post" action="/api/login">
        <input name="passcode" type="password" autoComplete="current-password" required autoFocus aria-label="Demo passcode" />{' '}
        <button type="submit">Enter</button>
      </form>
      {bad && <p role="alert" style={{ color: '#b00' }}>Wrong passcode.</p>}
    </main>
  );
}
