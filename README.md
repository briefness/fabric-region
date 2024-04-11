
# Vue3 + Fabric.js

实现简易画布

# 版本
*fabric不同版本的API也是不同，相同的API在不同的版本中，源码的实现方式有的也略微不同，所以请注意版本的区别*

- fabric: ^5.3.0

# 功能

- 自定义背景图
- 背景图伸缩
- 对象靠近自动吸附
- 对象对齐辅助线
- 对象双击添加描述文字
- 自定义删除
- 自定义旋转
- 导出Png
- 保存json字符串
- 清空画布
- 粘贴 & 复制
- 框选的对象组，禁用伸缩和旋转
- 撤销 & 重做 （因为使用loadFromJSON加载记录，所以页面会存在闪烁）
- H5端预览
- H5端手势伸缩
- H5端添加额外信息

# 分支

- master: pc端操作模拟
- develop-h5: h5端预览

# 启动

```js
    pnpm i
    pnpm dev
```