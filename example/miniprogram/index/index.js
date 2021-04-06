import FillFast from './lib/fillfast_miniprogram'
import { colors } from './config'

const app = getApp()

Page({
  data: {
    FF: null,
    current: 0,
    colors,
  },
  onLoad() {
    const query = wx.createSelectorQuery()
    query.select('#myCanvas')
      .fields({ node: true, size: true })
      .exec(this.canvasHandle.bind(this))
  },
  canvasHandle(res) {
    const { node, width, height } = res[0]
    this.FF = FillFast.create({
      canvas: node,
      canvasSize: [width, height],
      imageURL: '/index/images/timg-small.jpg',
      fillColor: colors[0].color,
      tolerance: 120,
    })

    // 图片资源加载完成回调
    this.FF.loaded(res => {
      this.FF.turnOn();
      console.log(res.msg ? res.msg : '图片加载完毕')
    })

    // 监听开始填充
    this.FF.startFill(() => {
      console.log('填充开始')
    })

    // 监听填充完毕
    this.FF.fillDone(() => {
      console.log('填充完成')
    }, () => {
      console.log('填充失败')
    })
  },
  resetHandle () {
    this.FF.resetCanvas()
  },
  selectImgHandle () {
    wx.chooseImage({
      count: 1,
      success: res => {
        const { tempFilePaths } = res
        this.FF.reset({
          imageURL: tempFilePaths[0],
        })
      },
    })
  },
  selectColorHandle (e) {
    const { color, index } = e.target.dataset

    this.FF.reset({
      fillColor: colors[index].color,
    })

    this.setData({
      current: index,
    })
  },
  tapHandle (e) {
    this.FF.tapHandle(e)
  },
})
