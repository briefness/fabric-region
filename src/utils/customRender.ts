import { fabric } from 'fabric';

function drawImg(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    img: HTMLImageElement,
    wSize: number,
    hSize: number,
    angle: number | undefined
  ) {
    if (angle === undefined) return;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(angle));
    ctx.drawImage(img, -wSize / 2, -hSize / 2, wSize, hSize);
    ctx.restore();
}
// 自定义删除图标和删除操作
export function deleteControl(canvas: fabric.Canvas) {
  const deleteIcon =
    "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
  const delImg = new Image();
  delImg.src = deleteIcon;

  function renderDelIcon(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: any,
    fabricObject: fabric.Object
  ) {
    drawImg(ctx, left, top, delImg, 20, 20, fabricObject.angle);
  }

  // 删除选中元素
  function deleteObject(target: fabric.Transform) {
    if (target.action === 'rotate') return true;
    const activeObject = canvas.getActiveObjects();
    if (activeObject) {
      activeObject.map((item) => canvas.remove(item));
      canvas.requestRenderAll();
      canvas.discardActiveObject();
    }
    return true;
  }

  // 删除图标
  fabric.Object.prototype.controls.deleteControl = new fabric.Control({
    x: 0.4,
    y: -0.4,
    offsetY: -14,
    offsetX: 14,
    cursorStyle: 'pointer',
    mouseUpHandler: deleteObject,
    render: renderDelIcon,
  });
}

// 自定义旋转图标和旋转操作
export function rotationControl() {
    const img = document.createElement('img');
    img.src = "data:image/svg+xml,%3Csvg height='18' width='18' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'%3E%3Cg fill='none' transform='rotate(45 16 16)'%3E%3Cpath d='M22.4484 0L32 9.57891L22.4484 19.1478V13.1032C17.6121 13.8563 13.7935 17.6618 13.0479 22.4914H19.2141L9.60201 32.01L0 22.4813H6.54912C7.36524 14.1073 14.0453 7.44023 22.4484 6.61688V0Z' fill='white'/%3E%3Cpath d='M24.0605 3.89587L29.7229 9.57896L24.0605 15.252V11.3562C17.0479 11.4365 11.3753 17.0895 11.3048 24.0879H15.3048L9.60201 29.7308L3.90932 24.0879H8.0806C8.14106 15.3223 15.2645 8.22345 24.0605 8.14313V3.89587Z' fill='black'/%3E%3C/g%3E%3C/svg%3E ";
    function renderIconRotate(
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      styleOverride: any,
      fabricObject: fabric.Object
    ) {
      drawImg(ctx, left, top, img, 20, 20, fabricObject.angle);
    }
    // 旋转图标
    fabric.Object.prototype.controls.mtr = new fabric.Control({
      x: 0,
      y: -1,
      cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
      actionHandler: fabric.controlsUtils.rotationWithSnapping,
      offsetY: 16,
      actionName: 'rotate',
      render: renderIconRotate,
    });
}

// 绘制刻度线，根据实际比例
export function scaleMark(canvas: fabric.Canvas) {
    // 绘制数量， 具体根据实际比例计算
    const gridX = Math.abs(50/0.5);
    const gridY = Math.abs(10/0.3);
    // 线的颜色
    const lineStroke = 'red'
    // 循环绘制
    for (let i = 0; i < (canvas.width / gridX); i++) {
        const lineX = new fabric.Line([ 0, i * gridX, canvas.width, i * gridX], {
            stroke: lineStroke,
            selectable: false,
            type: 'line'
        });
        canvas.add(lineX);
    }
    // 循环绘制
    for (let i = 0; i < (canvas.width / gridY); i++) {
        const lineY = new fabric.Line([ i * gridY, 0, i * gridY, canvas.width], {
            stroke: lineStroke,
            selectable: false,
            type: 'line'
        })
        canvas.add(lineY)
    }
}

