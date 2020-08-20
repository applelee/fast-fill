(function (win, doc) {
  const w = win || window
  const d = doc || document

  const FastFill = function (opt = {}) {
    this.options = {
      // canvas容器id
      elementId: '',
      // 图片地址
      imageURL: '',
      // 区域起点
      minFrontier: [0, 0],
      // 区域大小
      maxFrontier: [600, 800],
      // 填充色
      fillColor: [100, 100, 100, 255],
      // 禁止填充色
      boundaryColor: [0, 0, 0, 255],
      // 颜色匹配容差值 1-200
      tolerance: 100,
      // 是否禁止填充边界色
      isBanBoundaryColor: true,
      // fill类型
      type: 0,
      ...opt,
    }

    // 是否绑定事件
    this.isEvent = false
    // 被填充色
    this.coverFillColor = [255, 255, 255, 255]
    // 绘制数据
    this.imgData = null
    // 已经检测集合
    this.solvedSet = new Set()
    // 未检测集合
    this.stackedSet = new Set()
    // 可以填充的栈
    this.fillStack = []

    // 开始填充回调
    this.startCB = () => {}
    // 填充完成回调
    this.doneCB = () => {}
    // 资源加载回调
    this.loadedCB = () => {}

    // 检测方向枚举
    this.directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
    // 场景容器
    this.cvs = d.createElement('canvas')

    this.__init__()
  }

  FastFill.create = function (opt = {}) {
    return new FastFill(opt)
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
    this.maxFrontier = options.maxFrontier
    this.fillColor = options.fillColor
    this.boundaryColor = options.boundaryColor
    this.isBanBoundaryColor = options.isBanBoundaryColor
    this.tolerance = options.tolerance
    this.type = options.type

    this.count = 0

    if (!this.elementId) this.__error__('options 的 elementId 不能为空！！')
    if (!this.imageURL) this.__error__('options 的 imageURL 不能为空！！')

    this.__screen__()
    this.__imageHandle__()
  }

  FastFill.prototype.__screen__ = function () {
    const cvsContainer = d.getElementById(this.elementId)
    const [width, height] = this.maxFrontier
    
    if (!cvsContainer) this.__error__('画布容器不存在！！')

    this.cvs.width = width
    this.cvs.height = height
    cvsContainer.append(this.cvs)
    this.ctx = this.cvs.getContext("2d")
  }

  // 图片加载
  FastFill.prototype.__imageHandle__ = function () {
    const __self__ = this
    const image = new Image()

    image.src = this.imageURL

    image.onerror = function (e) {
      __self__.__error__('图片加载异常', e.type)
    }

    image.onload = function (e) {
      __self__.loadedCB();
      const [width, height] = __self__.maxFrontier
      const imgWidth = e.path[0].width
      const imgHeight = e.path[0].height
      const cvsProportion = width / height
      const imgProportion = imgWidth / imgHeight

      __self__.imgDisplayWidth = cvsProportion >= imgProportion ? imgWidth * height / imgHeight : width
      __self__.imgDisplayHeight = cvsProportion >= imgProportion ? height :  width * imgHeight / imgWidth
      __self__.imgStartX = cvsProportion >= imgProportion ? (width / 2) - (__self__.imgDisplayWidth / 2) : 0
      __self__.imgStartY = cvsProportion >= imgProportion ? 0 : (height / 2) - (__self__.imgDisplayHeight / 2)

      __self__.ctx.drawImage(this, 0, 0, imgWidth, imgHeight, __self__.imgStartX, __self__.imgStartY, __self__.imgDisplayWidth, __self__.imgDisplayHeight);

      // if (__self__.isEvent) return
      // __self__.isEvent = true
      __self__.__run__()
    }
  }

  FastFill.prototype.__run__ = function () {
    if (this.isEvent) return

    this.isEvent = true
    this.cvs.addEventListener('click', e => {
      const [x, y] = getEventPosition(e)
      this.coverFillColor = this.ctx.getImageData(x, y, 1, 1).data
      this.fillStack = [[x, y]]

      // 选中的被填充检测无效
      if ((this.isBanBoundaryColor && isSameColor(this.coverFillColor, this.boundaryColor)) || x < this.imgStartX || y < this.imgStartY || x >= this.imgStartX + this.imgDisplayWidth || y >= this.imgStartY + this.imgDisplayHeight) return

      this.__startFill__()
    })
  }

  // 开始
  FastFill.prototype.__startFill__ = function (t) {
    const type = t || '__drippingRecursion__'

    this.startCB()
    while(this.fillStack.length > 0) {
      this[type](this.fillStack)
    }
    this.__endFill__()
  }

  // 滴水算法递归
  FastFill.prototype.__drippingRecursion__ = function (a) {
    const [x, y] = a.shift()
    const dirs = this.directions.filter((v, i) => (i & 1) === this.type)

    // 入栈
    this.solvedSet.add(`${x};${y}`)
    this.stackedSet.delete(`${x};${y}`)
    // 填色
    if (!this.imgData) {
      this.ctx.rect(x, y, 1, 1)
      this.ctx.fillStyle = `rgba(${this.fillColor[0]}, ${this.fillColor[1]}, ${this.fillColor[2]}, ${this.fillColor[3]})`
      this.ctx.fill()

      this.imgData = this.ctx.getImageData(x, y, 1, 1)
    }
    else{
      this.ctx.putImageData(this.imgData, x, y)
    }

    // 方向检测
    // 不注释setTimeout可显示递归过程
    // setTimeout(() => {
      dirs.forEach(([dirX, dirY], i) => {
        const dirCoord = [x + dirX, y + dirY]

        if (this.__pushTesting__(dirCoord)) {
          this.fillStack.push(dirCoord)

          if (!this.solvedSet.has(`${dirCoord[0]};${dirCoord[1]}`)) {
            this.stackedSet.add(`${dirCoord[0]};${dirCoord[1]}`)
          }
        }
      })

      if (this.fillStack.length > 0) {
        this.count += 1
        try{
          this.__drippingRecursion__(this.fillStack)
        }
        catch(e) {
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

    // 超出填充区域
    if (x < this.minFrontier[0] || y < this.minFrontier[1] || x >= this.maxFrontier[0] || y >= this.maxFrontier[1]) {
      return false
    }

    return true
  }

  FastFill.prototype.update = function (o) {
    this.imgData = null
    for (let i in o) {
      this[i] = o[i]
    }
    if (o.imgUrl) {
      const [x, y] = this.maxFrontier
      this.ctx.clearRect(0, 0, x, y)
      this.__imageHandle__()
    }
  }

  // 结束
  FastFill.prototype.__endFill__ = function () {
    this.solvedSet.clear()
    this.stackedSet.clear()
    this.fillStack = []
    this.doneCB()
  }

  // 抛出错误
  FastFill.prototype.__error__ = function (msg) {
    throw msg
  }

  // 资源加载完成
  FastFill.prototype.loaded = function (cb) {
    this.loadedCB = cb
  }

  // 开始
  FastFill.prototype.start = function (cb) {
    this.startCB = e => cb(e)
  }

  // 结果
  FastFill.prototype.done = function (cb) {
    this.doneCB = e => cb(e)
  }

  // 深拷贝
  const deepCopy = function (s, o) {
    for (let i in o){
      if (typeof s[i] === 'object') {
        s[i] = deepCopy(s[i], o[i])
      }
      else {
        s[i] = o[i]
      }
    }

    return s
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
