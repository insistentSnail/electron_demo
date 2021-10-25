// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const gotTheLock = app.requestSingleInstanceLock()
// const loginUrl = 'https://yd.signup.yunduancn.com/#/examLogin'
const loginUrl = 'http://localhost:9528/#/examLogin'

// 屏蔽快捷热键、切屏
const childProcess = require('child_process')
let appPath = app.getAppPath()
console.log(appPath, 'appPath')
appPath = appPath.replace('app.asar', '')

// 启动脚本的方法
function runExec() {
  // 不受child_process默认的缓冲区大小的使用方法，没参数也要写上{}：workerProcess = exec(cmdStr, {})
  workerProcess = childProcess.spawn('AutoHotkey.exe', { cwd: appPath })
  // 打印正常的后台可执行程序输出
  workerProcess.stdout.on('data', function (data) {})

  // 打印错误的后台可执行程序输出
  workerProcess.stderr.on('data', function (data) {})

  // 退出之后的输出
  workerProcess.on('close', function (code) {})
}

// 屏蔽任务管理器脚本
const sudo = require('sudo-prompt')
function disabledTask() {
  console.log(111111)
  const options = {
    name: 'Electron'
    // cwd: appPath+'\\resources'
  }
  sudo.exec('./resources/jy.bat', options, function (error, stdout, stderr) {
    if (error) throw error
    console.log('stdout: ' + stdout)
  })
}

// 重启任务管理器脚本
function enableTask() {
  console.log(222222)
  const options = {
    name: 'Electron'
    // cwd: appPath
  }
  sudo.exec('./resources/start.bat', options, function (error, stdout, stderr) {
    if (error) throw error
    console.log('stdout: ' + stdout)
  })
}

// 监听网页调用
const getmac = require('getmac') // 获取电脑mac地址
const psList = require('ps-list') // 获取进程列表
function ipcEvent() {
  ipcMain.on('checkForUpdate', () => {
    //执行自动更新检查
    autoUpdater.checkForUpdates()
  })

  ipcMain.on('enableChangeTabLock', () => {
    // 不允许切屏
    if (!workerProcess) {
      runExec()
    }
  })

  ipcMain.on('disableChangeTabLock', () => {
    // 允许切屏
    if (workerProcess) {
      workerProcess.kill()
      workerProcess = null
    }
  })

  ipcMain.handle('getIpMac', () => {
    // 获取电脑mac地址
    return getmac.default()
  })

  ipcMain.on('getPsList', () => {
    // 检测进程
    psList().then(n => {
      let map = {
        'wechat.exe': '微信',
        'dingtalk.exe': '钉钉',
        'tim.exe': 'TIM',
        'qq.exe': 'QQ'
      }
      for (let i = 0; i < n.length; i++) {
        const exe = n[i].name.toLocaleLowerCase()
        if (map[exe]) {
          // mainWindow.setAlwaysOnTop(false) //设置在最上级

          return dialog
            .showMessageBox(mainWindow, {
              type: 'error',
              title: '检测到有聊天工具',
              message: '检测到' + map[exe] + '正在运行，请关闭' + map[exe],
              detail: '检测到有聊天工具正在运行，请关闭后重新打开页面!',
              buttons: ['确定']
            })
            .then(returnValue => {
              app.exit()
            })
        }
      }
    })
  })

  ipcMain.on('send_message_load', (event, arg) => {
    console.log(arg)
    event.sender.send('asynchronous-message', 'electron传给web的数据')
    dialog
      .showMessageBox({
        type: 'info',
        title: '提示',
        message: '你想要关闭这个应用吗?',
        buttons: ['是', '否']
      })
      .then(index => {
        if (index.response == 0) {
          canQuit = true
          // app.quit();
          // 放在关闭之前调用就行
          // runExec3()
          setTimeout(() => {
            app.exit()
          }, 500)
        }
      })
  })
}

let canQuit = false

var mainWindow = null

