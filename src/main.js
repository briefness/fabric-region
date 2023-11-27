import { createApp } from 'vue'
import App from './App.vue'
import antDesignVue from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css'; // or 'ant-design-vue/dist/antd.less'
import './index.css'

createApp(App).use(antDesignVue).mount('#app')
