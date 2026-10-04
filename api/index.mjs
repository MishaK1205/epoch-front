// Vercel function: every request that is not a static file is handled by the Angular SSR server.
export default async function handler(req, res) {
  const { reqHandler } = await import('../dist/epoch-front/server/server.mjs');
  return reqHandler(req, res);
}
