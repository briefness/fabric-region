// 限制group中的文本对象跟随group一起旋转
export function limitTextAngleOfGroup(options) {
    // 获取group对象
    const activeObject = options.target;
    // 获取文本对象
    const text = activeObject.item(1);
    // 设置文本对象的旋转角度
    text.set({ angle: -activeObject.angle });
  }

  // 对象临近时贴边，但不会限制重叠
  export function limitObjectIntersect(options, fabricCanvas) {
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