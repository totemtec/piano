/* ============================================================
   storage.js — localStorage / IndexedDB 封装
   视频文件二进制使用 IndexedDB 存储（base64 太大会超出 LS 限制）
   ============================================================ */
(function (global) {
  'use strict';

  const LS_KEYS = {
    users:     'liszt.users.v1',
    videos:    'liszt.videos.v1',
    scores:    'liszt.scores.v1',
    session:   'liszt.session.v1',
    comments:  'liszt.comments.v1',
    seeded:    'liszt.seeded.v1',
    qrTokens:  'liszt.qrTokens.v2',      // 评委扫码登录 token
    regEdits:  'liszt.regEdits.v1',      // 报名修改日志
    schemaVer: 'liszt.schema.v1',        // 数据 schema 版本：自动重建脏数据
    // 决赛 / 回顾
    finalRegs:   'liszt.finalRegs.v1',
    finalScores: 'liszt.finalScores.v1',
    recapLikes:  'liszt.recapLikes.v1'   // 回顾页的"最喜爱奖"投票（演示）
  };

  // ---- localStorage 包装 ----
  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { console.error('LS set error', e); return false; }
  }

  // ---- IndexedDB 包装 ----
  const DB_NAME = 'liszt_ipc';
  const DB_VERSION = 1;
  const STORE_VIDEOS = 'videos';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
          db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      tx.objectStore(STORE_VIDEOS).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
  async function dbGet(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readonly');
      const req = tx.objectStore(STORE_VIDEOS).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function dbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEOS, 'readwrite');
      tx.objectStore(STORE_VIDEOS).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---- API ----
  const Store = {
    // 初始化种子数据（演示项目：首次访问写入；之后保留用户新上传/注册的数据）
    // 保留策略：
    //   - users：保留非种子用户（注册账号），同时确保种子账号始终存在
    //   - videos：保留非种子作品（用户上传的）
    //   - scores：保留非种子评分（用户打的）
    //   - comments：始终清空（演示场景下不持久化）
    seed() {
      // schema 自愈：检测到 SEED_COMPETITION.schemaVersion 变更时，自动重建数据
      // 这样可以避免你之前看到的"我已改了 seed 但页面仍是旧数据"问题
      const currentSchema = lsGet(LS_KEYS.schemaVer, 0);
      const targetSchema = (LisztData.SEED_COMPETITION && LisztData.SEED_COMPETITION.schemaVersion) || 1;
      if (currentSchema !== targetSchema) {
        // schema 变了 → 重新 seed（保留 session，但重置业务数据）
        const session = lsGet(LS_KEYS.session, null);
        Object.values(LS_KEYS).forEach(k => {
          if (k !== LS_KEYS.session) localStorage.removeItem(k);
        });
        if (session) lsSet(LS_KEYS.session, session);
        lsSet(LS_KEYS.users, LisztData.SEED_USERS);
        lsSet(LS_KEYS.videos, LisztData.SEED_VIDEOS);
        lsSet(LS_KEYS.scores, LisztData.SEED_SCORES);
        lsSet(LS_KEYS.comments, []);
        if (LisztData.SEED_FINAL_REGISTRATIONS)  lsSet(LS_KEYS.finalRegs, LisztData.SEED_FINAL_REGISTRATIONS);
        if (LisztData.SEED_FINAL_SCORES)        lsSet(LS_KEYS.finalScores, LisztData.SEED_FINAL_SCORES);
        lsSet(LS_KEYS.seeded, true);
        lsSet(LS_KEYS.schemaVer, targetSchema);
        console.info(`[LisztStore] schema ${currentSchema} → ${targetSchema}，已重建种子数据`);
        return;
      }

      if (lsGet(LS_KEYS.seeded, false)) {
        // 已 seed 过 → 仅补齐缺失的种子（兼容老 LS）
        const userIds = new Set(lsGet(LS_KEYS.users, []).map(u => u.id));
        const missing = LisztData.SEED_USERS.filter(u => !userIds.has(u.id));
        if (missing.length) lsSet(LS_KEYS.users, [...lsGet(LS_KEYS.users, []), ...missing]);

        const videoIds = new Set(lsGet(LS_KEYS.videos, []).map(v => v.id));
        const missingV = LisztData.SEED_VIDEOS.filter(v => !videoIds.has(v.id));
        if (missingV.length) lsSet(LS_KEYS.videos, [...lsGet(LS_KEYS.videos, []), ...missingV]);

        const scoreIds = new Set(lsGet(LS_KEYS.scores, []).map(s => s.id));
        const missingS = LisztData.SEED_SCORES.filter(s => !scoreIds.has(s.id));
        if (missingS.length) lsSet(LS_KEYS.scores, [...lsGet(LS_KEYS.scores, []), ...missingS]);

        // 决赛数据补齐
        if (LisztData.SEED_FINAL_REGISTRATIONS) {
          const regIds = new Set(lsGet(LS_KEYS.finalRegs, []).map(r => r.id));
          const missR = LisztData.SEED_FINAL_REGISTRATIONS.filter(r => !regIds.has(r.id));
          if (missR.length) lsSet(LS_KEYS.finalRegs, [...lsGet(LS_KEYS.finalRegs, []), ...missR]);
        }
        if (LisztData.SEED_FINAL_SCORES) {
          const fsIds = new Set(lsGet(LS_KEYS.finalScores, []).map(s => s.id));
          const missF = LisztData.SEED_FINAL_SCORES.filter(s => !fsIds.has(s.id));
          if (missF.length) lsSet(LS_KEYS.finalScores, [...lsGet(LS_KEYS.finalScores, []), ...missF]);
        }
        return;
      }
      // 首次 seed：写入所有演示数据
      lsSet(LS_KEYS.users, LisztData.SEED_USERS);
      lsSet(LS_KEYS.videos, LisztData.SEED_VIDEOS);
      lsSet(LS_KEYS.scores, LisztData.SEED_SCORES);
      lsSet(LS_KEYS.comments, []);
      if (LisztData.SEED_FINAL_REGISTRATIONS)  lsSet(LS_KEYS.finalRegs, LisztData.SEED_FINAL_REGISTRATIONS);
      if (LisztData.SEED_FINAL_SCORES)        lsSet(LS_KEYS.finalScores, LisztData.SEED_FINAL_SCORES);
      lsSet(LS_KEYS.seeded, true);
      lsSet(LS_KEYS.schemaVer, targetSchema);
    },

    // 重置种子（强制覆盖，调试用）
    resetAndReload() {
      localStorage.removeItem(LS_KEYS.seeded);
      localStorage.removeItem(LS_KEYS.users);
      localStorage.removeItem(LS_KEYS.videos);
      localStorage.removeItem(LS_KEYS.scores);
      localStorage.removeItem(LS_KEYS.comments);
      this.seed();
    },

    // 用户
    getUsers: () => lsGet(LS_KEYS.users, []),
    setUsers: (v) => lsSet(LS_KEYS.users, v),
    findUser: (predicate) => Store.getUsers().find(predicate),

    // 视频元数据
    getVideos: () => lsGet(LS_KEYS.videos, []),
    setVideos: (v) => lsSet(LS_KEYS.videos, v),
    findVideo: (predicateOrId) => {
      const videos = Store.getVideos();
      if (typeof predicateOrId === 'function') return videos.find(predicateOrId);
      return videos.find(x => x.id === predicateOrId);
    },
    videosBy: (predicate) => Store.getVideos().filter(predicate),

    // 业务规则：每位选手限 1 件作品（编辑场景下传 existingId 可豁免）
    canUpload(contestantId, existingId) {
      const mine = Store.videosBy(v => v.contestantId === contestantId);
      if (existingId) {
        // 编辑模式：允许"无作品"或"作品就是自己"两种状态
        return mine.length === 0 || mine.every(v => v.id === existingId);
      }
      return mine.length === 0;
    },
    myVideo(contestantId) {
      return Store.videosBy(v => v.contestantId === contestantId)[0] || null;
    },

    // 评分
    getScores: () => lsGet(LS_KEYS.scores, []),
    setScores: (v) => lsSet(LS_KEYS.scores, v),
    scoresForVideo: (videoId) => Store.getScores().filter(s => s.videoId === videoId),
    scoresByJudge: (judgeId) => Store.getScores().filter(s => s.judgeId === judgeId),

    // 写入一条评分，并按"≥ JUDGES_PER_VIDEO 位评委已评"自动维护 video.status
    // 这是状态机的唯一入口，调用方不应再直接修改 status
    setScore(score) {
      const scores = Store.getScores();
      const idx = scores.findIndex(s => s.id === score.id);
      if (idx >= 0) scores[idx] = score; else scores.push(score);
      lsSet(LS_KEYS.scores, scores);
      // 同步 video 状态
      const videos = Store.getVideos();
      const vIdx = videos.findIndex(v => v.id === score.videoId);
      if (vIdx >= 0) {
        const vScores = scores.filter(s => s.videoId === score.videoId);
        const need = (LisztData.JUDGES_PER_VIDEO || 3);
        videos[vIdx].status = vScores.length >= need ? 'scored' : 'reviewing';
        lsSet(LS_KEYS.videos, videos);
      }
      return score;
    },
    removeScore(scoreId) {
      const scores = Store.getScores().filter(s => s.id !== scoreId);
      lsSet(LS_KEYS.scores, scores);
      // 重新计算被影响 video 的状态
      const remainingFor = new Set(scores.map(s => s.videoId));
      const videos = Store.getVideos();
      videos.forEach((v, i) => {
        if (remainingFor.has(v.id)) {
          const vScores = scores.filter(s => s.videoId === v.id);
          const need = (LisztData.JUDGES_PER_VIDEO || 3);
          v.status = vScores.length >= need ? 'scored' : 'reviewing';
        }
      });
      lsSet(LS_KEYS.videos, videos);
    },

    // 评论 / 回复
    getComments: () => lsGet(LS_KEYS.comments, []),
    setComments: (v) => lsSet(LS_KEYS.comments, v),
    commentsForVideo: (videoId) => Store.getComments().filter(c => c.videoId === videoId),

    // 会话
    getSession: () => lsGet(LS_KEYS.session, null),
    setSession: (s) => lsSet(LS_KEYS.session, s),
    clearSession: () => localStorage.removeItem(LS_KEYS.session),

    // 视频二进制
    saveVideoBlob: (id, blob, meta) => dbPut({ id, blob, meta }),
    getVideoBlob: (id) => dbGet(id).then(r => r && r.blob),
    deleteVideoBlob: (id) => dbDelete(id),

    // 工具
    uid: (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4),

    // 重置
    reset() {
      Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    },

    // ---------- 评委扫码登录 token ----------
    // 每个评委在评审页点"扫码登录"→ 生成 token → 模拟手机扫码 → 后台轮询
    createQrToken(judgeId) {
      const tokens = lsGet(LS_KEYS.qrTokens, []);
      const token = 'qr-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      tokens.push({
        token,
        judgeId,
        status: 'pending',      // pending → scanned → confirmed
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
      });
      lsSet(LS_KEYS.qrTokens, tokens);
      return token;
    },
    getQrToken(token) {
      const tokens = lsGet(LS_KEYS.qrTokens, []);
      return tokens.find(t => t.token === token) || null;
    },
    setQrTokenStatus(token, status, extra) {
      const tokens = lsGet(LS_KEYS.qrTokens, []);
      const i = tokens.findIndex(t => t.token === token);
      if (i >= 0) {
        tokens[i] = { ...tokens[i], status, ...(extra || {}) };
        lsSet(LS_KEYS.qrTokens, tokens);
      }
    },
    cleanExpiredQrTokens() {
      const tokens = lsGet(LS_KEYS.qrTokens, []);
      const now = Date.now();
      const fresh = tokens.filter(t => t.expiresAt > now);
      if (fresh.length !== tokens.length) lsSet(LS_KEYS.qrTokens, fresh);
    },

    // ---------- 评委手机号登录（演示：直接通过手机号找到评委） ----------
    findJudgeByPhone(phone) {
      const judge = LisztData.SEED_JUDGES.find(j => j.phone === phone);
      if (!judge) return null;
      const user = Store.findUser(u => u.judgeId === judge.id && u.role === 'judge');
      return { judge, user };
    },

    // ---------- 决赛 / 回顾 ----------
    // 决赛报名
    getFinalRegs:    () => lsGet(LS_KEYS.finalRegs, []),
    setFinalRegs:    (v) => lsSet(LS_KEYS.finalRegs, v),
    findFinalReg:    (predicate) => Store.getFinalRegs().find(predicate),
    myFinalReg:      (contestantId) => Store.getFinalRegs().find(r => r.contestantId === contestantId) || null,
    // 决赛成绩
    getFinalScores:  () => lsGet(LS_KEYS.finalScores, []),
    setFinalScores:  (v) => lsSet(LS_KEYS.finalScores, v),
    scoresForFinalReg: (regId) => Store.getFinalScores().filter(s => s.regId === regId),
    // 工具：判断选手是否通过初赛（演示：u-001 自动晋级；其他按综合均分判定）
    isPrelimPassed: (contestantId) => {
      if (contestantId === 'u-001') return true;   // 演示：种子选手直接晋级
      const video = Store.myVideo(contestantId);
      if (!video || video.status !== 'scored') return false;
      const scores = Store.scoresForVideo(video.id);
      if (scores.length < 3) return false;
      const avg = scores.reduce((a, b) => a + b.overall, 0) / scores.length;
      return avg >= (LisztData.PROMOTION_SCORE || 8.0);
    },
    // 回顾页：最喜爱奖投票
    getLikes:        () => lsGet(LS_KEYS.recapLikes, {}),
    addLike:         (contestantId) => {
      const likes = Store.getLikes();
      likes[contestantId] = (likes[contestantId] || 0) + 1;
      lsSet(LS_KEYS.recapLikes, likes);
      return likes[contestantId];
    },
    // 给决赛报名分配唯一的"参赛证号"
    allocCertNo: () => {
      const regs = Store.getFinalRegs();
      const next = (regs.length + 1).toString().padStart(4, '0');
      return `LISZT-FN-2026-${next}`;
    },

    // ---------- 报名修改日志 ----------
    logRegEdit(contestantId, fields) {
      const logs = lsGet(LS_KEYS.regEdits, []);
      logs.push({
        id: Store.uid('edit'),
        contestantId,
        fields,
        at: new Date().toISOString()
      });
      lsSet(LS_KEYS.regEdits, logs);
    },
    getRegEdits(contestantId) {
      const logs = lsGet(LS_KEYS.regEdits, []);
      return logs.filter(l => l.contestantId === contestantId);
    }
  };

  global.LisztStore = Store;
})(window);