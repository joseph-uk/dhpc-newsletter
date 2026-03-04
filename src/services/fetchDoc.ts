export async function fetchGoogleDoc(url: string): Promise<string> {
  if (url.length === 0) {
    throw new Error('fetchGoogleDoc: url must not be empty');
  }

  const fetchUrl = url.includes('?embedded=true') ? url : `${url}?embedded=true`;

  let response: Response;
  try {
    response = await fetch(fetchUrl, { cache: 'no-store' });
  } catch (cause) {
    throw new Error(
      `fetchGoogleDoc: network failure fetching "${fetchUrl}": ${String(cause)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `fetchGoogleDoc: server returned ${response.status} for "${fetchUrl}"`,
    );
  }

  return response.text();
}
