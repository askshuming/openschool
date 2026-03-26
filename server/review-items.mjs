export const REVIEW_ITEMS = [
  {
    id: "r1",
    targetType: "vocab",
    title: "奇观（词义辨析）",
    dueAt: "today",
    status: "pending",
    difficulty: "basic",
    practice: {
      stem: "“奇观”在课文中更接近下面哪个意思？",
      options: ["平常景色", "雄伟而少见的景象", "天气变化", "江面宽度"],
    },
    answer: {
      correctIndex: 1,
      feedback: {
        correctMessage: "词义判断很准确，继续保持。",
        wrongMessage: "先看词语所在句，再抓“奇”和“观”两个关键词。",
        evidence: "课文中“天下奇观”强调的是“少见且壮观”的景象。",
      },
    },
  },
  {
    id: "r2",
    targetType: "evidence_locating",
    title: "找出描写潮声的依据句",
    dueAt: "today",
    status: "pending",
    difficulty: "medium",
    practice: {
      stem: "哪句最能作为“钱塘江大潮非常有名”的依据？",
      options: [
        "潮水来得很快。",
        "自古以来被称为天下奇观。",
        "很多人站在江边。",
        "江面非常宽阔。",
      ],
    },
    answer: {
      correctIndex: 1,
      feedback: {
        correctMessage: "依据句找得很准。",
        wrongMessage: "题目问“有名”，优先找直接表达“闻名/奇观”的句子。",
        evidence: "“自古以来被称为天下奇观”直接体现“有名”。",
      },
    },
  },
  {
    id: "r3",
    targetType: "main_idea",
    title: "《观潮》主旨一句话",
    dueAt: "tomorrow",
    status: "pending",
    difficulty: "medium",
    practice: {
      stem: "下面哪一句最贴近《观潮》这篇课文的主旨？",
      options: [
        "江边很热闹，大家都很开心。",
        "课文主要写了钱塘江大潮的壮丽景象。",
        "作者重点介绍了江边天气变化。",
        "文章主要讲了古诗背诵技巧。",
      ],
    },
    answer: {
      correctIndex: 1,
      feedback: {
        correctMessage: "主旨概括方向正确。",
        wrongMessage: "主旨要覆盖全文核心内容，不只抓局部细节。",
        evidence: "文章围绕潮来前、潮来时、潮过后展开，核心是“大潮壮观”。",
      },
    },
  },
  {
    id: "r4",
    targetType: "recitation",
    title: "《古诗三首》背诵片段 2",
    dueAt: "3d",
    status: "done",
    difficulty: "advanced",
    practice: {
      stem: "开始背诵前，哪种做法更有助于准确朗读？",
      options: ["直接加速背", "先听一遍示范并划分停顿", "跳过难句", "只背最后一句"],
    },
    answer: {
      correctIndex: 1,
      feedback: {
        correctMessage: "方法选得很好，先听后读更稳。",
        wrongMessage: "先建立节奏和停顿，再背诵会更准确。",
        evidence: "先听示范并划分停顿，可以显著降低漏字和错断句。",
      },
    },
  },
];

export const RETRY_ITEMS_BY_ERROR_TAG = {
  evidence_missed: {
    id: "retry_evidence_locating",
    targetType: "evidence_locating",
    title: "错题回顾：依据句定位",
    dueAt: "today",
    status: "pending",
    difficulty: "medium",
    practice: {
      stem: "再练：哪句最能说明“钱塘江大潮非常有名”？",
      options: [
        "潮水来得很快。",
        "自古以来被称为天下奇观。",
        "很多人站在江边。",
        "江面非常宽阔。",
      ],
    },
    answer: {
      correctIndex: 1,
      feedback: {
        correctMessage: "这次找对了，依据句定位更稳了。",
        wrongMessage: "继续抓关键词“奇观/有名”，优先选直接证据句。",
        evidence: "“自古以来被称为天下奇观”是最直接证据。",
      },
    },
  },
};
