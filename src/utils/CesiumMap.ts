/**
 * 功能名称：Cesium 地图极简初始化（开源独立工程）
 * 有 Cesium ion Token 时使用 ion 影像与世界地形；否则使用免 Token 数据源
 * (Esri imagery, optional WMS orthophotos, Mapterhorn terrain)。
 */
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createGeozoneLayer, createImageryLayers, createRgbTerrainProvider } from './freeMapSources';

/** 默认视点 [经度, 纬度, 高度米]，可通过 VITE_HOME_VIEW="lon,lat,height" 配置（默认西安附近） */
const DEFAULT_HOME: [number, number, number] = [108.94, 34.34, 20000];

function homeView(): [number, number, number] {
	const parts = (import.meta.env.VITE_HOME_VIEW || '').split(',').map((v) => Number(v.trim()));
	if (parts.length === 3 && parts.every(Number.isFinite) && Math.abs(parts[0]) <= 180 && Math.abs(parts[1]) <= 90 && parts[2] > 0) {
		return parts as [number, number, number];
	}
	return DEFAULT_HOME;
}

/**
 * 初始化 Cesium Viewer（默认影像与地形）
 * @param cesiumContainer 容器 DOM 或 id
 */
export const initMap = (cesiumContainer: string | Element): Cesium.Viewer => {
	if (!cesiumContainer) {
		throw new Error('Cesium container is required');
	}

	const token = import.meta.env.VITE_CESIUM_TOKEN;
	if (token) {
		Cesium.Ion.defaultAccessToken = token;
	}
	const imageryLayers = token ? [] : createImageryLayers();

	const viewer = new Cesium.Viewer(cesiumContainer, {
		animation: false,
		baseLayerPicker: false,
		fullscreenButton: false,
		geocoder: false,
		homeButton: false,
		infoBox: false,
		sceneModePicker: false,
		selectionIndicator: false,
		timeline: false,
		navigationHelpButton: false,
		...(token
			? { terrain: Cesium.Terrain.fromWorldTerrain() }
			: { terrainProvider: createRgbTerrainProvider(), baseLayer: imageryLayers[0] }),
	});
	for (const layer of imageryLayers.slice(1)) {
		viewer.imageryLayers.add(layer);
	}
	// Geozones on top of all imagery; toggled from the header (window.geozoneLayer).
	const geozones = createGeozoneLayer();
	if (geozones) {
		geozones.show = localStorage.getItem('planar.geozones') !== 'off';
		viewer.imageryLayers.add(geozones);
		window.geozoneLayer = geozones;
	}

	viewer.scene.globe.depthTestAgainstTerrain = true;
	const home = homeView();
	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(home[0], home[1], home[2]),
		orientation: {
			heading: Cesium.Math.toRadians(0),
			pitch: Cesium.Math.toRadians(-90),
			roll: 0,
		},
	});

	return viewer;
};
