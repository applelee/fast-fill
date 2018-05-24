(function(win) {
  const w = win || window

  const FloodFill = function(context, object) {
    this.context = context

    // 默认设置
    var setting = {
      // 区域七点钟
      minFrontier: {
        x: 0,
        y: 0,
      },
      // 区域大小
      maxFrontier: {
        width: 200,
        height: 100,
      },
      // 初始点
      point: {
        x: 0,
        y: 0,
      },
      // 区域需填筑的颜色
      selectColor: [255, 255, 255, 255],
      // 区域填筑色
      fillColor: [0, 0, 0, 255],
      // 区域颜色匹配容差值
      talerance: 10,
    }

    // 合并自定义设置
    setting = deepCopy(setting, object)
    this.init(setting)
  }

  FloodFill.prototype.init = function(setting) {
    this.minFrontier = setting.minFrontier
    this.maxFrontier = setting.maxFrontier
    this.talerance = setting.talerance
    this.selectColor = setting.selectColor
    this.fillColor = setting.fillColor

    // 递归计数器
    this.count = 0
    // 最大递归次数
    this.maxRacursion = 5000
    // 复制绘制
    this.imgData = null
    // 已经灌注的堆
    this.solveSet = new Set()
    // 已入栈集合
    this.stackedSet = new Set()
    // 可以填筑的栈
    this.fillStack = [{x: setting.point.x, y: setting.point.y}]
    // 检测顺序
    this.directions = [
      {x: 0, y: -1},
      {x: 1, y: 0},
      {x: 0, y: 1},
      {x: -1, y: 0}
    ]
  }

  FloodFill.prototype.startFill = function(t) {
    const type = t || 'drippingRecursion'

    while(this.fillStack.length > 0) {
      this[type](this.fillStack)
    }
  }

  FloodFill.prototype.drippingRecursion = function(a) {
    const coordinate = a.shift()

    // 入堆
    this.solveSet.add(`${coordinate.x};${coordinate.y}`)
    this.stackedSet.delete(`${coordinate.x};${coordinate.y}`)
    // 填色
    if (!this.imgData) {
      ctx.rect(coordinate.x, coordinate.y, 1, 1)
      ctx.fillStyle = `rgba(${this.fillColor[0]}, ${this.fillColor[1]}, ${this.fillColor[2]}, ${this.fillColor[3]})`
      ctx.fill()

      this.imgData = this.context.getImageData(coordinate.x, coordinate.y, 1, 1)
    }
    else{
      ctx.putImageData(this.imgData, coordinate.x, coordinate.y)
    }

    // 方向检测
    // setTimeout(() => {
      this.directions.forEach((v, k) => {
        const dirCoord = {
          x: coordinate.x + v.x,
          y: coordinate.y + v.y,
        }

        // console.log(this.pushTesting(dirCoord))
        // console.log(this.stackedSet)
        if (this.pushTesting(dirCoord)) {
          this.fillStack.push(dirCoord)

          if (!this.solveSet.has(`${dirCoord.x};${dirCoord.y}`)) {
            this.stackedSet.add(`${dirCoord.x};${dirCoord.y}`)
          }
        }
      })

      // console.log(Date.now() - this.time)
      // this.time = Date.now()

      if (this.count > 7000) {
        this.count = 0
        return
      }

      if (this.fillStack.length > 0) {
        this.count += 1
        this.drippingRecursion(this.fillStack)
        return
      }

      // console.log(Date.now() - this.time)
      // this.time = Date.now()
    // })
  }

  // 入栈检测
  FloodFill.prototype.pushTesting = function(coord) {
    const data = ctx.getImageData(coord.x, coord.y, 1, 1).data

    if (this.solveSet.has(`${coord.x};${coord.y}`)) {
      return false
    }

    if (this.stackedSet.has(`${coord.x};${coord.y}`)) {
      return false
    }

    if ((this.selectColor[0] - data[0] < -this.talerance || this.selectColor[0] - data[0] > this.talerance)
    || (this.selectColor[1] - data[1] < -this.talerance || this.selectColor[1] - data[1] > this.talerance)
    || (this.selectColor[2] - data[2] < -this.talerance || this.selectColor[2] - data[2] > this.talerance)
    || (this.selectColor[3] - data[3] < -this.talerance || this.selectColor[3] - data[3] > this.talerance)) {
      return false
    }

    if (coord.x < this.minFrontier.x || coord.y < this.minFrontier.y || coord.x > this.maxFrontier.x || coord.y > this.maxFrontier.y) {
      return false
    }

    return true
  }

  // 深度拷贝
  const deepCopy = function(s, o) {
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

  w.FloodFill = FloodFill
})(window)
