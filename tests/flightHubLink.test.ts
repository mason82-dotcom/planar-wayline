import { afterEach, describe, expect, it, vi } from 'vitest';
import { flightHubBase, readFlightHubKmzLink, sendKmzToFlightHub } from '../src/utils/flightHubLink';

const BASE = 'http://192.168.178.50:3003';
const kmz = (u: string, name = 'Feld') => `?kmz=${encodeURIComponent(u)}&name=${encodeURIComponent(name)}`;

describe('FlightHub link', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('normalises the base URL and rejects other schemes', () => {
		expect(flightHubBase('http://192.168.178.50:3003/')).toBe(BASE);
		expect(flightHubBase('')).toBe('');
		expect(flightHubBase('javascript:alert(1)')).toBe('');
	});

	it('accepts only KMZ links of the configured FlightHub', () => {
		expect(readFlightHubKmzLink(kmz(`${BASE}/api/waylines/0123456789abcdef/kmz`, 'Acker.kmz'), BASE)).toEqual({
			url: `${BASE}/api/waylines/0123456789abcdef/kmz`,
			name: 'Acker',
		});
		expect(readFlightHubKmzLink(kmz('http://evil.example/api/waylines/0123456789abcdef/kmz'), BASE)).toBeNull();
		expect(readFlightHubKmzLink(kmz(`${BASE}/api/status`), BASE)).toBeNull();
		expect(readFlightHubKmzLink('?name=x', BASE)).toBeNull();
		expect(readFlightHubKmzLink(kmz(`${BASE}/api/waylines/0123456789abcdef/kmz`), '')).toBeNull();
	});

	it('posts the KMZ and reports errors from FlightHub', async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: 'abc', name: 'Acker.kmz' }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(sendKmzToFlightHub(new Blob(['x']), 'Acker', BASE)).resolves.toEqual({ id: 'abc', name: 'Acker.kmz' });
		expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/waylines?name=Acker.kmz&origin=planar`);
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'keine Wegpunkte' }), { status: 422 })));
		await expect(sendKmzToFlightHub(new Blob(['x']), 'Acker', BASE)).rejects.toThrow('keine Wegpunkte');
	});
});
