# 说明

一个偏门儿的小应用，供同好自娱自乐之。  

## DEMO运行起来

### 1. 安装依赖
```
npm install
```
or
```
yarn install
```

### 2. 启动本地服务
```
npm start
```
or
```
yarn start
```

### 3. 浏览器访问下面地址

127.0.0.1:3300 或 localhost:3300  

## 引入FastFill

### 引用
```javascript
<script src='/lib/FastFill.js'></script>
```  

## FastFill API

### 创建实例 instance
__new FastFill(options)__
```javascript
var FF = new FastFill({
  elementId: 'canvas',
  imageURL: '/example/timg-small.jpg',
  fillColor: [170, 0, 0, 255],
  tolerance: 120,
  // ...
})
```
__FastFill.create(options)__
```javascript
var FF = FastFill.create({
  elementId: 'canvas',
  imageURL: '/example/timg-small.jpg',
  fillColor: [170, 0, 0, 255],
  tolerance: 120,
  // ...
})
```  

### instance.loaded(callback)
监听资源加载方法<br/>
callback 是图片加载完成并渲染到画布的回调
```javascript
FF.loaded(() => {
  console.log('资源加载完毕')
})
```  

### instance.start(callback)
填色功能开启方法<br/>
callback 是开始填充的回调
```javascript
FF.start(() => {
  console.log('START', '开始填充')
})
```  

### instance.done(success, error)
填色完成的方法<br/>
success 是填充完成的回调<br/>
error(err) 为填充时异常回调，有唯一参数err，err有唯一属性msg
```javascript
FF.done(() => {
  console.log('END', `填充完成`)
}, err => {
  console.log(err.msg)
})
```  

### instance.end()
关闭并注销填色事件，可以用start方法重新开启填色
```javascript
FF.end()
```  

### instance.reset(options)
覆盖配置项
```javascript
FF.reset({
  imageURl: '',
})
```  

### options配置及初始值
```javascript
opstions = {
  // canvas父级id（必填）
  elementId: '',
  // 图片地址（必填）
  imageURL: '',
  // 区域起点
  minFrontier: [0, 0],
  // 区域大小
  maxFrontier: [600, 800],
  // 填充色
  // 切换填充色需要重新设置
  fillColor: [100, 100, 100, 255],
  // 被填充色
  // 默认值为白色
  coverFillColor: [255, 255, 255, 255],
  // 禁止填充色
  // 默认值为例子中的黑线色
  boundaryColor: [0, 0, 0, 255],
  // 颜色匹配容差值 1-200
  tolerance: 100,
  // 是否禁止填充边界色
  // boundaryColor颜色是否能被填充
  isBanBoundaryColor: true,
}
```

# 注意
__图片资源同源问题__

# License
__MIT__
