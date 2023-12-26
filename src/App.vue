<template>
    <div>
        <!-- 绘制图层 -->
        <canvas id="canvas"/>
        <!-- UID信息表单，如果没有UID，则输入UID绑定对象保存，如果存在UID则调用接口获取UID的详细信息展示 -->
        <AttributeForm :modelVisible="visible" style="margin-top: 20px" :uid="selectUid" :type="selectType" @success="setObjectUid" @close="closeModel" />
    </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, reactive, computed, onUnmounted } from 'vue';
  import { Button, Upload, Progress } from 'ant-design-vue';
  import type { UploadChangeParam } from 'ant-design-vue';
  import { cloneDeep } from 'lodash-es';
  import { fabric } from 'fabric';
  import Hammer from 'hammerjs';
  import logo from './assets/logo.png';
  import bgImage from './assets/bg.jpg';
  import { deleteControl, rotationControl } from './utils/customRender.ts';
  import { scaleMark, initAligningGuidelines } from './utils/drawTools.ts';
  import { limitTextAngleOfGroup, limitObjectIntersect, limitObjectArea } from './utils/utils.ts';
  import AttributeForm from './components/AttributeForm.vue';

  // 选中的对象
  const selectedObject = ref(null);

  const visible = ref(false);

  // 记录上一次的画布zoom
  let lastZoom = 1;
  
  // fabric实例化对象
  // 这个不能使用响应式数据，否则会影响fabric的使用
  let fabricCanvas = null;
  let touchState: any = null
  // 初始zoom值
  const initZoom = ref(1);

  // 被选中对象的uid
  const selectUid = computed(() => selectedObject.value?.get('uid') ?? '');
  // 被选中对象的货架类型
  const selectType = computed(() => selectedObject.value?.get('goodsShelfType') ?? '');

  // 缩放百分比，默认100%
  const zoom = computed(() => `${Math.floor(initZoom.value * 100)}%`);
  
  onMounted(() => {
      initFabric();
      canvasObjectSelected();
      drawBg(bgImage);
      fabric.loadSVGFromURL('https://nihaojob.github.io/vue-fabric-editor-static/svg/400.svg', function(objects, options) {
        var obj = fabric.util.groupSVGElements(objects, options);
        // 设置缩放
        obj.scale(0.1);
        obj.set({
            originX: 'center',
            originY: 'center'
        })
        // 初始化空的文字，待后期修改
        const text = new fabric.Text('', {
            fontSize: 24,
            originX: 'center',
            originY: 'center'
        });
        // 创建工具和文字组
        const group = new fabric.Group([obj, text], {
            left: 20,
            top: 100,
            hasBorders: false, // 隐藏边框
            hasControls: false, // 禁止控制
            // selectable: false, // 禁止选中
        });
        fabricCanvas.add(group);
    });
    var hammer = new Hammer(document.querySelector('.canvas-container'));
    hammer.get('pinch').set({ enable: true });
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('pinch pan', function(ev) {
        // 缩放
        if (ev.type == 'pinch') {
            let zoom = fabricCanvas.getZoom();
            let zoomRatio = ev.scale / lastZoom;
            zoom *= zoomRatio;
            if (zoom > 6) zoom = 6;
            if (zoom < 0.01) zoom = 0.01;
            fabricCanvas.zoomToPoint(new fabric.Point(ev.center.x, ev.center.y), zoom);
            lastZoom = ev.scale;
        } else if (ev.type == 'pan') {
            const delta = new fabric.Point(ev.srcEvent.movementX, ev.srcEvent.movementY);
            fabricCanvas.relativePan(delta);
        }
    });
  })

  onUnmounted(() => {
    // 移除监听事件
    fabricCanvas.off('selection:updated');
    fabricCanvas.off('selection:created');
  })

  const closeModel = () => {
    visible.value = false;
  }

  
  // 初始化fabric对象
  const initFabric = () => {
    fabricCanvas = new fabric.Canvas('canvas');
    fabricCanvas.selection = false;
  }

  // 绘制背景图片
  const drawBg = (bgImageObj: string) => {
    // bgImage为图片路径
    fabric.Image.fromURL(bgImageObj, function(img) {
      // 设置背景图片，并设置其透明度
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), { opacity: 0.3 });
      const zoomValue = document.body.clientWidth / img.width;
      // 设置canvas的宽高
      fabricCanvas.setWidth(document.body.clientWidth);
      fabricCanvas.setHeight(img.height * zoomValue);
      console.log(zoomValue)
      fabricCanvas.setZoom(zoomValue)
    });
  }

  // 选中对象添加额外属性uid
  const setObjectUid = ({uid, type}) => {
    // 设置额外属性
    selectedObject.value?.set('uid', uid);
    selectedObject.value?.set('goodsShelfType', type);
    // 获取文本对象
    const text = selectedObject.value.item(1);
    text.set({
        text: type,
    })
    fabricCanvas.renderAll();
  }

  // canvas 的选中事件
  const canvasObjectSelected = () => {
    fabricCanvas.on('selection:created', function (options) {
        // 被选中的对象数据
        selectedObject.value = options.selected[0];
        visible.value = true;
        fabricCanvas.discardActiveObject();
    })
    fabricCanvas.on('selection:updated', function (options) {
        // 被选中的对象数据
        selectedObject.value = options.selected[0];
        visible.value = true;
        fabricCanvas.discardActiveObject();
    })
  }
</script>
<style>
    #app {
        height: 100%;
        padding: 0;
        margin: 0 !important;
    }
</style>
  