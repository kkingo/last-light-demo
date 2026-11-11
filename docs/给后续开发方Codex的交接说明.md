# 给后续开发方 Codex 的交接说明

本项目把浏览器中的交互输入转换为场景状态，再逐帧更新 Three.js 世界、界面和合成声音。全部应用代码在客户端执行，唯一持久化内容是当前浏览器保存的记忆收集索引；构建结果可放到接收方自己的静态服务器。现阶段以整页运行或 iframe 嵌入为边界，后续若需宿主系统控制或 SPA 反复挂载，应先补充外部协议与资源生命周期，而不是直接重复加载入口脚本。

## 接手时先确认的事实

- 本仓库是《时间的尽头》的完整应用源码，来自已发布源提交 `591e1971f33204fe4ad05722cefcb3fccca5ee36`。
- 原站点地址仅用于来源识别；本仓库不包含原 Sites 项目绑定，也没有原平台部署权限。不要据此去更新原站点。
- 应用没有后端、数据库、用户账户、云同步、HTTP API、WebSocket 或运行时外部素材下载。
- 不需要任何 API Key；`.env.example` 只是说明模板，没有虚构的配置项。
- 首次安装需要 npm 包源。运行时的黑洞、星云、碎片、图片纹理及音频均在浏览器生成。
- 原 Sites 的域名、访问控制和登录门禁是平台基础设施，未导出，也不是遗漏的自有后端。迁移后要保护页面访问，应接入宿主自身的认证系统。
- 精确验收环境、执行结果和未验证部分以同目录的 `交付验证记录.md` 为准；不要把旧对话中描述的测试当成本轮证据。

## 目录与职责

```text
last-light-demo/
├── index.html                       页面 DOM 与模块入口
├── src/
│   ├── main.js                      运行入口、状态、控制器、动画循环
│   ├── world.js                     Three.js 场景对象与逐帧更新
│   ├── shaders.js                   GLSL 着色器和最终屏幕效果
│   ├── ui.js                        界面绑定、记忆文案与显示状态
│   ├── audio.js                     Web Audio 合成声音
│   └── style.css                    排版、全屏界面与响应式样式
├── public/third-party-notices.txt    Three.js MIT 声明
├── docs/                            本交接说明和本次验证记录
├── package.json                     依赖、Node/npm 约束、启动命令
├── package-lock.json                npm 精确依赖锁文件
├── vite.config.js                   相对资源路径、构建目标与分包
├── .env.example                     无必填环境变量的说明模板
├── .nvmrc                           验证使用的 Node 版本
├── .gitignore                       排除缓存、产物、凭据和平台绑定
├── .gitattributes                   文本换行规则
├── AGENTS.md                        后续自动化开发约定
└── README.md                        从克隆到运行与集成的说明
```

`node_modules/`、`dist/`、原平台 `.openai/`、旧 `.git/` 历史、日志、截图、浏览器 profile 和真实环境文件均未导入。接收方 `npm ci` 后重新生成依赖，`npm run build` 后重新生成 `dist/`。

## 启动与数据流

1. `index.html` 提供 `#universe` 画布容器、`#fragment-labels` 标记层、时间轴、按钮及档案/帮助对话框，并加载 `/src/main.js`。
2. `main.js` 读取本地存储，过滤五段记忆的有效索引；创建 `ObservatoryAudio` 并把回调交给 `initUI`。
3. `start()` 创建渲染器、相机和 `OrbitControls`，调用 `createWorld()` 生成世界，再配置后处理和可点击标记。
4. Three.js 编译着色器成功后，`ui.ready()` 隐藏加载提示，`animate()` 开始逐帧更新。
5. 用户操作经 UI 回调或指针事件改变主程序状态；动画循环把时间、纪元、脉冲、新生进度传给世界和着色器。
6. 收集时更新三维晶体、DOM 标记、界面计数与档案，同时将索引写回 localStorage。

`OrbitControls` 是 Three.js 提供的相机交互控制器。`EffectComposer` 是本项目使用的后处理流水线，依次执行场景渲染、泛光、输出颜色变换和自定义的暗角/颗粒/轻微色差。它们不是服务端组件。

## 模块内部接口

这些接口用于当前源码模块之间协作，尚未承诺作为外部系统的稳定 API。

| 入口 | 作用与约束 |
| --- | --- |
| `initUI(callbacks)` | `ui.js` 绑定固定 DOM ID、按钮、输入和快捷键，返回 `ready()`、`update(patch)`、`toast(text)`、`showMemory(index)`、`setError(message)` |
| UI callbacks | `onTime(value)` 接收 0–1；其余为 `onExplore/onAudio/onPause/onReset/onQuality/onRebirth` |
| `update(patch)` | 支持部分界面状态；`collected` 是索引数组，`chapter` 为 0/1/2，`quality` 为 high/low |
| `createWorld(renderer, scene, {mobile})` | `world.js` 创建场景，返回 `update`、`memories`、`shared`、`hole`、`architecture`、`starCount`、`rubbleCount` |
| `world.update(...)` | 接收 `time/era/pulse/birth/camera/dpr/reduceMotion`，更新场景姿态、粒子和统一着色器变量 |
| `ObservatoryAudio` | `audio.js` 的音频控制类，提供 `toggle/chime/setEra/suspend/resume`；首次 toggle 才创建音频上下文 |
| `window.__observatory.state` | 主程序初始化后提供的只读状态快照；不要通过修改返回对象来控制应用 |
| `window.__observatory.diagnostics` | 调试读取帧率、像素比、相机、粒子数量等；`drawCalls` 不是可靠的整帧后处理总调用数 |

