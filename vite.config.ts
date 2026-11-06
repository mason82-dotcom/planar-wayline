import { defineConfig, loadEnv, type UserConfig, type ConfigEnv } from 'vite';
import { resolve, basename } from 'path';
import { readdirSync, readFileSync } from 'fs';
import type { Plugin } from 'vite';
import Vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import cesium from 'vite-plugin-cesium';

const root = process.cwd();

/**
 * Ersatz für vite-plugin-svg-icons (unbetreut, zieht verwundbare Abhängigkeiten nach sich):
 * `virtual:svg-icons-register` hängt ein verstecktes SVG-Sprite mit `<symbol id="icon-NAME">`
 * für jede Datei in `iconDir` an das Dokument an.
 */
function svgSpritePlugin(iconDir: string): Plugin {
	const virtualId = 'virtual:svg-icons-register';
	const resolvedId = '\0' + virtualId;
	const buildSprite = () =>
		readdirSync(iconDir)
			.filter((file) => file.endsWith('.svg'))
			.sort()
			.map((file) => {
				const svg = readFileSync(resolve(iconDir, file), 'utf8').replace(/<\?xml[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '');
				const open = svg.match(/<svg\b[^>]*>/i);
				if (!open) return '';
				const viewBox = open[0].match(/viewBox="([^"]+)"/i)?.[1] ?? '0 0 24 24';
				const inner = svg.slice(svg.indexOf(open[0]) + open[0].length, svg.lastIndexOf('</svg>'));
				return `<symbol id="icon-${basename(file, '.svg')}" viewBox="${viewBox}">${inner}</symbol>`;
			})
			.join('');
	return {
		name: 'local-svg-sprite',
		resolveId: (id) => (id === virtualId ? resolvedId : undefined),
		load(id) {
			if (id !== resolvedId) return undefined;
			const sprite = JSON.stringify(`<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true">${buildSprite()}</svg>`);
			return `const mount = () => document.body.insertAdjacentHTML('afterbegin', ${sprite});
if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
export default {};`;
		},
	};
}

function pathResolve(dir: string) {
	return resolve(root, '.', dir);
}

export default ({ command, mode }: ConfigEnv): UserConfig => {
	const isBuild = command === 'build';
	const env = loadEnv(isBuild ? mode : process.argv[3] === '--mode' ? process.argv[4] : process.argv[3] || mode, root);

	return {
		base: env.NODE_ENV === 'development' ? '/' : './',
		root,
		build: {
			outDir: env.VITE_OUT_DIR || 'dist',
			sourcemap: env.VITE_SOURCEMAP === 'true',
		},
		server: {
			port: Number(env.VITE_PORT) || 5180,
			host: '0.0.0.0',
			open: env.VITE_OPEN === 'true',
		},
		plugins: [
			Vue(),
			cesium(),
			AutoImport({
				imports: ['vue', 'vue-router'],
				dts: 'src/types/auto-imports.d.ts',
				resolvers: [ElementPlusResolver()],
			}),
			Components({
				dts: 'src/types/auto-components.d.ts',
				resolvers: [ElementPlusResolver()],
				globs: ['src/components/**/**.{vue,md}'],
			}),
			svgSpritePlugin(pathResolve('src/assets/yawSvg')),
		],
		resolve: {
			alias: [
				{
					find: /\@\//,
					replacement: `${pathResolve('src')}/`,
				},
			],
			dedupe: ['cesium'],
		},
	};
};
