/// <reference types="vite/client" />

declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly VITE_PORT: string;
	readonly VITE_OPEN: string;
	readonly VITE_DEV: string;
	readonly VITE_APP_TENANT_ENABLE: string;
	readonly VITE_BASE_GEO_URL: string;
	readonly VITE_BASE_BIGEMAP_URL: string;
	readonly VITE_BASE_ARCGIS_URL: string;
	readonly VITE_BASE_TERRAIN_URL: string;
	readonly VITE_BASE_API_URL: string;
	readonly VITE_CESIUM_TOKEN: string;
	/** Optional FlightHub Keyless origin for KMZ exchange, e.g. http://192.168.178.50:3003 */
	readonly VITE_FLIGHTHUB_URL?: string;
	/** 'false' hides the DIPUL UAS geozone overlay */
	readonly VITE_GEOZONES?: string;
	/** Comma-separated DIPUL WMS layers (default: all active zones) */
	readonly VITE_GEOZONES_LAYERS?: string;
	readonly VITE_HOME_VIEW?: string;
	readonly VITE_IMAGERY_URL?: string;
	readonly VITE_IMAGERY_CREDIT?: string;
	readonly VITE_IMAGERY_MAX_LEVEL?: string;
	readonly VITE_ORTHO_WMS_URL?: string;
	readonly VITE_ORTHO_WMS_LAYERS?: string;
	readonly VITE_ORTHO_CREDIT?: string;
	readonly VITE_ORTHO_BOUNDS?: string;
	readonly VITE_ORTHO_MAX_LEVEL?: string;
	readonly VITE_TERRAIN_URL?: string;
	readonly VITE_TERRAIN_ENCODING?: string;
	readonly VITE_TERRAIN_CREDIT?: string;
	readonly VITE_TERRAIN_MAX_LEVEL?: string;
	readonly VITE_SOURCEMAP: string;
	readonly VITE_OUT_DIR: string;
	readonly BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