页面末尾加载 `main.js` 会自动启动；没有导出的应用工厂、HTTP 路由、postMessage 消息格式或 `mount/dispose`。

## 状态与存储

`main.js` 管理时间轴目标值、平滑后的纪元、暂停、声音、画质、探索状态、新生状态及长按状态。记忆由一个 Set 保存，避免重复收集；新生进度使用未暂停时累计的帧时间。

持久化协议只有一个键：

```js
// Schema example only; no real user progress is shipped.
localStorage.setItem('last-light-observatory-v1', JSON.stringify({
  collected: [0, 2]
}));
```

- 只接受整数 `0..4`；重复项由 Set 合并。
- 解析异常、存储被拒绝等情况不会阻止场景运行，但不会显示额外的保存失败提示。
- 不保存声音、相机、纪元、暂停或结局播放进度。
- 同 origin 的不同路径共享这个键；不同 origin、浏览器或设备不共享。
- 「归位」只重置相机和主标题，不清空进度。「再赴一次星海」在结局后清空收集进度。
- 无数据库，因而无表结构、SQL 初始化或用户数据导出任务。

如果增加后端同步，需要自行设计账户归属、数据协议、冲突处理和失败恢复；当前的 localStorage 不是安全或防作弊边界。

## 当前配置和耦合点

- `package.json`：开发地址 127.0.0.1:4177，生产预览地址 127.0.0.1:4178，两者均 strictPort；Node >=22.12.0，建议按 `.nvmrc` 复现。
- `vite.config.js`：`base: './'`，输出 ES2022，Three.js 独立分包；构建产物适合静态子路径。
- `main.js`：以宽度 700 为手机镜头断点；高画质像素比上限 1.5，低画质上限 0.85；自动降画质不会自动升回。
- `world.js`：首次手机加载时为 6,600 个星点/尘埃与 150 块残骸，首次桌面加载为 13,000 与 290；仅改变窗口尺寸不会重新生成数量。
- 五段记忆共同耦合 `ui.js` 的 `MEMORIES`、`world.js` 的坐标数组、`main.js` 的索引校验和解锁数量，以及 `index.html` 的计数和五个进度点。增减数量需要同步维护。
- `style.css` 使用 `html/body`、固定定位、全屏遮罩及系统字体；这不是带局部 CSS 作用域的可嵌入组件。

## 集成的起点与尚未完成的能力

**当前可用边界**是整页静态部署或 iframe。README 提供了子路径部署与 iframe 示例；如果宿主只需展示作品，这两种方式能保留目前的 CSS 和 DOM 约定。

以下是后续功能方向，均未在本仓库中实现，不能向接收方描述为已有能力：

1. **SPA 生命周期与多实例。** 需要把自动启动改为显式实例创建，给 DOM 查询增加容器作用域，并提供停止 RAF、卸载 window/document/控件监听、清理计时器、关闭 AudioContext、dispose 控制器/材质/几何/纹理/渲染器的完整退出路径。
2. **宿主控制协议。** 如果通过 postMessage 暴露暂停、纪元和收集事件，需要设计消息版本、目标 origin、来源校验、白名单与确认回执；当前不存在该协议。采用同页函数调用也应先封装实例接口。
3. **账户和云同步。** 需要接收方自行提供认证、存储、API 与访问控制，项目没有这些服务的占位实现。

实施上述改造前，应由接收方说明现有系统的框架、嵌入方式、登录要求和保存需求；不要根据原平台的登录页面推断本项目已有后台。

## 已知限制

- 需要 WebGL 2；上下文丢失时给出刷新提示，未自动重建。
- 暂停冻结场景时间与新生进度，但不停止 RAF 或 GPU 渲染；改变时间轴后仍可看到状态平滑过渡。
- 系统字体回退、设备像素比和 GPU 差异会改变细节；音频随机噪声、动画时刻也不保证一致。
- 画质切换调整分辨率与泛光，不会完整重新配置场景复杂度。
- 音频须在用户手势后启动；自动化只能验证音频上下文和开关状态，不能证明扬声器听感。
- Three.js 构建块超过 Vite 默认 500 kB 提示阈值；是否继续拆分应依据实际加载性能，不应通过移除必要效果来仅消除提示。
- 没有浏览器兼容性保证覆盖所有实体手机；本次实测范围见验证记录。
- 不是科学仿真，也没有多人、支付、后台管理、账户体系、数据导出或远程资源 API。

## 推荐的接手顺序

1. 先按 README 完成全新克隆、`npm ci`、`npm run check`、`npm run build` 与浏览器游玩，得到自己的基准结果。
2. 确认宿主只需 iframe 展示，还是确实需要组件化/业务控制；后者先处理生命周期与接口边界。
3. 修改视觉或记忆内容后回归探索、旋转、缩放、长按、暂停、五段收集、刷新恢复、新生、重玩及窄屏交互。

临时测试数据、截图和日志写入 `tmp/`，不得把测试浏览器的实际 localStorage 或登录 profile 提交到仓库。
