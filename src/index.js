import Region from './App.vue'
export default Region
if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.component('fabric-region', Region)
}
