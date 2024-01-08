import { fabric } from 'fabric';
import { dblclickEditing } from './utils'

/**
 * 重写 initialize
 */
fabric.Canvas.prototype.initialize = (function (originalFn) {
    return function (...args) {
      originalFn.call(this, ...args);
      this._historyInit();
      return this;
    };
  })(fabric.Canvas.prototype.initialize);
  
  /**
   * 重写 dispose
   */
  fabric.Canvas.prototype.dispose = (function (originalFn) {
    return function (...args) {
      originalFn.call(this, ...args);
      this._historyDispose();
      return this;
    };
  })(fabric.Canvas.prototype.dispose);
  
  /**
   * 返回当前canvas字符串
   */
  fabric.Canvas.prototype._historyNext = function () {
    return JSON.stringify(this.toDatalessJSON(this.extraProps));
  };
  
  /**
   * 返回事件监听
   */
  fabric.Canvas.prototype._historyEvents = function () {
    return {
      'object:added': this._historySaveAction,
      'object:removed': this._historySaveAction,
      'object:modified': this._historySaveAction,
      'object:skewing': this._historySaveAction,
    };
  };
  
  /**
   * 初始化历史记录
   */
  fabric.Canvas.prototype._historyInit = function () {
    this.historyUndo = [];
    this.historyRedo = [];
    this.extraProps = ['uid', 'goodsShelfType'];
    this.historyNextState = this._historyNext();
  
    this.on(this._historyEvents());
  };
  
  /**
   * 移除自定义事件监听
   */
  fabric.Canvas.prototype._historyDispose = function () {
    this.off(this._historyEvents());
  };
  
  /**
   * 历史记录入栈
   */
  fabric.Canvas.prototype._historySaveAction = function (e) {
    // historyProcessing为true或者isDisabled为true时，不触发history:append事件
    if (this.historyProcessing || e?.target.isDisabled) return;
    const json = this.historyNextState;
    this.historyUndo.push(json);
    this.historyNextState = this._historyNext();
    this.fire('history:append', { json: json });
  };
  
  /**
   * 撤销
   */
  fabric.Canvas.prototype.undo = function (callback) {
    // The undo process will render the new states of the objects
    // Therefore, object:added and object:modified events will triggered again
    // To ignore those events, we are setting a flag.
    this.historyProcessing = true;
  
    const history = this.historyUndo.pop();
    if (history) {
      // Push the current state to the redo history
      this.historyRedo.push(this._historyNext());
      this.historyNextState = history;
      this._loadHistory(history, 'history:undo', callback);
    } else {
      this.historyProcessing = false;
    }
  };
  
  /**
   * 重做
   */
  fabric.Canvas.prototype.redo = function (callback) {
    // The undo process will render the new states of the objects
    // Therefore, object:added and object:modified events will triggered again
    // To ignore those events, we are setting a flag.
    this.historyProcessing = true;
    const history = this.historyRedo.pop();
    if (history) {
      // Every redo action is actually a new action to the undo history
      this.historyUndo.push(this._historyNext());
      this.historyNextState = history;
      this._loadHistory(history, 'history:redo', callback);
    } else {
      this.historyProcessing = false;
    }
  };
  
  fabric.Canvas.prototype._loadHistory = function (history, event, callback) {
    var that = this;
    this.clear();
    this.loadFromJSON(history, () => {
        that.renderAll();
        that.fire(event);
        that.historyProcessing = false;
        if (callback && typeof callback === 'function') callback();
    }, function(_, object) {
        object.on("mousedblclick", (options) => dblclickEditing(options, that));
    });
  };
  
  /**
   * 清除历史记录
   */
  fabric.Canvas.prototype.clearHistory = function () {
    this.historyUndo = [];
    this.historyRedo = [];
    this.fire('history:clear');
  };
  
  /**
   * 历史记录绑定事件
   */
  fabric.Canvas.prototype.onHistory = function () {
    this.historyProcessing = false;
  
    this._historySaveAction();
  };
  
  /**
   * 是否可以撤销
   */
  
  fabric.Canvas.prototype.canUndo = function () {
    return (this.historyUndo ?? []).length > 0;
  };
  
  /**
   * 是否可以重做
   */
  fabric.Canvas.prototype.canRedo = function () {
    return (this.historyRedo ?? []).length > 0;
  };
  
  /**
   * 移除历史记录事件
   */
  fabric.Canvas.prototype.offHistory = function () {
    this.historyProcessing = true;
  };