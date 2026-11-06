import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import de from 'element-plus/es/locale/lang/de';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';
import 'virtual:svg-icons-register';

import App from './App.vue';
import router from './router';
import '@/styles/index.scss';

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component);
}

app.use(router);
app.use(ElementPlus, { locale: de });

/** 全站禁用浏览器右键菜单（避免与测区绘制右键结束冲突） */
document.addEventListener('contextmenu', (event) => {
	event.preventDefault();
});

app.mount('#app');
