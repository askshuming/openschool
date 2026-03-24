export const DEFAULT_PORT = 4310;
export const DEFAULT_MINIMAX_MODEL = 'MiniMax2.7';

export const MINIMAX_ENDPOINT_CANDIDATES = [
  'https://api.minimax.io/v1/text/chatcompletion_v2',
  'https://api.minimax.io/v1/chat/completions',
  'https://api.minimax.chat/v1/chat/completions',
];

export const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

export const GRADE_PROFILES = {
  kindergarten: { age: '4-6', tone: '游戏化启蒙', pace: '短时高互动' },
  primaryLower: { age: '6-8', tone: '故事化+可视化', pace: '每段 6-8 分钟' },
  primaryUpper: { age: '9-12', tone: '概念讲清+例题演示', pace: '每段 8-12 分钟' },
  middleSchool: { age: '12-15', tone: '方法训练+题型迁移', pace: '每段 12-15 分钟' },
  highSchool: { age: '15-18', tone: '考点拆解+高密度训练', pace: '每段 15-20 分钟' },
};
