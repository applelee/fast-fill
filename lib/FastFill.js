(function (win, doc) {
  const w = win || window
  const d = doc || document

  const FastFill = function (opt = {}) {
    this.options = {
      // canvas父级id（必填）
      elementId: '',
      // 图片地址（必填）
      imageURL: '',
      // 画布尺寸
      canvasSize: [600, 800],
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
      ...opt,
    }

    // 填充类型
    this.type = 0
    // 是否绑定点击事件
    this.isEvent = false
    // 绘制数据
    this.imgData = null
    // 已经检测集合
    this.solvedSet = new Set()
    // 未检测集合
    this.stackedSet = new Set()
    // 可以填充的栈
    this.fillStack = []

    // 开始填充回调
    this.fillStartCB = () => {}
    // 资源加载回调
    this.loadedCB = () => {}
    // 填充完成回调
    this.successCB = () => {}
    // 填充异常回调
    this.errorCB = () => {}

    // 图片在画布中的位置与现实尺寸
    this.startX = 0
    this.startY = 0
    this.imgDisplayWidth = 0
    this.imgDisplayHeight = 0

    // 检测方向枚举
    this.directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
    // 场景容器
    this.cvs = d.createElement('canvas')
    // 计数器
    this.count = 0
    // 最大计数值(防止内存溢出)
    this.maxCount = 2000
    // 开关
    this.isTurnOn = false

    this.__init__()
  }

  // 工厂函数
  FastFill.create = function (opt = {}) {
    return new FastFill(opt)
  }

  // 更改配置
  FastFill.prototype.reset = function (opt = {}) {
    this.imgData = null
    for (let i in opt) {
      this[i] = opt[i]
    }

    if (opt.imageURL) {
      const [x, y] = this.canvasSize
      this.ctx.clearRect(0, 0, x, y)
      this.__imageHandle__()
    }
  }

  // 重置画布
  FastFill.prototype.resetCanvas = function () {
    this.__imageHandle__('图片重新加载完毕')
  }

  // 注册开始
  FastFill.prototype.turnOn = function (cb = () => {}) {
    this.isTurnOn = true
    if (this.isEvent) return
    this.__run__()
  }

  // 填色开始
  FastFill.prototype.fillStart = function (cb = () => {}) {
    this.fillStartCB = cb
  }

  // 注销结束
  FastFill.prototype.turnOff = function (cb = () => {}) {
    this.cvs.removeEventListener('click', this.clickHandle)
    this.isTurnOn = false
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

  FastFill.prototype.getTurnOnStatus = function () {
    return this.isTurnOn
  } 

  // 初始化
  FastFill.prototype.__init__ = function (opt = {}) {
    const options = {
      ...this.options,
      ...opt,
    };

    this.elementId = options.elementId
    this.imageURL = options.imageURL
    this.minFrontier = options.minFrontier
    this.canvasSize = options.canvasSize
    this.fillColor = options.fillColor
    this.coverFillColor = options.coverFillColor
    this.boundaryColor = options.boundaryColor
    this.isBanBoundaryColor = options.isBanBoundaryColor
    // 最大值200
    this.tolerance = options.tolerance > 200 ? 200 : options.tolerance
    // 暂时只采用十字检测
    this.directions = this.directions.filter((v, i) => (i & 1) === this.type)
    // 点击事件
    this.clickHandle = this.__clickHandle__.bind(this)

    if (!this.elementId) this.__error__('options 的 elementId 不能为空！！')
    if (!this.imageURL) this.__error__('options 的 imageURL 不能为空！！')

    this.__screen__()
    this.__imageHandle__()
  }

  FastFill.prototype.__screen__ = function () {
    const cvsContainer = d.getElementById(this.elementId)
    const [width, height] = this.canvasSize
    
    if (!cvsContainer) this.__error__('画布容器不存在！！')

    this.cvs.width = width
    this.cvs.height = height
    cvsContainer.append(this.cvs)
    this.ctx = this.cvs.getContext("2d")
  }

  // 图片加载
  FastFill.prototype.__imageHandle__ = function (msg) {
    const __self__ = this
    const image = new Image()

    image.src = this.imageURL

    image.onerror = function (e) {
      __self__.__error__('图片加载异常', e.type)
    }

    image.onload = function (e) {
      const [width, height] = __self__.canvasSize
      const imgWidth = e.path[0].width
      const imgHeight = e.path[0].height
      const cvsProportion = width / height
      const imgProportion = imgWidth / imgHeight

      __self__.imgDisplayWidth = cvsProportion >= imgProportion ? imgWidth * height / imgHeight : width
      __self__.imgDisplayHeight = cvsProportion >= imgProportion ? height :  width * imgHeight / imgWidth
      __self__.imgStartX = cvsProportion >= imgProportion ? (width / 2) - (__self__.imgDisplayWidth / 2) : 0
      __self__.imgStartY = cvsProportion >= imgProportion ? 0 : (height / 2) - (__self__.imgDisplayHeight / 2)

      __self__.ctx.drawImage(this, 0, 0, imgWidth, imgHeight, __self__.imgStartX, __self__.imgStartY, __self__.imgDisplayWidth, __self__.imgDisplayHeight);

      __self__.loadedCB({ msg });
    }
  }

  FastFill.prototype.__run__ = function () {
    this.isEvent = true
    this.cvs.addEventListener('click', this.clickHandle)
  }

  // 点击事件处理
  FastFill.prototype.__clickHandle__ = function (e) {
    // 填充起点矢量
    const [x, y] = getEventPosition(e)

    // 填充起点入栈
    this.fillStack = [[x, y]]

    const bool = this.__invalidFillDetecion__([x, y])
    if (!bool) return
    this.__startFill__()
  }

  // 无效填充检测
  FastFill.prototype.__invalidFillDetecion__ = function ([x, y]) {
    const color = this.ctx.getImageData(x, y, 1, 1).data;

    if (x < this.imgStartX || y < this.imgStartY || x >= this.imgStartX + this.imgDisplayWidth || y >= this.imgStartY + this.imgDisplayHeight) {
      this.errorCB({
        msg: '无效填充区域',
      })
      return false
    }
    if (this.isBanBoundaryColor && isSameColor(color, this.boundaryColor)) {
      this.errorCB({
        msg: '选中颜色为禁止填充色',
      })
      return false
    }
    if (!isSameColor(color, this.coverFillColor)) {
      this.errorCB({
        msg: '选中颜色不是能被填充的颜色',
      })
      return false
    }

    return true
  }

  // 开始
  FastFill.prototype.__startFill__ = function (t) {
    const type = t || '__drippingRecursion__'

    this.fillStartCB()
    while(this.fillStack.length > 0) {
      this[type](this.fillStack)
    }
    this.__endFill__()
  }

  // 核心逻辑
  FastFill.prototype.__drippingRecursion__ = function (a) {
    const [x, y] = a.shift()

    // 入栈于出栈
    this.solvedSet.add(`${x};${y}`)
    this.stackedSet.delete(`${x};${y}`)

    // 填色
    this.__fill__([x, y])

    // 方向检测
    this.__directionDetection__([x, y])
  }

  // 填色
  FastFill.prototype.__fill__ = function ([x, y]) {
    if (!this.imgData) {
      this.ctx.rect(x, y, 1, 1)
      this.ctx.fillStyle = `rgba(${this.fillColor[0]}, ${this.fillColor[1]}, ${this.fillColor[2]}, ${this.fillColor[3]})`
      this.ctx.fill()
      this.imgData = this.ctx.getImageData(x, y, 1, 1)
    } else {
      this.ctx.putImageData(this.imgData, x, y)
    }
  }

  // 方向检测
  FastFill.prototype.__directionDetection__ = function ([x, y]) {
    // 不注释setTimeout可显示填色过程
    // setTimeout(() => {
    this.directions.forEach(([dirX, dirY]) => {
      const dirCoord = [x + dirX, y + dirY]

      if (this.__pushTesting__(dirCoord)) {
        this.fillStack.push(dirCoord)

        if (!this.solvedSet.has(`${dirCoord[0]};${dirCoord[1]}`)) {
          this.stackedSet.add(`${dirCoord[0]};${dirCoord[1]}`)
        }
      }
    })

    if (this.fillStack.length > 0) {
      if (this.count >= this.maxCount) {
        this.count = 0
        return
      }

      this.count += 1

      try{
        this.__drippingRecursion__(this.fillStack)
      } catch(e) {
        this.count = 0
        return
      }
    }
    // })
  }

  // 入栈检测
  FastFill.prototype.__pushTesting__ = function ([x, y]) {
    const data = this.ctx.getImageData(x, y, 1, 1).data

    // 已经填充
    if (this.solvedSet.has(`${x};${y}`)) {
      return false
    }

    // 已经入栈
    if (this.stackedSet.has(`${x};${y}`)) {
      return false
    }

    // 色彩偏移
    if ((this.coverFillColor[0] - data[0] < -this.tolerance || this.coverFillColor[0] - data[0] > this.tolerance)
    || (this.coverFillColor[1] - data[1] < -this.tolerance || this.coverFillColor[1] - data[1] > this.tolerance)
    || (this.coverFillColor[2] - data[2] < -this.tolerance || this.coverFillColor[2] - data[2] > this.tolerance)
    || (this.coverFillColor[3] - data[3] < -this.tolerance || this.coverFillColor[3] - data[3] > this.tolerance)) {
      return false
    }

    // 边界色检测
    // if (this.isBanBoundaryColor && isSameColor(this.boundaryColor, data)) {
    //   this.endFill()
    //   return false
    // }

    return true
  }

  // 结束
  FastFill.prototype.__endFill__ = function () {
    this.count = 0
    this.solvedSet.clear()
    this.stackedSet.clear()
    this.fillStack = []
    this.successCB()
  }

  // 抛出错误
  FastFill.prototype.__error__ = function (msg) {
    throw msg
  }

  // 获取填充起点
  const getEventPosition = e => {
    let x, y;
  
    if (e.layerX || e.layerX === 0) {
      x = e.layerX
      y = e.layerY
    } else if (e.offsetX || e.offsetX === 0) { // Opera
      x = e.offsetX
      y = e.offsetY
    }
  
    return [x, y]
  }

  // 是否是等色
  const isSameColor = (s, b) => {
    if (s[0] === b[0] && s[1] === b[1] && s[2] === b[2] && s[3] === b[3]) {
      return true
    }
    return false
  }

  w.FastFill = FastFill
})(window, document)
