import { ref, watch } from 'vue';

/**
 * Colour theme: light (default, same tokens as FlightHub Keyless) or dark (original look).
 * Sets data-theme on <html> (own variables) and the class "dark" (Element Plus dark variables).
 */
const KEY = 'planar.theme';
const initial = (() => {
	try {
		return localStorage.getItem(KEY) === 'dark';
	} catch {
		return false;
	}
})();

export const darkTheme = ref(initial);

function apply(dark: boolean): void {
	const html = document.documentElement;
	html.dataset.theme = dark ? 'dark' : 'light';
	html.classList.toggle('dark', dark);
}

apply(initial);
watch(darkTheme, (dark) => {
	apply(dark);
	try {
		localStorage.setItem(KEY, dark ? 'dark' : 'light');
	} catch {
		/* storage unavailable */
	}
});
