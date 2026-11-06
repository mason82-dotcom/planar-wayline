/**
 * 功能名称：免 Token 地图数据源（Free map sources without a Cesium ion token）
 *
 * Imagery: Esri World Imagery, optionally overlaid with regional orthophotos (WMS).
 * Terrain: Terrarium-encoded RGB elevation tiles (Mapterhorn by default), decoded into
 * Cesium heightmaps by a CustomHeightmapTerrainProvider.
 *
 * The RGB tiles hold heights above mean sea level, while Cesium (like Cesium World Terrain)
 * works with heights above the WGS84 ellipsoid, and the exported waylines use WGS84 heights.
 * Every height is therefore converted with the EGM96 geoid (about +48 m in southern Germany);
 * without it, terrain-following routes would fly that much too low.
 */
import * as Cesium from 'cesium';
import { meanSeaLevel } from 'egm96-universal';

const env = import.meta.env;

const DEFAULT_IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_IMAGERY_CREDIT = 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';
const DEFAULT_TERRAIN_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
const DEFAULT_TERRAIN_CREDIT = '© Mapterhorn';

/** Heightmap posts per tile edge; 129 gives ~12 m spacing at level 14 in central Europe. */
const HEIGHTMAP_SIZE = 129;

function numberEnv(value: string | undefined, fallback: number): number {
	const n = Number(value);
	return value && Number.isFinite(n) ? n : fallback;
}

/** Imagery layers: worldwide imagery plus optional regional orthophotos (e.g. LGL-BW DOP20). */
export function createImageryLayers(): Cesium.ImageryLayer[] {
	const layers = [
		new Cesium.ImageryLayer(
			new Cesium.UrlTemplateImageryProvider({
				url: env.VITE_IMAGERY_URL || DEFAULT_IMAGERY_URL,
				credit: env.VITE_IMAGERY_CREDIT || DEFAULT_IMAGERY_CREDIT,
				maximumLevel: numberEnv(env.VITE_IMAGERY_MAX_LEVEL, 19),
			})
		),
	];

	const wmsUrl = env.VITE_ORTHO_WMS_URL;
	const wmsLayers = env.VITE_ORTHO_WMS_LAYERS;
	if (wmsUrl && wmsLayers) {
		const bounds = (env.VITE_ORTHO_BOUNDS || '')
			.split(',')
			.map((v) => Number(v.trim()))
			.filter((v) => Number.isFinite(v));
		layers.push(
			new Cesium.ImageryLayer(
				new Cesium.WebMapServiceImageryProvider({
					url: wmsUrl,
					layers: wmsLayers,
					parameters: { format: 'image/png', transparent: true },
					tilingScheme: new Cesium.WebMercatorTilingScheme(),
					credit: env.VITE_ORTHO_CREDIT || '',
					maximumLevel: numberEnv(env.VITE_ORTHO_MAX_LEVEL, 20),
					...(bounds.length === 4 ? { rectangle: Cesium.Rectangle.fromDegrees(bounds[0], bounds[1], bounds[2], bounds[3]) } : {}),
				})
			)
		);
	}
	return layers;
}

interface DecodedTile {
	width: number;
	height: number;
	/** Height in metres for every pixel, row-major. */
	heights: Float32Array;
}

/** Decodes one RGB elevation tile into per-pixel heights in metres. */
async function decodeTile(url: string, encoding: 'terrarium' | 'mapbox'): Promise<DecodedTile> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`terrain tile ${response.status}: ${url}`);
	const bitmap = await createImageBitmap(await response.blob());
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('2D canvas unavailable');
	ctx.drawImage(bitmap, 0, 0);
	const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
	bitmap.close();

	const heights = new Float32Array(width * height);
	for (let p = 0, i = 0; p < heights.length; p++, i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		heights[p] = encoding === 'mapbox' ? -10000 + (r * 65536 + g * 256 + b) * 0.1 : r * 256 + g + b / 256 - 32768;
	}
	return { width, height, heights };
}

