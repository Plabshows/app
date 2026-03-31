export const config = {
  runtime: 'edge',
};

export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1.0' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
