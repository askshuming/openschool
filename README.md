# 语文伴学 App 1.0（UI 骨架）

## 本次已完成
- Expo + TypeScript 基础工程
- React Query + Zustand 状态架构
- 本地持久化（onboarding + 学习会话断点）
- 设计 Token（颜色/字体/间距/圆角/动效）
- Onboarding 合规流程（家长登录 -> 监护人同意 -> 孩子档案）
- 核心页面：
  - 首页
  - 学习页（7 卡闭环：导学/字词/精读/主旨/小测/反馈/收尾）
  - 复习页（队列模式 + 单题快速复习 + 今日批量复习）
  - 家长页
- 通用组件：
  - `AppButton`
  - `AppCard`
  - `AppInput`
  - `ProgressHeader`
  - `FeedbackBox`
  - `StatusChip`
- Mock API 契约层：
  - `/catalog`
  - `/parent/signup`
  - `/consent/guardian`
  - `/child-profile`
  - `/session/start`
  - `/session/answer`
  - `/session/finish`
  - `/review/answer`
- Fastify 后端增强：
  - 路由 schema 校验（请求体/查询参数）
  - 统一错误格式（`errorCode` + `message` + `details`）
  - 监护人同意记录查询与撤回（`/consent/record`、`/consent/revoke`）
- 页面真实查询化：
  - `Home` 页走 `/catalog` + `/progress-summary`
  - 首页重构为“拍照生成课程 / 上传资料生成课程”双主入口
  - 首页主文案聚焦“拍照随时学”，默认短屏（减少信息堆积）
  - 首页保留“继续学习”与“进度快览”，并将庆祝反馈改为轻提示卡
  - `Review` 页走 `/review-queue`
  - `Review` 页新增默认折叠队列（先展示焦点信息，按需展开）
  - `Parent` 页走 `/catalog` + `/progress-summary` + `/parent/weekly-report`
  - `Parent` 页新增“展开详细信息”折叠层，默认短屏查看
- 会话体验：
  - 首页区分“开始今天学习（新会话）”与“继续上次（断点恢复）”
  - 学习页支持“重新开始本课”
  - 学习页支持“稍后继续”返回首页（保留断点）
  - 完成学习后调用 `session/finish` 关闭活动会话
  - 完成学习后回到首页展示一次性“达成”轻庆祝提示（6 秒自动收起）
  - 学习页/复习页答题后自动滚动至反馈与下一步按钮
  - 复习批量练习支持“跳过本题（后移队尾）”
  - 复习完成后展示总结卡（批量/单题），可回首页查看已联动的目标进度
- 页面级状态组件：
  - `loading`
  - `empty`
  - `error`
  - `offline`
- iOS 适配：
  - 顶部/底部安全区（刘海屏与 Home Indicator）
  - TabBar 安全区高度与键盘收起
  - 登录/同意/建档页 KeyboardAvoidingView 键盘避让
  - 主要滚动页 `contentInsetAdjustmentBehavior` 与滚动指示器边距
  - 首页/复习/家长支持原生下拉刷新（`RefreshControl`）
  - 关键滚动页支持 iOS `interactive` 键盘下拉收起
  - 按钮命中区域与按压反馈增强（更稳定的儿童点击体验）
  - 判题结果触发轻震动反馈（正确/错误区分）
- 导航增强：
  - 底部 Tab 的“复习”入口展示待复习数量角标
- 查询 hooks：
  - `useCatalog`
  - `useLearningSession`
  - `useReviewQueue`
  - `useProgressSummary`
  - `useWeeklyReport`
- 错误提示：
  - 前端支持按 `errorCode` 映射中文友好提示
- 基础埋点（本地存储）：
  - `home_start_tap`
  - `session_started`
  - `session_paused`
  - `card_viewed`
  - `answer_submitted`
  - `feedback_viewed`
  - `review_item_skipped`
  - `review_completed`
  - `weekly_report_opened`

## 运行
```bash
npm install
npm run start
```

## 数据源切换
- 默认：本地函数 mock（无需起服务）
- 远端 HTTP：
```bash
EXPO_PUBLIC_API_MODE=remote EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 npm run start
```

## 本地接口桩
```bash
npm run mock:server
```
- 详细说明见：[server/README.md](/Users/mac/Documents/openschool/server/README.md)
- OpenAPI 合同见：[server/openapi.yaml](/Users/mac/Documents/openschool/server/openapi.yaml)
- API 合同测试：
```bash
npm run test:api
```

## 目录
- `src/design`: 设计系统 token 与主题
- `src/components`: 通用 UI 组件
- `src/components/states`: 页面状态组件
- `src/screens`: 页面实现
- `src/api`: mock API 与契约类型
- `src/hooks`: 数据查询 hooks
- `src/state`: 全局应用状态（onboarding / profile）
- `server`: 本地 mock 后端（PRD 最小 API 合同）
- `src/data/mock.ts`: PRD 对应 mock 数据
- `docs/yuwen-ui-spec-v1.md`: UI 规范文档
