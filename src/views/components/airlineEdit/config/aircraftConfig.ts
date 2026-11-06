/**
 * Fluggeräte und Sicherheitseinstellungen für den WPML-Export.
 *
 * Gerätekennungen (droneEnumValue:droneSubEnumValue → payloadEnumValue) laut DJI Cloud API 1.18
 * Product Support / WPML; die Matrice 4T (99:1, Kamera 89) ist mit einer echten Drohne abgeglichen.
 * Bildwinkel und Fotoformat der Weitwinkelkamera laut DJI-Datenblättern.
 */
import { reactive, watch } from 'vue';
import type { CameraPhotoSpecification } from './cameraConfig';

export interface AircraftProfile {
	/** `${droneEnumValue}:${droneSubEnumValue}` */
	key: string;
	name: string;
	droneEnumValue: number;
	droneSubEnumValue: number;
	payloadEnumValue: number;
	camera: CameraPhotoSpecification;
}

function wide(model: string, diagonalFovDegrees: number, photoWidthPixels: number, photoHeightPixels: number): CameraPhotoSpecification {
	return { model, lens: 'wide', diagonalFovDegrees, photoWidthPixels, photoHeightPixels };
}

function profile(drone: number, sub: number, payload: number, name: string, camera: CameraPhotoSpecification): AircraftProfile {
	return { key: `${drone}:${sub}`, name, droneEnumValue: drone, droneSubEnumValue: sub, payloadEnumValue: payload, camera };
}

export const AIRCRAFT_PROFILES: readonly AircraftProfile[] = [
	profile(99, 1, 89, 'Matrice 4T', wide('M4T', 82, 8064, 6048)),
	profile(99, 0, 88, 'Matrice 4E', wide('M4E', 84, 5280, 3956)),
	profile(100, 1, 99, 'Matrice 4TD', wide('M4TD', 82, 8064, 6048)),
	profile(100, 0, 98, 'Matrice 4D', wide('M4D', 84, 5280, 3956)),
	profile(91, 1, 81, 'Matrice 3TD', wide('M3TD', 82, 4032, 3024)),
	profile(91, 0, 80, 'Matrice 3D', wide('M3D', 84, 5280, 3956)),
	profile(77, 0, 66, 'Mavic 3E', wide('M3E', 84, 5280, 3956)),
	profile(77, 1, 67, 'Mavic 3T', wide('M3T', 84, 8000, 6000)),
	profile(77, 2, 68, 'Mavic 3M', wide('M3M', 84, 5280, 3956)),
	profile(77, 3, 129, 'Mavic 3TA', wide('M3TA', 84, 8000, 6000)),
	profile(67, 0, 52, 'Matrice 30', wide('M30', 84, 4000, 3000)),
	profile(67, 1, 53, 'Matrice 30T', wide('M30T', 84, 4000, 3000)),
];

export const DEFAULT_AIRCRAFT_KEY = '99:1';

export function getAircraftProfile(key: string): AircraftProfile {
	return AIRCRAFT_PROFILES.find((p) => p.key === key) ?? AIRCRAFT_PROFILES.find((p) => p.key === DEFAULT_AIRCRAFT_KEY)!;
}

/**
 * Fluggerät zu den Kennungen einer KMZ-Datei. Innerhalb einer Gerätefamilie entscheidet die Kamera,
 * wie DJI Pilot 2 es macht (Pilot 2 schreibt z. B. bei der M4T teils droneSubEnumValue 0 mit Kamera 89).
 */
export function findAircraftProfile(droneEnumValue?: number, droneSubEnumValue?: number, payloadEnumValue?: number): AircraftProfile | undefined {
	if (droneEnumValue === undefined) return undefined;
	const family = AIRCRAFT_PROFILES.filter((p) => p.droneEnumValue === droneEnumValue);
	if (payloadEnumValue !== undefined) {
		const byCamera = family.find((p) => p.payloadEnumValue === payloadEnumValue);
		if (byCamera) return byCamera;
	}
	return family.find((p) => p.droneSubEnumValue === (droneSubEnumValue ?? 0)) ?? family[0];
}