function createWindow() {
  disabledTask()
  // runExec2()
  // exec('.\\AutoHotkey.exe');   //启动脚本

  runExec() //启动脚本
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true, //全屏
    resizable: false, // 窗口是否可调整大小
    minimizable: false, // 窗口是否可最小化
    closable: false, //窗口是否可以关闭. 在 Linux上无效. 默认为 true
    alwaysOnTop: false, //窗口是否总是显示在其他窗口之前. 在 Linux上无效. 默认为 false   可以切屏但是切不出去
    autoHideMenuBar: true, //除非点击 Alt ，否则隐藏菜单栏.默认为 false
    resizable: false, //是否可以改变窗口size，默认为 true
    frame: false, //指定 false 来创建一个 Frameless Window. 默认为 true  去除顶部所有导航按钮
    autoHideMenuBar: true, //隐藏菜单栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  })

  // and load the index.html of the app.
  // mainWindow.loadFile('index.html')
  app.commandLine.appendSwitch('--disable-http-cache') // 禁用缓存

  //   测试与打包地址之间的通信
  mainWindow.loadURL(loginUrl)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // 禁止关闭应用
  mainWindow.on('close', event => {
    if (!canQuit) {
      event.preventDefault()
    }
  })
  ipcEvent()

  mainWindow.on('closed', () => {
    // exec('TASKKILL /IM AutoHotkey.exe'); // 终止脚本
    mainWindow = null
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  mainWindow.show()
}

if (!gotTheLock) {
  app.quit()
} else {
  // 只打开一个应用
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
      mainWindow.show()
    }
  })
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()

    workerProcess.kill() // 终止脚本
  })

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  function checkUpdate() {
    if (process.platform == 'darwin') {
      //我们使用koa-static将静态目录设置成了static文件夹，
      //所以访问http://127.0.0.1:9005/darwin，就相当于访问了static/darwin文件夹，win32同理
      autoUpdater.setFeedURL('http://localhost:8888/update') //设置要检测更新的路径
    } else {
      autoUpdater.setFeedURL('http://localhost:8888/update')
    }

    //检测更新
    autoUpdater.checkForUpdates()

    //监听'error'事件
    autoUpdater.on('error', err => {
      console.log(err)
    })

    //监听'update-available'事件，发现有新版本时触发
    autoUpdater.on('update-available', () => {
      console.log('found new version')
    })

    //默认会自动下载新版本，如果不想自动下载，设置autoUpdater.autoDownload = false

    //监听'update-downloaded'事件，新版本下载完成时触发
    autoUpdater.on('update-downloaded', () => {
      // 设置层级
      mainWindow.setAlwaysOnTop(false)

      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: '应用更新',
          message: '发现新版本，是否更新？',
          buttons: ['是', '否']
        })
        .then(buttonIndex => {
          if (buttonIndex.response == 0) {
            //选择是，则退出程序，安装新版本
            autoUpdater.quitAndInstall()
            app.quit()
          }
        })
    })
  }

  app.on('ready', () => {
    //每次启动程序，就检查更新
    checkUpdate()

    // 注册全局快捷键
    globalShortcut.register('CommandOrControl+Alt+K', () => {
      // 设置层级
      // mainWindow.setAlwaysOnTop(false)

      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: '提示',
          message: '你想要关闭这个应用吗?',
          buttons: ['是', '否']
        })
        .then(index => {
          console.log('you chose', index)
          if (index.response == 0) {
            canQuit = true
            // app.quit();
            // 放在关闭之前调用就行
            enableTask()
            setTimeout(() => {
              app.exit()
            }, 500)
          }
        })
    })

    globalShortcut.register('CommandOrControl+shift+I', () => {
      // event.preventDefault()
      // 屏蔽调用控制台
    })
    globalShortcut.register('Alt+R', () => {
      // event.preventDefault()
      // 强制刷新
      mainWindow.webContents.reloadIgnoringCache()
    })
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll() //注销所有快捷键
  })
}
