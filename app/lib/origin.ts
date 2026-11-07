// Public origin for absolute redirects from route handlers.
// Behind Render's proxy, req.url is the internal address (http://localhost:10000), and Next.js resolves a
// relative Location header in a route handler against that same internal address, so both an absolute URL
// built from req.url and a relative Location send the browser to localhost. Render sets RENDER_EXTERNAL_URL
// (e.g. https://duespilot.onrender.com) on every web service; PUBLIC_URL overrides it for other hosts.
// Locally neither is set and req.url is already the real address.
export function publicUrl(path: string, reqUrl: string): URL {
  const base = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || reqUrl;
  return new URL(path, base);
}
