# 说明

一个偏门儿的基于html canvas的小应用，供同好自娱自乐之。  

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

### 实例的方法 method  
#### instance.loaded void
监听资源加载方法<br/>
唯一参数 callback 是图片加载完成并渲染到画布的回调，有唯一参数，该参数有唯一属性msg
```javascript
FF.loaded(() => {
  console.log('资源加载完毕')
})
```  

#### instance.turnOn void
填色功能开启方法
```javascript
FF.turnOn()
```  

#### instance.turnOff void
关闭并注销填色事件，可以用turnOn方法重新开启填色
```javascript
FF.turnOff()
```  

#### instance.getTurnOnStatus boolean
获取填色开启状态
```javascript
FF.getTurnOnStatus()
```  

#### instance.fillStart void
填色开始
唯一参数 callback 是填色开始的回调
```javascript
FF.fillStart(() => {
  console.log('START', '填色开始')
}) 
```  

#### instance.fillDone void
填色完成的方法<br/>
参数1 success 是填充完成的回调<br/>
参数2 error 为填充时异常回调，有唯一参数，该参数有唯一属性msg
```javascript
FF.fillDone(() => {
  console.log('END', `填充完成`)
}, err => {
  console.log(err.msg)
})
```  

#### instance.reset void
覆盖配置项<br/>
唯一参数 options 配置项
```javascript
FF.reset({
  imageURl: '',
})
```  

#### instance.resetCanvas void
重置画布与当前的图片
```javascript
FF.resetCanvas()
```  

### options配置及初始值
```javascript
opstions = {
  // canvas父级id（必填）
  elementId: '',
  // 图片地址（必填）
  imageURL: '',
  // 画布尺寸
  canvasSize: [600, 800],
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
