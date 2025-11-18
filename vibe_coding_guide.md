最近Cursor的计费上调，让我们团队不得不寻找新的AI IDE工具，之前已经试用过国内几款主流的AI IDE工具，效果都不是很理想。近期听说`Comate`的`Zulu`智能体编程非常好用，正好手头有个MCP工具的想法，试试`Comate`能力的同时，也熟悉一下MCP工具的开发流程，一举多得。简单说下对这个MCP工具的想法：**可以记录在`Vibe Coding`过程中的踩坑经验，并在类似情况再次发生时，自动检索过去的经验，快速定位问题并解决，避免浪费开发者时间和大量token浪费。下文就是完整的实测记录与体会。**

### 🚀 开始

那么就开始试试`Comate`的能力怎么样吧，也顺便验证一下它在复杂MCP流程中的稳定度。

#### 📦 安装MCP

开发前，我们先来配置一下常用的两个MCP：`Supabase`和`Context7`，这两个工具这里不做过多介绍。在`Comate`中配置MCP也非常简单：展开AI侧边栏，点击右上角的MCP，在MCP市场搜索到添加就可以

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/d34bea66e7584ae7a355336558325272~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=VaSX9zh9u4exG9NYVXfer1J0Rs8%3D)
`Supabase`在MCP市场里找不到，没有关系，点击右上角手动配置，打开json文件，手动添加就可以了

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/12a4b7116f74489c99665fc7546bb9a3~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=2HQgnLHI8BouV48j%2BNISzU4kJP0%3D)

#### 🗂️ 文档生成

正常来说，配置好MCP后就可以直接对话`Zulu`智能体开始开发了。不过，针对这个MCP工具我还有一些想法，比如有个后台管理，还要有个搜索页面，几个加在一起就有些复杂了。针对这种复杂的项目，我习惯先使用`Spec Kit`工具先生成文档（包含项目章程、需求、设计、数据模型、任务拆分、验收清单等），生成后的文档如下：

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/c75a312a0b2c4a59b173f026a2af613b~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=2h9SfgouPXzmkVJ%2BUt1tN6AiWdM%3D)

### 🤖 Zulu智能体启动

所有文档都生成之后，终于到我们的`Zulu`智能体发力了。可以看到我一口气将所有文档都塞了进去，`Zulu`阅读文档了解整个需求后，拆分了7个待办任务，并按照优先级逐个实现。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/cdbc5ec46e174f379b379c8d7485b929~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=6XZuXw3Agw5fXkqGVFS1dJ5wWGc%3D)

整个Coding过程还是很出乎意料的，除了每实现一到两个任务需要我人工确认下一步，期间并没有什么问题，非常顺利的将整个项目的功能都实现了一遍。当然并不是说整个项目就这么开发好了，但基本上也有`60%~70%`的完成度了。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/5dd088ba6bd34239a99bd3f93fe32b6a~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=N3A%2FKgsc0r6wCK07Xsh%2FafPyGoc%3D)

期间闹了个小乌龙，因为我对MCP了解的不够深入，以为MCP的client也需要开发，所以写在文档中了，其实这部分是不用开发的，浪费了不少的快速请求次数。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/852b7a59ce9b45ab86aa0fe90298cd3e~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=IrSwLltAdtFDuiABUFxrX60ZE9s%3D)

之后就是常见的启动 --> 运行 --> 报错 --> 修复 --> 再启动的开发流程了

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/48267ffececd4b57babdb6e821431db5~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=3LrC2DW%2BAXD%2FLGb%2B42rLtZEHJsw%3D)

### 🌟 点名表扬

开发期间最让我感到意外和好用的是这个功能，通过`Comate`内置的浏览器**可以直接选择页面元素，指哪改哪**，改起前端真是太好用了。这个功能也是我另一个项目灵感来源，这里就不展开说了。

![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/7d4ec20e96c440cba829a49dc68bab6a~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=YqD3KLRjDV1mnkO71DWUATZmu7M%3D)

## 🧾 总结

简单做个使用总结，`Comate`的`Zulu`智能体整体使用下来的感觉很好，快速模式下响应速度很快，产出的代码质量也很高，不过在一些bug修复、问题解决的能力上还是稍有不足。赠送的50次快速请求要比我预想的更加耐用一些，开发一个小项目不成问题。不过期间IDE还是偶发出现了些小问题，主要是`直接选择页面元素`那部分功能，浏览器中打开后，选中元素无法带回对话框内，只有在IDE内打开才行；另外不支持自定义命令让我很不习惯，之前自己整理了很多自定义命令都没用上。整体来看，它仍旧是当前国内体验最能打的AI IDE之一。

## 🎬 作品演示（Recall Kit）

首页
![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/26681e5f4c374247901311b887253547~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=3ytWlzoJP3r9IY2KATZiOpJ%2FuiA%3D)
搜索页（向量检索）
![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/29e4bd012379425f8bc291a2d79ae9b8~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=kE5YnrWBgleHxDkQM012XGxXs2Q%3D)
后台
![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/52c9eb72a91b40bda3b555f6b5a28290~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=4e6kRzuxCbPYBBzDRb%2FUx2nJt3Y%3D)
Cusror中MCP（比较乌龙，MCP开发用的最新的StreamableHTTP，但Comate不支持这个。。）
![image.png](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/7901e4a0107449cabbac2bf08aaffc4e~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgQ29kZXZh:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMjE0MDEyMTAzOTExNTE5NSJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1764000939&x-orig-sign=tHpb%2BbBBy2SlNSUO%2FMhbzbDFRZI%3D)

