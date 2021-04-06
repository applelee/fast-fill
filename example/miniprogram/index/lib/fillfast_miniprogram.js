/**
 * 
 * 一个javascript填色小工具
 * 此版本仅适用微信小程序
 * 该代码由其作者applelee公开
 * 任何人或机构可以随意使用，但任何使用该代码产生的后果，作者不负任何责任
 * 
 * 版本2021-04-06
*/

export default (function () {
  // 可配置属性
  let options = {
    // canvas上下文
    canvas: null,
    // canvas缩放尺寸
    canvasSize: [300, 150],
    // 像素比
    pixelRatio: wx.getSystemInfoSync().pixelRatio,
    // 场景比例
    cvsProportion: 2,
    // 填充色
    fillColor: [100, 100, 100, 255],
    // 被填充色
    coverFillColor: [255, 255, 255, 255],
    // 禁止填充色
    boundaryColor: [0, 0, 0, 255],
    // 颜色匹配容差值 1-200
    tolerance: 100,
    // 是否禁止填充边界色
    isBanBoundaryColor: true,
    // 是否自动更新被填充色
    isAutoChangeCoverFillColor: true,
  }

  // 开关
  let isTurnOn = false

  // 构造函数
  const FastFill = function (opt = {}) {
    options = {
      ...options,
      ...opt,
    };

    if (!options.canvas) error('options 的canvas 不能为空！！')
    if (!options.imageURL) error('options 的imageURL 不能为空！！')

    init(this)
  }

  // 工厂函数
  FastFill.create = (opt = {}) => {
    return new FastFill(opt)
  }

  // 更改配置
  FastFill.prototype.reset = function (opt = {}) {
    this.imgData = null
    this.elementId = opt.elementId || this.elementId
    this.imageURL = opt.imageURL || this.imageURL
    this.canvasSize = opt.canvasSize || this.canvasSize
    this.fillColor = opt.fillColor || this.fillColor
    this.coverFillColor = opt.coverFillColor || this.coverFillColor
    this.boundaryColor = opt.boundaryColor || this.boundaryColor
    this.isBanBoundaryColor = opt.isBanBoundaryColor || this.isBanBoundaryColor
    this.tolerance = opt.tolerance && (opt.tolerance > 200 ? 200 : opt.tolerance) || this.tolerance

    if (opt.imageURL) {
      const {width, height} = this.canvas
      this.context.clearRect(0, 0, width, height)
      imageHandle('图片重新加载完毕', this)
    }
  }

  // 重置画布
  FastFill.prototype.resetCanvas = function () {
    imageHandle('图片重新加载完毕', this)
  }

  // 触摸事件处理
  FastFill.prototype.tapHandle = function (e) {
    // 填充起点矢量
    const x = e.detail.x >> 0
    const y = e.detail.y >> 0
    const [cx, cy] = vectorTransform([x, y], this)
    const X = cx >> 0
    const Y = cy >> 0

    console.log(X, Y)
    // return

    // 填充起点入栈
    this.fillStack = [[X, Y]]

    const bool = invalidFillDetecion([X, Y], this)
    if (!bool) return
    startFill(this)
  }

  // 注册开始
  FastFill.prototype.turnOn = function (cb = () => {}) {
    if (this.isEvent) return
    run(this)
  }

  // 监听填色开始
  FastFill.prototype.startFill = function (cb = () => {}) {
    this.startFillCB = cb
  }

  // 关闭填色，注销事件
  FastFill.prototype.turnOff = function (cb = () => {}) {
    this.canvas.removeEventListener('click', this.clickEventHandle)
    this.isEvent = false
    cb()
  }

  // 资源加载完成
  FastFill.prototype.loaded = function (cb = () => {}) {
    this.loadedCB = res => cb(res)
  }

  // 填色结果
  FastFill.prototype.fillDone = function (success = () => {}, error = () => {}) {
    this.successCB = () => success()
    this.errorCB = err => error(err)
  }

  const init = self => {
    // 填充类型
    const type = 0
    // 是否绑定点击事件
    self.isEvent = false
    // 绘制数据
    self.imgData = null
    // 已经检测集合
    self.solvedSet = new Set()
    // 未检测集合
    self.stackedSet = new Set()
    // 可以填充的栈
    self.fillStack = []
    // 图片在画布中的位置与实际尺寸
    self.imgStartX = 0
    self.imgStartY = 0
    self.imgDisplayWidth = 0
    self.imgDisplayHeight = 0

    // 检测方向枚举
    self.directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
    // canvas上下文
    self.context = options.canvas.getContext('2d')
    // 递归计数器
    self.count = 0
    // 最大计数值(防止内存溢出)
    self.maxCount = 2000

    // 点击事件回调
    self.clickEventHandle = () => {}
    // 开始填充回调
    self.startFillCB = () => {}
    // 资源加载回调
    self.loadedCB = () => {}
    // 填充完成回调
    self.successCB = () => {}
    // 填充异常回调
    self.errorCB = () => {}

    self.canvas = options.canvas
    self.imageURL = options.imageURL
    self.fillColor = options.fillColor
    self.coverFillColor = options.coverFillColor
    self.boundaryColor = options.boundaryColor
    self.isBanBoundaryColor = options.isBanBoundaryColor
    self.isAutoChangeCoverFillColor = options.isAutoChangeCoverFillColor
    self.tolerance = options.tolerance > 200 ? 200 : options.tolerance
    self.directions = self.directions.filter((v, i) => (i & 1) === type)

    const { width, height } = self.canvas
    const [sW, sH] = options.canvasSize
    self.pixelRatio = options.pixelRatio
    self.cvsProportion = sW / sH
    self.canvas.width = width * self.pixelRatio
    self.canvas.height = height * self.pixelRatio
    self.canvasSize = options.canvasSize
    self.scaleSize = width / height / (sW / sH)
    imageHandle(self)
  }

  // 图片加载
  const imageHandle = function () {
    const len = arguments.length
    const msg = typeof arguments[0] !== 'string' ? '' : arguments[0]
    const self = arguments[len - 1]
    const image = self.canvas.createImage()
    image.src = self.imageURL
    image.crossOrigin = 'Anonymous'
    console.log(image, self.imageURL)

    image.onerror = function (e) {
      console.log('错误')
      error('图片加载异常', e.type)
    }

    image.onload = function (e) {
      console.log(e)
      const {width, height} = self.canvas
      const [sW, sH] = self.canvasSize
      const curHeight = width / self.cvsProportion
      const imgWidth = e.path[0].width
      const imgHeight = e.path[0].height
      const imgProportion = imgWidth / imgHeight

      self.imgDisplayWidth = self.cvsProportion >= imgProportion ? imgWidth * curHeight / imgHeight : width
      self.imgDisplayHeight = self.cvsProportion >= imgProportion ? curHeight :  width * imgHeight / imgWidth
      self.imgStartX = self.cvsProportion >= imgProportion ? (width - self.imgDisplayWidth) * (sW / width): 0
      self.imgStartY = self.cvsProportion >= imgProportion ? 0 : (curHeight - self.imgDisplayHeight) / 2 / self.scaleSize
      self.context.drawImage(this, 0, 0, imgWidth, imgHeight, self.imgStartX, self.imgStartY, self.imgDisplayWidth, self.imgDisplayHeight / (curHeight / height))

      self.loadedCB({ msg })
    }
  }

  const run = self => {
    self.isEvent = true
    // self.clickEventHandle = clickEventHandle.bind(self)
    // self.canvas.addEventListener('click', self.clickEventHandle)
  }

  // 无效填充检测
  const invalidFillDetecion = ([x, y], self) => {
    const colorData = self.context.getImageData(x, y, 1, 1).data;

    if (self.isAutoChangeCoverFillColor) {
      self.coverFillColor = colorData;
    }

    if (x < self.imgStartX || y < self.imgStartY || x >= self.imgStartX + self.imgDisplayWidth || y >= self.imgStartY + self.imgDisplayHeight) {
      self.errorCB({
        msg: '无效填充区域',
      })
      return false
    }
    if (self.isBanBoundaryColor && isSameColor(colorData, self.boundaryColor)) {
      self.errorCB({
        msg: '选中颜色为禁止填充色',
      })
      return false
    }
    if (!isSameColor(colorData, self.coverFillColor)) {
      self.errorCB({
        msg: '选中颜色不是被填充的颜色',
      })
      return false
    }

    return true
  }

  // 开始
  const startFill = self => {
    self.startFillCB()

    while(self.fillStack.length > 0) {
      drippingRecursion(self)
    }
    console.log(self.stackedSet)
    endFill(self)
  }

  // 核心逻辑
  const drippingRecursion = self => {
    const [x, y] = self.fillStack.shift()

    // 入栈于出栈
    self.solvedSet.add(`${x};${y}`)
    self.stackedSet.delete(`${x};${y}`)

    // 填色
    fill([x, y], self)

    // 方向检测
    directionDetection([x, y], self)
  }

  // 填色
  const fill = ([x, y], self) => {
    const [r, g, b, a] = self.fillColor
    
    if (!self.imgData) {
      self.context.rect(x, y, 1, 1)
      self.context.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      self.context.fill()
      self.imgData = self.context.getImageData(x, y, 1, 1)
    } else {
      self.context.putImageData(self.imgData, x, y)
    }
  }

  // 方向检测
  const directionDetection = ([x, y], self) => {
    // 不注释setTimeout可显示填色过程
    // setTimeout(() => {
    self.directions.forEach(([dirX, dirY]) => {
      const dirCoord = [x + dirX, y + dirY]

      if (pushTesting(dirCoord, self)) {
        self.fillStack.push(dirCoord)

        if (!self.solvedSet.has(`${dirCoord[0]};${dirCoord[1]}`)) {
          self.stackedSet.add(`${dirCoord[0]};${dirCoord[1]}`)
        }
      }
    })

    if (self.fillStack.length > 0) {
      if (self.count >= self.maxCount) {
        self.count = 0
        return
      }

      self.count += 1

      try{
        drippingRecursion(self)
      } catch(e) {
        self.count = 0
        return
      }
    }
    // })
  }

  // 入栈检测
  const pushTesting = ([x, y], self) => {
    const data = self.context.getImageData(x, y, 1, 1).data

    // 已经填充
    if (self.solvedSet.has(`${x};${y}`)) {
      return false
    }

    // 已经入栈
    if (self.stackedSet.has(`${x};${y}`)) {
      return false
    }

    // 色彩偏移
    if ((self.coverFillColor[0] - data[0] < -self.tolerance || self.coverFillColor[0] - data[0] > self.tolerance)
    || (self.coverFillColor[1] - data[1] < -self.tolerance || self.coverFillColor[1] - data[1] > self.tolerance)
    || (self.coverFillColor[2] - data[2] < -self.tolerance || self.coverFillColor[2] - data[2] > self.tolerance)
    || (self.coverFillColor[3] - data[3] < -self.tolerance || self.coverFillColor[3] - data[3] > self.tolerance)) {
      return false
    }

    // 边界色检测
    // if (isBanBoundaryColor && isSameColor(boundaryColor, data)) {
    //   endFill()
    //   return false
    // }

    return true
  }

  const endFill = self => {
    self.count = 0
    self.solvedSet.clear()
    self.stackedSet.clear()
    self.fillStack = []
    self.successCB()
  }

  // 抛出错误
  const error = msg => {
    throw msg
  }

  // 是否是等色
  const isSameColor = (s, b) => {
    if (s[0] === b[0] && s[1] === b[1] && s[2] === b[2] && s[3] === b[3]) {
      return true
    }
    return false
  }

  // 矢量转换
  const vectorTransform = ([x, y], self) => {
    const {width} = self.canvas
    const [cvsW] = self.canvasSize
    const p = cvsW / width

    return [x / p, y / p / self.scaleSize]
  }

  return FastFill
})()