/** Bilinear height at fractional pixel coordinates. */
function bilinear(tile: DecodedTile, fx: number, fy: number): number {
	const x0 = Math.max(0, Math.min(tile.width - 1, Math.floor(fx)));
	const y0 = Math.max(0, Math.min(tile.height - 1, Math.floor(fy)));
	const x1 = Math.min(tile.width - 1, x0 + 1);
	const y1 = Math.min(tile.height - 1, y0 + 1);
	const tx = Math.max(0, Math.min(1, fx - x0));
	const ty = Math.max(0, Math.min(1, fy - y0));
	const h = tile.heights;
	const top = h[y0 * tile.width + x0] * (1 - tx) + h[y0 * tile.width + x1] * tx;
	const bottom = h[y1 * tile.width + x0] * (1 - tx) + h[y1 * tile.width + x1] * tx;
	return top * (1 - ty) + bottom * ty;
}

/**
 * Terrain provider for Terrarium (or Mapbox) RGB elevation tiles on a Web Mercator XYZ grid.
 * Levels deeper than VITE_TERRAIN_MAX_LEVEL are cut out of the ancestor tile at that level,
 * so every requested tile resolves (returning undefined would make Cesium retry forever).
 */
export function createRgbTerrainProvider(): Cesium.CustomHeightmapTerrainProvider {
	const template = env.VITE_TERRAIN_URL || DEFAULT_TERRAIN_URL;
	const encoding = env.VITE_TERRAIN_ENCODING === 'mapbox' ? 'mapbox' : 'terrarium';
	const maxLevel = numberEnv(env.VITE_TERRAIN_MAX_LEVEL, 14);

	// Small LRU cache of decoded source tiles (deeper levels reuse their ancestor).
	const cache = new Map<string, Promise<DecodedTile>>();
	const loadSource = (z: number, x: number, y: number): Promise<DecodedTile> => {
		const key = `${z}/${x}/${y}`;
		let tile = cache.get(key);
		if (tile) {
			cache.delete(key);
		} else {
			const url = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
			tile = decodeTile(url, encoding);
			tile.catch(() => cache.delete(key));
		}
		cache.set(key, tile);
		if (cache.size > 96) cache.delete(cache.keys().next().value as string);
		return tile;
	};

	const tilingScheme = new Cesium.WebMercatorTilingScheme();
	const projection = tilingScheme.projection;

	return new Cesium.CustomHeightmapTerrainProvider({
		width: HEIGHTMAP_SIZE,
		height: HEIGHTMAP_SIZE,
		tilingScheme,
		credit: env.VITE_TERRAIN_CREDIT || DEFAULT_TERRAIN_CREDIT,
		callback: async (x, y, level) => {
			const depth = Math.max(0, level - maxLevel);
			const scale = 2 ** depth;
			const sx = Math.floor(x / scale);
			const sy = Math.floor(y / scale);
			const tile = await loadSource(level - depth, sx, sy);
			// Part of the source tile covered by the requested tile, in source pixels.
			const spanX = (tile.width - 1) / scale;
			const spanY = (tile.height - 1) / scale;
			const originX = (x - sx * scale) * spanX;
			const originY = (y - sy * scale) * spanY;

			// Tile corners in Web Mercator metres; posts are evenly spaced in that projection.
			const native = tilingScheme.tileXYToNativeRectangle(x, y, level);
			const heights = new Float32Array(HEIGHTMAP_SIZE * HEIGHTMAP_SIZE);
			const geoidByColumn = new Float64Array(HEIGHTMAP_SIZE);
			for (let row = 0; row < HEIGHTMAP_SIZE; row++) {
				// Posts lie on the tile edges, so neighbouring tiles share their border heights.
				const t = row / (HEIGHTMAP_SIZE - 1);
				const fy = originY + t * spanY;
				const mercatorY = native.north - t * (native.north - native.south);
				const latitude = Cesium.Math.toDegrees(projection.unproject(new Cesium.Cartesian3(native.west, mercatorY)).latitude);
				for (let col = 0; col < HEIGHTMAP_SIZE; col++) {
					const u = col / (HEIGHTMAP_SIZE - 1);
					const longitude = Cesium.Math.toDegrees(projection.unproject(new Cesium.Cartesian3(native.west + u * (native.east - native.west), mercatorY)).longitude);
					geoidByColumn[col] = meanSeaLevel(latitude, longitude);
					const fx = originX + u * spanX;
					heights[row * HEIGHTMAP_SIZE + col] = bilinear(tile, fx, fy) + geoidByColumn[col];
				}
			}
			return heights;
		},
	});
}
