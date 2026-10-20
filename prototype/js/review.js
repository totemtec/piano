/* ============================================================
   review.js — 评委点评打分页（完整交互版）
   维度说明/快捷键/草稿/时间戳/进度条/排序筛选/撤销/对比
   ============================================================ */
(function () {
  'use strict';

  const me = LisztAuth.current;
  if (!me) {
    const next = 'review.html' + (location.search || '');
    location.href = 'login.html?next=' + encodeURIComponent(next);
    return;
  }
  if (me.role !== 'judge') {
    location.href = me.role === 'admin' ? 'admin.html' : 'result.html';
    return;
  }

  const judge = LisztData.SEED_JUDGES.find(j => j.id === me.judgeId) || { name: me.name, initial: (me.name || '评').slice(0,1), avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)', title: '评委' };

  // 顶部
  document.getElementById('judgeAvatar').textContent = judge.initial || '评';
  document.getElementById('judgeAvatar').style.background = judge.avatarColor;
  document.getElementById('judgeName').textContent = judge.name;
  document.getElementById('judgeSubLine').textContent = `${judge.title} · 评审中心`;

  // =============== 评分维度 + 草稿 ===============
  const DRAFT_KEY = 'liszt_review_draft';
  const PROGRESS_KEY = 'liszt_review_progress';
  const DRAFT_SAVE_DELAY = 600;
  let saveTimer = null;
  let lastSavedAt = 0;
  let demoFile = null;
  let currentDim = 0; // 当前键盘操作的维度
  let lastSubmitted = null; // 用于撤销

  // 状态
  let activeVid = null;
  let filterGroup = 'all';
  let filterStatus = 'all';
  let sortBy = 'uploaded';
  let searchKw = '';

  const allVideos = LisztStore.getVideos();
  const myScores = LisztStore.scoresByJudge(me.judgeId);
  const pending = allVideos.filter(v => !myScores.some(s => s.videoId === v.id));
  const scored = allVideos.filter(v => myScores.some(s => s.videoId === v.id));

  // 进度条
  const total = allVideos.length;
  const completed = myScores.length;
  document.getElementById('progNum').textContent = completed;
  document.getElementById('progTotal').textContent = total;
  document.getElementById('progPct').textContent = total ? Math.round(completed / total * 100) + '%' : '0%';
  document.getElementById('progressBar').style.width = total ? (completed / total * 100) + '%' : '0%';

  document.getElementById('reviewStats').innerHTML = `
    <div class="stat" style="${pending.length ? 'border-color: var(--color-gold);' : ''}"><div class="n">${pending.length}</div><div class="l">待评审</div></div>
    <div class="stat"><div class="n">${myScores.length}</div><div class="l">已完成</div></div>
    <div class="stat"><div class="n">${allVideos.length}</div><div class="l">总作品</div></div>
  `;

  // 默认选中的视频
  const params = new URLSearchParams(location.search);
  activeVid = params.get('vid') || (pending[0]?.id || scored[0]?.id);

  if (!activeVid) {
    document.getElementById('reviewContent').innerHTML = `
      <div class="empty-state">
        <div class="icon">🎼</div>
        <h3>暂无作品需要评审</h3>
        <p>当前没有选手提交作品。请稍后再来查看。</p>
        <a href="judge-panel.html" class="btn btn-primary" style="margin-top: 18px;">进入评审中心</a>
      </div>
    `;
    return;
  }

  // =============== 筛选/排序/搜索 ===============
  function applyFilterSort(videos) {
    let arr = videos.slice();
    if (filterGroup !== 'all') arr = arr.filter(v => v.group === filterGroup);
    if (filterStatus === 'pending') arr = arr.filter(v => !myScores.some(s => s.videoId === v.id));
    if (filterStatus === 'scored') arr = arr.filter(v => myScores.some(s => s.videoId === v.id));
    if (searchKw) {
      const kw = searchKw.toLowerCase();
      arr = arr.filter(v => {
        const c = LisztStore.findUser(u => u.id === v.contestantId);
        return v.title.toLowerCase().includes(kw) ||
               (v.composer || '').toLowerCase().includes(kw) ||
               (c?.name || '').toLowerCase().includes(kw);
      });
    }
    if (sortBy === 'uploaded') arr.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    if (sortBy === 'group') arr.sort((a, b) => (a.group || '').localeCompare(b.group || ''));
    if (sortBy === 'name') {
      arr.sort((a, b) => {
        const ca = LisztStore.findUser(u => u.id === a.contestantId)?.name || '';
        const cb = LisztStore.findUser(u => u.id === b.contestantId)?.name || '';
        return ca.localeCompare(cb);
      });
    }
    return arr;
  }

  // =============== 渲染左侧 ===============
  function renderShell() {
    const filteredPending = applyFilterSort(pending);
    const filteredScored = applyFilterSort(scored);

    document.getElementById('reviewContent').innerHTML = `
      <div class="review-grid">
        <aside class="pending-list">
          <h3>作品列表</h3>
          <div class="filter-bar">
            <select id="sortSelect">
              <option value="uploaded" ${sortBy === 'uploaded' ? 'selected' : ''}>按上传时间</option>
              <option value="group" ${sortBy === 'group' ? 'selected' : ''}>按组别</option>
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>按选手名</option>
            </select>
            <select id="groupFilter">
              <option value="all">全部组别</option>
              <option ${filterGroup === '儿童组' ? 'selected' : ''}>儿童组</option>
              <option ${filterGroup === '少年组' ? 'selected' : ''}>少年组</option>
              <option ${filterGroup === '青年组' ? 'selected' : ''}>青年组</option>
              <option ${filterGroup === '专业组' ? 'selected' : ''}>专业组</option>
            </select>
            <select id="statusFilter">
              <option value="all">全部状态</option>
              <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>待评审</option>
              <option value="scored" ${filterStatus === 'scored' ? 'selected' : ''}>已评审</option>
            </select>
            <input type="search" id="searchInput" placeholder="搜索作品/选手" value="${LisztUtil.escape(searchKw)}">
          </div>
          <div class="list-scroll">
            ${renderListSection('待评审', filteredPending, false)}
            ${filteredScored.length ? renderListSection('已完成', filteredScored, true) : ''}
            ${!filteredPending.length && !filteredScored.length ? '<p class="muted" style="font-size:.85rem; padding: 8px;">无匹配作品</p>' : ''}
          </div>
        </aside>
        <section class="review-main" id="reviewMain"></section>
      </div>
    `;

    // 筛选/排序事件
    document.getElementById('sortSelect').onchange = e => { sortBy = e.target.value; renderShell(); };
    document.getElementById('groupFilter').onchange = e => { filterGroup = e.target.value; renderShell(); };
    document.getElementById('statusFilter').onchange = e => { filterStatus = e.target.value; renderShell(); };
    document.getElementById('searchInput').oninput = e => { searchKw = e.target.value; renderShell(); };

    document.querySelectorAll('[data-vid]').forEach(el => el.addEventListener('click', e => {
      e.preventDefault();
      activeVid = el.dataset.vid;
      currentDim = 0;
      const u = new URL(location.href);
      u.searchParams.set('vid', activeVid);
      history.replaceState(null, '', u);
      document.querySelectorAll('.pending-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      renderForm();
    }));

    renderForm();
  }

  function renderListSection(title, videos, isScored) {
    if (!videos.length) return '';
    return `
      <h3 style="${isScored ? 'margin-top: 18px;' : ''}">${title} (${videos.length})</h3>
      ${videos.map(v => {
        const c = LisztStore.findUser(u => u.id === v.contestantId);
        const myScore = myScores.find(s => s.videoId === v.id);
        const otherScores = LisztStore.scoresForVideo(v.id).filter(s => s.judgeId !== me.judgeId);
        const otherAvg = otherScores.length ? otherScores.reduce((a, b) => a + b.overall, 0) / otherScores.length : null;
        return `
          <a class="pending-item ${isScored ? 'scored' : ''} ${v.id === activeVid ? 'active' : ''}" data-vid="${v.id}">
            <div class="t">
              <span>${LisztUtil.escape(v.title)}</span>
              ${myScore ? `<span class="badge tag" style="background: rgba(79,157,111,.18); color:#b6e3c8; border-color: rgba(79,157,111,.3);">已评 ★${myScore.overall.toFixed(2)}</span>` : ''}
            </div>
            <div class="s">
              <span class="badge tag tag-cat">${LisztUtil.escape(v.group)}</span>
              <span>${LisztUtil.escape(c?.name || '—')}</span>
              ${otherAvg !== null ? `<span>·</span><span style="color:var(--color-gold-2);">他评 ★${otherAvg.toFixed(1)}</span>` : ''}
            </div>
          </a>
        `;
      }).join('')}
    `;
  }

  // =============== 渲染评分表单 ===============
  let videoEl = null;
  let tsList = [];

  async function renderForm() {
    const v = LisztStore.findVideo(x => x.id === activeVid);
    if (!v) {
      document.getElementById('reviewMain').innerHTML = `<div class="alert alert-error">未找到该作品</div>`;
      return;
    }
    const c = LisztStore.findUser(u => u.id === v.contestantId);
    const existingScore = myScores.find(s => s.videoId === v.id);
    const isReScore = !!existingScore;
    const otherScores = LisztStore.scoresForVideo(v.id).filter(s => s.judgeId !== me.judgeId);
    const otherAvg = otherScores.length ? otherScores.reduce((a, b) => a + b.overall, 0) / otherScores.length : null;
    const dimAvg = {};
    LisztData.SCORE_DIMS.forEach(d => {
      dimAvg[d.key] = otherScores.length ? otherScores.reduce((a, b) => a + b[d.key], 0) / otherScores.length : 0;
    });

    // 加载草稿（如果存在）
    const draft = loadDraft();
    const useDraft = draft && draft.videoId === v.id;
    const baseVals = {};
    const baseComment = useDraft ? draft.comment : (isReScore ? existingScore.comment : '');
    const baseTs = useDraft ? (draft.timestamps || []) : (isReScore ? (existingScore.timestamps || []) : []);
    tsList = baseTs.slice();
    LisztData.SCORE_DIMS.forEach(d => {
      if (useDraft) baseVals[d.key] = draft[d.key];
      else if (isReScore) baseVals[d.key] = existingScore[d.key];
      else baseVals[d.key] = 9.0;
    });
    demoFile = null;

    let videoHTML = `<div class="video-frame"><div style="text-align:center;"><div style="font-size: 3rem;">🎬</div><p>视频文件未上传（演示场景）</p></div></div>`;
    try {
      const url = await LisztVideoLoader.getObjectURL(v.id);
      if (url) {
        videoHTML = `
          <video class="video-frame" id="scoreVideo" src="${url}" controls></video>
          <div class="video-controls">
            <select id="speedSelect">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
            <button type="button" id="muteBtn" title="M 键">🔊 静音</button>
            <button type="button" id="fullscreenBtn" title="F 键">⛶ 全屏</button>
            <button type="button" class="ts-btn" id="addTsBtn" title="按 T 键在当前时间点添加评语">⏱ 添加时间戳评语 <kbd>T</kbd></button>
          </div>
        `;
      }
    } catch (e) {}

    const templates = LisztData.COMMENT_TEMPLATES || [];

    document.getElementById('reviewMain').innerHTML = `
      <div class="review-header">
        <div>
          <h2>${LisztUtil.escape(v.title)}</h2>
          <div class="meta">
            <span class="strong">${LisztUtil.escape(v.composer || '')}</span> ·
            <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span> ·
            ${LisztUtil.escape(v.durationLabel || '—')}
            ${otherAvg !== null ? ` · 其他评委均分 <span class="strong">★ ${otherAvg.toFixed(2)}</span>（${otherScores.length} 位，匿名）` : ''}
            ${isReScore ? ` · <span class="tag" style="background: rgba(200,164,92,.15); border-color: var(--color-gold); color: var(--color-gold-2);">修改评分</span>` : ''}
          </div>
        </div>
      </div>

      <div class="video-wrap">
        ${videoHTML}
      </div>

      <!-- 选手信息 -->
      <div style="margin-top: 16px; padding: 12px 16px; background: rgba(12,10,8,.4); border-radius: var(--radius-sm); border: 1px solid var(--color-border); display: flex; gap: 12px; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${c?.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)'}; display: grid; place-items: center; color: #1a1410; font-weight: 700; font-size: .9rem;">${LisztUtil.escape((c?.name || '?').slice(0,1))}</div>
        <div style="flex: 1; min-width: 0;">
          <div><strong style="color: var(--color-text);">${LisztUtil.escape(c?.name || '—')}</strong> <span class="muted" style="font-size: .85rem;">· ${LisztUtil.escape(c?.school || '')}</span></div>
          <div class="muted" style="font-size: .8rem;">${c?.age || '—'} 岁 · 指导教师 ${LisztUtil.escape(c?.teacher || '—')}</div>
        </div>
        <div>
          <a href="result.html?uid=${c?.id}&vid=${v.id}" class="btn btn-ghost btn-sm" target="_blank">查看选手视角</a>
        </div>
      </div>

      ${v.notes ? `<div style="margin-top: 12px; padding: 12px 14px; background: rgba(200,164,92,.06); border-left: 3px solid var(--color-gold); border-radius: 4px; font-size: .9rem; color: var(--color-text-2); line-height: 1.6;"><strong>选手笔记：</strong>${LisztUtil.escape(v.notes)}</div>` : ''}

      <!-- 时间戳评语 -->
      <div class="timestamp-section">
        <div class="head">
          <h4>⏱ 时间戳评语（${tsList.length}）</h4>
          <span class="muted" style="font-size: .8rem;">播放到指定时间点按 <kbd style="background: rgba(12,10,8,.5); padding: 1px 5px; border-radius: 3px;">T</kbd> 添加</span>
        </div>
        <div class="timestamp-list" id="tsList">
          ${renderTsList()}
        </div>
      </div>

      <form class="score-form" id="scoreForm" data-vid="${v.id}">
        <h3>📊 评分（4 个维度，每项 0–10 分）</h3>
        <p class="form-hint">点击 / 拖动滑块调整评分。键盘快捷键：<kbd style="background:rgba(12,10,8,.5);padding:1px 5px;border-radius:3px;">Tab</kbd> 切换维度 · <kbd style="background:rgba(12,10,8,.5);padding:1px 5px;border-radius:3px;">↑↓</kbd> 调整 0.1 · <kbd style="background:rgba(12,10,8,.5);padding:1px 5px;border-radius:3px;">0-9</kbd> 快速设分</p>

        ${LisztData.SCORE_DIMS.map((d, i) => `
          <div class="dim-row ${i === currentDim ? 'active' : ''}" data-dim="${d.key}" data-dimi="${i}" style="--dim-color: ${d.color};">
            <div class="name">
              <span>${LisztUtil.escape(d.label)}</span>
              <span class="weight">${Math.round(d.weight * 100)}%</span>
              <span class="info">ⓘ</span>
              <div class="dim-tooltip">
                <span class="w">权重 ${Math.round(d.weight * 100)}%</span>
                <strong>${LisztUtil.escape(d.label)}</strong><br>
                ${LisztUtil.escape(d.desc)}
                ${otherScores.length ? `<br><br>其他评委均分：<span style="color:${d.color};font-weight:600;">${dimAvg[d.key].toFixed(2)}</span>` : ''}
              </div>
            </div>
            <div class="val" id="val_${d.key}">${baseVals[d.key].toFixed(1)}</div>
            <input type="range" name="${d.key}" min="0" max="10" step="0.1" value="${baseVals[d.key]}">
            <div class="quick">
              <button type="button" data-q="0" data-d="${d.key}">0</button>
              <button type="button" data-q="9" data-d="${d.key}">9</button>
            </div>
            <div class="bar"><div id="bar_${d.key}" style="width: ${baseVals[d.key] * 10}%;"></div></div>
          </div>
        `).join('')}

        <div class="overall-box">
          <div class="label">
            综合评分
            <small>4 维度加权平均</small>
          </div>
          <div class="val" id="overallVal">${computeOverall(baseVals).toFixed(2)}</div>
        </div>

        ${otherScores.length ? `
          <div class="compare-box">
            <div class="head">📊 匿名对比（其他评委均分）</div>
            ${LisztData.SCORE_DIMS.map(d => {
              const my = baseVals[d.key];
              const o = dimAvg[d.key];
              const diff = my - o;
              const arrow = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : '';
              const warn = Math.abs(diff) > 2 ? `<span class="warn">⚠ 偏离较大（${diff > 0 ? '+' : ''}${diff.toFixed(1)}）</span>` : '';
              return `<div class="compare-row">
                <span class="lbl" style="color:${d.color};">${LisztUtil.escape(d.label)}</span>
                <div class="nums">
                  <span class="other">他评 <span style="color:${d.color};font-weight:600;">${o.toFixed(2)}</span></span>
                  <span class="arrow ${arrow}">${arrow === 'up' ? '↑' : arrow === 'down' ? '↓' : '·'}</span>
                  <span style="font-weight:600;color:var(--color-gold-2);">我评 ${my.toFixed(1)}</span>
                </div>
                ${warn}
              </div>`;
            }).join('')}
            <div class="compare-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(200,164,92,.15);">
              <span class="lbl" style="color: var(--color-gold-2);">综合分</span>
              <div class="nums">
                <span class="other">他评 <strong style="color: var(--color-gold-2);">${otherAvg.toFixed(2)}</strong></span>
                <span class="arrow ${(computeOverall(baseVals) - otherAvg) > 0.5 ? 'up' : (computeOverall(baseVals) - otherAvg) < -0.5 ? 'down' : ''}">${(computeOverall(baseVals) - otherAvg) > 0.5 ? '↑' : (computeOverall(baseVals) - otherAvg) < -0.5 ? '↓' : '·'}</span>
                <span style="font-weight:700;color:var(--color-gold-2);">我评 ${computeOverall(baseVals).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="field" style="margin-top: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <label style="margin: 0;">评语 <em style="color:#e07b6e;">*</em> <span class="muted" style="font-weight:normal;font-size:.78rem;">（最少 20 字）</span></label>
            <span class="counter" id="charCount">${baseComment.length} / 500</span>
          </div>
          <textarea name="comment" required minlength="20" maxlength="500" placeholder="对选手演奏的总体评价、技术与音乐性分析、改进建议等..." style="min-height: 120px;">${LisztUtil.escape(baseComment)}</textarea>
          <div class="tpl-chips">
            ${templates.map((t, i) => `<span class="chip" data-tpl="${i}">📝 ${LisztUtil.escape(t.title)}<span class="preview">${LisztUtil.escape(t.body)}</span></span>`).join('')}
          </div>
        </div>

        <div class="draft-status" id="draftStatus" style="${useDraft ? '' : 'display: none;'}">
          <div class="left">
            <span class="dot"></span>
            <span id="draftText">草稿已恢复</span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" id="clearDraftBtn">清除草稿</button>
        </div>

        <h4 class="demo-section" style="margin: 22px 0 10px; font-size: 1rem; padding-top: 18px; border-top: 1px solid var(--color-border);">📹 示范视频（可选）</h4>
        <p class="muted" style="font-size: .85rem; margin-bottom: 10px;">上传一段示范演奏片段，供选手参考学习。${isReScore && existingScore.demoVideoId ? '<span style="color: var(--color-gold-2);">已上传，重新提交将替换。</span>' : ''}</p>
        <div class="demo-upload" id="demoUpload">
          <p style="color: var(--color-text); font-size: .9rem; margin: 6px 0;">点击或拖拽视频至此处</p>
          <p class="hint">MP4 / MOV / WebM · ≤ 500MB</p>
          <input type="file" id="demoFile" accept="video/*" style="display: none;">
        </div>
        <div id="demoFileStatus" style="display:none; margin-top:10px; color: var(--color-gold-2); font-size:.85rem;"></div>

        <div class="submit-row">
          <button class="btn btn-primary" type="submit" style="flex: 1; min-width: 200px;">${isReScore ? '更新评分' : (pending.length > 1 ? '提交并评审下一件 →' : '提交评分')}</button>
          ${pending.length && !isReScore ? `<button class="btn btn-ghost" type="button" id="skipBtn">跳过</button>` : ''}
          <span class="kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 提交 · <kbd>T</kbd> 加时间戳 · <kbd>Esc</kbd> 跳过</span>
        </div>
      </form>
    `;

    bindForm();
    bindVideo();
    renderTsList();
  }

  function computeOverall(vals) {
    return LisztData.SCORE_DIMS.reduce((a, d) => a + vals[d.key] * d.weight, 0);
  }

  // =============== 时间戳评语 ===============
  function renderTsList() {
    const wrap = document.getElementById('tsList');
    if (!wrap) return;
    if (!tsList.length) {
      wrap.innerHTML = `<span class="ts-empty">在视频播放时按 T 键，在当前时间点添加针对该段落的评语。</span>`;
      return;
    }
    wrap.innerHTML = tsList.map((t, i) => `
      <div class="timestamp-pill">
        <span class="ts" data-ts-seek="${t.time}">${LisztUtil.formatDuration(t.time)}</span>
        <span class="txt">${LisztUtil.escape(t.text || '（无文字）')}</span>
        <span class="del" data-ts-del="${i}">×</span>
      </div>
    `).join('');
    wrap.querySelectorAll('[data-ts-seek]').forEach(el => el.addEventListener('click', () => {
      if (videoEl) videoEl.currentTime = parseFloat(el.dataset.tsSeek);
    }));
    wrap.querySelectorAll('[data-ts-del]').forEach(el => el.addEventListener('click', () => {
      tsList.splice(parseInt(el.dataset.tsDel), 1);
      renderTsList();
      saveDraftDebounced();
    }));
  }

  function addTimestampComment() {
    if (!videoEl) { LisztUtil.toast('当前无视频可标记', 'info'); return; }
    const time = Math.floor(videoEl.currentTime);
    const text = prompt(`在 ${LisztUtil.formatDuration(time)} 处添加评语：`, '');
    if (text === null) return;
    tsList.push({ time, text: text.trim() || '（无文字）' });
    tsList.sort((a, b) => a.time - b.time);
    renderTsList();
    saveDraftDebounced();
    LisztUtil.toast(`已记录 ${LisztUtil.formatDuration(time)} 处评语`, 'success');
  }

  // =============== 视频控制 ===============
  function bindVideo() {
    videoEl = document.getElementById('scoreVideo');
    if (!videoEl) return;
    const speedSelect = document.getElementById('speedSelect');
    const muteBtn = document.getElementById('muteBtn');
    const fsBtn = document.getElementById('fullscreenBtn');
    const addTsBtn = document.getElementById('addTsBtn');

    speedSelect?.addEventListener('change', e => videoEl.playbackRate = parseFloat(e.target.value));
    muteBtn?.addEventListener('click', () => { videoEl.muted = !videoEl.muted; muteBtn.textContent = videoEl.muted ? '🔇 取消静音' : '🔊 静音'; });
    fsBtn?.addEventListener('click', () => { videoEl.requestFullscreen?.(); });
    addTsBtn?.addEventListener('click', addTimestampComment);
  }

  // =============== 草稿 ===============
  function draftKey() { return DRAFT_KEY + '_' + me.judgeId + '_' + activeVid; }

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey()) || 'null'); }
    catch (e) { return null; }
  }

  function saveDraftDebounced() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraftNow, DRAFT_SAVE_DELAY);
  }

  function saveDraftNow() {
    const form = document.getElementById('scoreForm');
    if (!form) return;
    const fd = Object.fromEntries(new FormData(form));
    const data = {
      videoId: activeVid,
      judgeId: me.judgeId,
      comment: fd.comment || '',
      timestamps: tsList,
      savedAt: Date.now()
    };
    LisztData.SCORE_DIMS.forEach(d => { data[d.key] = parseFloat(fd[d.key]); });
    localStorage.setItem(draftKey(), JSON.stringify(data));
    lastSavedAt = Date.now();
    const ds = document.getElementById('draftStatus');
    if (ds) {
      ds.style.display = '';
      document.getElementById('draftText').textContent = `草稿已自动保存 · ${LisztUtil.relativeTime(lastSavedAt)}`;
    }
  }

  function clearDraft() {
    localStorage.removeItem(draftKey());
    const ds = document.getElementById('draftStatus');
    if (ds) ds.style.display = 'none';
  }

  // =============== 表单绑定 ===============
  function bindForm() {
    const form = document.getElementById('scoreForm');
    const overall = document.getElementById('overallVal');
    const charCount = document.getElementById('charCount');
    const textarea = form.querySelector('textarea[name="comment"]');

    function bumpVal(el) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 150); }
    function bumpOverall() { overall.classList.add('bump'); setTimeout(() => overall.classList.remove('bump'), 200); }

    function update() {
      const vals = {};
      LisztData.SCORE_DIMS.forEach(d => {
        vals[d.key] = parseFloat(form[d.key].value);
        document.getElementById('val_' + d.key).textContent = vals[d.key].toFixed(1);
        document.getElementById('bar_' + d.key).style.width = (vals[d.key] * 10) + '%';
      });
      overall.textContent = computeOverall(vals).toFixed(2);
      updateCharCount();
      saveDraftDebounced();
    }

    function updateCharCount() {
      const len = textarea.value.length;
      charCount.textContent = `${len} / 500`;
      charCount.classList.toggle('over', len >= 500);
      charCount.classList.toggle('ok', len >= 20);
    }
    updateCharCount();

    form.querySelectorAll('input[type="range"]').forEach(inp => inp.addEventListener('input', update));
    textarea.addEventListener('input', () => { updateCharCount(); saveDraftDebounced(); });

    // 点击维度行激活
    form.querySelectorAll('.dim-row').forEach(row => row.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      currentDim = parseInt(row.dataset.dimi);
      form.querySelectorAll('.dim-row').forEach(r => r.classList.toggle('active', parseInt(r.dataset.dimi) === currentDim));
    }));

    // 快速设分
    form.querySelectorAll('[data-q]').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.d;
      const v = parseFloat(btn.dataset.q);
      form[k].value = v;
      bumpVal(document.getElementById('val_' + k));
      update();
      bumpOverall();
    }));

    // 评语模板
    document.querySelectorAll('[data-tpl]').forEach(chip => chip.addEventListener('click', () => {
      const i = Number(chip.dataset.tpl);
      const tpl = (LisztData.COMMENT_TEMPLATES || [])[i];
      if (!tpl) return;
      if (textarea.value.trim() && !confirm('当前已有内容，是否替换为模板？')) return;
      textarea.value = tpl.body;
      updateCharCount();
      saveDraftDebounced();
    }));

    // 清除草稿
    document.getElementById('clearDraftBtn')?.addEventListener('click', () => {
      if (!confirm('清除当前作品的评分草稿？')) return;
      clearDraft();
      LisztUtil.toast('草稿已清除', 'info');
    });

    // 跳过
    document.getElementById('skipBtn')?.addEventListener('click', () => {
      const cur = activeVid;
      const next = pending.find(v => v.id !== cur);
      if (next) {
        activeVid = next.id;
        const u = new URL(location.href);
        u.searchParams.set('vid', activeVid);
        history.replaceState(null, '', u);
        clearDraft();
        document.querySelectorAll('.pending-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-vid="${activeVid}"]`)?.classList.add('active');
        renderForm();
        window.scrollTo(0, 0);
      } else {
        LisztUtil.toast('已是最后一件待评审作品', 'info');
      }
    });

    // 提交
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      if (!fd.comment.trim() || fd.comment.trim().length < 20) {
        LisztUtil.toast('请填写不少于 20 字的评语', 'error');
        textarea.focus();
        return;
      }
      const isReScore = !!myScores.find(s => s.videoId === activeVid);
      if (isReScore && !confirm('确定要修改已提交的评分？原评分将被覆盖。')) return;

      const vals = {};
      LisztData.SCORE_DIMS.forEach(d => { vals[d.key] = parseFloat(fd[d.key]); });
      const overallVal = computeOverall(vals);
      const scoreId = isReScore ? myScores.find(s => s.videoId === activeVid).id : LisztStore.uid('s');

      const score = {
        id: scoreId,
        videoId: activeVid,
        judgeId: me.judgeId,
        judgeName: judge.name,
        technical: vals.technical,
        musicality: vals.musicality,
        artistry: vals.artistry,
        interpretation: vals.interpretation,
        overall: overallVal,
        comment: fd.comment.trim(),
        reply: isReScore ? (myScores.find(s => s.videoId === activeVid).reply || '') : '',
        demoVideoId: isReScore ? (myScores.find(s => s.videoId === activeVid).demoVideoId || null) : null,
        demoNote: isReScore ? (myScores.find(s => s.videoId === activeVid).demoNote || '') : '',
        timestamps: tsList,
        scoredAt: new Date().toISOString()
      };

      if (demoFile) {
        const demoId = LisztStore.uid('demo');
        try {
          await LisztStore.saveVideoBlob(demoId, demoFile, { judgeId: me.judgeId, name: demoFile.name, size: demoFile.size });
          score.demoVideoId = demoId;
          score.demoNote = demoFile.name;
        } catch (err) {
          LisztUtil.toast('示范视频上传失败：' + err.message, 'error');
        }
      }

      // 状态机下沉到 setScore
      LisztStore.setScore(score);

      clearDraft();
      demoFile = null;

      // 显示撤销 toast
      showUndoToast(score);

      // 重新加载数据并跳到下一个待评审
      setTimeout(() => {
        location.reload();
      }, 1200);
    });
  }

  // =============== 撤销 ===============
  function showUndoToast(score) {
    lastSubmitted = score;
    const wrap = document.createElement('div');
    wrap.className = 'undo-toast';
    wrap.innerHTML = `
      <span>✓ 评分已提交 · ★ ${score.overall.toFixed(2)}</span>
      <button id="undoBtn">撤销</button>
    `;
    document.body.appendChild(wrap);
    let undone = false;
    document.getElementById('undoBtn').onclick = () => {
      undone = true;
      // 撤销：状态机下沉到 removeScore，自动维护 video.status
      LisztStore.removeScore(score.id);
      wrap.remove();
      LisztUtil.toast('已撤销', 'info');
      setTimeout(() => location.reload(), 400);
    };
    setTimeout(() => { if (!undone) wrap.remove(); }, 5500);
  }

  // =============== 键盘快捷键 ===============
  document.addEventListener('keydown', e => {
    // 输入框中不处理
    if (e.target.matches('input, textarea, select')) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('scoreForm')?.requestSubmit();
      }
      return;
    }

    // 视频相关
    if (videoEl) {
      if (e.key === 'm' || e.key === 'M') { videoEl.muted = !videoEl.muted; e.preventDefault(); }
      if (e.key === 'f' || e.key === 'F') { videoEl.requestFullscreen?.(); e.preventDefault(); }
      if (e.key === 't' || e.key === 'T') { addTimestampComment(); e.preventDefault(); }
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); videoEl.paused ? videoEl.play() : videoEl.pause(); }
    }

    // 跳过
    if (e.key === 'Escape') {
      const skip = document.getElementById('skipBtn');
      if (skip) { skip.click(); e.preventDefault(); }
      return;
    }

    // 评分快捷键
    if (e.key === 'Tab') {
      e.preventDefault();
      currentDim = (currentDim + (e.shiftKey ? -1 : 1) + 4) % 4;
      const form = document.getElementById('scoreForm');
      form?.querySelectorAll('.dim-row').forEach(r => r.classList.toggle('active', parseInt(r.dataset.dimi) === currentDim));
      form?.querySelectorAll('input[type="range"]')[currentDim]?.focus();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const form = document.getElementById('scoreForm');
      const inp = form?.querySelectorAll('input[type="range"]')[currentDim];
      if (!inp) return;
      const delta = e.shiftKey ? 1 : 0.1;
      const v = Math.max(0, Math.min(10, parseFloat(inp.value) + (e.key === 'ArrowUp' ? delta : -delta)));
      inp.value = v.toFixed(1);
      const val = document.getElementById('val_' + inp.name);
      val.classList.add('bump'); setTimeout(() => val.classList.remove('bump'), 150);
      const overall = document.getElementById('overallVal');
      overall.classList.add('bump'); setTimeout(() => overall.classList.remove('bump'), 200);
      // 触发 input 事件
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // 0-9 快速设分
    if (/^[0-9]$/.test(e.key)) {
      const v = parseInt(e.key);
      const form = document.getElementById('scoreForm');
      const inp = form?.querySelectorAll('input[type="range"]')[currentDim];
      if (!inp) return;
      const target = v; // 0-9
      inp.value = target;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  renderShell();
})();