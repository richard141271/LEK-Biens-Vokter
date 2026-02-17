import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ROBOWFLOW_API_KEY || process.env.ROBoflow_API_KEY || process.env.ROBOWFLOW_KEY || process.env.ROBOFLOW_API_KEY;
    if (!apiKey) {
      return new NextResponse('API‑nøkkel mangler på server (ROBOFLOW_API_KEY). Bruk Mock‑modus inntil dette er satt.', { status: 400 });
    }

    const form = await req.formData();
    const image = form.get('image') as File | null;
    const model = String(form.get('model') || '').trim();
    const version = String(form.get('version') || '').trim();
    if (!image) {
      return new NextResponse('Ingen bilde mottatt', { status: 400 });
    }
    if (!model || !version) {
      return new NextResponse('Modell‑ID og versjon er påkrevd', { status: 400 });
    }

    const url = `https://detect.roboflow.com/${encodeURIComponent(model)}/${encodeURIComponent(version)}?api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': image.type || 'application/octet-stream'
      },
      body: Buffer.from(await image.arrayBuffer())
    });
    if (!res.ok) {
      const txt = await res.text();
      return new NextResponse(txt || 'Roboflow‑feil', { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return new NextResponse(e?.message || 'Ukjent feil', { status: 500 });
  }
}

