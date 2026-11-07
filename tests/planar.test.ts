import { describe, expect, it } from 'vitest';
import * as Cesium from 'cesium';
import { egm96ToEllipsoid, meanSeaLevel } from 'egm96-universal';
import {
	findAircraftProfile,
	getAircraftProfile,
	MISSION_SETTINGS_DEFAULTS,
	sanitizeMissionSettings,
} from '../src/views/components/airlineEdit/config/aircraftConfig';
import { calculateCameraFieldOfView } from '../src/views/components/airlineEdit/config/cameraConfig';
import { buildPlanarKmz, type PlanarKmzExportOptions } from '../src/views/components/airlineEdit/utils/planarKmzExport';
import { parsePlanarKmz } from '../src/views/components/airlineEdit/utils/planarKmzImport';
import { calculateMaximumLineSpacing, calculatePhotoDistance } from '../src/views/components/airlineEdit/utils/wayLineCalc';
import JSZip from 'jszip';

// Testgebiet Michaelsberg (Untergrombach): Bodenhöhe ~240 m ü. NN, Geoid ~48 m
const LON = 8.5606;
const LAT = 49.0882;
const ground = (lon: number, lat: number, aboveGround: number) => Cesium.Cartesian3.fromDegrees(lon, lat, egm96ToEllipsoid(lat, lon, 240) + aboveGround);

function exportOptions(overrides: Partial<PlanarKmzExportOptions> = {}): PlanarKmzExportOptions {
	const polygon = [
		Cesium.Cartesian3.fromDegrees(LON, LAT, 0),
		Cesium.Cartesian3.fromDegrees(LON + 0.002, LAT, 0),
		Cesium.Cartesian3.fromDegrees(LON + 0.002, LAT + 0.0015, 0),
		Cesium.Cartesian3.fromDegrees(LON, LAT + 0.0015, 0),
	];
	return {
		isOblique: false,
		polygonPositions: polygon,
		takeoffPosition: ground(LON - 0.001, LAT - 0.001, 0),
		routes: [
			{
				id: 1,
				gimbalPitchDegrees: -90,
				segments: [
					{ type: 'scan', captureGroupId: 1, positions: [ground(LON, LAT + 0.0002, 70), ground(LON + 0.002, LAT + 0.0002, 70)] },
					{ type: 'transit', positions: [ground(LON + 0.002, LAT + 0.0002, 70), ground(LON + 0.002, LAT + 0.0006, 70)] },
					{ type: 'scan', captureGroupId: 2, positions: [ground(LON + 0.002, LAT + 0.0006, 70), ground(LON, LAT + 0.0006, 70)] },
				],
			},
		] as PlanarKmzExportOptions['routes'],
		lineAngle: 90,
		lineHeight: 70,
		heightType: 3,
		flightSpeed: 8,
		transitionalSpeed: 15,
		overlapW: 70,
		overlapH: 80,
		gimbalPitchDegrees: -45,
		photoTriggerMode: 'time',
		photoDistance: 15,
		aircraft: getAircraftProfile('99:1'),
		rcLostBehaviour: 'goBack',
		finishAction: 'goHome',
		takeOffSecurityHeight: 40,
		rthHeight: 100,
		...overrides,
	};
}

async function exportedXml(options: PlanarKmzExportOptions) {
	const blob = await buildPlanarKmz(options);
	const zip = await JSZip.loadAsync(await blob.arrayBuffer());
	return {
		blob,
		template: await zip.file('wpmz/template.kml')!.async('string'),
		waylines: await zip.file('wpmz/waylines.wpml')!.async('string'),
	};
}

