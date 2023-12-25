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
  import logo from './assets/logo.png';
  import bgImage from './assets/bg.jpg';
  import { deleteControl, rotationControl } from './utils/customRender.ts';
  import { scaleMark, initAligningGuidelines } from './utils/drawTools.ts';
  import { limitTextAngleOfGroup, limitObjectIntersect, limitObjectArea } from './utils/utils.ts';
  import AttributeForm from './components/AttributeForm.vue';

  // 选中的对象
  const selectedObject = ref(null);

  const visible = ref(false);
  
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
    document.addEventListener('touchstart', updateTouchState, false)

    document.addEventListener('touchmove', updateTouchEndState, false)

    document.addEventListener('touchend', updateTouchEnd, false)
  })

  onUnmounted(() => {
    // 移除监听事件
    fabricCanvas.off('selection:updated');
    fabricCanvas.off('selection:created');
    document.removeEventListener('touchstart', updateTouchState, false)

    document.removeEventListener('touchmove', updateTouchEndState, false)

    document.removeEventListener('touchend', updateTouchEnd, false)
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

  const updateTouchState = (evt) => {
    touchState = {
        startX: evt.touches[0].pageX,
        startY: evt.touches[0].pageY,
        endX: evt.touches[0].pageX,
        endY: evt.touches[0].pageY,
        startX2: evt.touches[1] ? evt.touches[1].pageX : -1,
        startY2: evt.touches[1] ? evt.touches[1].pageY: -1,
        endX2: evt.touches[1] ? evt.touches[1].pageX : -1,
        endY2: evt.touches[1] ? evt.touches[1].pageY : -1
    }
  }

  const updateTouchEndState = (evt) => {
    if (touchState === null) {
        return
    }
    touchState.endX = evt.touches[0].pageX
    touchState.endY = evt.touches[0].pageY
    touchState.endX2 = evt.touches[1] ? evt.touches[1].pageX : -1
    touchState.endY2 = evt.touches[1] ? evt.touches[1].pageY : -1
  }

  const updateTouchEnd = (evt) => {
    if (touchState === null) {
        return
    }
    // 计算两点的距离
    const getDistance = function (startX, startY, endX, endY) {
        return Math.hypot(endX - startX, endY - startY)
    }
    if (touchState.startX2 !== -1 && touchState.endX2 !== -1 && touchState.startY2 != -1 && touchState.endY2 !== -1) {
        let distanceStart = getDistance(touchState.startX, touchState.startY, touchState.startX2, touchState.startY2)
        let distanceEnd = getDistance(touchState.endX, touchState.endY, touchState.endX2, touchState.endY2);
        //起始时两点距离和结束时两点距离进行比较，判断是放大还是缩小
        if(distanceStart < distanceEnd) {
            console.log('放大')
        }else if (distanceStart > distanceEnd) {
            console.log('缩小')
        }
    }
  }
</script>
<style>
    #app {
        height: 100%;
        padding: 0;
        margin: 0 !important;
    }
</style>
  