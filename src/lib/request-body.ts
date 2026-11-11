import { NextResponse } from 'next/server';

export type JsonBodyResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

function errorJson(message: string, status: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Lit un corps JSON sous forme d'objet en appliquant une limite stricte en octets
 * sur le flux réel (protège contre Transfer-Encoding: chunked et Content-Length falsifié ou NaN).
 */
export async function readJsonObjectBody(
  request: Request,
  maxBytes: number,
  tooLargeMessage = 'Requête trop volumineuse.'
): Promise<JsonBodyResult> {
  const rawLength = request.headers.get('content-length');
  if (rawLength !== null) {
    const trimmed = rawLength.trim();
    if (!/^\d+$/.test(trimmed)) {
      return { ok: false, response: errorJson('En-tête Content-Length invalide.', 400) };
    }
    if (Number(trimmed) > maxBytes) {
      return { ok: false, response: errorJson(tooLargeMessage, 413) };
    }
  }

  let rawText = '';
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            return { ok: false, response: errorJson(tooLargeMessage, 413) };
          }
          chunks.push(value);
        }
      }

      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      rawText = new TextDecoder('utf-8', { fatal: false }).decode(merged);
    } else {
      rawText = await request.text();
      if (new TextEncoder().encode(rawText).byteLength > maxBytes) {
        return { ok: false, response: errorJson(tooLargeMessage, 413) };
      }
    }
  } catch {
    return { ok: false, response: errorJson('Lecture du corps de requête impossible.', 400) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, response: errorJson('Corps de requête JSON invalide.', 400) };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: errorJson('Format de requête invalide (objet attendu).', 400) };
  }

  return { ok: true, data: parsed as Record<string, unknown> };
}
