import { createServer } from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

function requestId() {
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function json(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const lessonPack = {
  id: "g4_u1_l03",
  title: "观潮",
  genre: "modern_text",
  grade: "G4",
  textbookVersion: "PEP",
  paragraphs: [
    {
      id: "p1",
      text: "钱塘江大潮，自古以来被称为天下奇观。",
      simpleExplanation: "钱塘江的潮水很有名，古时候起就被认为很壮观。",
      summary: "开头点出钱塘江大潮很壮观。",
      keySentenceIds: ["s1"],
    },
  ],
  vocab: [
    {
      word: "奇观",
      pinyin: "qí guān",
      explanation: "雄伟美丽而少见的景象",
      contextSentence: "钱塘江大潮，自古以来被称为天下奇观。",
    },
  ],
  structureMap: ["写潮来前的期待", "写潮来时的声音和样子", "写潮过后的感受"],
  mainIdea: "课文描写了钱塘江大潮的壮丽景象，表达了作者的赞叹。",
  evidenceBank: [
    {
      questionId: "q_evidence_1",
      paragraphId: "p1",
      evidenceText: "自古以来被称为天下奇观",
    },
  ],
};

const cards = [
  {
    id: "c_intro",
    type: "intro",
    skillTag: "main_idea",
    payload: {
      title: "导学卡",
      goals: ["理解课文写了什么", "学会从文中找依据", "完成 1 道小测"],
    },
  },
  {
    id: "c_vocab",
    type: "vocab",
    skillTag: "vocab",
    payload: {
      title: "字词卡",
      vocabItems: [
        {
          word: "奇观",
          pinyin: "qí guān",
          explanation: "雄伟美丽而少见的景象",
          example: "钱塘江大潮，自古以来被称为天下奇观。",
        },
      ],
    },
  },
  {
    id: "c_reading",
    type: "close_reading",
    skillTag: "sentence_understanding",
    payload: {
      title: "精读卡",
      paragraph: "钱塘江大潮，自古以来被称为天下奇观。",
      simpleExplanation: "钱塘江的潮水从古时候就很有名，大家都觉得很壮观。",
    },
  },
  {
    id: "c_main",
    type: "main_idea",
    skillTag: "main_idea",
    payload: {
      title: "主旨卡",
      structure: ["潮来前的期待", "潮来时的声音和样子", "潮过后的感受"],
      mainIdea: "课文描写钱塘江大潮的壮丽景象，表达作者赞叹。",
    },
  },
  {
    id: "c_quiz",
    type: "quiz",
    skillTag: "evidence_locating",
    payload: {
      title: "小测卡",
      questionId: "q_evidence_1",
      body: "哪句话最能说明钱塘江大潮非常有名？",
      options: [
        "江面很宽，水势很大。",
        "自古以来被称为天下奇观。",
        "大家早早来到江边等待。",
        "潮水来得很快。",
      ],
    },
  },
  {
    id: "c_feedback",
    type: "feedback",
    skillTag: "evidence_locating",
    payload: {
      title: "反馈卡",
      body: "提交答案后查看错因和证据句。",
    },
  },
  {
    id: "c_summary",
    type: "summary",
    skillTag: "main_idea",
    payload: {
      title: "收尾卡",
      mastered: ["奇观词义", "依据句定位", "主旨概括"],
      nextReview: "明天复习：证据句定位",
    },
  },
];

const parentSettingsByParent = new Map();
const parentIds = new Set();
const guardianConsentByParent = new Map();
const childProfilesById = new Map();

function defaultParentSettings(parentId) {
  return {
    parentId,
    studyDurationLimitMin: 15,
    reminderTime: "19:30",
    updatedAt: nowIso(),
  };
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    json(res, 400, { requestId: requestId(), message: "Invalid request" });
    return;
  }

  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (req.method === "POST" && path === "/parent/signup") {
      const body = await readJsonBody(req);
      if (!body.account || !body.code) {
        json(res, 400, { requestId: requestId(), message: "Missing account or code" });
        return;
      }
      const parentId = `parent_${Date.now()}`;
      parentIds.add(parentId);
      parentSettingsByParent.set(parentId, defaultParentSettings(parentId));
      json(res, 200, { requestId: requestId(), parentId });
      return;
    }

    if (req.method === "POST" && path === "/consent/guardian") {
      const body = await readJsonBody(req);
      const parentId = body.parentId;
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      if (!body.agreed) {
        json(res, 400, { requestId: requestId(), message: "Consent required" });
        return;
      }
      const consentId = `consent_${Date.now()}`;
      const agreedAt = new Date().toISOString();
      guardianConsentByParent.set(parentId, {
        consentId,
        parentId,
        relation: body.relation ?? "other_guardian",
        childUnder14: Boolean(body.childUnder14),
        agreed: Boolean(body.agreed),
        agreedAt,
      });
      json(res, 200, {
        requestId: requestId(),
        consentId,
        agreedAt,
      });
      return;
    }

    if (req.method === "GET" && path === "/consent/record") {
      const parentId = url.searchParams.get("parentId");
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      const record = guardianConsentByParent.get(parentId);
      if (!record) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "CONSENT_NOT_FOUND",
          message: "Guardian consent record not found",
        });
        return;
      }
      json(res, 200, {
        requestId: requestId(),
        ...record,
      });
      return;
    }

    if (req.method === "POST" && path === "/consent/revoke") {
      const body = await readJsonBody(req);
      const parentId = body.parentId;
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      const record = guardianConsentByParent.get(parentId);
      if (!record) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "CONSENT_NOT_FOUND",
          message: "Guardian consent record not found",
        });
        return;
      }
      if (!record.revokedAt) {
        record.revokedAt = new Date().toISOString();
        guardianConsentByParent.set(parentId, record);
      }
      json(res, 200, {
        requestId: requestId(),
        consentId: record.consentId,
        parentId,
        status: "revoked",
        revokedAt: record.revokedAt,
      });
      return;
    }

    if (req.method === "POST" && path === "/child-profile") {
      const body = await readJsonBody(req);
      if (!body.nickname) {
        json(res, 400, { requestId: requestId(), message: "Nickname required" });
        return;
      }
      const parentId = body.parentId;
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      const consent = guardianConsentByParent.get(parentId);
      if (!consent || !consent.agreed || !consent.childUnder14 || consent.revokedAt) {
        json(res, 409, {
          requestId: requestId(),
          errorCode: "CONSENT_REQUIRED",
          message: "Consent required",
        });
        return;
      }
      const childId = `child_${Date.now()}`;
      childProfilesById.set(childId, {
        childId,
        parentId,
        nickname: body.nickname,
        grade: body.grade ?? "G4",
        textbookVersion: body.textbookVersion ?? "PEP",
        interests: body.interests ?? [],
        readingLevel: body.readingLevel ?? "normal",
      });
      json(res, 200, { requestId: requestId(), childId });
      return;
    }

    if (req.method === "POST" && path === "/child-profile/delete") {
      const body = await readJsonBody(req);
      const parentId = body.parentId;
      const childId = body.childId;
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      const child = childProfilesById.get(childId);
      if (!child) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "CHILD_NOT_FOUND",
          message: "Child not found",
        });
        return;
      }
      if (child.parentId !== parentId) {
        json(res, 409, {
          requestId: requestId(),
          errorCode: "PARENT_CHILD_MISMATCH",
          message: "Parent does not own this child profile",
        });
        return;
      }
      childProfilesById.delete(childId);
      json(res, 200, {
        requestId: requestId(),
        childId,
        status: "deleted",
        deletedAt: nowIso(),
      });
      return;
    }

    if (req.method === "GET" && path === "/parent/settings") {
      const parentId = url.searchParams.get("parentId") ?? "parent_demo";
      const settings = parentSettingsByParent.get(parentId) ?? defaultParentSettings(parentId);
      parentSettingsByParent.set(parentId, settings);
      json(res, 200, {
        requestId: requestId(),
        ...settings,
      });
      return;
    }

    if (req.method === "POST" && path === "/parent/settings") {
      const body = await readJsonBody(req);
      const parentId = body.parentId ?? "parent_demo";
      const settings = {
        parentId,
        studyDurationLimitMin: body.studyDurationLimitMin ?? 15,
        reminderTime: body.reminderTime ?? "19:30",
        updatedAt: nowIso(),
      };
      parentSettingsByParent.set(parentId, settings);
      json(res, 200, {
        requestId: requestId(),
        ...settings,
      });
      return;
    }

    if (req.method === "GET" && path === "/parent/export-data") {
      const parentId = url.searchParams.get("parentId");
      const childId = url.searchParams.get("childId");
      if (!parentId || !parentIds.has(parentId)) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "PARENT_NOT_FOUND",
          message: "Parent not found",
        });
        return;
      }
      const child = childProfilesById.get(childId ?? "");
      if (!child) {
        json(res, 404, {
          requestId: requestId(),
          errorCode: "CHILD_NOT_FOUND",
          message: "Child not found",
        });
        return;
      }
      if (child.parentId !== parentId) {
        json(res, 409, {
          requestId: requestId(),
          errorCode: "PARENT_CHILD_MISMATCH",
          message: "Parent does not own this child profile",
        });
        return;
      }
      json(res, 200, {
        requestId: requestId(),
        parentId,
        childId,
        exportedAt: nowIso(),
        profile: {
          nickname: child.nickname,
          grade: child.grade,
          textbookVersion: child.textbookVersion,
          interests: child.interests,
          readingLevel: child.readingLevel,
        },
        progressSummary: {
          completedLessons: 4,
          averageDurationMin: 9,
          masteredTags: ["vocab", "evidence_locating", "main_idea"],
        },
        weeklyReport: {
          weeklyCompletedLessons: 4,
          averageDurationMin: 9,
        },
        attemptsCount: 0,
        recitationsCount: 0,
      });
      return;
    }

    if (req.method === "GET" && path === "/catalog") {
      json(res, 200, {
        requestId: requestId(),
        grades: ["G4"],
        textbookVersions: ["PEP"],
        lessons: [{ id: "g4_u1_l03", title: "观潮", unitId: "u1" }],
      });
      return;
    }

    if (req.method === "GET" && path.startsWith("/lesson-pack/")) {
      json(res, 200, { requestId: requestId(), lessonPack });
      return;
    }

    if (req.method === "POST" && path === "/session/start") {
      const body = await readJsonBody(req);
      json(res, 200, {
        requestId: requestId(),
        sessionId: `sess_${Date.now()}`,
        lessonId: body.lessonId || "g4_u1_l03",
        cards,
      });
      return;
    }

    if (req.method === "POST" && path === "/session/answer") {
      const body = await readJsonBody(req);
      const correct = body.selectedIndex === 1;
      json(res, 200, {
        requestId: requestId(),
        correct,
        skillTag: "evidence_locating",
        errorTag: correct ? undefined : "evidence_missed",
        feedback: {
          whyWrong: correct ? "定位准确，继续保持。" : "题目问的是“有名”的依据句。",
          evidenceText: "自古以来被称为天下奇观。",
          retryQuestion: "再找一句能体现“奇观”的原文。",
        },
      });
      return;
    }

    if (req.method === "POST" && path === "/session/recitation") {
      json(res, 200, {
        requestId: requestId(),
        status: "recorded",
        segmentId: "seg_1",
        completedAt: nowIso(),
        message: "本段朗读已记录，继续保持。",
      });
      return;
    }

    if (req.method === "GET" && path === "/review-queue") {
      json(res, 200, {
        requestId: requestId(),
        items: [
          {
            id: "r1",
            targetType: "vocab",
            title: "奇观词义",
            dueAt: "today",
            status: "pending",
            difficulty: "basic",
          },
          {
            id: "r2",
            targetType: "evidence_locating",
            title: "依据句定位",
            dueAt: "tomorrow",
            status: "pending",
            difficulty: "medium",
          },
          {
            id: "r3",
            targetType: "recitation",
            title: "背诵片段 2",
            dueAt: "3d",
            status: "done",
            difficulty: "advanced",
          },
        ],
      });
      return;
    }

    if (req.method === "GET" && path === "/progress-summary") {
      json(res, 200, {
        requestId: requestId(),
        completedLessons: 4,
        averageDurationMin: 9,
        masteredTags: ["vocab", "evidence_locating"],
      });
      return;
    }

    if (req.method === "GET" && path === "/parent/weekly-report") {
      json(res, 200, {
        requestId: requestId(),
        weeklyCompletedLessons: 4,
        averageDurationMin: 9,
        errorDistribution: {
          vocab_unknown: 0.34,
          evidence_missed: 0.41,
          main_idea_off: 0.25,
        },
        recitation: {
          completedCount: 0,
          unstableSegments: [],
        },
      });
      return;
    }

    json(res, 404, { requestId: requestId(), message: "Not Found" });
  } catch (error) {
    json(res, 500, {
      requestId: requestId(),
      message: error instanceof Error ? error.message : "Internal Error",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`Mock server running at http://localhost:${PORT}`);
});
