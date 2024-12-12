export default class ResiChild {
  constructor(container, options = {}) {
    // 配置默认选项
    if (typeof container === 'string') container = document.querySelector(container)
    if (!container) {
      // eslint-disable-next-line no-console
      console.error('Can not find container', container, options)
      return
    }

    this.container = container
    this.options = {
      buttonTextMore: 'More',
      buttonTextLess: 'Less',
      buttonClass: 'responsive-button',
      collapsedClass: 'collapsed',
      popover: false,
      clone: false,
      popoverWrapClass: 'responsive-popover-wrap',
      popoverWrapStyle: `
  position: absolute;
  visibility: hidden;
  height: 0;
  z-index: 1000;
  background: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);`,
      popoverClass: 'responsive-popover',
      popoverStyle: `
  padding: 10px;
  width: auto;
  width: fit-content;`,
      popoverContainer: document.body,
      hiddenClass: 'responsive-hide',
      ...options
    }
    this.button = null // 按钮元素
    this.popoverWrap = null // 弹出层元素
    this.hiddenElements = [] // 溢出的子元素
    this.isCollapsed = true // 初始状态为折叠
    this.resizeObserver = null
    this.popoverVisible = false // 用于控制弹出层是否显示
    this.handleClickOutside = this.handleClickOutside.bind(this) // 绑定点击外部事件

    this.init()
  }

  init() {
    // 创建“显示更多”按钮
    this.createButton()
    if (this.options.popover) {
      // 创建弹出层
      this.createPopover()
    }

    // 初始化 ResizeObserver
    this.resizeObserver = new ResizeObserver(() => this.checkOverflow())
    this.resizeObserver.observe(this.container)

    // 初次加载检查
    this.checkOverflow()
  }

  createButton() {
    const button = document.createElement('button')
    button.type = 'button'
    button.innerHTML = this.options.buttonTextMore
    button.className = this.options.buttonClass
    button.classList.add(this.options.hiddenClass)
    button.style.display = 'none' // 默认隐藏
    button.addEventListener('click', () => this.toggleShowMore())
    this.container.appendChild(button)
    this.button = button
  }

  createPopover() {
    const popoverWrap = document.createElement('div')
    popoverWrap.className = this.options.popoverWrapClass
    popoverWrap.style.cssText = this.options.popoverWrapStyle
    popoverWrap.classList.add(this.options.hiddenClass)

    const popover = document.createElement('div')
    popover.className = this.options.popoverClass
    popover.style.cssText = this.options.popoverStyle
    popoverWrap.appendChild(popover)

    this.options.popoverContainer.appendChild(popoverWrap)

    this.popoverWrap = popoverWrap
    this.popover = popover
  }

  getElementPlaceWidth(target) {
    const cs = window.getComputedStyle(target)
    return target.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight)
  }

  checkOverflow() {
    const style = window.getComputedStyle(this.container)
    const containerWidth = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth)
    if (containerWidth <= 0) return

    // 先显示按钮用于计算宽度
    this.button.style.display = ''
    Object.assign(this.button.style, {
      position: 'absolute',
      display: '',
      visibility: 'hidden'
    })
    const buttonWidth = this.getElementPlaceWidth(this.button)

    // 是否需要显示的隐藏元素
    const needToHideChild = !this.options.popover || this.options.clone

    const children = Array.from(this.container.children).filter((el) => {
      if (needToHideChild) {
        el.style.display = ''
      }
      return el !== this.button && el !== this.popoverWrap
    })

    if (this.options.popover && !this.options.clone) {
      children.push(...this.hiddenElements)
    }

    let viewCount = 0
    let currentWidth = 0

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const childWidth = this.getElementPlaceWidth(child)
      if (currentWidth + buttonWidth > containerWidth) {
        viewCount--
        break
      }
      if (currentWidth + childWidth > containerWidth) {
        break
      }
      currentWidth += childWidth
      viewCount++
    }

    this.hiddenElements = children.slice(viewCount)
    if (needToHideChild) {
      this.hiddenElements.forEach((el) => {
        el.style.display = 'none'
      })
    }

    const hasHidChild = this.hiddenElements.length > 0
    Object.assign(this.button.style, {
      position: '',
      display: hasHidChild ? '' : 'none',
      visibility: ''
    })
    this.button.classList[hasHidChild ? 'remove' : 'add'](this.options.hiddenClass)

    if (this.options.popover && this.popoverWrap) {
      this.updatePopover()
    }
  }

  updatePopover() {
    if (!this.popoverWrap) return

    if (this.options.clone) {
      this.popover.innerHTML = ''
    } else {
      // 未在隐藏列表的元素，要移回原位
      Array.from(this.popover.children).forEach((el) => {
        if (!this.hiddenElements.includes(el)) {
          this.container.insertBefore(el, this.button)
        }
      })
    }

    // 将被隐藏的元素添加到弹出层
    this.hiddenElements.forEach((child) => {
      // 直接移到弹层中
      if (this.options.clone) {
        const clone = child.cloneNode(true)
        clone.style.display = '' // 确保克隆的元素可见
        this.popover.appendChild(clone)
      } else {
        this.popover.appendChild(child)
      }
    })

    // 更新弹出层位置
    const rect = this.button.getBoundingClientRect()
    // const popoverRect = this.popover.getBoundingClientRect();
    const containerRect = this.options.popoverContainer.getBoundingClientRect()
    this.popoverWrap.style.top = `${rect.bottom - containerRect.top + 5}px`
    this.popoverWrap.style.left = `${rect.right - containerRect.left - this.popoverWrap.offsetWidth}px`
  }

  toggleShowMore() {
    if (this.options.popover) {
      this.togglePopover()
    } else {
      this.isCollapsed = !this.isCollapsed
      this.updateButton()
      this.updateContent()
    }
  }

  togglePopover(show = !this.popoverVisible) {
    if (show) {
      // this.popover.style.display = "block";
      this.popoverWrap.style.visibility = 'visible'
      this.popoverWrap.style.height = 'auto'
      this.popoverVisible = true
      document.addEventListener('mousedown', this.handleClickOutside)
    } else {
      // this.popover.style.display = "none";
      this.popoverWrap.style.visibility = 'hidden'
      this.popoverWrap.style.height = 0
      this.popoverVisible = false
      document.removeEventListener('mousedown', this.handleClickOutside)
    }
    this.popoverWrap.classList[this.popoverVisible ? 'remove' : 'add'](this.options.hiddenClass)
  }

  handleClickOutside(event) {
    if (this.popoverWrap && !this.popoverWrap.contains(event.target) && !this.button.contains(event.target)) {
      this.togglePopover(false)
    }
  }

  updateButton() {
    this.button.innerHTML = this.isCollapsed
      ? this.options.buttonTextMore
      : this.options.buttonTextLess
  }

  updateContent() {
    this.hiddenElements.forEach((child) => {
      child.style.display = this.isCollapsed ? 'none' : ''
    })
    this.container.classList[this.isCollapsed ? 'add' : 'remove'](this.options.collapsedClass)
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    if (this.button) {
      this.button.remove()
    }
    if (this.popoverWrap) {
      this.popoverWrap.remove()
    }
  }
}
