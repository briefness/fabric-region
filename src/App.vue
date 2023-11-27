<template>
    <div class="flex h-full">
      <!-- 工具图标库 -->
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
        <!-- 上传门店图 -->
        <Upload
            name="file"
            action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
            :showUploadList="false"
        >
            <Button type="primary" class="mr-10">
                上传门店图
            </Button>
        </Upload>
        <Button type="primary" @click="clearAllCanvasObject">
            清除所有对象
        </Button>
        <!-- 绘制图层 -->
        <canvas id="canvas" class="mt-20" />
      </div>
      <!-- 对象内容 -->
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
        <!-- UID信息表单 -->
        <AttributeForm v-if="selectedObject" style="margin-top: 20px" :uid="selectUid" @success="setObjectUid" />
      </div>
    </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, reactive, computed } from 'vue';
  import { Button, Upload } from 'ant-design-vue';
  import { fabric } from 'fabric';
  import logo from './assets/logo.png';
  import bgImage from './assets/bg.jpg';
  import { deleteControl } from './utils/customRender.ts';
  import AttributeForm from './components/AttributeForm.vue';

  // 选中的对象
  const selectedObject = ref(null);
  
  // fabric实例化对象
  // 这个不能使用响应式数据，否则会影响fabric的使用
  let fabricCanvas = null;

  // 拖拽的外部图片url
  const dropImgUrl = ref('');
  // 拖拽外部图片的坐标
  const targetImgCoord = ref({left: 0, top: 0});

  // 工具图标列表
  const toolIconList = ref<String[]>([]);

  // 被选中对象的uid
  const selectUid = computed(() => selectedObject.value?.get('uid') ?? '');
  
  onMounted(() => {
        for(let index = 400; index < 430; index++) {
            toolIconList.value.push(`https://nihaojob.github.io/vue-fabric-editor-static/svg/${index}.svg`);
        }

      initFabric();
      drawBg();
      addCanvasEvent();
      deleteControl(fabricCanvas);
  })
  
  // 初始化fabric对象
  const initFabric = () => {
    fabricCanvas = new fabric.Canvas('canvas');
    const img = new Image();
    img.src = bgImage;
    img.addEventListener('load', () => {
        fabricCanvas.setWidth(img.width);
        fabricCanvas.setHeight(img.height);
    });
  }

  // 绘制背景图片
  const drawBg = () => {
    fabric.Image.fromURL(bgImage, function(img) {
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas));
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
  // canvas添加事件
  const addCanvasEvent = () => {
      canvasObjectMoving();
      canvasObjectSelected();
      dropTool();
  }

  // 选中对象添加额外属性uid
  const setObjectUid = (uid: string) => {
    selectedObject.value?.set('uid', uid);
  }

  // canvas 的选中事件
  const canvasObjectSelected = () => {
    fabricCanvas.on('selection:created', function (options) {
        // 被选中的对象数据
        selectedObject.value = options.selected[0];
        console.log('选中对象1：', selectedObject.value);
    })
    fabricCanvas.on('selection:updated', function (options) {
        // 被选中的对象数据
        selectedObject.value = options.selected[0];
        console.log('选中对象2：', selectedObject.value);
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
    obj.scale(0.5);
    // 设置坐标
    obj.set({
        left: pointerVpt.x,
        top: pointerVpt.y,
        hasBorders: false,
    });
    forbidStretch(obj);
    fabricCanvas.add(obj);
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

  // 监控 fabricCanvas 的 moving 方法
  const canvasObjectMoving = () => {
      // 监控 fabricCanvas 的 moving 方法 , 判断是否移出 canvas 区域
      fabricCanvas.on('object:moving', function (options) {
        limitObjectArea(options)
        limitObjectIntersect(options);
      })
  }

  // 限制对象重叠时贴边
  const limitObjectIntersect = (options) => {
    // 目标对象
    const activeObject = options.target;
    activeObject.setCoords();
    // 目标对象的BoundingRect
    const activeObjectBoundingRect = activeObject.getBoundingRect();
    fabricCanvas.forEachObject(function(targ) {
        // 同一个对象则返回
        if (targ === activeObject) return;
        const targBoundingRect = targ.getBoundingRect();

        // 左侧6像素内直接吸附
        if (Math.abs(activeObject.oCoords.tr.x - targ.oCoords.tl.x) < 6) {
            activeObject.left = targ.left - activeObjectBoundingRect.width;
        }
        // 右侧6像素内直接吸附
        if (Math.abs(activeObject.oCoords.tl.x - targ.oCoords.tr.x) < 6) {
            activeObject.left = targ.left + targBoundingRect.width;
        }
        // 上侧6像素内直接吸附
        if (Math.abs(activeObject.oCoords.br.y - targ.oCoords.tr.y) < 6) {
            activeObject.top = targ.top - activeObjectBoundingRect.height;
        }
        // 下侧6像素内直接吸附
        if (Math.abs(targ.oCoords.br.y - activeObject.oCoords.tr.y) < 6) {
            activeObject.top = targ.top + targBoundingRect.height;
        }
    });
    // console.log(options, '=====')
    // // 目标对象
    // const activeObject = options.target;
    // // activeObject.setCoords();
    // // 目标对象的BoundingRect
    // const activeObjectBoundingRect = activeObject.getBoundingRect();
    // const movementX = activeObjectBoundingRect.left - optionsLeft;
    // const movementY = activeObjectBoundingRect.top - optionsTop;
    // optionsLeft = activeObjectBoundingRect.left;
    // optionsTop = activeObjectBoundingRect.top;
    // // 目标对象底部的距离
    // const activeObjectBottom = Math.abs(activeObjectBoundingRect.top + activeObjectBoundingRect.height);
    // // 目标对象右边的距离
    // const activeObjectRight = Math.abs(activeObjectBoundingRect.left + activeObjectBoundingRect.width);
    // // 循环所有对象
    // fabricCanvas.forEachObject((targ) => {
    //     const targBoundingRect = targ.getBoundingRect();
    //     // 同一个对象则返回
    //     if (targ === activeObject) return;
    //     const left = activeObjectBoundingRect.left;
    //     const top = activeObjectBoundingRect.top;
    //     // 重叠
    //     if (objectsCollide(activeObjectBoundingRect, targBoundingRect)) {
    //         // 对象底部的距离
    //         const targObjectBottom = Math.abs(targBoundingRect.top + targBoundingRect.height);
    //         // 对象右边的距离
    //         const targObjectRight = Math.abs(targBoundingRect.left + targBoundingRect.width);
    //         console.log(movementX, targObjectRight, activeObjectBoundingRect.left)
    //         if (!((targObjectRight >= activeObjectBoundingRect.left && movementX > -1))) {
    //             activeObject.left = left;
    //             activeObject.top = top;
    //         }
    //     }
    // });
};

  // 限制canvas对象的移动范围，不可移动出canvas
  const limitObjectArea = (options) => {
      // 获取对象的高度
      var optionsHeight = options.target.aCoords.br.y - options.target.aCoords.tr.y
      // 获取对象的宽度
      var optionsWidth = options.target.aCoords.br.x - options.target.aCoords.bl.x
      // 是否移动到左边界
      if (options.target.left < 0) {
        options.target.left = 0
      } else if (options.target.left + optionsWidth > fabricCanvas.width) {
        options.target.left = fabricCanvas.width - optionsWidth
      }
      // 是否移动到上边界
      if (options.target.top < 0) {
        options.target.top = 0
      } else if (options.target.top + optionsHeight > fabricCanvas.height) {
        options.target.top = fabricCanvas.height - optionsHeight
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
    link.download = 'canvas.png';
    // 模拟点击链接进行下载
    link.click();
  }

  // 保存为json
  const saveCanvasToJson = () => {
    console.log('canvas json格式：', fabricCanvas.toJSON(['uid']));
    console.log(JSON.stringify(fabricCanvas.toJSON(['uid'])));
    // fabricCanvas.clear();
    setTimeout(() => {
        // 根据保存的json字符串，重新渲染canvas，注意所有对象的事件都会清除，需要重新添加
        fabricCanvas.loadFromJSON(JSON.stringify(fabricCanvas.toJSON(['uid'])), fabricCanvas.renderAll.bind(fabricCanvas), function(o, object) {
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
    const fabricCanvasJsonString = JSON.stringify(fabricCanvas.toJSON(['uid']));
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
    /* .canvas-container {
        border: 1px solid blue;
        flex: 1;
        height: 100% !important;
    }
    .upper-canvas, .lower-canvas {
        width: 100% !important;
        height: 100% !important;
    } */
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
</style>
  