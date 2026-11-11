# 时间的尽头 · LAST LIGHT

一个可以独立运行、继续开发并嵌入其他系统的 Three.js 交互式宇宙作品。浏览器加载页面后，在本地生成黑洞、星环、星尘和环境音；鼠标、触摸及时间轴操作改变场景状态，收集到的记忆索引只写入当前浏览器。构建过程将页面和依赖合并为静态资源，任何合适的 HTTP 静态服务器都可以提供这些文件。

此仓库包含真实的页面、样式、交互、GLSL 着色器和声音生成源码，来自已发布作品的源码版本 `591e1971f33204fe4ad05722cefcb3fccca5ee36`。交付时保留 `index.html`、`src/`、`public/` 和 Vite 构建配置的应用内容；新增运行说明与环境约束，调整项目名称，并将生产预览端口改为 4178。原站点没有被修改或重新发布。

- 原作品：<https://last-light-observatory-20261111.kingoo.chatgpt.site/>
- 源码仓库：<https://github.com/kkingo/last-light-demo>
- 接手开发前阅读：[给后续开发方 Codex 的交接说明](docs/给后续开发方Codex的交接说明.md)
- 本次实测范围和限制：[交付验证记录](docs/交付验证记录.md)

## 功能与技术栈

- 黑洞与吸积盘光流、破碎星环、程序生成的星云和漂浮遗迹。
- 鼠标环绕、滚轮缩放、触屏旋转与双指缩放、长按减速。
- 余晖、静寂、新生三个纪元；暂停、归位、画质切换和全屏。
- 收集五段记忆、浏览档案、刷新恢复收集进度、唤醒新星并重新开始。
- 用户手动开启的 Web Audio 环境音与提示音。
- 原生 JavaScript ES Modules、HTML、CSS、Three.js **0.187.0**、Vite **8.3.8**；精确依赖由 `package-lock.json` 固定。

这是一件艺术交互作品，黑洞、天文坐标和纪元不是科学数值模拟。

## 环境要求

| 项目 | 要求 |
| --- | --- |
| Node.js | 本仓库要求 **22.12.0 或以上**；推荐复现本次验证使用的 **24.12.0**，见 `.nvmrc` |
| npm | 10 或以上；本次使用 **11.6.2** |
| Git | 克隆和版本管理需要 Git |
| 浏览器 | 支持 WebGL 2、ES2022、原生 dialog 和 Web Audio 的现代浏览器；建议启用硬件加速 |
| 网络 | 第一次 `npm ci` 需要访问 npm 包源；网页运行不调用外部 API、字体或素材 CDN |

Windows、macOS、Linux 都可使用下述 npm 命令；本次实际验证系统及未覆盖环境详见验证记录。不同系统的字体、GPU、设备像素比、随机噪声和动画时刻可能造成画面细微差异，不承诺截图逐像素相同。

## 从克隆开始运行

在有仓库读取权限的账号环境中执行：

```sh
git clone https://github.com/kkingo/last-light-demo.git
cd last-light-demo
node --version
npm --version
npm ci
npm run dev
```

打开 **http://127.0.0.1:4177/**。`npm start` 是 `npm run dev` 的别名。使用 `Ctrl+C` 停止服务。

无需 API 密钥、账号配置、数据库建表、种子数据或其他初始化。`.env.example` 是仅含注释的配置说明，当前无需复制为 `.env`；项目没有读取环境变量的业务代码。

使用 nvm 的接收方可以先执行 `nvm install` 和 `nvm use`；没有 nvm 时直接安装上述 Node.js 版本即可。私有 GitHub 仓库需要所有者授予朋友读取权限，这只是源码访问权限，不是网页运行的依赖。

## 检查、构建与生产预览

```sh
npm run check
npm run build
npm run preview
```

- `npm run check` 检查 JavaScript 与 Vite 配置语法，不替代浏览器交互测试。
- `npm run build` 生成 `dist/`；其中包含入口 HTML、打包后的 JS/CSS 和第三方许可。
- `npm run preview` 在 **http://127.0.0.1:4178/** 提供构建产物，可与 4177 的开发服务同时运行。
- `preview` 用于验收，不是带 TLS、认证、限流和运维能力的生产服务。正式上线时由现有系统的静态服务器提供 `dist/`。
- Three.js 代码块约 628 kB，Vite 会提示单块超过 500 kB。这是体积提示，不是构建失败；实际大小以本机构建输出为准。

两个服务都使用 `--strictPort`，端口被占用会明确失败，不会悄悄换地址。可显式换端口：

```sh
npm run dev -- --port 4277
npm run preview -- --port 4278
```

不要直接双击 `index.html` 或用 `file://` 打开：源码使用 ES Modules 和 npm 包解析，须通过开发服务器或构建后的 HTTP 服务访问。

## 素材、后端、数据库与外部能力

