/**
 * Exchange of KMZ routes with a local FlightHub Keyless instance (optional).
 * Enabled when VITE_FLIGHTHUB_URL is set at build time, e.g. http://192.168.178.50:3003.
 *   - open:  ?kmz=<FlightHub KMZ URL>&name=<route name>  → import on start
 *   - send:  POST <FlightHub>/api/waylines?name=…&origin=planar
 * Only KMZ URLs from the configured FlightHub origin are accepted.
 */
export function flightHubBase(raw: string | undefined = import.meta.env.VITE_FLIGHTHUB_URL): string {
	const value = (raw || '').trim().replace(/\/+$/, '');
	if (!value) return '';
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : '';
	} catch {
		return '';
	}
}

export interface FlightHubKmzLink {
	url: string;
	name: string;
}

/** Reads ?kmz= / ?name= and returns the link only if it points to the configured FlightHub. */
export function readFlightHubKmzLink(search: string, base: string = flightHubBase()): FlightHubKmzLink | null {
	if (!base) return null;
	const params = new URLSearchParams(search);
	const raw = params.get('kmz');
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.origin !== base || !/^\/api\/waylines\/[0-9a-f]{16}\/kmz$/.test(url.pathname)) return null;
	const name = (params.get('name') || 'Route').replace(/\.kmz$/i, '').slice(0, 100).trim() || 'Route';
	return { url: url.toString(), name };
}

/** Sends a KMZ to the FlightHub route library; resolves with the stored route's id and name. */
export async function sendKmzToFlightHub(blob: Blob, name: string, base: string = flightHubBase()): Promise<{ id: string; name: string }> {
	if (!base) throw new Error('FlightHub ist nicht eingerichtet');
	const file = name.replace(/\.kmz$/i, '') + '.kmz';
	const res = await fetch(`${base}/api/waylines?name=${encodeURIComponent(file)}&origin=planar`, {
		method: 'POST',
		headers: { 'content-type': 'application/octet-stream' },
		body: blob,
	});
	let body: { id?: string; name?: string; error?: string } = {};
	try {
		body = await res.json();
	} catch {
		/* keep empty */
	}
	if (!res.ok || !body.id) throw new Error(body.error || `FlightHub antwortet ${res.status}`);
	return { id: body.id, name: body.name || file };
}
