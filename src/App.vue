<template>
    <div class="flex h-full">
      <!-- 工具图标库 TODO: 可展开/收起 -->
      <div class="tool-content flex flex-wrap">
        <div class="tool-content-item" v-for="icon in toolIconList" :key="icon" draggable="true" v-on:dragstart="(e) => handleDrag(icon, e)">
            <img
                :src="icon"
                :alt="icon"
                style="width: 30px; height: 30px;"
                class="pointer"
            />
        </div>
      </div>
      <!-- 绘制区 -->
      <div>
        <!-- 上传门店图，TODO: 需要限制只能上传图片 -->
        <Upload
            name="file"
            action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
            :showUploadList="false"
            @change="uploadBgChange"
        >
            <Button type="primary" class="mr-10">
                上传门店图
            </Button>
        </Upload>
        <Button type="primary" @click="clearAllCanvasObject">
            清空
        </Button>
        <div class="flex item-center justify-center">
            <Button type="primary" @click="canvasSetZoom('sub')" class="mr-10"> - </Button>
            <Progress
                stroke-color="#ccc"
                :showInfo="false"
                :percent="initZoom * 10"
            />
            <span class="mr-10">{{ zoom }}</span>
            <Button type="primary" @click="canvasSetZoom('add')"> + </Button>
        </div>
        <!-- 绘制图层 -->
        <canvas id="canvas" class="mt-20" />
      </div>
      <!-- 对象内容 TODO: 可展开/收起-->
      <div>
        <Button type="primary" class="mr-10" @click="exportCanvasToPNG">
            导出为png
        </Button>
        <Button type="primary" class="mr-10" @click="saveCanvasToJson">
            保存为json
        </Button>
        <Button type="primary" @click="save">
            保存
        </Button>
        <!-- UID信息表单，如果没有UID，则输入UID绑定对象保存，如果存在UID则调用接口获取UID的详细信息展示 -->
        <AttributeForm v-if="selectedObject" style="margin-top: 20px" :uid="selectUid" :type="selectType" @success="setObjectUid" />
      </div>
    </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, reactive, computed } from 'vue';
  import { Button, Upload, Progress } from 'ant-design-vue';
  import { fabric } from 'fabric';
  import logo from './assets/logo.png';
  import bgImage from './assets/bg.jpg';
  import { deleteControl, scaleMark, rotationControl } from './utils/customRender.ts';
  import AttributeForm from './components/AttributeForm.vue';

  // 选中的对象
  const selectedObject = ref(null);
  
  // fabric实例化对象
  // 这个不能使用响应式数据，否则会影响fabric的使用
  let fabricCanvas = null;
  // 伸缩最小比例
  const expansionRatio = 0.01;
  // 初始zoom值
  const initZoom = ref(1);
  // 拖拽的外部图片url
  const dropImgUrl = ref('');
  // 拖拽外部图片的坐标
  const targetImgCoord = ref({left: 0, top: 0});

  // 工具图标列表
  const toolIconList = ref<String[]>([]);

  // 被选中对象的uid
  const selectUid = computed(() => selectedObject.value?.get('uid') ?? '');
  // 被选中对象的货架类型
  const selectType = computed(() => selectedObject.value?.get('goodsShelfType') ?? '');

  // 缩放百分比，默认100%
  const zoom = computed(() => `${Math.floor(initZoom.value * 100)}%`);
  
  onMounted(() => {
        // 工具库
        for(let index = 400; index < 430; index++) {
            toolIconList.value.push(`https://nihaojob.github.io/vue-fabric-editor-static/svg/${index}.svg`);
        }

      initFabric();
      drawBg();
      addCanvasEvent();
      dropTool();
      deleteControl(fabricCanvas);
      rotationControl();
  })

  // 重绘canvas，通过接口返回的canvas json数据
  const reDrawFromCanvasJson = () => {
    // 1. 请求接口，获取保存的canvas json数据
    const canvasJson = JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType']))
    // 2. 根据保存的json字符串，重新渲染canvas，注意所有对象的事件都会清除，需要重新添加
    fabricCanvas.loadFromJSON(canvasJson, fabricCanvas.renderAll.bind(fabricCanvas), function(o, object) {
        // 隐藏边框
        object.hasBorders = false;
        // 禁用拉伸
        forbidStretch(object);
    });
  }
  
  // 初始化fabric对象
  const initFabric = () => {
    fabricCanvas = new fabric.Canvas('canvas');
    fabricCanvas.selection = false;
  }

  // 绘制背景图片
  const drawBg = () => {
    // bgImage为图片路径
    fabric.Image.fromURL(bgImage, function(img) {
      // 设置背景图片，并设置其透明度
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), { opacity: 0.3 });
      // 设置canvas的宽高
      fabricCanvas.setWidth(img.width);
      fabricCanvas.setHeight(img.height);
      // 绘制刻度线
    //   scaleMark(fabricCanvas);
    });
  }

  // 拖拽tool icon
  const handleDrag = (img, ev) => {
    // 保存工具icon的坐标（鼠标相对icon的坐标）
    targetImgCoord.left = ev.offsetX;
    targetImgCoord.top = ev.offsetY;
    // 保存 icon的 url
    dropImgUrl.value = img;
  }
  // canvas添加事件（对象left和top的坐标是左上角）
  const addCanvasEvent = () => {
      canvasObjectMoving();
      canvasObjectRotating();
      canvasObjectSelected();
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
        console.log('选中对象：', selectedObject.value);
    })
    fabricCanvas.on('selection:updated', function (options) {
        // 被选中的对象数据
        selectedObject.value = options.selected[0];
        console.log('选中对象：', selectedObject.value);
    })
  }

  // 禁止拉伸宽高
  const forbidStretch = (obj) => {
    ['tl', 'bl', 'tr', 'br', 'ml', 'mb', 'mr', 'mt'].forEach(element => {
        obj.setControlVisible(element, false);
    });
  };

  // 绘制svg
  const drawSvg = (pointerVpt) => {
    fabric.loadSVGFromURL(dropImgUrl.value, function(objects, options) {
        var obj = fabric.util.groupSVGElements(objects, options);
        // 设置缩放
        obj.scale(0.1);
        obj.set({
            originX: 'center',
            originY: 'center'
        })
        // 初始化空的文字，带后期修改
        const text = new fabric.Text('', {
            fontSize: 24,
            originX: 'center',
            originY: 'center'
        });
        // 创建工具和文字组
        const group = new fabric.Group([obj, text], {
            left: pointerVpt.x,
            top: pointerVpt.y,
            // borderColor: 'red',
            hasBorders: false,
        });
        forbidStretch(group);
        fabricCanvas.add(group);
    });

  }

  // 拖拽外部图片到canvas进行绘制
  const dropTool = () => {
    fabricCanvas.on('drop', function (options) {
        const offset = {
            left: fabricCanvas.getSelectionElement().getBoundingClientRect().left,
            top: fabricCanvas.getSelectionElement().getBoundingClientRect().top
        }

            // 鼠标坐标转换成画布的坐标（未经过缩放和平移的坐标）
        const point = {
            x: options.e.x - offset.left - targetImgCoord.left,
            y: options.e.y - offset.top - targetImgCoord.top,
        }

        // 转换后的坐标，restorePointerVpt 不受视窗变换的影响
        const pointerVpt = fabricCanvas.restorePointerVpt(point);
        // 这个是绘制SVG的，如果要绘制图片，用下面注释的方法
        drawSvg(pointerVpt);
    //     const img = new Image();
    //     img.src = dropImgUrl.value;
    //     img.addEventListener('load', () => {
    //       const imag = fabric.Image(img);
    //       imag.set({
    //         left: pointerVpt.x,
    //         top: pointerVpt.y,
    //       })
    //       fabricCanvas.add(imag);
    //   });
        // console.log(dropImgUrl.value, '======')
        // fabric.util.loadImage(dropImgUrl.value, function(image) {
        //     console.log(image, '-----image')
        //     var object = new fabric.Image(image);
        //     object.set({
        //         left: pointerVpt.x,
        //         top: pointerVpt.y,
        //     });
        //     console.log(object, '======object')
        //     fabricCanvas.add(object);

        // }, {
        //     crossOrigin: 'anonymous'
        // })

        // const image = new Image();
        // image.setAttribute('crossOrigin', 'anonymous');
        // image.src = dropImgUrl.value;
        // const fabricImage = new fabric.Image(image, {
        //     left: pointerVpt.x,
        //     top: pointerVpt.y,
        // })
        // fabricCanvas.add(fabricImage);
    })
  }

  // 监控 fabricCanvas 的 rotating 方法
  const canvasObjectRotating = () => {
    fabricCanvas.on('object:rotating', function (options) {
        limitObjectArea(options)
        limitObjectIntersect(options);
        limitTextAngleOfGroup(options);
      })
  }

  // 监控 fabricCanvas 的 moving 方法
  const canvasObjectMoving = () => {
      fabricCanvas.on('object:moving', function (options) {
        limitObjectArea(options)
        limitObjectIntersect(options);
      })
  }

  // 限制group中的文本对象跟随group一起旋转
  const limitTextAngleOfGroup = (options) => {
    // 获取group对象
    const activeObject = options.target;
    // 获取文本对象
    const text = activeObject.item(1);
    // 设置文本对象的旋转角度
    text.set({ angle: -activeObject.angle });
  }

  // 对象临近时贴边，但不会限制重叠
  const limitObjectIntersect = (options) => {
    // 移动对象
    const activeObject = options.target;
    // 吸附像素（6像素内自动吸附，可调节）
    const adsorbpPixel = 6;
    activeObject.setCoords();
    fabricCanvas.forEachObject((targ) => {
        // 不对刻度线做吸附操作
        // if (targ.type === 'line') return;
        // 同一个对象则返回
        if (targ === activeObject) return;
        const targBoundingRect = targ.getBoundingRect();
        // 左侧6像素内直接吸附
        const leftPixel = targBoundingRect.left - (activeObject.getBoundingRect().left + activeObject.getBoundingRect().width);
        if (leftPixel < adsorbpPixel && leftPixel > 0) {
            activeObject.left = Math.max(activeObject.left + leftPixel, targBoundingRect.left - activeObject.getBoundingRect().width);
        }
        // 右侧6像素内直接吸附
        const rightPixel = activeObject.getBoundingRect().left - (targBoundingRect.left + targBoundingRect.width);
        if (rightPixel < adsorbpPixel && rightPixel > 0) {
            activeObject.left = Math.max(activeObject.left - rightPixel, targBoundingRect.left + targBoundingRect.width);
        }
        // 上侧6像素内直接吸附
        const topPixel = targBoundingRect.top - (activeObject.getBoundingRect().top + activeObject.getBoundingRect().height);
        if (topPixel < adsorbpPixel && topPixel > 0) {
            activeObject.top = Math.max(activeObject.top + topPixel, targBoundingRect.top - activeObject.getBoundingRect().height);
        }
        // 下侧6像素内直接吸附
        const bottomPixel = activeObject.getBoundingRect().top - targBoundingRect.height - targBoundingRect.top;
        if (bottomPixel < adsorbpPixel && bottomPixel > 0) {
            activeObject.top = Math.max(activeObject.top - bottomPixel, targBoundingRect.height + targBoundingRect.top);
        }
    });
};

  // 限制canvas对象的移动范围，不可移动出canvas
  const limitObjectArea = (options) => {
    // 当前对象
    const activeObject = options.target;
    // 判断对象是否过大，超出canvas
    if (activeObject.height > activeObject.canvas.height || activeObject.width > activeObject.canvas.width) {
        return;
    }
    activeObject.setCoords();
    // 判断上边界和左边界
    if (activeObject.getBoundingRect().top < 0 || activeObject.getBoundingRect().left < 0) {
        activeObject.top = Math.max(activeObject.top, activeObject.top - activeObject.getBoundingRect().top);
        activeObject.left = Math.max(activeObject.left, activeObject.left - activeObject.getBoundingRect().left);
    }
    // 判断下边界和右边界
    if (activeObject.getBoundingRect().top + activeObject.getBoundingRect().height > activeObject.canvas.height || activeObject.getBoundingRect().left + activeObject.getBoundingRect().width > activeObject.canvas.width) {
        activeObject.top = Math.min(activeObject.top, activeObject.canvas.height - activeObject.getBoundingRect().height + activeObject.top - activeObject.getBoundingRect().top);
        activeObject.left = Math.min(activeObject.left, activeObject.canvas.width - activeObject.getBoundingRect().width + activeObject.left - activeObject.getBoundingRect().left);
    }
  }

  // 导出为png图片
  const exportCanvasToPNG = () => {
    // 可以添加配置
    const option = {
      quality: 1,
    };
    // 如果canvas中存在跨域问题的图片链接，toDataURL会报错
      const dataUrl = fabricCanvas.toDataURL(option);

    // 创建一个链接元素
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = '店铺平面图.png';
    // 模拟点击链接进行下载
    link.click();
  }

  // 保存为json
  const saveCanvasToJson = () => {
    console.log('canvas json格式：', fabricCanvas.toJSON(['uid', 'goodsShelfType']));
    console.log(JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType'])));
    // fabricCanvas.clear();
    setTimeout(() => {
        // 根据保存的json字符串，重新渲染canvas，注意所有对象的事件都会清除，需要重新添加
        fabricCanvas.loadFromJSON(JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType'])), fabricCanvas.renderAll.bind(fabricCanvas), function(o, object) {
            // 隐藏边框
            object.hasBorders = false;
            // 禁用拉伸
            forbidStretch(object);
        });
    }, 3000);
  }

  // 调用接口保存canvas信息
  const save = () => {
    // canvas对象的json字符串
    const fabricCanvasJsonString = JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType']));
    // TODO：调用接口保存此此json字符串
    console.log('canvas json字符串：', fabricCanvasJsonString)
  }

  // 清除canvas上所有对象
  const clearAllCanvasObject = () => {
    // 循环遍历所有对象
    fabricCanvas.forEachObject(function(targ) {
        // 移除对象
        fabricCanvas.remove(targ);
    });
  }

  // 上传背景图
  const uploadBgChange = () => {
    // 上传成功后，调用设置背景的方法即可
  }

  // 手动背景图校准
  // 实现原理：手动设置canvas 的宽高和背景图的伸缩比例，已达到背景图可以伸缩，而其他对象不会跟随canvas一起伸缩的目标
  const canvasSetZoom = (type) => {
    if (type === 'add') {
        // 设置画布当前缩放级别
        initZoom.value += expansionRatio;
    } else {
        // 设置画布当前缩放级别
        initZoom.value -= expansionRatio;
    }
    // 获取背景图片对象
    const bgImg = fabricCanvas.backgroundImage;
    // 设置 canvas 的宽高
    fabricCanvas.setWidth(bgImg.width * initZoom.value);
    fabricCanvas.setHeight(bgImg.height * initZoom.value);
    // 背景图片伸缩
    bgImg.scaleX = bgImg.scaleY = initZoom.value;
    fabricCanvas.renderAll();
  }
</script>
<style>
    #app {
        height: 100%;
        padding: 30px;
        margin: 0 !important;
    }
    .flex {
        display: flex;
        align-content: flex-start;
    }
    .item-center {
        align-items: center;
    }
    .justify-center {
        justify-content: center;
    }
    .flex-wrap {
        flex-wrap: wrap;
    }
    .h-full {
        height: 100%;
    }
    .mt-20 {
        margin-top: 20px;
    }
    .mr-10 {
        margin-right: 10px;
    }
    .pointer {
        cursor: pointer;
    }
    .tool-content {
        width: 282px;
        height: 100%;
        margin-right: 30px;
        border: 1px solid #ccc;
        padding: 10px;
    }
    .tool-content-item {
        width: 50px;
        height: 50px;
        text-align: center;
        line-height: 50px;
        background-color: #ddd;
        margin-right: 2px;
        margin-bottom: 6px;
    }
    .ant-progress-line {
        width: 40% !important;
    }
</style>
  