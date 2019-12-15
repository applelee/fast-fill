(function (win, doc) {
  const w = win || window
  const d = doc || document

  const FastFill = function () {
    // 默认设置
    this.__setting__ = {
      // 画布容器
      container: d,
      // 区域起点
      minFrontier: {
        x: 0,
        y: 0,
      },
      // 区域大小
      maxFrontier: {
        width: 0,
        height: 0,
      },
      // 需替换填充色
      selectColor: [255, 255, 255, 255],
      // 填充色
      fillColor: [100, 100, 100, 255],
      // 边界或禁止填充色
      boundaryColor: [0, 0, 0, 255],
      // img地址
      imgUrl: '',
      // 颜色匹配容差值 1-200
      tolerance: 100,
      //
      event: 'click',
      // 是否禁止填充边界色
      isBanBoundaryColor: true
    }
  }

  FastFill.prototype.create = function (doc, o) {
    this.init(doc, o)
  }

  FastFill.prototype.update = function (o) {
    this.imgData = null
    for (let i in o) {
      this[i] = o[i]
    }
    if (o.imgUrl) {
      const { width, height } = this.maxFrontier
      this.ctx.clearRect(0, 0, width, height)
      this.__imageHandle__()
    }
  }

  // 初始化
  FastFill.prototype.init = function (dom, o) {
    const setting = deepCopy(this.__setting__, o)
    const width = dom.clientWidth
    const height = dom.clientHeight

    this.minFrontier = setting.minFrontier
    this.fillColor = setting.fillColor
    this.boundaryColor = setting.boundaryColor
    this.isBanBoundaryColor = setting.isBanBoundaryColor
    this.tolerance = setting.tolerance > 200 ? 200 : (setting.tolerance < 0 ? 0 : setting.tolerance)
    this.event = setting.event
    this.imgUrl = setting.imgUrl
    this.startCB = () => {}
    this.doneCB = () => {}
    this.failCB = () => {}

    // 是否绑定事件
    this.isEvent = false
    // 绘制数据
    this.imgData = null
    // 已经灌注集合
    this.solveSet = new Set()
    // 已入栈集合
    this.stackedSet = new Set()
    // 可以填充的栈
    this.fillStack = []
    // 检测顺序
    this.directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1},
      { x: -1, y: 0 }
    ]
    // 画布容器
    this.container = dom
    // 创建画布
    this.cvs = document.createElement('canvas')
    this.cvs.width = width
    this.cvs.height = height
    this.container.append(this.cvs)
    this.ctx = this.cvs.getContext("2d");
    this.maxFrontier = {
      width,
      height
    }
    this.__imageHandle__()
  }

  // 图片加载
  FastFill.prototype.__imageHandle__ = function () {
    const _self = this
    const img = new Image()

    img.src = this.imgUrl
    img.onerror = function (e) {
      console.error('图片加载错误', e.type)
    }
    img.onload = function (e) {
      console.log('图片加载完成')
      const { width, height } = _self.maxFrontier
      const imgWidth = e.path[0].width
      const imgHeight = e.path[0].height
      const cvsProportion = width / height
      const imgProportion = imgWidth / imgHeight

      _self.imgDisplayWidth = cvsProportion >= imgProportion ? imgWidth * height / imgHeight : width
      _self.imgDisplayHeight = cvsProportion >= imgProportion ? height :  width * imgHeight / imgWidth
      _self.imgStartX = cvsProportion >= imgProportion ? (width / 2) - (_self.imgDisplayWidth / 2) : 0
      _self.imgStartY = cvsProportion >= imgProportion ? 0 : (height / 2) - (_self.imgDisplayHeight / 2)

      _self.ctx.drawImage(this, 0, 0, imgWidth, imgHeight, _self.imgStartX, _self.imgStartY, _self.imgDisplayWidth, _self.imgDisplayHeight);

      if (_self.isEvent) return
      _self.isEvent = true
      _self.cvs.addEventListener(_self.event, e => {
        const point = getEventPosition(e)
        _self.selectColor = _self.ctx.getImageData(point.x, point.y, 1, 1).data
        _self.fillStack = [point]

        // 无效点击
        if ((_self.isBanBoundaryColor && isSameColor(_self.selectColor, _self.boundaryColor)) || point.x < _self.imgStartX || point.y < _self.imgStartY || point.x >= _self.imgStartX + _self.imgDisplayWidth || point.y >= _self.imgStartY + _self.imgDisplayHeight) return

        _self.startFill()
      })
    }
  }

  // 开始
  FastFill.prototype.startFill = function (t) {
    const type = t || 'drippingRecursion'

    this.startCB()
    while(this.fillStack.length > 0) {
      this[type](this.fillStack)
    }
    this.endFill()
  }

  // 滴水算法递归
  FastFill.prototype.drippingRecursion = function (a) {
    const coordinate = a.shift()

    // 入堆
    this.solveSet.add(`${coordinate.x};${coordinate.y}`)
    this.stackedSet.delete(`${coordinate.x};${coordinate.y}`)
    // 填色
    if (!this.imgData) {
      this.ctx.rect(coordinate.x, coordinate.y, 1, 1)
      this.ctx.fillStyle = `rgba(${this.fillColor[0]}, ${this.fillColor[1]}, ${this.fillColor[2]}, ${this.fillColor[3]})`
      this.ctx.fill()

      this.imgData = this.ctx.getImageData(coordinate.x, coordinate.y, 1, 1)
    }
    else{
      this.ctx.putImageData(this.imgData, coordinate.x, coordinate.y)
    }

    // 方向检测
    // 不注释setTimeout可显示递归过程
    // setTimeout(() => {
      this.directions.forEach(v => {
        const dirCoord = {
          x: coordinate.x + v.x,
          y: coordinate.y + v.y,
        }

        if (this.pushTesting(dirCoord)) {
          this.fillStack.push(dirCoord)

          if (!this.solveSet.has(`${dirCoord.x};${dirCoord.y}`)) {
            this.stackedSet.add(`${dirCoord.x};${dirCoord.y}`)
          }
        }
      })

      if (this.fillStack.length > 0) {
        this.count += 1
        try{
          this.drippingRecursion(this.fillStack)
        }
        catch(e) {
          this.count = 0
          return
        }
      }
    // })
  }

  // 入栈检测
  FastFill.prototype.pushTesting = function (coord) {
    const data = this.ctx.getImageData(coord.x, coord.y, 1, 1).data

    // 已经填充
    if (this.solveSet.has(`${coord.x};${coord.y}`)) {
      return false
    }

    // 已经入栈
    if (this.stackedSet.has(`${coord.x};${coord.y}`)) {
      return false
    }

    // 色彩偏移
    if ((this.selectColor[0] - data[0] < -this.tolerance || this.selectColor[0] - data[0] > this.tolerance)
    || (this.selectColor[1] - data[1] < -this.tolerance || this.selectColor[1] - data[1] > this.tolerance)
    || (this.selectColor[2] - data[2] < -this.tolerance || this.selectColor[2] - data[2] > this.tolerance)
    || (this.selectColor[3] - data[3] < -this.tolerance || this.selectColor[3] - data[3] > this.tolerance)) {
      return false
    }

    // 边界色检测
    // if (this.isBanBoundaryColor && isSameColor(this.boundaryColor, data)) {
    //   this.endFill()
    //   return false
    // }

    // 超出填充区域
    if (coord.x < this.minFrontier.x || coord.y < this.minFrontier.y || coord.x >= this.maxFrontier.width || coord.y >= this.maxFrontier.height) {
      return false
    }

    return true
  }

  // 结束
  FastFill.prototype.endFill = function () {
    this.solveSet.clear()
    this.stackedSet.clear()
    this.fillStack = []
    this.doneCB()
  }

  // 开始
  FastFill.prototype.start = function (cb) {
    this.startCB = cb
  }

  // 结果
  FastFill.prototype.complete = function (d, f) {
    this.doneCB = d
    this.failCB = f
  }

  // 深度拷贝
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
  
    return { x, y }
  }

  // 是否是等色
  const isSameColor = (s, b) => {
    if (s[0] === b[0] && s[1] === b[1] && s[2] === b[2] && s[3] === b[3]) {
      return true
    }
    return false
  }

  w.FastFill = w.FF = new FastFill()
})(window, document)