const values = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<wpml:${tag}>([^<]*)<`, 'g'))].map((m) => m[1]);

describe('Fluggeräte', () => {
	it('ordnet Kennungen dem Gerät zu; in der Familie entscheidet die Kamera', () => {
		expect(findAircraftProfile(99, 1, 89)?.name).toBe('Matrice 4T');
		// Pilot 2 schreibt bei der M4T teils Untertyp 0 mit Kamera 89
		expect(findAircraftProfile(99, 0, 89)?.name).toBe('Matrice 4T');
		expect(findAircraftProfile(99, 0, 88)?.name).toBe('Matrice 4E');
		expect(findAircraftProfile(91, 1, 81)?.name).toBe('Matrice 3TD');
		expect(findAircraftProfile(12, 0, 1)).toBeUndefined();
		expect(findAircraftProfile(undefined, undefined, undefined)).toBeUndefined();
	});

	it('bereinigt ungültige Einstellungen auf sichere Vorgaben', () => {
		const s = sanitizeMissionSettings({ aircraftKey: '1:1', rcLostBehaviour: 'fly-away' as never, takeOffSecurityHeight: -5, rthHeight: 9999 });
		expect(s.aircraftKey).toBe(MISSION_SETTINGS_DEFAULTS.aircraftKey);
		expect(s.rcLostBehaviour).toBe('goBack');
		expect(s.takeOffSecurityHeight).toBe(2);
		expect(s.rthHeight).toBe(500);
	});
});

describe('Kamera und Abstände', () => {
	it('berechnet Linien- und Fotoabstand aus dem Bildwinkel', () => {
		const fov = calculateCameraFieldOfView(getAircraftProfile('99:1').camera);
		expect(fov.horizontalDegrees).toBeGreaterThan(fov.verticalDegrees);
		const spacing = calculateMaximumLineSpacing(70, fov.horizontalDegrees, 70);
		const photo = calculatePhotoDistance(70, fov.verticalDegrees, 80);
		// Bildbreite 70 m · 2 · tan(HFOV/2), davon 30 % neu
		expect(spacing).toBeCloseTo(2 * 70 * Math.tan((fov.horizontalDegrees * Math.PI) / 360) * 0.3, 6);
		expect(photo).toBeGreaterThan(0);
		expect(photo).toBeLessThan(spacing * 2);
	});

	it('kennt die Geoidhöhe in Nordbaden (~48 m)', () => {
		expect(meanSeaLevel(49.153, 8.585)).toBeGreaterThan(47.5);
		expect(meanSeaLevel(49.153, 8.585)).toBeLessThan(48.8);
	});
});

describe('KMZ-Export', () => {
	it('schreibt Gerätekennung und Sicherheitseinstellungen', async () => {
		const { template, waylines } = await exportedXml(exportOptions({ rcLostBehaviour: 'landing', finishAction: 'autoLand' }));
		for (const xml of [template, waylines]) {
			expect(values(xml, 'droneEnumValue')).toEqual(['99']);
			expect(values(xml, 'droneSubEnumValue')).toEqual(['1']);
			expect(values(xml, 'payloadEnumValue')).toEqual(['89']);
			expect(values(xml, 'exitOnRCLost')).toEqual(['executeLostAction']);
			expect(values(xml, 'executeRCLostAction')).toEqual(['landing']);
			expect(values(xml, 'finishAction')).toEqual(['autoLand']);
			expect(values(xml, 'takeOffSecurityHeight')).toEqual(['40']);
			expect(values(xml, 'globalRTHHeight')).toEqual(['100']);
		}
	});

	it('setzt die Route nur bei „Route fortsetzen“ ohne Verbindung fort', async () => {
		const { template } = await exportedXml(exportOptions({ rcLostBehaviour: 'goContinue' }));
		expect(values(template, 'exitOnRCLost')).toEqual(['goContinue']);
	});

	it('exportiert Geländefolge als WGS84-Ellipsoidhöhe (Gelände + Geoid + 70 m)', async () => {
		const { template, waylines } = await exportedXml(exportOptions());
		expect(values(waylines, 'executeHeightMode')).toEqual(['WGS84']);
		expect(values(template, 'surfaceRelativeHeight')).toEqual(['70']);
		const expected = egm96ToEllipsoid(LAT + 0.0002, LON, 240) + 70;
		const first = Number(values(waylines, 'executeHeight')[0]);
		expect(first).toBeCloseTo(expected, 1);
		expect(first - 240 - meanSeaLevel(LAT, LON)).toBeCloseTo(70, 0);
	});

	it('lehnt unsinnige Sicherheitshöhen ab', async () => {
		await expect(buildPlanarKmz(exportOptions({ takeOffSecurityHeight: 0 }))).rejects.toThrow('Sicherheitshöhe');
		await expect(buildPlanarKmz(exportOptions({ rthHeight: 1 }))).rejects.toThrow('Rückkehrhöhe');
		await expect(buildPlanarKmz(exportOptions({ transitionalSpeed: 16 }))).rejects.toThrow('Anfluggeschwindigkeit');
		await expect(buildPlanarKmz(exportOptions({ transitionalSpeed: 0 }))).rejects.toThrow('Anfluggeschwindigkeit');
	});
});

describe('KMZ-Import', () => {
	it('liest Gerät und Sicherheitseinstellungen aus der exportierten Datei zurück', async () => {
		const { blob } = await exportedXml(exportOptions({ aircraft: getAircraftProfile('99:0'), rcLostBehaviour: 'hover', rthHeight: 80 }));
		const imported = await parsePlanarKmz(blob);
		expect(findAircraftProfile(imported.droneEnumValue, imported.droneSubEnumValue, imported.payloadEnumValue)?.name).toBe('Matrice 4E');
		expect(imported.rcLostBehaviour).toBe('hover');
		expect(imported.finishAction).toBe('goHome');
		expect(imported.takeOffSecurityHeight).toBe(40);
		expect(imported.rthHeight).toBe(80);
		expect(imported.heightType).toBe(3);
		expect(imported.lineHeight).toBe(70);
		expect(imported.routes).toHaveLength(1);
	});
});
