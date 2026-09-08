export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirect') || '/';

  const headers = new Headers();
  headers.set('Location', redirectTo);
  headers.append('Set-Cookie', 'session=; Path=/; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
