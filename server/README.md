# Fastify Mock Backend

## 启动
```bash
npm run mock:server
```

- 默认监听：`127.0.0.1:3001`
- 可通过环境变量覆盖：
```bash
HOST=127.0.0.1 PORT=3001 npm run mock:server
```

## 接口清单（PRD 最小合同）
- `POST /parent/signup`
- `POST /consent/guardian`
- `GET /consent/record`
- `POST /consent/revoke`
- `POST /child-profile`
- `POST /child-profile/delete`
- `GET /catalog`
- `GET /lesson-pack/:id`
- `POST /session/start`
- `POST /session/answer`
- `POST /session/finish`
- `POST /session/recitation`
- `POST /review/answer`
- `GET /review-queue`
- `GET /progress-summary`
- `GET /parent/weekly-report`
- `GET /parent/settings`
- `POST /parent/settings`
- `GET /parent/export-data`
- `GET /health`

## 调试示例
```bash
curl -sS http://127.0.0.1:3001/health
```

```bash
curl -sS -X POST http://127.0.0.1:3001/parent/signup \
  -H 'Content-Type: application/json' \
  -d '{"account":"13800000000","code":"123456"}'
```

```bash
curl -sS -X POST http://127.0.0.1:3001/session/start \
  -H 'Content-Type: application/json' \
  -d '{"childId":"child_xxx","lessonId":"g4_u1_l03"}'
```

```bash
curl -sS -X POST http://127.0.0.1:3001/session/finish \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"sess_xxx","completed":true}'
```

## 合同测试
```bash
npm run test:api
```

## 说明
- 当前为内存态 mock，不持久化数据库。
- 已支持同一 `childId` 的会话恢复（`forceNew=false` 时返回活动会话）。
- OpenAPI 文件：`server/openapi.yaml`
- 课文包/题库/学习卡配置集中在 `server/content-items.mjs`（`content-domain.mjs` 负责读取与校验）。
- `GET /catalog` 的 `grades`、`textbookVersions`、`lessons` 均由内容配置自动生成。
- 当前内置示例课文：`g4_u1_l03`（观潮）、`g4_u1_l04`（走月亮）。
- 复习队列与判题逻辑已抽离到 `server/review-domain.mjs`（`/review-queue`、`/review/answer` 共用）。
- 复习题配置集中在 `server/review-items.mjs`（`REVIEW_ITEMS` + `RETRY_ITEMS_BY_ERROR_TAG`）。
- 可配合前端远程模式运行：
```bash
EXPO_PUBLIC_API_MODE=remote EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 npm run start
```

## 错误返回格式
```json
{
  "requestId": "req_xxx",
  "errorCode": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": []
}
```

- 常见 `errorCode`：
  - `VALIDATION_ERROR`
  - `PARENT_NOT_FOUND`
  - `CHILD_NOT_FOUND`
  - `LESSON_NOT_FOUND`
  - `LESSON_PACK_NOT_FOUND`
  - `SESSION_NOT_FOUND`
  - `SESSION_NOT_COMPLETED`
  - `QUESTION_NOT_FOUND`
  - `REVIEW_ITEM_NOT_FOUND`
  - `REVIEW_OPTION_OUT_OF_RANGE`
  - `CONSENT_REQUIRED`
  - `CONSENT_NOT_FOUND`
  - `PARENT_CHILD_MISMATCH`
  - `NOT_FOUND`
  - `INTERNAL_ERROR`
