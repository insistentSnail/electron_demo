const { contextBridge, ipcRenderer } = require('electron')
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
  // ipcRenderer.send('getPsList')
})

/**
 * 使用上下文隔离 增加renderer安全性 让renderer使用序列化好的API使用
 * invoke 方法是异步的不会阻止其它方法
 * 在业务层面考虑使用 invoke 或者是 send/on
 */
contextBridge.exposeInMainWorld('fromManager', {
  enableChangeTabLock: () => {
    // 启用防切屏
    ipcRenderer.send('enableChangeTabLock')
  },
  // 禁用防切屏 允许切屏
  disableChangeTabLock: () => {
    ipcRenderer.send('disableChangeTabLock')
  },
  getIpAndMac: () => ipcRenderer.invoke('getIpMac'), // 获取mac地址
  getPsList: () => ipcRenderer.send('getPsList') // 检测进程
})
