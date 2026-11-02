import { createApp } from 'vue';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.vue';
import { vReveal } from './lib/scroll.js';

// Automated screenshots run on a slow software renderer: show content instantly.
if (/[?&]capture\b/.test(location.search)) document.documentElement.classList.add('capture');

const app = createApp(App);
app.directive('reveal', vReveal);
app.mount('#app');
