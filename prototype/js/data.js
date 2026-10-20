/* ============================================================
   data.js — 种子数据 / 数据模型
   ============================================================ */
(function (global) {
  'use strict';

  // ---------- 种子数据 ----------
  const SEED_JUDGES = [
    {
      id: 'judge-001',
      name: '陈 慕 涵',
      title: '评委会主席 · 钢琴演奏家',
      initial: '陈',
      role: '主席',
      phone: '13900000001',
      bio: '中央音乐学院钢琴系教授，旅欧钢琴演奏家，曾获范·克莱本国际钢琴比赛银奖。担任多项国际钢琴赛事评委。',
      expertise: ['肖邦', '拉赫玛尼诺夫', '李斯特'],
      years: 28,
      avatarUrl: 'assets/judges/j-001.png',
      avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)'
    },
    {
      id: 'judge-002',
      name: '李 正 熙',
      title: '评委会副主席 · 钢琴教育家',
      initial: '李',
      role: '副主席',
      phone: '13900000002',
      bio: '上海音乐学院附中钢琴学科主任，上海市优秀青年教师，从事钢琴教学与演奏三十年，培养出数十位国际比赛获奖选手。',
      expertise: ['古典奏鸣曲', '巴赫', '莫扎特'],
      years: 30,
      avatarUrl: 'assets/judges/j-002.png',
      avatarColor: 'linear-gradient(135deg, #b13b3b, #6b2828)'
    },
    {
      id: 'judge-003',
      name: '伊 莎 贝 拉',
      title: '国际评委 · 意大利钢琴家',
      initial: 'I',
      role: '国际评委',
      phone: '13900000003',
      bio: '意大利米兰音乐学院终身教授，伊莫拉国际钢琴学院客座艺术家，活跃于欧洲各大音乐节与大师班。',
      expertise: ['德彪西', '拉威尔', '斯卡拉蒂'],
      years: 22,
      avatarUrl: 'assets/judges/j-003.png',
      avatarColor: 'linear-gradient(135deg, #5b9ed1, #2c5e8a)'
    },
    {
      id: 'judge-004',
      name: '王 思 远',
      title: '评委 · 青年演奏家',
      initial: '王',
      role: '评委',
      phone: '13900000004',
      bio: '青年钢琴演奏家，慕尼黑国际音乐比赛金奖得主，现任浙江音乐学院钢琴系青年教师。',
      expertise: ['李斯特超技练习曲', '普罗科菲耶夫'],
      years: 12,
      avatarUrl: 'assets/judges/j-004.png',
      avatarColor: 'linear-gradient(135deg, #4f9d6f, #2d5a3e)'
    },
    {
      id: 'judge-005',
      name: 'Helena K.',
      title: '国际评委 · 德国钢琴家',
      initial: 'H',
      role: '国际评委',
      phone: '13900000005',
      bio: '德国汉诺威音乐学院教授，专精于德奥学派演奏传统，柏林爱乐特邀独奏家。',
      expertise: ['贝多芬', '勃拉姆斯', '舒曼'],
      years: 25,
      avatarUrl: 'assets/judges/j-005.png',
      avatarColor: 'linear-gradient(135deg, #8a6a2c, #4f3a18)'
    },
    {
      id: 'judge-006',
      name: '苏 羽 晴',
      title: '评委 · 教育专家',
      initial: '苏',
      role: '评委',
      phone: '13900000006',
      bio: '中国音乐家协会钢琴学会理事，主攻青少年钢琴教学法，著有《琴童之路》系列教材。',
      expertise: ['启蒙教学', '考级指导', '舞台心理'],
      years: 18,
      avatarUrl: 'assets/judges/j-006.png',
      avatarColor: 'linear-gradient(135deg, #b16fb1, #6b3a6b)'
    }
  ];

  const SEED_COMPETITION = {
    schemaVersion: 4,   // ⬆ 改 SEED 结构时 +1，自动重建 localStorage，避免脏数据
    name: '李斯特国际青少年钢琴大赛',
    shortName: 'Liszt IPC',
    edition: '第十二届',
    year: 2026,
    season: '2026 赛季',
    tagline: '跨越百年浪漫，让琴键诉说你的声音',
    intro: '李斯特国际青少年钢琴大赛（Liszt International Piano Competition for Young Artists）创办于 2014 年，是面向全球 6–22 岁青少年钢琴学习者的权威性国际赛事。赛事以浪漫主义大师弗朗茨·李斯特的精神为指引，致力于发掘并培育新一代钢琴艺术人才。',
    // 报名截止日期（北京时间 23:59:59）
    deadline: '2026-12-31T23:59:59+08:00',
    // 报名费（元）
    feeAmount: 480,
    // 缴费账户（演示用）
    feeAccount: {
      bank: '中国工商银行',
      accountName: '李斯特国际钢琴大赛组委会',
      accountNo: '6222 0202 0202 0202 020',
      alipay: 'liszt-pc@alipay.com',
      wechat: 'liszt-pc-official'
    },
    highlights: [
      { num: '12+', label: '届赛事历史' },
      { num: '38', label: '国家与地区' },
      { num: '2600+', label: '历届参赛选手' },
      { num: '$120K', label: '年度奖金总额' }
    ],
    timeline: [
      { date: '2026.03', event: '线上预选报名开启' },
      { date: '2026.05', event: '预选视频提交截止' },
      { date: '2026.06', event: '入围名单公布' },
      { date: '2026.07.15', event: '现场复赛 · 杭州' },
      { date: '2026.07.20', event: '总决赛暨颁奖音乐会' }
    ],
    groups: [
      { name: '儿童组', age: '6–9 岁', desc: '演奏 1 首任意风格作品，时长不超过 4 分钟' },
      { name: '少年组', age: '10–14 岁', desc: '演奏 2 首不同风格作品，时长不超过 8 分钟' },
      { name: '青年组', age: '15–18 岁', desc: '演奏 2 首作品，含 1 首古典时期奏鸣曲快板乐章' },
      { name: '专业组', age: '19–22 岁', desc: '演奏 30 分钟独奏会曲目，含李斯特练习曲' }
    ],
    prizes: [
      { rank: '冠军', amount: '￥ 80,000 + 签约演出', perGroup: '各组别冠军' },
      { rank: '亚军', amount: '￥ 40,000', perGroup: '各组别亚军' },
      { rank: '季军', amount: '￥ 20,000', perGroup: '各组别季军' },
      { rank: '最佳李斯特演绎奖', amount: '￥ 15,000', perGroup: '全场唯一' },
      { rank: '最具潜力奖', amount: '￥ 10,000', perGroup: '每组一名' }
    ]
  };

  // 专业（选手报名时先选专业，再选专业下的组别）
  const MAJORS = [
    { key: 'piano',   label: '钢琴', icon: '🎹', groups: ['儿童组', '少年组', '青年组', '专业组'],
      desc: '古典 / 浪漫 / 印象 / 现代钢琴独奏作品均可。' },
    { key: 'vocal',   label: '声乐', icon: '🎤', groups: ['儿童组', '少年组', '青年组', '专业组'],
      desc: '美声 / 民族 / 流行三种唱法任选，伴奏形式不限。' },
    { key: 'instrument', label: '器乐', icon: '🎻', groups: ['儿童组', '少年组', '青年组', '专业组'],
      desc: '弦乐 / 管乐 / 弹拨乐 / 打击乐均可，含独奏与重奏。' }
  ];

  // 视频上传规格
  const VIDEO_SPEC = {
    maxSizeMB: 500,
    minSizeMB: 10,
    resolution: '1080P（1920×1080）或以上',
    minResolution: '720P（1280×720）',
    bitrate: '≥ 8 Mbps',
    formats: ['mp4', 'mov', 'mkv'],
    durationLimit: { '儿童组': 240, '少年组': 480, '青年组': 720, '专业组': 1200 },
    qualityTips: [
      '使用三脚架固定机位，确保画面稳定不抖动。',
      '光线充足，避免逆光；演奏者面部、双手清晰可见。',
      '收音建议使用外接麦克风，避免环境噪音。',
      '录制时从第一小节开始前预留 2 秒静默，从最后一小节结束后再保留 2 秒。'
    ]
  };

  // 晋级分数线（综合均分 ≥ 此值 → 晋级）
  // 注：演示数据采用 10 分制；为贴合用户表达的"80 分以上晋级"，
  // 此处 PROMOTION_SCORE = 8.0（即 10 分制下的 80%）
  const PROMOTION_SCORE = 8.0;
  const PROMOTION_SCORE_LABEL = '8.0 分（百分制 80 分）';

  // 每个作品由 3 位评委点评
  const JUDGES_PER_VIDEO = 3;

  const SEED_USERS = [
    // 演示账号：选手
    {
      id: 'u-001',
      username: 'player',
      password: '123456',
      role: 'contestant',
      name: '林 知 瑶',
      email: 'demo@liszt-pc.org',
      phone: '13800000001',
      age: 14,
      major: 'piano',          // 专业：钢琴
      group: '少年组',
      school: '中央音乐学院附中',
      teacher: '王老师',
      bio: '习琴 9 年，曾获 2024 年星海杯少年组金奖。',
      avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)',
      feePaid: true,
      feeAmount: 480,
      feeAt: '2026-03-15T11:20:00Z',
      feeMethod: 'alipay',
      feeReceipt: 'ALIPAY-20260315-7821',
      createdAt: '2026-01-12T08:00:00Z'
    },
    // 演示账号：评委
    {
      id: 'u-002',
      username: 'judge',
      password: '123456',
      role: 'judge',
      name: '陈 慕 涵',
      email: 'judge@liszt-pc.org',
      phone: '13900000001',     // 评委手机号（用于评审登录）
      judgeId: 'judge-001',
      bio: '中央音乐学院钢琴系教授',
      avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)',
      createdAt: '2026-01-01T08:00:00Z'
    },
    // 演示账号：组委会
    {
      id: 'u-003',
      username: 'admin',
      password: 'admin',
      role: 'admin',
      name: '组 委 会',
      email: 'admin@liszt-pc.org',
      bio: '大赛组委会',
      avatarColor: 'linear-gradient(135deg, #b13b3b, #6b2828)',
      createdAt: '2026-01-01T08:00:00Z'
    }
  ];

  const SEED_VIDEOS = [
    {
      id: 'v-001',
      contestantId: 'u-001',
      title: '肖邦 降 b 小调第二谐谑曲 Op.31',
      composer: 'Frédéric Chopin',
      major: 'piano',                  // 专业
      group: '少年组',
      duration: 612,
      durationLabel: '10:12',
      size: 78_500_000,
      isOriginal: false,               // 非原创
      intro: '',                        // 非原创可不填
      fileMeta: { resolution: '1920×1080', bitrate: '10 Mbps', format: 'mp4' },
      uploadedAt: '2026-05-04T10:32:00Z',
      status: 'scored',
      thumb: '',
      notes: '本视频为我于 2026 年 4 月在中央音乐学院附中音乐厅录制的现场演奏，时长约 10 分钟。该谐谑曲是肖邦创作盛期的重要作品，蕴含丰富的戏剧性张力。',
      storageKey: ''
    }
  ];

  const SEED_SCORES = [
    // ============ v-001（肖邦谐谑曲）—— 3 条评分 ============
    {
      id: 's-001',
      videoId: 'v-001',
      judgeId: 'judge-001',
      judgeName: '陈 慕 涵',
      technical: 9.0,
      musicality: 9.5,
      artistry: 9.2,
      interpretation: 9.4,
      overall: 9.28,
      comment: '知瑶的演奏展现了极佳的音乐感觉。技巧部分左手的连续八度稳定、清晰，节奏把控力出色。肖邦该作品中蕴含的戏剧性张力在你的演绎下获得了很好的呈现。在装饰音的细节处理上仍有精细化空间，建议下一阶段多聆听鲁宾斯坦与齐默尔曼的版本，强化"歌唱性"线条。中段柔板主题的呼吸感处理非常成熟，是本次最值得肯定的部分。',
      signature: '陈慕涵',
      demoVideoId: 'demo-001',
      demoNote: '示范片段：陈老师亲自示范谐谑曲主题的歌唱性处理',
      scoredAt: '2026-05-08T14:20:00Z'
    },
    {
      id: 's-002',
      videoId: 'v-001',
      judgeId: 'judge-002',
      judgeName: '李 正 熙',
      technical: 8.8,
      musicality: 9.2,
      artistry: 9.0,
      interpretation: 9.1,
      overall: 9.03,
      comment: '整体完成度出色，是同年龄段非常成熟的演绎。左手的八度段落力量感稍显过强，在高潮处可考虑更细腻的层次。建议对肖邦踏板的使用做更精细的"半踏板"处理，避免和声过于浑浊。作品的"叙事性"在你身上体现得很自然，期待你下一阶段对李斯特作品的尝试。',
      signature: '李正熙',
      demoVideoId: 'demo-002',
      demoNote: '示范片段：李老师讲解踏板使用与和声清晰度的关系',
      scoredAt: '2026-05-09T10:05:00Z'
    },
    {
      id: 's-005',
      videoId: 'v-001',
      judgeId: 'judge-006',
      judgeName: '苏 羽 晴',
      technical: 8.9,
      musicality: 9.4,
      artistry: 9.1,
      interpretation: 9.0,
      overall: 9.10,
      comment: '从教学法的角度，你的演奏展现出良好的训练基础。建议：1) 加强三段中"宣叙性"段落的呼吸训练；2) 结尾八度段落可分拆练习，避免肌肉紧张；3) 继续保持对作品背景的研究，这是演绎的灵魂。',
      signature: '苏羽晴',
      demoVideoId: null,
      demoNote: '',
      scoredAt: '2026-05-10T16:30:00Z'
    }
  ];

  // 评委预录的示范视频说明（演示场景下文件本身不存在，仅用于展示引用关系）
  // poster: 渐变 CSS 字符串，用于无视频文件时的占位海报
  const SEED_DEMOS = [
    { id: 'demo-001', judgeId: 'judge-001', videoId: 'v-001', title: '陈慕涵老师·谐谑曲主题示范', duration: '2:14', durationSec: 134, uploadedAt: '2026-05-08T14:25:00Z',
      poster: 'linear-gradient(135deg, #c8a45c 0%, #5e4520 50%, #1a1410 100%)' },
    { id: 'demo-002', judgeId: 'judge-002', videoId: 'v-001', title: '李正熙老师·踏板使用讲解', duration: '3:42', durationSec: 222, uploadedAt: '2026-05-09T10:10:00Z',
      poster: 'linear-gradient(135deg, #b13b3b 0%, #5a1c1c 50%, #1a0a0a 100%)' },
    { id: 'demo-003', judgeId: 'judge-002', videoId: 'v-001', title: '李正熙老师·半踏板与叙事性处理', duration: '1:58', durationSec: 118, uploadedAt: '2026-05-11T09:35:00Z',
      poster: 'linear-gradient(135deg, #b13b3b 0%, #5a1c1c 50%, #1a0a0a 100%)' }
  ];

  // 数据访问入口
  global.LisztData = {
    SEED_JUDGES,
    SEED_COMPETITION,
    SEED_USERS,
    SEED_VIDEOS,
    SEED_SCORES,
    SEED_DEMOS,
    MAJORS,
    VIDEO_SPEC,
    PROMOTION_SCORE,
    PROMOTION_SCORE_LABEL,
    JUDGES_PER_VIDEO,
    // 评分维度（每维度含说明、权重、颜色）
    SCORE_DIMS: [
      { key: 'technical',     label: '演奏技巧', short: '技巧', weight: 0.25, color: '#c8a45c',
        desc: '考察音准、节奏、触键、力度控制、踏板运用等技术层面的精准度与稳定性。' },
      { key: 'musicality',    label: '音乐表现', short: '表现', weight: 0.30, color: '#7a9cc6',
        desc: '考察乐句的呼吸、连断处理、力度层次对比、rubato 的自然度与歌唱性。' },
      { key: 'artistry',      label: '艺术处理', short: '艺术', weight: 0.20, color: '#b87ac0',
        desc: '考察音色变化、踏板技巧、整体张力曲线与舞台表现力。' },
      { key: 'interpretation',label: '作品诠释', short: '诠释', weight: 0.25, color: '#7ac0a0',
        desc: '考察对作品曲式结构、风格时期、作曲家语汇的理解深度与个人化表达。' }
    ],
    // 评委评语模板（评委评分时可选快速填充）
    COMMENT_TEMPLATES: [
      {
        title: '鼓励 + 技术建议',
        body: '整体完成度出色，是同年龄段相当成熟的演绎。建议：\n1) 加强左手的八度段落练习；\n2) 中段呼吸可更自由一些；\n3) 继续保持对作品背景的研究，这是演绎的灵魂。\n期待你下一阶段的进步。'
      },
      {
        title: '鼓励 + 音乐性建议',
        body: '你的演奏展现了极佳的音乐感觉。技巧部分稳定、清晰，节奏把控力出色。\n\n建议下一阶段多聆听大师版本，强化"歌唱性"线条，让每个音符都有呼吸。\n\n注意踏板的细腻处理，少量多次会更为干净。'
      },
      {
        title: '批评 + 改进方向',
        body: '基本结构与音准完成，但在音乐性层面仍有较大提升空间。建议：\n1) 重新研究作品的曲式结构；\n2) 多练习分声部聆听；\n3) 演奏前先在心里"唱"完整首作品，再落键。\n\n不要急于求成，慢练是通向大师的唯一路径。'
      },
      {
        title: '肯定 + 风格建议',
        body: '对作品风格把握准确，技术能力匹配曲目难度。\n\n如能在以下方面再下功夫会更上层楼：\n· 装饰音的处理（巴洛克）；\n· 力度曲线的戏剧性（浪漫派）；\n· 踏板的分层使用（印象派）。\n\n整体非常出色的演绎。'
      }
    ],

    /* ============================================================
       决赛 / 赛后回顾 数据
       ============================================================ */
    // 决赛比赛信息
    FINAL_COMPETITION: {
      name: '李斯特国际青少年钢琴大赛·全国总决赛',
      shortName: 'Liszt Finals',
      edition: '第十二届·决赛',
      year: 2026,
      season: '2026 赛季',
      tagline: '巅峰对决，让世界听见中国少年的声音',
      intro: '第十二届李斯特国际青少年钢琴大赛全国总决赛将于 2026 年盛夏在上海举办。\n决赛采取「线下现场演奏 + 大师班 + 颁奖音乐会」三段式赛制，从全国各赛区脱颖而出的优秀选手将齐聚申城，与来自意大利、德国、美国的国际评委面对面。',
      // 时间 / 地点
      date: '2026-07-20 ~ 2026-07-24',
      dateLabel: '2026 年 7 月 20 日 – 7 月 24 日',
      regDeadline: '2026-06-15T23:59:59',
      city: '上海',
      venue: '上海音乐学院·贺绿汀音乐厅',
      address: '上海市汾阳路 20 号',
      feeAmount: 680,
      // 奖金
      prizes: [
        { rank: '总冠军', amount: '￥ 100,000 + 签约演出 + 大师班名额', perGroup: '全场唯一' },
        { rank: '亚军',   amount: '￥ 50,000 + 大师班名额', perGroup: '各组别' },
        { rank: '季军',   amount: '￥ 25,000', perGroup: '各组别' },
        { rank: '最佳李斯特演绎奖', amount: '￥ 20,000', perGroup: '全场唯一' },
        { rank: '观众最喜爱奖',     amount: '￥ 8,000',  perGroup: '各组一名' },
        { rank: '优秀奖',           amount: '奖杯 + 证书', perGroup: '若干' }
      ],
      // 决赛日程
      schedule: [
        { date: '2026.07.20', event: '选手报到 & 抽签' },
        { date: '2026.07.21', event: '开幕仪式 / 走台彩排' },
        { date: '2026.07.22', event: '专业组·青年组 现场演奏' },
        { date: '2026.07.23', event: '少年组·儿童组 现场演奏' },
        { date: '2026.07.24', event: '颁奖音乐会（公开）' }
      ]
    },

    // 决赛专属评委阵容（与初赛部分重叠，加入国际名家）
    FINAL_JUDGES: [
      { id: 'judge-001', name: '陈 慕 涵', title: '评委会主席 · 钢琴演奏家', initial: '陈', role: '主席', phone: '13900000001',
        bio: '中央音乐学院钢琴系教授，旅欧钢琴演奏家，曾获范·克莱本国际钢琴比赛银奖。',
        expertise: ['肖邦', '拉赫玛尼诺夫', '李斯特'], years: 28,
        avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)' },
      { id: 'judge-007', name: 'Marcello V.', title: '国际评委 · 意大利钢琴家', initial: 'M', role: '国际评委', phone: '13900000007',
        bio: '米兰威尔第音乐学院终身教授，伊莫拉国际钢琴学院艺术总监，布索尼国际钢琴比赛评委会成员。',
        expertise: ['李斯特', '贝多芬晚期奏鸣曲', '巴托克'], years: 32,
        avatarColor: 'linear-gradient(135deg, #a87fbf, #5a3d80)' },
      { id: 'judge-008', name: 'Sophia L.', title: '国际评委 · 美国钢琴家', initial: 'S', role: '国际评委', phone: '13900000008',
        bio: '柯蒂斯音乐学院钢琴系主任，茱莉亚音乐学院客座教授，纽约林肯中心常驻艺术家。',
        expertise: ['普罗科菲耶夫', '拉赫玛尼诺夫', '当代作品'], years: 24,
        avatarColor: 'linear-gradient(135deg, #d1894f, #8a5424)' },
      { id: 'judge-005', name: 'Helena K.', title: '国际评委 · 德国钢琴家', initial: 'H', role: '国际评委', phone: '13900000005',
        bio: '德国汉诺威音乐学院教授，专精德奥学派，柏林爱乐特邀独奏家。',
        expertise: ['贝多芬', '勃拉姆斯', '舒曼'], years: 25,
        avatarColor: 'linear-gradient(135deg, #8a6a2c, #4f3a18)' },
      { id: 'judge-002', name: '李 正 熙', title: '评委会副主席 · 钢琴教育家', initial: '李', role: '副主席', phone: '13900000002',
        bio: '上海音乐学院附中钢琴学科主任，上海市优秀青年教师，培养数十位国际比赛获奖选手。',
        expertise: ['古典奏鸣曲', '巴赫', '莫扎特'], years: 30,
        avatarColor: 'linear-gradient(135deg, #b13b3b, #6b2828)' },
      { id: 'judge-006', name: '苏 羽 晴', title: '评委 · 教育专家', initial: '苏', role: '评委', phone: '13900000006',
        bio: '中国音乐学院附中钢琴主科教师，CCEA 全国青少年展演评委。',
        expertise: ['中国钢琴作品', '教学法', '儿童心理'], years: 18,
        avatarColor: 'linear-gradient(135deg, #5b9ed1, #2c5e8a)' }
    ],

    // 决赛报名种子（演示数据：u-001 选手已晋级决赛）
    SEED_FINAL_REGISTRATIONS: [
      {
        id: 'fr-001',
        contestantId: 'u-001',
        // 决赛 2 个作品
        works: [
          { title: '李斯特 超技练习曲《追雪》S.139 No.12', composer: 'Franz Liszt', duration: 6, desc: '我尝试还原齐夫拉式的"风暴感"开篇，在中段慢板加入更多的自由呼吸，体现李斯特晚期对自然与生命的感悟。' },
          { title: '拉赫玛尼诺夫 第二钢琴协奏曲 Op.18 — 第一乐章', composer: 'Sergei Rachmaninoff', duration: 10, desc: '选自决赛必奏曲目。开篇的八度与和弦段落我做了"由弱到强"的层次处理，体现俄罗斯式的悲剧性。' }
        ],
        // 指导教师
        teacherName: '王 启 文',
        teacherPhone: '13911112222',
        // 收件地址（参赛证邮寄）
        address: { name: '林 知 瑶', phone: '13800000001', province: '北京市', city: '北京市', detail: '西城区鲍家街 43 号 中央音乐学院附中' },
        feePaid: true,
        feeAmount: 680,
        feeAt: '2026-05-22T10:15:00Z',
        feeMethod: 'wechat',
        feeReceipt: 'WX-20260522-9921',
        certNo: 'LISZT-FN-2026-0001',
        submittedAt: '2026-05-21T16:30:00Z'
      }
    ],

    // 决赛成绩种子（演示数据：u-001 已完成决赛评分）
    SEED_FINAL_SCORES: [
      // fr-001 (u-001) 的现场演奏评分：5 位评委
      { id: 'fs-001', regId: 'fr-001', judgeId: 'judge-001', judgeName: '陈 慕 涵', technical: 9.5, musicality: 9.6, artistry: 9.4, interpretation: 9.5, overall: 9.50, comment: '两首作品完成度都极为出色，超技练习曲的速度与精准令人印象深刻，拉赫第二的悲剧性渲染恰到好处。', scoredAt: '2026-07-22T19:30:00Z' },
      { id: 'fs-002', regId: 'fr-001', judgeId: 'judge-002', judgeName: '李 正 熙', technical: 9.3, musicality: 9.5, artistry: 9.4, interpretation: 9.4, overall: 9.40, comment: '整体非常成熟。建议拉赫的开篇八度可以再"沉"一些，会更有戏剧张力。', scoredAt: '2026-07-22T19:32:00Z' },
      { id: 'fs-003', regId: 'fr-001', judgeId: 'judge-005', judgeName: 'Helena K.', technical: 9.4, musicality: 9.5, artistry: 9.5, interpretation: 9.3, overall: 9.43, comment: 'A very mature and convincing performance. The poetic atmosphere in the middle section of the Liszt etude was beautiful.', scoredAt: '2026-07-22T19:35:00Z' },
      { id: 'fs-004', regId: 'fr-001', judgeId: 'judge-007', judgeName: 'Marcello V.', technical: 9.5, musicality: 9.7, artistry: 9.6, interpretation: 9.5, overall: 9.58, comment: 'Bravo! Truly one of the most promising young pianists of this generation. Stage presence is exceptional.', scoredAt: '2026-07-22T19:38:00Z' },
      { id: 'fs-005', regId: 'fr-001', judgeId: 'judge-008', judgeName: 'Sophia L.', technical: 9.4, musicality: 9.4, artistry: 9.5, interpretation: 9.4, overall: 9.43, comment: 'A confident and musical performance. Look forward to following your development.', scoredAt: '2026-07-22T19:40:00Z' }
    ],

    // 决赛获奖名单（演示）
    FINAL_AWARDS: [
      { rank: '总冠军', contestantId: 'u-001', group: '少年组', score: 9.47, work: '李斯特 追雪', certNo: 'LISZT-FN-2026-0001' }
    ],

    /* ============================================================
       赛后回顾数据
       ============================================================ */
    // 新闻
    NEWS: [
      { id: 'n-001', date: '2026-07-25', category: '赛事快讯', title: '第十二届李斯特国际青少年钢琴大赛全国总决赛圆满落幕',
        summary: '7 月 24 日晚，上海音乐学院贺绿汀音乐厅星光熠熠，第十二届李斯特国际青少年钢琴大赛全国总决赛暨颁奖音乐会在此圆满落幕。',
        cover: '🎼', tag: '头条' },
      { id: 'n-002', date: '2026-07-24', category: '现场报道', title: '颁奖音乐会花絮：冠军诞生时刻',
        summary: '当评委会主席陈慕涵教授宣布少年组冠军时，全场掌声雷动。来自中央音乐学院附中的林知瑶以两首高难度作品征服评委。',
        cover: '🏆', tag: '独家' },
      { id: 'n-003', date: '2026-07-22', category: '评委专访', title: 'Marcello V.：中国青少年钢琴水准已达到世界前列',
        summary: '意大利钢琴家 Marcello V. 教授接受组委会专访时表示，中国新一代青少年钢琴选手的技术与音乐性已能与欧洲同龄选手比肩。',
        cover: '🎤', tag: '专访' },
      { id: 'n-004', date: '2026-07-20', category: '赛事公告', title: '第十二届决赛日程公布',
        summary: '第十二届决赛日程正式公布：7 月 20 日报到，21 日开幕，22-23 日分组比赛，24 日颁奖音乐会。',
        cover: '📅', tag: '公告' },
      { id: 'n-005', date: '2026-07-18', category: '选手故事', title: '少年组冠军林知瑶：我的钢琴之路',
        summary: '从 5 岁第一次触碰琴键，到站在全国总决赛的领奖台，林知瑶用 9 年的时间诠释了什么叫"热爱可抵岁月漫长"。',
        cover: '✨', tag: '故事' }
    ],

    // 花絮（用 emoji 占位 + caption）
    HIGHLIGHTS: [
      { id: 'h-001', cover: '🎹', caption: '开幕仪式·贺绿汀音乐厅',         tag: '现场' },
      { id: 'h-002', cover: '🎼', caption: '专业组现场演奏',               tag: '演奏' },
      { id: 'h-003', cover: '🌟', caption: '少年组·林知瑶的舞台瞬间',      tag: '选手' },
      { id: 'h-004', cover: '🎻', caption: '后台走台彩排',                 tag: '幕后' },
      { id: 'h-005', cover: '🏆', caption: '冠军颁奖时刻',                 tag: '颁奖' },
      { id: 'h-006', cover: '🤝', caption: '评委与选手合影',               tag: '评委' },
      { id: 'h-007', cover: '🌃', caption: '夜间彩排·灯火通明',           tag: '现场' },
      { id: 'h-008', cover: '👏', caption: '全场观众起立鼓掌',             tag: '现场' },
      { id: 'h-009', cover: '🎶', caption: '评委 Marcello V. 大师班',       tag: '大师班' },
      { id: 'h-010', cover: '📸', caption: '选手与家长合影',               tag: '花絮' },
      { id: 'h-011', cover: '🎵', caption: '青年组·激烈角逐',             tag: '演奏' },
      { id: 'h-012', cover: '✍️', caption: '评委签到墙',                   tag: '评委' }
    ],

    // 优秀选手展演（决赛获奖 / 半决赛优秀者）
    TOP_FINALISTS: [
      { contestantId: 'u-001', name: '林 知 瑶', group: '少年组',  rank: '总冠军', school: '中央音乐学院附中', avg: 9.47, work: '李斯特 超技练习曲《追雪》' },
      { contestantId: 'u-f02', name: '张 慕 之', group: '儿童组',  rank: '冠军',  school: '上海音乐学院附小', avg: 9.32, work: '莫扎特 奏鸣曲 K.310' },
      { contestantId: 'u-f03', name: '陈 思 远', group: '青年组',  rank: '冠军',  school: '中国音乐学院附中', avg: 9.28, work: '李斯特 b 小调奏鸣曲' },
      { contestantId: 'u-f04', name: '周 允 文', group: '专业组',  rank: '冠军',  school: '中央音乐学院',     avg: 9.51, work: '贝多芬 第 29 奏鸣曲"槌子键琴"' },
      { contestantId: 'u-f05', name: '苏 子 墨', group: '少年组',  rank: '亚军',  school: '深圳艺术学校',     avg: 9.21, work: '肖邦 叙事曲 Op.47' },
      { contestantId: 'u-f06', name: '韩 奕 辰', group: '儿童组',  rank: '亚军',  school: '杭州外国语学校',   avg: 9.18, work: '巴赫 二部创意曲 No.8' }
    ]
  };
})(window);