// 绘制辅助线(对象间对齐校准)
export function initAligningGuidelines(canvas: fabric.Canvas) {
 
	let ctx = canvas.getSelectionContext(),
		aligningLineOffset = 0,
		aligningLineMargin = 0,
		aligningLineWidth = 1,
		aligningLineColor = '#4bec13',
		viewportTransform,
		zoom = 1;
 
	function drawVerticalLine(coords) {
		drawLine(
			coords.x + 0.5,
			coords.y1 > coords.y2 ? coords.y2 : coords.y1,
			coords.x + 0.5,
			coords.y2 > coords.y1 ? coords.y2 : coords.y1
        );
	}
 
	function drawHorizontalLine(coords) {
		drawLine(
			coords.x1 > coords.x2 ? coords.x2 : coords.x1,
			coords.y + 0.5,
			coords.x2 > coords.x1 ? coords.x2 : coords.x1,
			coords.y + 0.5
        );
	}
 
	function drawLine(x1, y1, x2, y2) {
		ctx.save();
		ctx.lineWidth = aligningLineWidth;
		ctx.strokeStyle = aligningLineColor;
		ctx.beginPath();
		ctx.moveTo(((x1+viewportTransform[4])*zoom), ((y1+viewportTransform[5])*zoom));
		ctx.lineTo(((x2+viewportTransform[4])*zoom), ((y2+viewportTransform[5])*zoom));
		ctx.stroke();
		ctx.restore();
	}
 
	function isInRange(value1, value2) {
		value1 = Math.round(value1);
		value2 = Math.round(value2);
		for (let i = value1 - aligningLineMargin, len = value1 + aligningLineMargin; i <= len; i++) {
			if (i === value2) {
				return true;
			}
		}
		return false;
	}
 
	const verticalLines: any[] = [],
	horizontalLines: any[] = [];
 
	canvas.on('mouse:down', function () {
		viewportTransform = canvas.viewportTransform;
		zoom = canvas.getZoom();
	});
 
	canvas.on('object:moving', function(e) {
 
		let activeObject = e.target,
			canvasObjects = canvas.getObjects(),
			activeObjectCenter = activeObject.getCenterPoint(),
			activeObjectLeft = activeObjectCenter.x,
			activeObjectTop = activeObjectCenter.y,
			activeObjectBoundingRect = activeObject.getBoundingRect(),
			activeObjectHeight = activeObjectBoundingRect.height / viewportTransform[3],
			activeObjectWidth = activeObjectBoundingRect.width / viewportTransform[0],
			horizontalInTheRange = false,
			verticalInTheRange = false,
			transform = canvas._currentTransform;
 
		if (!transform) return;
 
		// It should be trivial to DRY this up by encapsulating (repeating) creation of x1, x2, y1, and y2 into functions,
		// but we're not doing it here for perf. reasons -- as this a function that's invoked on every mouse move
 
		for (let i = canvasObjects.length; i--; ) {
 
			if (canvasObjects[i] === activeObject) continue;
 
			const objectCenter = canvasObjects[i].getCenterPoint(),
				objectLeft = objectCenter.x,
				objectTop = objectCenter.y,
				objectBoundingRect = canvasObjects[i].getBoundingRect(),
				objectHeight = objectBoundingRect.height / viewportTransform[3],
				objectWidth = objectBoundingRect.width / viewportTransform[0];
 
			// snap by the horizontal center line
			if (isInRange(objectLeft, activeObjectLeft)) {
				verticalInTheRange = true;
				verticalLines.push({
					x: objectLeft,
					y1: (objectTop < activeObjectTop)
						? (objectTop - objectHeight / 2 - aligningLineOffset)
						: (objectTop + objectHeight / 2 + aligningLineOffset),
					y2: (activeObjectTop > objectTop)
						? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
						: (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(objectLeft, activeObjectTop), 'center', 'center');
			}
 
			// snap by the left edge
			if (isInRange(objectLeft - objectWidth / 2, activeObjectLeft - activeObjectWidth / 2)) {
				verticalInTheRange = true;
				verticalLines.push({
					x: objectLeft - objectWidth / 2,
					y1: (objectTop < activeObjectTop)
						? (objectTop - objectHeight / 2 - aligningLineOffset)
						: (objectTop + objectHeight / 2 + aligningLineOffset),
					y2: (activeObjectTop > objectTop)
						? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
						: (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(objectLeft - objectWidth / 2 + activeObjectWidth / 2, activeObjectTop), 'center', 'center');
			}
 
			// snap by the right edge
			if (isInRange(objectLeft + objectWidth / 2, activeObjectLeft + activeObjectWidth / 2)) {
				verticalInTheRange = true;
				verticalLines.push({
					x: objectLeft + objectWidth / 2,
					y1: (objectTop < activeObjectTop)
						? (objectTop - objectHeight / 2 - aligningLineOffset)
						: (objectTop + objectHeight / 2 + aligningLineOffset),
					y2: (activeObjectTop > objectTop)
						? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
						: (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(objectLeft + objectWidth / 2 - activeObjectWidth / 2, activeObjectTop), 'center', 'center');
			}
 
			// snap by the vertical center line
			if (isInRange(objectTop, activeObjectTop)) {
				horizontalInTheRange = true;
				horizontalLines.push({
					y: objectTop,
					x1: (objectLeft < activeObjectLeft)
						? (objectLeft - objectWidth / 2 - aligningLineOffset)
						: (objectLeft + objectWidth / 2 + aligningLineOffset),
					x2: (activeObjectLeft > objectLeft)
						? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
						: (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop), 'center', 'center');
			}
 
			// snap by the top edge
			if (isInRange(objectTop - objectHeight / 2, activeObjectTop - activeObjectHeight / 2)) {
				horizontalInTheRange = true;
				horizontalLines.push({
					y: objectTop - objectHeight / 2,
					x1: (objectLeft < activeObjectLeft)
						? (objectLeft - objectWidth / 2 - aligningLineOffset)
						: (objectLeft + objectWidth / 2 + aligningLineOffset),
					x2: (activeObjectLeft > objectLeft)
						? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
						: (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop - objectHeight / 2 + activeObjectHeight / 2), 'center', 'center');
			}
 
			// snap by the bottom edge
			if (isInRange(objectTop + objectHeight / 2, activeObjectTop + activeObjectHeight / 2)) {
				horizontalInTheRange = true;
				horizontalLines.push({
					y: objectTop + objectHeight / 2,
					x1: (objectLeft < activeObjectLeft)
						? (objectLeft - objectWidth / 2 - aligningLineOffset)
						: (objectLeft + objectWidth / 2 + aligningLineOffset),
					x2: (activeObjectLeft > objectLeft)
						? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
						: (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
				});
				activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop + objectHeight / 2 - activeObjectHeight / 2), 'center', 'center');
			}
		}
 
		if (!horizontalInTheRange) {
			horizontalLines.length = 0;
		}
 
		if (!verticalInTheRange) {
			verticalLines.length = 0;
		}
	});
 
	canvas.on('before:render', function() {
		if(canvas&&canvas.contextTop)
		{
			canvas.clearContext(canvas.contextTop);
		}
	});
 
	canvas.on('after:render', function() {
		for (let i = verticalLines.length; i--; ) {
			drawVerticalLine(verticalLines[i]);
		}
		for (let i = horizontalLines.length; i--; ) {
			drawHorizontalLine(horizontalLines[i]);
		}
 
		verticalLines.length = horizontalLines.length = 0;
	});
 
	canvas.on('mouse:up', function() {
		verticalLines.length = horizontalLines.length = 0;
		canvas.renderAll();
	});
}
