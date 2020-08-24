/**
 * 
 * 一个javascript填色小工具
 * 以h5的canvas为载体
 * 该代码由其作者applelee公开
 * 任何人或机构可以随意使用，但任何使用该代码产生的后果，作者不负任何责任
 * 
 * 版本2020-08-24
*/

(function (win, doc) {
  const w = win || window
  const d = doc || document

  // 可配置属性
  let options = {
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
  }

  // 可配置的私有变量
  let elementId, imageURL, canvasSize, fillColor, coverFillColor, boundaryColor, tolerance, isBanBoundaryColor

  // 填充类型
  const type = 0
  // 是否绑定点击事件
  let isEvent = false
  // 绘制数据
  let imgData = null
  // 已经检测集合
  let solvedSet = new Set()
  // 未检测集合
  let stackedSet = new Set()
  // 可以填充的栈
  let fillStack = []

  // 图片在画布中的位置与现实尺寸
  let imgDisplayWidth, imgDisplayHeight

  // 检测方向枚举
  let directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
  // 场景容器
  const cvs = d.createElement('canvas')
  // canvas上下文
  let ctx
  // 递归计数器
  let count = 0
  // 最大计数值(防止内存溢出)
  const maxCount = 2000

  // 开始填充回调
  let startFillCB = () => {}
  // 资源加载回调
  let loadedCB = () => {}
  // 填充完成回调
  let successCB = () => {}
  // 填充异常回调
  let errorCB = () => {}

  // 构造函数
  const FastFill = function (opt = {}) {
    init(opt);
  }

  // 工厂函数
  FastFill.create = function (opt = {}) {
    return new FastFill(opt)
  }

  // 更改配置
  FastFill.prototype.reset = function (opt = {}) {
    imgData = null
    elementId = opt.elementId || elementId
    imageURL = opt.imageURL || imageURL
    canvasSize = opt.canvasSize || canvasSize
    fillColor = opt.fillColor || fillColor
    coverFillColor = opt.coverFillColor || coverFillColor
    boundaryColor = opt.boundaryColor || boundaryColor
    isBanBoundaryColor = opt.isBanBoundaryColor || isBanBoundaryColor
    tolerance = opt.tolerance && (opt.tolerance > 200 ? 200 : opt.tolerance) || tolerance

    if (opt.imageURL) {
      const [x, y] = canvasSize
      ctx.clearRect(0, 0, x, y)
      imageHandle()
    }
  }

  // 重置画布
  FastFill.prototype.resetCanvas = function () {
    imageHandle('图片重新加载完毕')
  }

  // 填色是否开启
  FastFill.prototype.isTurnOn = false

  // 注册开始
  FastFill.prototype.turnOn = function (cb = () => {}) {
    this.isTurnOn = true
    if (isEvent) return
    run()
  }

  // 监听填色开始
  FastFill.prototype.startFill = function (cb = () => {}) {
    startFillCB = cb
  }

  // 关闭填色，注销事件
  FastFill.prototype.turnOff = function (cb = () => {}) {
    cvs.removeEventListener('click', clickHandle)
    this.isTurnOn = false
    isEvent = false
    cb()
  }

  // 资源加载完成
  FastFill.prototype.loaded = (cb = () => {}) => {
    loadedCB = res => cb(res)
  }

  // 填色结果
  FastFill.prototype.fillDone = function (success = () => {}, error = () => {}) {
    successCB = () => success()
    errorCB = err => error(err)
  }

  // 初始化
  const init = (opt = {}) => {
    options = {
      ...options,
      ...opt,
    };

    elementId = options.elementId
    imageURL = options.imageURL
    canvasSize = options.canvasSize
    fillColor = options.fillColor
    coverFillColor = options.coverFillColor
    boundaryColor = options.boundaryColor
    isBanBoundaryColor = options.isBanBoundaryColor
    tolerance = options.tolerance > 200 ? 200 : options.tolerance
    directions = directions.filter((v, i) => (i & 1) === type)

    if (!elementId) error('options 的 elementId 不能为空！！')
    if (!imageURL) error('options 的 imageURL 不能为空！！')

    createScreen()
    imageHandle()
  }

  const createScreen = () => {
    const cvsContainer = d.getElementById(elementId)
    const [width, height] = canvasSize
    
    if (!cvsContainer) error('画布容器不存在！！')

    cvs.width = width
    cvs.height = height
    cvsContainer.append(cvs)
    ctx = cvs.getContext("2d")
  }

  // 图片加载
  const imageHandle = msg => {
    const image = new Image()

    image.src = imageURL

    image.onerror = function (e) {
      error('图片加载异常', e.type)
    }

    image.onload = function (e) {
      const [width, height] = canvasSize
      const imgWidth = e.path[0].width
      const imgHeight = e.path[0].height
      const cvsProportion = width / height
      const imgProportion = imgWidth / imgHeight

      imgDisplayWidth = cvsProportion >= imgProportion ? imgWidth * height / imgHeight : width
      imgDisplayHeight = cvsProportion >= imgProportion ? height :  width * imgHeight / imgWidth
      imgStartX = cvsProportion >= imgProportion ? (width / 2) - (imgDisplayWidth / 2) : 0
      imgStartY = cvsProportion >= imgProportion ? 0 : (height / 2) - (imgDisplayHeight / 2)

      ctx.drawImage(this, 0, 0, imgWidth, imgHeight, imgStartX, imgStartY, imgDisplayWidth, imgDisplayHeight);

      loadedCB({ msg });
    }
  }

  const run = () => {
    isEvent = true
    cvs.addEventListener('click', clickHandle)
  }

  // 点击事件处理
  const clickHandle = e => {
    // 填充起点矢量
    const [x, y] = getEventPosition(e)

    // 填充起点入栈
    fillStack = [[x, y]]

    const bool = invalidFillDetecion([x, y])
    if (!bool) return
    startFill()
  }

  // 无效填充检测
  const invalidFillDetecion = ([x, y]) => {
    const colorData = ctx.getImageData(x, y, 1, 1).data;

    if (x < imgStartX || y < imgStartY || x >= imgStartX + imgDisplayWidth || y >= imgStartY + imgDisplayHeight) {
      errorCB({
        msg: '无效填充区域',
      })
      return false
    }
    if (isBanBoundaryColor && isSameColor(colorData, boundaryColor)) {
      errorCB({
        msg: '选中颜色为禁止填充色',
      })
      return false
    }
    if (!isSameColor(colorData, coverFillColor)) {
      errorCB({
        msg: '选中颜色不是能被填充的颜色',
      })
      return false
    }

    return true
  }

  // 开始
  const startFill = () => {
    startFillCB()
    while(fillStack.length > 0) {
      drippingRecursion(fillStack)
    }
    endFill()
  }

  // 核心逻辑
  const drippingRecursion = stack => {
    const [x, y] = stack.shift()

    // 入栈于出栈
    solvedSet.add(`${x};${y}`)
    stackedSet.delete(`${x};${y}`)

    // 填色
    fill([x, y])

    // 方向检测
    directionDetection([x, y])
  }

  // 填色
  const fill = ([x, y]) => {
    const [r, g, b, a] = fillColor
    
    if (!imgData) {
      ctx.rect(x, y, 1, 1)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      ctx.fill()
      imgData = ctx.getImageData(x, y, 1, 1)
    } else {
      ctx.putImageData(imgData, x, y)
    }
  }

  // 方向检测
  const directionDetection = ([x, y]) => {
    // 不注释setTimeout可显示填色过程
    // setTimeout(() => {
    directions.forEach(([dirX, dirY]) => {
      const dirCoord = [x + dirX, y + dirY]

      if (pushTesting(dirCoord)) {
        fillStack.push(dirCoord)

        if (!solvedSet.has(`${dirCoord[0]};${dirCoord[1]}`)) {
          stackedSet.add(`${dirCoord[0]};${dirCoord[1]}`)
        }
      }
    })

    if (fillStack.length > 0) {
      if (count >= maxCount) {
        count = 0
        return
      }

      count += 1

      try{
        drippingRecursion(fillStack)
      } catch(e) {
        count = 0
        return
      }
    }
    // })
  }

  // 入栈检测
  const pushTesting = ([x, y]) => {
    const data = ctx.getImageData(x, y, 1, 1).data

    // 已经填充
    if (solvedSet.has(`${x};${y}`)) {
      return false
    }

    // 已经入栈
    if (stackedSet.has(`${x};${y}`)) {
      return false
    }

    // 色彩偏移
    if ((coverFillColor[0] - data[0] < -tolerance || coverFillColor[0] - data[0] > tolerance)
    || (coverFillColor[1] - data[1] < -tolerance || coverFillColor[1] - data[1] > tolerance)
    || (coverFillColor[2] - data[2] < -tolerance || coverFillColor[2] - data[2] > tolerance)
    || (coverFillColor[3] - data[3] < -tolerance || coverFillColor[3] - data[3] > tolerance)) {
      return false
    }

    // 边界色检测
    // if (isBanBoundaryColor && isSameColor(boundaryColor, data)) {
    //   endFill()
    //   return false
    // }

    return true
  }

  const endFill = () => {
    count = 0
    solvedSet.clear()
    stackedSet.clear()
    fillStack = []
    successCB()
  }

  // 抛出错误
  const error = msg => {
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
