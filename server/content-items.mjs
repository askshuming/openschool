export const LESSON_PACKS = {
  g4_u1_l03: {
    id: "g4_u1_l03",
    title: "观潮",
    unitId: "u1",
    genre: "modern_text",
    grade: "G4",
    textbookVersion: "PEP",
    focusSkillTag: "evidence_locating",
    parentSuggestion:
      "建议优先训练证据句定位：先圈题干关键词，再回原文找直接对应句。",
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
  },
  g4_u1_l04: {
    id: "g4_u1_l04",
    title: "走月亮",
    unitId: "u1",
    genre: "modern_text",
    grade: "G4",
    textbookVersion: "PEP",
    focusSkillTag: "main_idea",
    parentSuggestion:
      "建议优先训练主旨归纳：先说段意，再合并成“人物 + 情感 + 场景”的一句话。",
    paragraphs: [
      {
        id: "p1",
        text: "啊，我和阿妈走月亮！",
        simpleExplanation: "我和妈妈在月光下散步。",
        summary: "开篇点明人物和场景。",
        keySentenceIds: ["s1"],
      },
      {
        id: "p2",
        text: "细细的溪水，流着山草和野花的香味。",
        simpleExplanation: "小溪缓缓流动，周围有花草的香味。",
        summary: "描写夜晚环境，营造温柔氛围。",
        keySentenceIds: ["s2"],
      },
    ],
    vocab: [
      {
        word: "汩汩",
        pinyin: "gǔ gǔ",
        explanation: "形容水流动的声音",
        contextSentence: "溪水汩汩地流着。",
      },
    ],
    structureMap: ["点明走月亮", "描写月夜景物", "表达亲情与喜悦"],
    mainIdea: "课文通过月夜散步场景，表达了孩子与母亲之间温暖的情感。",
    evidenceBank: [
      {
        questionId: "q_moonlight_1",
        paragraphId: "p2",
        evidenceText: "细细的溪水，流着山草和野花的香味。",
      },
    ],
  },
};

export const QUESTION_BANK = {
  q_evidence_1: {
    correctIndex: 1,
    skillTag: "evidence_locating",
    errorTag: "evidence_missed",
    evidenceText: "自古以来被称为天下奇观。",
    whyWrong: "题目要找“有名”的依据句，不是一般描述。",
    retryQuestion: "再找一句能体现“奇观”的原文。",
  },
  q_moonlight_1: {
    correctIndex: 2,
    skillTag: "main_idea",
    errorTag: "main_idea_off",
    evidenceText: "啊，我和阿妈走月亮！",
    whyWrong: "主旨题要抓“人物关系 + 情感基调”，不能只看景物描写。",
    retryQuestion: "再选一句最能体现“我和阿妈感情”的句子。",
  },
};

export const LESSON_CARDS_BY_ID = {
  g4_u1_l03: [
    {
      id: "l03_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: ["理解课文写了什么", "学会从文中找依据", "完成 1 道小测"],
      },
    },
    {
      id: "l03_vocab",
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
          {
            word: "屹立",
            pinyin: "yì lì",
            explanation: "像山峰一样高耸而稳固",
            example: "高楼屹立在江边。",
          },
        ],
      },
    },
    {
      id: "l03_reading",
      type: "close_reading",
      skillTag: "sentence_understanding",
      payload: {
        title: "精读卡",
        paragraph: "钱塘江大潮，自古以来被称为天下奇观。",
        simpleExplanation: "钱塘江的潮水从古时候就很有名，大家都觉得很壮观。",
      },
    },
    {
      id: "l03_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: "主旨卡",
        structure: ["潮来前的期待", "潮来时的声音和样子", "潮过后的感受"],
        mainIdea: "课文描写钱塘江大潮的壮丽景象，表达作者赞叹。",
      },
    },
    {
      id: "l03_quiz",
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
      id: "l03_feedback",
      type: "feedback",
      skillTag: "evidence_locating",
      payload: {
        title: "反馈卡",
        body: "提交答案后查看错因和证据句。",
      },
    },
    {
      id: "l03_recitation",
      type: "recitation",
      skillTag: "recitation",
      payload: {
        title: "朗读卡",
        segmentId: "l03_seg_1",
        recitationText: "钱塘江大潮，自古以来被称为天下奇观。",
        recitationTip: "先听一遍示范，再按停顿朗读一遍。",
        durationSec: 20,
      },
    },
    {
      id: "l03_summary",
      type: "summary",
      skillTag: "main_idea",
      payload: {
        title: "收尾卡",
        mastered: ["奇观词义", "依据句定位", "主旨概括"],
        nextReview: "明天复习：证据句定位",
      },
    },
  ],
  g4_u1_l04: [
    {
      id: "l04_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: ["感受月夜画面", "理解句子情感", "完成 1 道主旨题"],
      },
    },
    {
      id: "l04_vocab",
      type: "vocab",
      skillTag: "vocab",
      payload: {
        title: "字词卡",
        vocabItems: [
          {
            word: "汩汩",
            pinyin: "gǔ gǔ",
            explanation: "形容水流动的声音",
            example: "溪水汩汩地流着。",
          },
          {
            word: "柔和",
            pinyin: "róu hé",
            explanation: "温和而不刺眼",
            example: "月光柔和地洒在小路上。",
          },
        ],
      },
    },
    {
      id: "l04_reading",
      type: "close_reading",
      skillTag: "sentence_understanding",
      payload: {
        title: "精读卡",
        paragraph: "细细的溪水，流着山草和野花的香味。",
        simpleExplanation: "作者用视觉和嗅觉描写，让月夜更有画面感。",
      },
    },
    {
      id: "l04_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: "主旨卡",
        structure: ["走月亮场景", "沿途景物描写", "亲情情感表达"],
        mainIdea: "文章通过“我”和阿妈走月亮，表达温暖亲情与夜色之美。",
      },
    },
    {
      id: "l04_quiz",
      type: "quiz",
      skillTag: "main_idea",
      payload: {
        title: "小测卡",
        questionId: "q_moonlight_1",
        body: "《走月亮》最想表达下面哪一层意思？",
        options: [
          "介绍月亮的科学知识。",
          "重点写夜晚天气变化。",
          "表现我和阿妈在月夜散步时的温暖情感。",
          "说明山路很难走。",
        ],
      },
    },
    {
      id: "l04_feedback",
      type: "feedback",
      skillTag: "main_idea",
      payload: {
        title: "反馈卡",
        body: "主旨题要同时关注人物关系和情感线索。",
      },
    },
    {
      id: "l04_recitation",
      type: "recitation",
      skillTag: "recitation",
      payload: {
        title: "朗读卡",
        segmentId: "l04_seg_1",
        recitationText: "啊，我和阿妈走月亮！",
        recitationTip: "先按语气停顿分句，再完整朗读一遍。",
        durationSec: 18,
      },
    },
    {
      id: "l04_summary",
      type: "summary",
      skillTag: "main_idea",
      payload: {
        title: "收尾卡",
        mastered: ["月夜画面感", "关键词提取", "主旨归纳"],
        nextReview: "明天复习：主旨与情感判断",
      },
    },
  ],
};