| 内容 | 实际来源和交付状态 | 独立运行情况 |
| --- | --- | --- |
| 模型、星尘、纹理、光晕 | `world.js`、`shaders.js` 中由几何、GLSL、DataTexture、Canvas 生成 | 全部包含，无需外部下载 |
| 图标、胶片颗粒 | HTML/CSS 中内联 SVG 和 data URI | 全部包含 |
| 中文与英文字体 | 系统字体回退，见 `style.css` 的 `:root` | 不需要字体 CDN；没有私有字体文件可导出 |
| 环境音、收集提示音 | `audio.js` 使用 Web Audio 实时合成 | 全部包含，点击声音按钮后启动 |
| 后端与 HTTP API | 项目没有自有后端、服务端路由或 API 请求 | 无后端安装步骤，也无遗漏的后端目录 |
| 数据库 | 项目没有数据库 | 无 SQL、迁移或数据库示例数据 |
| 收集进度 | 当前浏览器的 localStorage | 无账号、云同步或跨设备同步 |
| npm 包源 | 安装 Three.js、Vite 及锁定的构建依赖 | 首次安装需联网；不是网页运行时云服务 |
| 原 Sites 托管与登录门禁 | 原平台提供域名、静态托管和访问控制 | 不是本项目后端，未导出；本地不需要 ChatGPT 登录 |

仓库没有原平台 `.openai/hosting.json` 绑定、部署令牌、浏览器登录信息或真实用户数据。原站点的登录页面不是此仓库中的应用功能；迁移后如需要登录保护，由接收方现有系统负责。

字体是系统回退而非遗漏素材。若未来需要跨设备一致的字体，可自行加入有分发授权的字体文件并添加 `@font-face`；本交付没有添加字体下载依赖。

## 数据存储与重置

唯一持久化键为 `last-light-observatory-v1`，值是 JSON 字符串：

```json
{"collected":[0,2]}
```

这是说明结构的示例，表示找到了第 1、3 段记忆，不是真实用户数据。有效索引是 `0..4`，默认进度为空；声音、视角、纪元与结局动画进度不持久化。存储不可用时仍能游玩，但刷新后不能保证恢复。

同一浏览器的不同 origin 各自保存进度，因此 `localhost`、`127.0.0.1`、不同端口和正式域名之间不共享。完整收集后点击「再赴一次星海」会清空当前进度；开发时也可以在本作品页面的开发者控制台执行：

```js
localStorage.removeItem('last-light-observatory-v1');
location.reload();
```

这只清理该键，不应清空宿主系统其他 localStorage 数据。

## 接入其他系统

### 作为静态子页面

1. 执行 `npm ci` 和 `npm run build`。
2. 将 `dist/` 的全部内容放到现有系统的静态目录，例如 `/last-light/`。
3. 通过 `/last-light/` 或 `/last-light/index.html` 访问，并让无尾斜杠的 `/last-light` 重定向到 `/last-light/`。

`vite.config.js` 使用 `base: './'`，构建后资源通过相对路径加载，不要求原域名。本应用没有前端路由或服务端接口，不需要把 `/api/*` 转发到其他服务。请保留 `assets/` 的层级、正确的 JavaScript/CSS MIME 类型及 `third-party-notices.txt`。

### 用 iframe 隔离嵌入

```html
<iframe
  src="/last-light/"
  title="时间的尽头"
  allow="fullscreen; autoplay"
  allowfullscreen
  style="display:block; width:100%; height:100dvh; border:0"
></iframe>
```

iframe 可隔离本作品的全屏 CSS、固定 DOM ID 和事件监听。声音依然需要用户在作品内点击开启，`allow="autoplay"` 不会绕过浏览器手势规则。宿主的 CSP、Permissions-Policy、frame-ancestors 及 iframe sandbox 规则需要允许脚本、WebGL、资源加载和所需的全屏/存储行为。上面的示例没有设置 sandbox；如现有系统需要 sandbox，应按安全要求单独验证，不能把其效果当作已完成测试。

### 接口边界

- 入口是 `index.html → src/main.js`，加载后自动启动。
- `window.__observatory.state` 和 `.diagnostics` 仅是只读调试快照，不是稳定业务 API；没有外部设置状态的方法。
- 当前**没有 HTTP API、WebSocket、postMessage 协议或可反复调用的 mount/dispose 接口**。
- 若需宿主按钮控制纪元、把收集结果保存到你的后端，或作为 React/Vue 路由组件反复挂载，需要增加明确的外部接口和生命周期清理；交接说明列出了改造位置。
- 同 origin 的多个副本使用同一个存储键，会共享收集进度。独立实例需要不同键和独立 DOM 作用域。

## 使用与常见问题

| 操作 | 行为 |
| --- | --- |
| 鼠标拖拽 / 单指拖动 | 环绕观察 |
| 滚轮 / 双指缩放 | 调整观察距离 |
| 长按空白处 | 减慢时间 |
| 点击菱形标记 | 收集记忆 |
| 底部时间轴 | 切换纪元 |
| 空格 / R / M / H | 暂停、归位、声音、帮助；输入控件或对话框拥有焦点时不会抢快捷键 |

- 一直停在连接提示或显示图形错误：检查 WebGL 2、硬件加速、浏览器控制台和包安装结果；图形上下文丢失后需刷新，当前没有自动重建。
- 没有声音：先点击右上角声音按钮，并检查浏览器/系统静音。程序不会自动播放。
- 在不同设备上略有不同：系统字体、GPU、像素比、动画时刻和音频随机噪声均可能不同。
- 性能不足：切换流畅画质；手机初始即使用流畅画质。暂停是视觉暂停，渲染循环仍在运行。
- 修改记忆数量：内容、三维位置、解锁条件和 HTML 计数目前共同约定五段，不能只添加一条文案。

第三方 Three.js 许可保存在 `public/third-party-notices.txt`，构建时一并复制。
