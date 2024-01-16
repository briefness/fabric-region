<template>
    <div class="flex h-full">
      <!-- 工具图标库 TODO: 可展开/收起 -->
      <div class="tool-content flex flex-wrap">
        <div class="tool-content-item" v-for="icon in toolIconList" :key="icon" draggable="true" v-on:dragstart="(e) => handleDrag(icon, e)">
            <img
                :src="icon"
                :alt="icon"
                style="width: 30px;"
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
        <Button type="primary" class="mr-10" @click="clearAllCanvasObject">
            清空
        </Button>
        <Button type="primary" class="mr-10" @click="deleteActiveObject">
            删除
        </Button>
        <Button type="primary" class="mr-10" :disabled="!canUndo" @click="undoOperate">
            撤销
        </Button>
        <Button type="primary" :disabled="!canRedo" @click="redoOperate">
            重做
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
        <!-- UID信息表单，如果没有UID，则输入UID绑定对象保存，如果存在UID则调用接口获取UID的详细信息展示 -->
        <AttributeForm
            v-if="selectedObject"
            style="margin-top: 20px"
            :uid="selectUid"
            :type="selectType"
            :angle="selectObjectAngle"
            @success="setObjectUid"
        />
      </div>
    </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, reactive, computed, onUnmounted } from 'vue';
  import { Button, Upload, Progress } from 'ant-design-vue';
  import type { UploadChangeParam } from 'ant-design-vue';
  import { cloneDeep } from 'lodash-es';
  import { fabric } from 'fabric';
  import './utils/history.ts';
  import logo from './assets/logo.png';
  import bgImage from './assets/bg.jpg';
  import tool_1 from './assets/1.jpg';
  import tool_2 from './assets/2.jpg';
  import { deleteControl, rotationControl } from './utils/customRender.ts';
  import { scaleMark, initAligningGuidelines } from './utils/drawTools.ts';
  import { limitTextAngleOfGroup, limitObjectIntersect, limitObjectArea, createGroup, dblclickEditing } from './utils/utils.ts';
  import AttributeForm from './components/AttributeForm.vue';

  // 选中的对象
  const selectedObject = ref(null);
  
  // fabric实例化对象
  // 基于现有fabric版本，因对响应式不友好，不建议把fabric的实例定义为响应式数据
  let fabricCanvas = null;
  // 历史记录事件
  const historyFn = ref(null)
  // 粘贴板上的canvas对象
  let clipboardCanvasObject = null;
  // 伸缩最小比例
  const expansionRatio = 0.01;
  // 是否可以撤销
  const canUndo = ref(true);
  // 是否可以重做
  const canRedo = ref(false);
  // 初始zoom值
  const initZoom = ref(1);
  // 拖拽的外部图片url
  const dropImgUrl = ref('');
  // 拖拽外部图片的坐标
  const targetImgCoord = ref({left: 0, top: 0});

  // 被选中对象的旋转角度
  const selectObjectAngle = ref(0);

  // 工具图标列表
  const toolIconList = ref<String[]>([tool_1, tool_2]);

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
      drawBg(bgImage);
      addCanvasEvent();
      addKeyEvent();
      dropTool();
    //   deleteControl(fabricCanvas);
      rotationControl();
      // 绘制对齐辅助线
      initAligningGuidelines(fabricCanvas);
  })

  onUnmounted(() => {
    // 移除监听事件
    fabricCanvas.off('selection:updated');
    fabricCanvas.off('selection:created');
    fabricCanvas.off('object:rotating');
    fabricCanvas.off('object:moving');
    fabricCanvas.off('drop');
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:up');
    fabricCanvas.off('before:render');
    fabricCanvas.off('after:render');
    document.removeEventListener('keydown', keydownHandle);
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
        // forbidStretch(object);
    });
  }
  
  // 初始化fabric对象
  const initFabric = () => {
    fabricCanvas = new fabric.Canvas('canvas');
    // fabricCanvas.selection = false;
    // 隐藏所有对象的控制点，只保留顶部旋转点
    ['tl', 'bl', 'tr', 'br', 'ml', 'mb', 'mr', 'mt'].forEach(e => {
        fabric.Object.prototype.controls[e] = new fabric.Control({
            render: () => null,
        });
    })
  }

  // 绘制背景图片
  const drawBg = (bgImageObj: string) => {
    // 绘制背景前清空画布
    // fabricCanvas.clear();
    // bgImage为图片路径
    fabric.Image.fromURL(bgImageObj, function(img) {
      // 设置背景图片，并设置其透明度
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), { opacity: 0.3 });
      // 设置canvas的宽高
      fabricCanvas.setWidth(img.width * initZoom.value);
      fabricCanvas.setHeight(img.height * initZoom.value);
      fabricCanvas.setZoom(initZoom.value);
      // 保存绘制背景图片的操作历史
      fabricCanvas._historySaveAction();
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

  // 键盘的keydown事件
  const keydownHandle = (e) => {
    // 不是操作canvas，则不需要响应canvas事件
    if (e.target.nodeName != 'BODY') {
        return;
    }
    keyboardUndo(e);
    const activeObject = fabricCanvas.getActiveObject()
    // 不存在选中的对象，则不处理
    if (!activeObject) {
        return;
    }
    copyAndPaste(activeObject, e);
    keyboardOperateObject(activeObject, e);
    keyboardDeleteActiveObject(e);
  }
  // 键盘方向键控制对象移动
  const keyboardOperateObject = (activeObject, e) => {
    const keyCode = e.keyCode; // 获取按下的键值
    if (keyCode > 36 && keyCode < 41) {
        // 阻止默认的滚动行为
        event.preventDefault();
        switch (keyCode) {
            case 37: // 左箭头键
                activeObject.left -= 1; // 向左移动1像素
                break;
            
            case 39: // 右箭头键
                activeObject.left += 1; // 向右移动1像素
                break;
                
            case 38: // 上箭头键
                activeObject.top -= 1; // 向上移动1像素
                break;
                
            case 40: // 下箭头键
                activeObject.top += 1; // 向下移动1像素
                break;
        }
        activeObject.setCoords();
        fabricCanvas.renderAll();
    }
  }
  // 粘贴和复制事件
  const copyAndPaste = (activeObject, e) => {
    // 按下ctrl+c，win+c, command+c, 时，复制
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        activeObject.clone(function(cloned) {
            console.log('点击了复制：', cloned);
            clipboardCanvasObject = cloned;
        });
    }
    // 按下ctrl+v，win+v, command+v时，粘贴
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardCanvasObject) {
        clipboardCanvasObject.clone(function(clonedObj) {
            fabricCanvas.discardActiveObject();
            console.log('点击了粘贴：', clonedObj);
            clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
            });
            // TODO: 框选多个复制后，操作撤销有问题
            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = fabricCanvas;
                clonedObj.forEachObject(function(obj) {
                    obj.hasBorders = false;
                    obj.on("mousedblclick", (options) => dblclickEditing(options, fabricCanvas));
                    // 临时方案，不保存进历史记录
                    // obj.set({ isDisabled: true })
                    fabricCanvas.offHistory();
                    fabricCanvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                clonedObj.hasBorders = false;
                clonedObj.on("mousedblclick", (options) => dblclickEditing(options, fabricCanvas));
                fabricCanvas.add(clonedObj);
            }
            clipboardCanvasObject.top += 10;
            clipboardCanvasObject.left += 10;
            fabricCanvas.setActiveObject(clonedObj);
            fabricCanvas.requestRenderAll();
        });
    }
  }
  // 键盘删除选中对象
  const keyboardDeleteActiveObject = (e) => {
    const keyCode = e.keyCode; // 获取按下的键值
    if (keyCode == 8) {
        deleteActiveObject();
    }
  }
  // 键盘撤销操作
  const keyboardUndo = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key == 'z') {
        fabricCanvas.undo();
    }
  }
  // 添加键盘事件
  const addKeyEvent = () => {
    // 监听键盘事件
    document.addEventListener('keydown', keydownHandle);
}
  // canvas添加事件（对象left和top的坐标是左上角）
  const addCanvasEvent = () => {
      canvasObjectMoving();
      canvasObjectRotating();
      canvasObjectSelected();
  }

  // 选中对象添加额外属性uid
  const setObjectUid = ({uid, type, angle}) => {
    // 设置额外属性
    selectedObject.value?.set('uid', uid);
    selectedObject.value?.set('goodsShelfType', type);
    selectObjectAngle.value = parseInt(angle, 10)
    // 设置旋转角度
    selectedObject.value?.set('angle', selectObjectAngle.value);
    // // 获取文本对象
    const text = selectedObject.value.item(1);
    text.set({
        angle: -selectObjectAngle.value,
    })
    fabricCanvas.renderAll();
  }

  // canvas 的选中事件
  const canvasObjectSelected = () => {
    fabricCanvas.on('selection:created', function (options) {
        console.log(options)
        if (options.selected?.length < 2) {
            // 被选中的对象数据
            selectedObject.value = options.selected[0];
            // 赋值 旋转角度
            selectObjectAngle.value = options.selected[0].angle;
            console.log('选中对象created：', selectedObject.value);
        }
        forbidStretch(options.selected?.length > 1);
    })
    fabricCanvas.on('selection:updated', function (options) {
        console.log(options)
        if (options.selected?.length < 2) {
            // 被选中的对象数据
            selectedObject.value = options.selected[0];
            // 赋值 旋转角度
            selectObjectAngle.value = options.selected[0].angle;
            console.log('选中对象updated：', selectedObject.value);
        }
        forbidStretch(options.selected?.length > 1);
    })
  }

  // 禁止拉伸宽高， 如果是框选的对个对象，则顶部旋转控制点也不显示
  const forbidStretch = (isGroup = false) => {
    fabric.Object.prototype.hasControls = !isGroup;
    fabric.Object.prototype.hasBorders = isGroup;
  };

  // 绘制图片
  const drawSvg = (pointerVpt) => {
    const isSvg = !(/\.jpg$/.test(dropImgUrl.value))
    if (isSvg) {
        fabric.loadSVGFromURL(dropImgUrl.value, function(objects, options) {
            var obj = fabric.util.groupSVGElements(objects, options);
            // 设置缩放
            obj.scale(0.1);
            obj.set({
                originX: 'center',
                originY: 'center'
            })
            // 初始化空的文字，待后期修改
            const text = new fabric.Textbox('', {
                fontSize: 24,
                originX: 'center',
                originY: 'center'
            });
            createGroup([obj, text], pointerVpt, fabricCanvas);
        });
    } else {
        fabric.util.loadImage(dropImgUrl.value, function(image) {
            var obj = new fabric.Image(image);
            obj.scale(0.1);
            obj.set({
                originX: 'center',
                originY: 'center'
            })
            // 初始化空的文字，待后期修改
            const text = new fabric.Textbox('', {
                fontSize: 24,
                originX: 'center',
                originY: 'center'
            });
            createGroup([obj, text], pointerVpt, fabricCanvas);
        })
    }
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
        // 绘制图片
        drawSvg(pointerVpt);
    })
  }

  // 监控 fabricCanvas 的 rotating 方法
  const canvasObjectRotating = () => {
    fabricCanvas.on('object:rotating', function (options) {
        console.log('旋转角度：', options.target.angle)
        // options.target.set({ isDisabled: false });
        fabricCanvas.onHistory();
        selectObjectAngle.value = options.target.angle;
        limitObjectArea(options)
        // limitObjectIntersect(options, fabricCanvas);
        limitTextAngleOfGroup(options);
      })
  }

  // 监控 fabricCanvas 的 moving 方法
  const canvasObjectMoving = () => {
      fabricCanvas.on('object:moving', function (options) {
        // options.target.set({ isDisabled: false });
        fabricCanvas.onHistory();
        limitObjectArea(options)
        limitObjectIntersect(options, fabricCanvas);
      })
  }

  // 导出为png图片
  const exportCanvasToPNG = () => {
    // 可以添加配置
    const option = {
      quality: 1,
    };
    // 深拷贝canvas，以达到不影响原画板的目的
    const fabricCanvasClone = cloneDeep(fabricCanvas);
    // 如果需要隐藏背景图导出，则使用此方法
    if (true) {
        fabricCanvasClone.setBackgroundImage(null);
    }
    // 如果canvas中存在跨域问题的图片链接，toDataURL会报错
    const dataUrl = fabricCanvasClone.toDataURL(option);

    // 创建一个链接元素
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = '店铺平面图.png';
    // 模拟点击链接进行下载
    link.click();
  }

  // 调用接口保存canvas信息
  const saveCanvasToJson = () => {
    console.log('canvas json格式：', fabricCanvas.toJSON(['uid', 'goodsShelfType']));
    console.log(JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType'])));
    // fabricCanvas.clear();
    // setTimeout(() => {
    //     // 根据保存的json字符串，重新渲染canvas，注意所有对象的事件都会清除，需要重新添加
    //     fabricCanvas.loadFromJSON(JSON.stringify(fabricCanvas.toJSON(['uid', 'goodsShelfType'])), fabricCanvas.renderAll.bind(fabricCanvas), function(o, object) {
    //         // 隐藏边框
    //         object.hasBorders = false;
    //         // 禁用拉伸
    //         forbidStretch(object);
    //     });
    // }, 3000);
    // TODO：调用接口保存此此json字符串
  }

  // 清除canvas上所有对象
  const clearAllCanvasObject = () => {
    selectedObject.value = null;
    clipboardCanvasObject = null;
    // 循环遍历所有对象
    fabricCanvas.forEachObject(function(targ) {
        // 移除对象
        fabricCanvas.remove(targ);
    });
  }

  // 上传文件转化为base64格式
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
  };

  // 上传背景图
  const uploadBgChange = async (info: UploadChangeParam) => {
    // 上传成功后，调用设置背景的方法即可
    if (info.file.status === 'done' || info.file.status === 'error') {
        const imgUrl = await getBase64(info.file.originFileObj);
        drawBg(imgUrl);
    }
  };

  // 手动背景图校准
  // 实现原理：手动设置canvas 的宽高和背景图的伸缩比例，以达到背景图可以伸缩，而其他对象不会跟随canvas一起伸缩的目标
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
  // 删除当前选中的对象
  const deleteActiveObject = () => {
    const activeObject = fabricCanvas.getActiveObjects();
    if (activeObject) {
      activeObject.map((item) => fabricCanvas.remove(item));
      fabricCanvas.requestRenderAll();
      fabricCanvas.discardActiveObject();
      selectedObject.value = null;
    }
  }

  // 撤销
  const undoOperate = () => {
    fabricCanvas.undo()
    canUndo.value = fabricCanvas.canUndo();
    canRedo.value = fabricCanvas.canRedo();
  }
  // 重做
  const redoOperate = () => {
    fabricCanvas.redo()
    canUndo.value = fabricCanvas.canUndo();
    canRedo.value = fabricCanvas.canRedo();
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
  