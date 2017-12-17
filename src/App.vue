<template>
  <div id="app">
    <div style="overflow: hidden;">
      <div class="region-container">
        <canvas id="myCanvas"></canvas>
      </div>
      <div :style="{'margin-left':fabricCanvasWidth}">
         <p v-for="(info,index) in objectInfo" :key="index" :class="{selectedObject: info.selected}">{{info.id}}</p>
      </div>
    </div>
  </div>
</template>

<script>
import Fabric from 'fabric'
export default {
  name: 'app',
  props: {
    // 背景图片路径
    regionImg: {
      type: String,
      required: false,
      default: require('./assets/pxh1.jpg')
    },
    // 绘制对象的width
    regionWidth: {
      type: Number,
      required: false,
      default: 100
    },
    // 绘制对象的height
    regionHeight: {
      type: Number,
      required: false,
      default: 100
    },
    // canvas的宽度
    canvasWidth: {
      type: Number,
      required: false,
      default: 0
    },
    // deleteObjectType 为 all ，表示双击删除对象和点击delete键删除对象，同时存在
    // deleteObjectType 为 dbClick ，表示双击删除对象
    // deleteObjectType 为 delete ，表示点击delete键删除对象
    deleteObjectType: {
      type: String,
      required: false,
      default: 'all'
    }
  },
  data () {
    return {
      fabricCanvas: '',
      imgScale: 1,
      order: 0,
      objectInfo: [],
      fabricCanvasWidth: 0
    }
  },
  watch: {
  },
  components: {
  },
  mounted () {
    this.fabricCanvas = this.__canvas = new Fabric.fabric.Canvas('myCanvas')
    this.drawRegionImg()
  },
  methods: {
    // 绘制框选所需的背景图
    drawRegionImg () {
      // 创建图片对象
      var img = new Image()
      // 获取图片对象src
      img.src = this.regionImg
      // 监听图像是否加载完毕'
      var that = this
      img.addEventListener('load', function () {
        that.setCanvas(that, img)
        // 绘制背景图，scaleY和 scaleX是纵横缩放比例
        that.fabricCanvas.setBackgroundImage(img.src, that.fabricCanvas.renderAll.bind(that.fabricCanvas), {
          scaleY: that.imgScale,
          scaleX: that.imgScale
        })
        that.addCanvasEvent(that)
      })
    },
    // 设置当前canvas的宽高
    setCanvas (that, img) {
      // 初始化图片宽度
      var imgWidth = img.width
      // 初始化图片高度
      var imgHeight = img.height
      // 初始化缩放比例，默认为 1
      that.imgScale = 1
      // 判断是否存在canvas的宽度，若存在则等比缩放img
      if (that.canvasWidth !== 0) {
        imgWidth = that.canvasWidth
        // 计算当前缩放比例
        that.imgScale = (imgWidth / imgWidth).toFixed(2)
        // 根据缩放比例，计算img的高度
        imgHeight = imgHeight * that.imgScale
      }
      that.fabricCanvasWidth = imgWidth + 'px'
      // 设置canvas的宽高
      that.fabricCanvas.setHeight(imgHeight)
      that.fabricCanvas.setWidth(imgWidth)
    },
    // canvas添加事件
    addCanvasEvent (that) {
      that.canvasMouseDown(that)
      that.canvasObjectMoving(that)
      // deleteObjectType 为 all ，表示双击删除对象和点击delete键删除对象，同时存在
      // deleteObjectType 为 dbClick ，表示双击删除对象
      // deleteObjectType 为 delete ，表示点击delete键删除对象
      if (that.deleteObjectType === 'all' || that.deleteObjectType === 'dbClick') {
        // 双击删除对象
        that.dbClickDeleteObject(that)
      }
    },
    // 监控 fabricCanvas 的 moving 方法
    canvasObjectMoving (that) {
      // 监控 fabricCanvas 的 moving 方法 , 判断是否移出 canvas 区域
      that.fabricCanvas.on('object:moving', function (options) {
        that.limitObjectArea(that, options)
      })
    },
    // fabric的mouse：down方法
    canvasMouseDown (that) {
      that.fabricCanvas.on('mouse:down', function (options) {
        // 判断是否点击在已绘制的对象上面， null为未在对象上
        if (options.target === null) {
          that.addCanvasObject(that, options)
        } else {
          // 单击选中对象
          that.selectedObject(that, options)
          // 点击delete键删除对象
          if (that.deleteObjectType === 'all' || that.deleteObjectType === 'delete') {
            that.removeObject(that, options)
          }
        }
      })
    },
    // 选中canvas中的对象
    selectedObject (that, options) {
      var length = that.objectInfo.length
      // 当前选中target的下标
      var currentIndex = 0
      for (let index = 0; index < length; index++) {
        that.objectInfo[index].selected = false
        if (that.objectInfo[index].id === options.target.id) {
          currentIndex = index
        }
      }
      that.objectInfo[currentIndex].selected = true
    },
    // 双击删除对象
    dbClickDeleteObject (that) {
      that.fabricCanvas.on('mouse:dblclick', function (options) {
        that.fabricCanvas.remove(options.target)
      })
    },
    // 点击delete键删除对象
    removeObject (that, option) {
      // 监控页面的键盘事件
      document.onkeydown = function (e) {
        // 是否点击delete
        if (e.keyCode === 8) {
          // 移除当前所选对象
          that.fabricCanvas.remove(option.target)
        }
      }
    },
    // 绘制canvas上的对象
    addCanvasObject (that, options) {
      // 初始化框选区域的宽高
      var regionWidth = that.regionWidth
      var regionHeight = that.regionHeight
      // 创建矩形区域
      var rect = new Fabric.fabric.Rect({
        width: regionWidth,
        height: regionHeight,
        fill: 'rgba(255, 255, 255, 0.6)',
        left: options.e.layerX,
        top: options.e.layerY
      })
      that.order += 1
      // 创建对象的ID
      rect.toObject = (function (toObject) {
        return function () {
          return Fabric.fabric.util.object.extend(
            toObject.call(this),
            {
              id: this.id
            }
          )
        }
      })(rect.toObject)
      // 设置对象的ID
      rect.id = that.order
      var objectInfoJson = {'id': rect.id, 'selected': false}
      that.objectInfo.push(objectInfoJson)
      // 将对象添加到 fabricCanvas
      that.fabricCanvas.add(rect)
    },
    // 限制canvas对象的移动范围，不可移动出canvas
    limitObjectArea (that, options) {
      // 获取canvas节点
      var canvas = document.getElementById('myCanvas')
      // 获取对象的高度
      var optionsHeight = options.target.aCoords.br.y - options.target.aCoords.tr.y
      // 获取对象的宽度
      var optionsWidth = options.target.aCoords.br.x - options.target.aCoords.bl.x
      // 是否移动到左边界
      if (options.target.left < 0) {
        options.target.left = 0
      } else if (options.target.left + optionsWidth > canvas.width) {
        options.target.left = canvas.width - optionsWidth
      }
      // 是否移动到上边界
      if (options.target.top < 0) {
        options.target.top = 0
      } else if (options.target.top + optionsHeight > canvas.height) {
        options.target.top = canvas.height - optionsHeight
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .region-container {
    float: left;
  }
  .selectedObject {
    color: red;
  }
</style>

