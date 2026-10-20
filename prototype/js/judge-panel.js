/* ============================================================
   judge-panel.js — 评委评审面板
   ============================================================ */
(function () {
  'use strict';

  if (!LisztAuth.require('judge')) return;

  const judge = LisztAuth.current;
  const judgeInfo = LisztData.SEED_JUDGES.find(j => j.id === judge.judgeId) || { name: judge.name };

  let demoVideoFile = null;
  let currentDemoMeta = null;

  // ---- 个人信息 ----
  function renderMe() {
    document.getElementById('meName').textContent = judge.name;
    document.getElementById('meAvatar').textContent = (judge.name || judge.username).slice(0, 1);
    document.getElementById('meAvatar').style.background = judge.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)';
  }

  // ---- 面板切换 ----
  document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });
  function switchPanel(name) {
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('panel-' + name);
    if (target) target.classList.add('active');
    if (name === 'queue') renderQueue();
    if (name === 'scored') renderScored();
    if (name === 'demos') renderMyDemos();
  }

  // ---- 待评审队列 ----
  function renderQueue() {
    const allVideos = LisztStore.getVideos();
    const myScores = LisztStore.scoresByJudge(judge.judgeId);
    const pending = allVideos.filter(v => !myScores.some(s => s.videoId === v.id));

    document.getElementById('queueStats').innerHTML = `
      <div class="stat-box" style="padding: 18px; border-left: 3px solid var(--color-gold);"><div class="num" style="font-size: 2rem;">${pending.length}</div><div class="label">待评审</div></div>
      <div class="stat-box" style="padding: 18px;"><div class="num" style="font-size: 2rem; color: var(--color-success);">${myScores.length}</div><div class="label">已完成</div></div>
      <div class="stat-box" style="padding: 18px;"><div class="num" style="font-size: 2rem;">${allVideos.length}</div><div class="label">总作品</div></div>
    `;

    const wrap = document.getElementById('queueGrid');
    if (!pending.length) {
      wrap.innerHTML = `<div class="alert alert-success" style="grid-column: 1 / -1;">🎉 您已完成全部作品的评审工作。</div>`;
      return;
    }
    wrap.innerHTML = pending.map(v => {
      const contestant = LisztStore.findUser(u => u.id === v.contestantId);
      const otherScores = LisztStore.scoresForVideo(v.id);
      const otherAvg = otherScores.length ? (otherScores.reduce((a, b) => a + b.overall, 0) / otherScores.length) : null;
      return `
        <div class="video-card" data-review="${v.id}">
          <div class="video-thumb" data-play="${v.id}">
            <div class="play"></div>
            <div class="duration">${LisztUtil.escape(v.durationLabel || '—')}</div>
            <div class="status status-pending">待评审</div>
          </div>
          <div class="video-body">
            <h4>${LisztUtil.escape(v.title)}</h4>
            <div class="meta">
              <span>${LisztUtil.escape(v.composer || '')}</span> · 
              <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span>
            </div>
            <div class="desc">
              <strong style="color:var(--color-gold-2);">选手：</strong>${LisztUtil.escape(contestant?.name || '—')}
              <span class="muted" style="font-size:.85rem;">(${LisztUtil.escape(contestant?.school || '')} · ${contestant?.age || '—'}岁)</span>
            </div>
            ${otherAvg !== null ? `
              <div style="margin-top: 10px; padding: 8px 12px; background: rgba(200,164,92,.08); border-radius: 4px; font-size:.85rem;">
                <span class="muted">其他评委均分：</span>
                <strong style="color:var(--color-gold-2);">★ ${otherAvg.toFixed(2)}</strong>
                <span class="muted" style="font-size:.78rem;">(${otherScores.length} 位)</span>
              </div>
            ` : ''}
            <div class="footer">
              <span class="muted" style="font-size:.85rem;">${LisztUtil.formatDate(v.uploadedAt)}</span>
              <button class="btn btn-primary btn-sm" data-review="${v.id}">开始评分 →</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    wrap.querySelectorAll('[data-review]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); location.href = 'score.html?vid=' + el.dataset.review; }));
    wrap.querySelectorAll('[data-play]').forEach(el => el.addEventListener('click', async e => { e.stopPropagation(); await previewVideo(el.dataset.play); }));
  }

  async function previewVideo(videoId) {
    const url = await LisztVideoLoader.getObjectURL(videoId);
    if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '预览' });
    else LisztModal.open(`<div class="alert alert-info">视频文件不存在</div>`, { title: '预览' });
  }

  // ---- 评分表单 ----
  async function openReview(videoId) {
    const v = LisztStore.findVideo(x => x.id === videoId);
    const contestant = LisztStore.findUser(u => u.id === v.contestantId);
    const url = await LisztVideoLoader.getObjectURL(videoId);

    // 检查当前评委是否已评过此作品
    const existingScore = LisztStore.scoresForVideo(videoId).find(s => s.judgeId === judge.judgeId);

    const dims = LisztData.SCORE_DIMS.map(d => `
      <div class="dim-row" style="margin-bottom: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
          <label style="margin: 0; color: var(--color-text);">${d.label}</label>
          <span style="font-family: var(--font-serif); font-size: 1.25rem; color: var(--color-gold-2); font-weight: 700;" id="dim_${d.key}_val">9.0</span>
        </div>
        <input type="range" name="${d.key}" min="0" max="10" step="0.1" value="9.0"
          style="width: 100%; accent-color: var(--color-gold);"
          oninput="document.getElementById('dim_${d.key}_val').textContent = parseFloat(this.value).toFixed(1); updateOverall(); updateDimBar('${d.key}', this.value);">
        <div style="height: 4px; background: rgba(12,10,8,.6); border-radius: 999px; margin-top: 4px; overflow:hidden;">
          <div id="dim_${d.key}_bar" style="height:100%; width:90%; background: linear-gradient(90deg, var(--color-gold-3), var(--color-gold-2)); transition: width .15s ease;"></div>
        </div>
      </div>
    `).join('');

    const templates = LisztData.COMMENT_TEMPLATES || [];
    const templateChips = templates.map((t, i) => `
      <button type="button" class="btn btn-ghost btn-sm" data-tpl="${i}">📝 ${LisztUtil.escape(t.title)}</button>
    `).join('');

    const html = `
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; @media (max-width: 820px) { grid-template-columns: 1fr; }">
        <!-- 左侧：视频 + 作品信息 -->
        <div>
          ${url ? `<video controls class="video-player" src="${url}"></video>` : `
            <div style="aspect-ratio: 16/9; background: linear-gradient(135deg, #1a1410, #2a241c); border-radius: var(--radius-sm); display: grid; place-items: center; color: var(--color-text-dim);">
              <div style="text-align:center;"><div style="font-size:3rem;">🎬</div><p style="margin-top: 10px;">视频文件不存在（演示场景）</p></div>
            </div>
          `}
          <div style="margin-top:18px; padding: 18px 20px; background: rgba(12,10,8,.4); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <h3 style="margin: 0 0 6px; color: var(--color-text);">${LisztUtil.escape(v.title)}</h3>
            <div class="muted">${LisztUtil.escape(v.composer || '')} · <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span> · ${v.durationLabel || '—'}</div>
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--color-border);">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${contestant?.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)'}; display: grid; place-items: center; color: #1a1410; font-weight: 700; font-size: .85rem;">${LisztUtil.escape((contestant?.name || '?').slice(0,1))}</div>
                <div>
                  <div><strong style="color: var(--color-text);">${LisztUtil.escape(contestant?.name || '—')}</strong> <span class="muted" style="font-size:.85rem;">· ${LisztUtil.escape(contestant?.school || '')}</span></div>
                  <div class="muted" style="font-size:.82rem;">${contestant?.age || '—'} 岁 · 指导教师 ${LisztUtil.escape(contestant?.teacher || '—')}</div>
                </div>
              </div>
            </div>
            ${v.notes ? `<div style="margin-top: 12px; padding: 12px 14px; background: rgba(200,164,92,.06); border-left: 3px solid var(--color-gold); border-radius: 4px; font-size:.9rem; color: var(--color-text-2); line-height: 1.6;">${LisztUtil.escape(v.notes)}</div>` : ''}
          </div>
        </div>

        <!-- 右侧：评分表单 -->
        <div>
          ${existingScore ? `<div class="alert alert-info" style="margin-bottom: 16px;">⚠ 您已于 ${LisztUtil.formatDate(existingScore.scoredAt)} 评过此作品。提交将覆盖原评分。</div>` : ''}
          <form id="scoreForm" data-vid="${videoId}" style="background: rgba(12,10,8,.3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 20px;">
            <h3 style="margin: 0 0 14px; font-size: 1.1rem;">📊 评分（4 个维度，每项 0–10 分）</h3>
            ${dims}
            <div style="background: linear-gradient(135deg, rgba(200,164,92,.12), rgba(200,164,92,.06)); padding: 14px 18px; border-radius: var(--radius-sm); margin-top: 12px; display:flex; justify-content: space-between; align-items:center;">
              <div>
                <div style="font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; color: var(--color-text-dim);">综合评分</div>
                <div style="font-size: .82rem; color: var(--color-text-dim); margin-top: 2px;">4 维度加权平均</div>
              </div>
              <div style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--color-gold-2); font-weight: 700; line-height: 1;" id="overallVal">9.00</div>
            </div>

            <div class="field" style="margin-top: 22px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                <label>评语（必填） *</label>
                <span class="muted" style="font-size:.78rem;">${(existingScore?.comment || '').length || 0} / 500</span>
              </div>
              <textarea name="comment" required minlength="20" maxlength="500" oninput="this.parentElement.querySelector('.muted').textContent = this.value.length + ' / 500'" placeholder="对选手演奏的总体评价、技术与音乐性分析、改进建议等..." style="min-height: 120px;">${existingScore?.comment || ''}</textarea>
              <div style="margin-top: 8px; display:flex; gap: 6px; flex-wrap: wrap;">
                ${templateChips}
              </div>
            </div>

            <h4 style="margin: 22px 0 10px; font-size: 1rem; padding-top: 18px; border-top: 1px solid var(--color-border);">📹 上传示范视频（可选）</h4>
            <p class="muted" style="font-size:.85rem; margin-bottom: 10px;">上传一段示范演奏片段，供选手参考学习。</p>
            <div class="dropzone" id="demoDropzone" style="padding: 22px 16px;">
              <p style="color:var(--color-text); font-size:.92rem;">点击或拖拽视频至此处</p>
              <p class="hint" style="margin-top: 6px;">MP4 / MOV / WebM</p>
              <input type="file" id="demoFileInput" accept="video/*">
            </div>
            <div id="demoFileStatus" style="display:none; margin-top:10px; color: var(--color-gold-2); font-size:.85rem;"></div>

            <div style="display:flex; gap:12px; margin-top: 24px;">
              <button class="btn btn-primary" type="submit" style="flex:1;">${existingScore ? '更新评分' : '提交评分'}</button>
              <button class="btn btn-ghost" type="button" onclick="LisztModal.close()">取消</button>
            </div>
          </form>
        </div>
      </div>
    `;

    LisztModal.open(html, { title: '🎼 评审作品 · ' + v.title });

    // 综合分计算
    window.updateOverall = function() {
      const form = document.getElementById('scoreForm');
      const vals = LisztData.SCORE_DIMS.map(d => parseFloat(form[d.key].value));
      const overall = vals.reduce((a, b) => a + b, 0) / vals.length;
      document.getElementById('overallVal').textContent = overall.toFixed(2);
    };
    window.updateDimBar = function(key, val) {
      const bar = document.getElementById('dim_' + key + '_bar');
      if (bar) bar.style.width = (val * 10) + '%';
    };

    // 评语模板
    document.querySelectorAll('[data-tpl]').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.tpl);
      const tpl = templates[i];
      if (!tpl) return;
      const textarea = document.querySelector('#scoreForm textarea[name="comment"]');
      if (textarea.value && !confirm('当前已有内容，是否替换为模板？')) return;
      textarea.value = tpl.body;
      // 触发字数统计
      textarea.dispatchEvent(new Event('input'));
    }));

    // 示范视频上传
    const demoDrop = document.getElementById('demoDropzone');
    const demoFile = document.getElementById('demoFileInput');
    const demoStatus = document.getElementById('demoFileStatus');
    demoDrop.addEventListener('click', () => demoFile.click());
    demoDrop.addEventListener('dragover', e => { e.preventDefault(); demoDrop.classList.add('dragover'); });
    demoDrop.addEventListener('dragleave', () => demoDrop.classList.remove('dragover'));
    demoDrop.addEventListener('drop', e => { e.preventDefault(); demoDrop.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleDemo(e.dataTransfer.files[0]); });
    demoFile.addEventListener('change', e => { if (e.target.files[0]) handleDemo(e.target.files[0]); });

    function handleDemo(file) {
      if (!file.type.startsWith('video/')) { LisztUtil.toast('请选择视频文件', 'error'); return; }
      demoVideoFile = file;
      demoStatus.style.display = '';
      demoStatus.textContent = `已选择：${file.name} · ${LisztUtil.formatSize(file.size)}`;
    }

    // 提交评分
    document.getElementById('scoreForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const dims = LisztData.SCORE_DIMS.map(d => ({ key: d.key, value: parseFloat(fd[d.key]) }));
      const overall = dims.reduce((a, b) => a + b.value, 0) / dims.length;
      if (!fd.comment.trim() || fd.comment.trim().length < 20) { LisztUtil.toast('请填写不少于 20 字的评语', 'error'); return; }

      const scoreId = existingScore ? existingScore.id : LisztStore.uid('s');
      const score = {
        id: scoreId,
        videoId: videoId,
        judgeId: judge.judgeId,
        judgeName: judge.name,
        technical: parseFloat(fd.technical),
        musicality: parseFloat(fd.musicality),
        artistry: parseFloat(fd.artistry),
        interpretation: parseFloat(fd.interpretation),
        overall,
        comment: fd.comment.trim(),
        reply: '',
        demoVideoId: null,
        scoredAt: new Date().toISOString()
      };

      // 处理示范视频
      if (demoVideoFile) {
        const demoId = LisztStore.uid('demo');
        await LisztStore.saveVideoBlob(demoId, demoVideoFile, { judgeId: judge.judgeId, name: demoVideoFile.name });
        score.demoVideoId = demoId;
      } else if (existingScore?.demoVideoId) {
        score.demoVideoId = existingScore.demoVideoId;
      }

      // 状态机下沉到 setScore：自动按 ≥JUDGES_PER_VIDEO 维护 video.status
      LisztStore.setScore(score);

      LisztUtil.toast(existingScore ? '评分已更新' : '评分已提交', 'success');
      demoVideoFile = null;
      LisztModal.close();
      // 跳转到评分详情页，便于评委确认
      setTimeout(() => {
        if (confirm('评分已保存。是否查看评分详情？')) {
          location.href = 'score-detail.html?vid=' + videoId;
        } else {
          renderQueue();
        }
      }, 400);
    });
  }

  // ---- 已完成 ----
  function renderScored() {
    const scores = LisztStore.scoresByJudge(judge.judgeId).sort((a, b) => new Date(b.scoredAt) - new Date(a.scoredAt));
    const wrap = document.getElementById('scoredList');
    if (!scores.length) {
      wrap.innerHTML = `<div class="alert alert-info">您尚未完成任何评分。</div>`;
      return;
    }
    wrap.innerHTML = scores.map(s => {
      const v = LisztStore.findVideo(x => x.id === s.videoId);
      const c = v ? LisztStore.findUser(u => u.id === v.contestantId) : null;
      return `
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:14px; flex-wrap:wrap;">
            <div style="flex:1;">
              <h3 style="margin:0 0 6px;">${LisztUtil.escape(v?.title || '')}</h3>
              <div class="muted" style="font-size:.9rem;">选手：${LisztUtil.escape(c?.name || '—')} · <span class="tag tag-cat">${LisztUtil.escape(v?.group || '')}</span></div>
            </div>
            <div style="text-align:right;">
              <div class="score-pill">★ ${s.overall.toFixed(2)}</div>
              <div class="muted" style="font-size:.8rem; margin-top:4px;">${LisztUtil.formatDate(s.scoredAt)}</div>
            </div>
          </div>
          <p style="margin-top:12px;"><strong style="color:var(--color-text);">评语：</strong>${LisztUtil.escape(s.comment.slice(0, 140))}${s.comment.length > 140 ? '…' : ''}</p>
          <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" data-view="${s.videoId}">查看作品</button>
            <a class="btn btn-primary btn-sm" href="score-detail.html?vid=${s.videoId}">查看完整评分 →</a>
            <button class="btn btn-ghost btn-sm" data-re-score="${s.videoId}">修改评分</button>
          </div>
          ${s.demoVideoId ? '<span class="tag" style="align-self:center;">已附示范视频</span>' : ''}
          ${s.reply ? '<span class="tag" style="align-self:center; background: rgba(79,157,111,.15); border-color: rgba(79,157,111,.4); color:#b6e3c8;">选手已回复 · 点击查看</span>' : ''}
        </div>
      `;
    }).join('');
    wrap.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', async () => {
      const id = el.dataset.view;
      const url = await LisztVideoLoader.getObjectURL(id);
      const v = LisztStore.findVideo(x => x.id === id);
      LisztModal.open(`
        ${url ? `<video controls class="video-player" src="${url}"></video>` : '<div class="alert alert-info">视频文件不存在</div>'}
        <h3 style="margin-top:18px;">${LisztUtil.escape(v.title)}</h3>
      `, { title: '作品详情' });
    }));
    wrap.querySelectorAll('[data-re-score]').forEach(el => el.addEventListener('click', () => {
      location.href = 'score.html?vid=' + el.dataset.reScore;
    }));
  }

  // ---- 我的示范视频 ----
  async function renderMyDemos() {
    const scores = LisztStore.scoresByJudge(judge.judgeId).filter(s => s.demoVideoId);
    const wrap = document.getElementById('myDemosList');
    if (!scores.length) {
      wrap.innerHTML = `<div class="alert alert-info">您尚未上传任何示范视频。在评分时可选择上传。</div>`;
      return;
    }
    wrap.innerHTML = `<div class="video-grid">` + scores.map(s => {
      const v = LisztStore.findVideo(x => x.id === s.videoId);
      const c = v ? LisztStore.findUser(u => u.id === v.contestantId) : null;
      return `
        <div class="video-card" data-play="${s.demoVideoId}">
          <div class="video-thumb">
            <div class="play"></div>
            <div class="status status-scored">示范</div>
          </div>
          <div class="video-body">
            <h4>示范 · ${LisztUtil.escape(v?.title || '')}</h4>
            <div class="meta">选手：${LisztUtil.escape(c?.name || '—')}</div>
            <div class="desc">${LisztUtil.escape((s.comment || '').slice(0, 80))}…</div>
            <div class="footer">
              <span class="muted" style="font-size:.85rem;">${LisztUtil.formatDate(s.scoredAt)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') + `</div>`;
    wrap.querySelectorAll('[data-play]').forEach(el => el.addEventListener('click', async () => {
      const url = await LisztVideoLoader.getObjectURL(el.dataset.play);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '我的示范视频' });
    }));
  }

  // ---- 初始化 ----
  renderMe();
  renderQueue();
})();