/** Verhalten bei Verlust der Funkverbindung (WPML exitOnRCLost / executeRCLostAction). */
export type RcLostBehaviour = 'goBack' | 'landing' | 'hover' | 'goContinue';
/** Aktion nach dem letzten Wegpunkt (WPML finishAction). */
export type FinishAction = 'goHome' | 'autoLand' | 'gotoFirstWaypoint' | 'noAction';

export const RC_LOST_OPTIONS: { value: RcLostBehaviour; label: string }[] = [
	{ value: 'goBack', label: 'Rückkehr zum Startpunkt' },
	{ value: 'landing', label: 'Sofort landen' },
	{ value: 'hover', label: 'Schweben' },
	{ value: 'goContinue', label: 'Route fortsetzen' },
];

export const FINISH_ACTION_OPTIONS: { value: FinishAction; label: string }[] = [
	{ value: 'goHome', label: 'Rückkehr zum Startpunkt' },
	{ value: 'autoLand', label: 'Landen' },
	{ value: 'gotoFirstWaypoint', label: 'Zum ersten Wegpunkt' },
	{ value: 'noAction', label: 'Schweben (keine Aktion)' },
];

/** Grenzen laut WPML: takeOffSecurityHeight 1,2–1500 m; Rückkehrhöhe praktisch 20–500 m. */
export const TAKEOFF_SECURITY_HEIGHT_RANGE = { min: 2, max: 1500 };
export const RTH_HEIGHT_RANGE = { min: 20, max: 500 };

export interface MissionSettings {
	aircraftKey: string;
	rcLostBehaviour: RcLostBehaviour;
	finishAction: FinishAction;
	takeOffSecurityHeight: number;
	rthHeight: number;
}

export const MISSION_SETTINGS_DEFAULTS: MissionSettings = {
	aircraftKey: DEFAULT_AIRCRAFT_KEY,
	rcLostBehaviour: 'goBack',
	finishAction: 'goHome',
	takeOffSecurityHeight: 20,
	rthHeight: 100,
};

const STORAGE_KEY = 'planar-wayline.missionSettings';

function clamp(value: unknown, range: { min: number; max: number }, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.min(range.max, Math.max(range.min, n)) : fallback;
}

/** Bereinigt gespeicherte oder importierte Werte; Unbekanntes fällt auf die Vorgabe zurück. */
export function sanitizeMissionSettings(raw: Partial<MissionSettings> | null | undefined): MissionSettings {
	const d = MISSION_SETTINGS_DEFAULTS;
	return {
		aircraftKey: AIRCRAFT_PROFILES.some((p) => p.key === raw?.aircraftKey) ? raw!.aircraftKey! : d.aircraftKey,
		rcLostBehaviour: RC_LOST_OPTIONS.some((o) => o.value === raw?.rcLostBehaviour) ? raw!.rcLostBehaviour! : d.rcLostBehaviour,
		finishAction: FINISH_ACTION_OPTIONS.some((o) => o.value === raw?.finishAction) ? raw!.finishAction! : d.finishAction,
		takeOffSecurityHeight: clamp(raw?.takeOffSecurityHeight, TAKEOFF_SECURITY_HEIGHT_RANGE, d.takeOffSecurityHeight),
		rthHeight: clamp(raw?.rthHeight, RTH_HEIGHT_RANGE, d.rthHeight),
	};
}

function loadMissionSettings(): MissionSettings {
	try {
		return sanitizeMissionSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
	} catch {
		return { ...MISSION_SETTINGS_DEFAULTS };
	}
}

/** Zuletzt gewählte Einstellungen; bleiben im Browser gespeichert. */
export const missionSettings = reactive<MissionSettings>(loadMissionSettings());

watch(
	() => ({ ...missionSettings }),
	(value) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
		} catch {
			// Speichern nicht möglich (privates Fenster) – Einstellungen gelten dann nur für diese Sitzung.
		}
	}
);

/** Kamera des gewählten Fluggeräts. */
export function selectedCamera(): CameraPhotoSpecification {
	return getAircraftProfile(missionSettings.aircraftKey).camera;
}
