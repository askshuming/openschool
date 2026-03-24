# LessonForge Family MVP

一个独立的 clean-room 原型，用来验证“家长上传教材并生成对应课程”的产品链路。

## 原则

- 不在现有 AGPL 项目上继续开发
- 不复用原仓库代码、目录结构和交互实现
- 只复用高层产品思路：材料输入 -> 孩子画像 -> 课程蓝图

## 当前能力

- 家长表单采集：年级、学科、教材版本、章节、薄弱点、课时等
- 文件上传：记录教材文件信息，TXT/MD 自动读取摘要
- 课程生成 API：用启发式逻辑生成课程蓝图、练习和家长提示
- 本地运行：只依赖 Node，无需安装额外包

## 启动

```bash
cd cleanroom-parent-mvp
npm run dev
```

打开 `http://localhost:4310`。

页面层级：
- 首页：`/`
- 生成页：`/planner.html`
- 课程页：`/course.html`

## 项目结构

```text
cleanroom-parent-mvp/
  public/                      # 前端静态页面（已拆分页面层级）
    index.html
    planner.html
    course.html
    styles.css
    common.js
    home.js
    planner.js
    course.js
  src/
    config/                    # 环境变量与全局常量
    domain/course/             # 课程蓝图启发式生成逻辑
    domain/material/           # 教材输入解析与信号提取
    services/minimax/          # MiniMax 调用与结果合并逻辑
    http/                      # body 解析、响应、静态文件服务
    server/                    # 路由与应用 server 组装
  server.mjs                   # 启动入口（薄层）
  run-minimax.sh               # 一键写入 key 并启动
```

## 校验

```bash
npm run check
```

## 调试接口（可选）

用于检查“教材输入 -> 结构化信号”的解析效果：

```bash
curl -sS -X POST http://localhost:4310/api/parse-material \
  -H 'Content-Type: application/json' \
  -d '{"subject":"数学","grade":"小学三年级","chapter":"分数初步认识","materialNotes":"真分数、假分数、分数大小比较","focusAreas":"应用题读题慢"}'
```

上传文件并由服务端抽取文本摘要（txt/md/csv/json）：

```bash
BASE64=$(printf '分数是把单位1平均分成若干份。' | base64)
curl -sS -X POST http://localhost:4310/api/upload-material \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"chapter1.txt\",\"type\":\"text/plain\",\"size\":48,\"base64\":\"$BASE64\"}"
```

PDF 兼容策略：默认走元信息模式（不上传整份 PDF 正文），即使文件较大也可继续生成课程。

## MiniMax 测试配置

服务端会优先尝试 MiniMax（模型默认 `MiniMax2.7`），失败后自动回退到内置规则引擎。

最简单做法（不用懂代码）：

```bash
cd /Users/mac/Documents/openmaic/cleanroom-parent-mvp
./run-minimax.sh "你的key"
```

打开页面后生成课程，状态栏会提示本次来源是 `minimax` 还是 `rules`。

如果还显示 `rules`，用带地址的命令重跑：

```bash
./run-minimax.sh "你的key" "你的PAI完整地址"
```

## 下一步建议

1. 接入真实 PDF/OCR 解析器
2. 接入 LLM 生成正式课程脚本、讲义和练习
3. 增加登录、课程历史、支付和交付链路
