import { fabric } from 'fabric';
// 限制group中的文本对象跟随group一起旋转
export function limitTextAngleOfGroup(options) {
    // 获取group对象
    const activeObject = options.target;
    // 获取文本对象
    const text = activeObject.item(1);
    // 设置文本对象的旋转角度
    text.set({ angle: -activeObject.angle });
  }

  // 判断两个对象是否临近
  // 原理：通过两个对象的中心点距离进行判断
  function centerPointNear(target, active) {
    const targetCenterPoint = target.getCenterPoint();
    const activeCenterPoint = active.getCenterPoint();
    const targetWidth = target.getBoundingRect().width;
    const targetHeight = target.getBoundingRect().height;
    const activeWidth = active.getBoundingRect().width;
    const activeHeight = active.getBoundingRect().height;
    const widthX = (targetWidth + activeWidth) / 2;
    const heightY = (targetHeight + activeHeight) / 2;
    const objectCenterPointDistanceX = activeCenterPoint.x - targetCenterPoint.x;
    const objectCenterPointDistanceY = activeCenterPoint.y - targetCenterPoint.y;
    return (objectCenterPointDistanceX < widthX && objectCenterPointDistanceX > -widthX) || (objectCenterPointDistanceY < heightY && objectCenterPointDistanceY > -heightY);
  }

  // 对象临近时贴边，但不会限制重叠
  export function limitObjectIntersect(options, fabricCanvas) {
    // 移动对象
    const activeObject = options.target;
    // 吸附像素（6像素内自动吸附，可调节）
    const adsorbpPixel = 6;
    // activeObject.setCoords();
    fabricCanvas.forEachObject((targ) => {
        // 不对刻度线做吸附操作
        // if (targ.type === 'line') return;
        // 同一个对象则返回
        if (targ === activeObject) return;
        const targBoundingRect = targ.getBoundingRect();
        // 左侧6像素内直接吸附
        const leftPixel = targBoundingRect.left - (activeObject.getBoundingRect().left + activeObject.getBoundingRect().width);
        const isCenterPointNear = centerPointNear(targ, activeObject);
        if (leftPixel < adsorbpPixel && leftPixel > 0 && isCenterPointNear) {
            activeObject.left = Math.max(activeObject.left + leftPixel, targBoundingRect.left - activeObject.getBoundingRect().width);
        }
        // 右侧6像素内直接吸附
        const rightPixel = activeObject.getBoundingRect().left - (targBoundingRect.left + targBoundingRect.width);
        if (rightPixel < adsorbpPixel && rightPixel > 0 && isCenterPointNear) {
            activeObject.left = Math.max(activeObject.left - rightPixel, targBoundingRect.left + targBoundingRect.width);
        }
        // 上侧6像素内直接吸附
        const topPixel = targBoundingRect.top - (activeObject.getBoundingRect().top + activeObject.getBoundingRect().height);
        if (topPixel < adsorbpPixel && topPixel > 0 && isCenterPointNear) {
            activeObject.top = Math.max(activeObject.top + topPixel, targBoundingRect.top - activeObject.getBoundingRect().height);
        }
        // 下侧6像素内直接吸附
        const bottomPixel = activeObject.getBoundingRect().top - targBoundingRect.height - targBoundingRect.top;
        if (bottomPixel < adsorbpPixel && bottomPixel > 0 && isCenterPointNear) {
            activeObject.top = Math.max(activeObject.top - bottomPixel, targBoundingRect.height + targBoundingRect.top);
        }
    });
    activeObject.setCoords();
    fabricCanvas.renderAll();
};

  // 限制canvas对象的移动范围，不可移动出canvas
  export function limitObjectArea(options) {
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

  // 创建可编辑的group
  export function createGroup(groupArray, pointerVpt, canvas) {
    const group = new fabric.Group(groupArray, {
      top: pointerVpt.y,
      left: pointerVpt.x,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
    });
    group.on("mousedblclick", (options) => dblclickEditing(options, canvas));
    canvas.remove(groupArray[0]);
    canvas.add(group);
    canvas.renderAll();
  }
    // 双击编辑文本方法
  export function dblclickEditing(options, canvas) {
    // this.item 获取 group 内部对象的方法 [0：背景图, 1：内容文本]
    const activeObject = options.target;
    const text = options.target.item(1);

    // 创建临时编辑文本对象
    const tempText = new fabric.util.object.clone(text);

    tempText.on("editing:exited", () => {
      // 退出编辑态处理，
      // 将 text value 赋值给原始文本对象 this.item(1)
      // 将临时文本对象干掉
      // activeObject.item(1).text = tempText.text;
      text.set({
        text: tempText.text,
        visible: true,
      });
    //   tempText.
      canvas.onHistory();
      canvas.remove(tempText);
    });

    tempText.on("changed", () => {
      // 文本变化处理，比如文本清空了需要显示 placeholder 等等之类的交互。
    });

    // 把原始的文本对象暂时隐藏
    activeObject.item(1).set({
      visible: false,
    });
    // 将临时文本对象加入画布，并激活，选中进入编辑态
    // tempText.set({ isDisabled: true })
    canvas.offHistory();
    canvas.add(tempText);
    canvas.setActiveObject(tempText);
    tempText.selectAll();
    tempText.enterEditing();
  }

