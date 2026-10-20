/* ============================================================
   dashboard.js — 选手中心
   ============================================================ */
(function () {
  'use strict';

  if (!LisztAuth.require('contestant')) return;

  const user = LisztAuth.current;
  let currentVideoFile = null;
  let currentVideoDuration = 0;

  // ---- 工具：渲染侧边栏个人信息 ----
  function renderMe() {
    document.getElementById('meName').textContent = user.name;
    document.getElementById('welcomeName').textContent = user.name;
    document.getElementById('meAvatar').textContent = (user.name || user.username).slice(0, 1);
    document.getElementById('meAvatar').style.background = user.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)';
  }

  // ---- 面板切换 ----
  document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });
  document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => switchPanel(el.dataset.go));
  });
  function switchPanel(name) {
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('panel-' + name);
    if (target) target.classList.add('active');
    if (name === 'overview') renderOverview();
    if (name === 'myvideos') renderMyVideos();
    if (name === 'scores') renderScores();
    if (name === 'demos') renderDemos();
    if (name === 'profile') renderProfile();
  }

  // ---- 总览 ----
  function renderOverview() {
    const videos = LisztStore.videosBy(v => v.contestantId === user.id);
    const allScores = LisztStore.getScores().filter(s => videos.some(v => v.id === s.videoId));
    const avg = allScores.length ? (allScores.reduce((sum, s) => sum + s.overall, 0) / allScores.length) : 0;

    document.getElementById('overviewStats').innerHTML = `
      <div class="stat-box"><div class="num">${videos.length}</div><div class="label">已上传视频</div></div>
      <div class="stat-box"><div class="num">${allScores.length}</div><div class="label">收到评分</div></div>
      <div class="stat-box"><div class="num">${avg ? avg.toFixed(2) : '—'}</div><div class="label">平均分</div></div>
      <div class="stat-box"><div class="num">${videos.filter(v => v.status === 'scored').length}</div><div class="label">已评审完成</div></div>
    `;

    const wrap = document.getElementById('recentScores');
    if (!allScores.length) {
      wrap.innerHTML = `<div class="empty-state">
        <div class="ic">⏳</div>
        <h4>暂无评分</h4>
        <p>评委将在评审周期内对您的作品进行评分，请耐心等待。</p>
      </div>`;
      return;
    }
    wrap.innerHTML = allScores.slice(-3).map(s => {
      const v = LisztStore.findVideo(x => x.id === s.videoId);
      return `
        <div class="card" style="margin-bottom: 12px;">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:14px; flex-wrap:wrap;">
            <div style="flex:1; min-width:240px;">
              <strong style="color:var(--color-gold-2);">${LisztUtil.escape(s.judgeName)}</strong>
              <span class="muted" style="font-size:.85rem; margin-left: 8px;">${LisztUtil.formatDate(s.scoredAt)}</span>
              <div style="margin-top: 6px; color: var(--color-text);">${LisztUtil.escape(v ? v.title : '')}</div>
              <div class="muted" style="font-size:.9rem; margin-top: 6px;">${LisztUtil.escape(s.comment.slice(0, 80))}…</div>
            </div>
            <div class="score-pill">${s.overall.toFixed(2)} 分</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---- 我的视频 ----
  function renderMyVideos() {
    const videos = LisztStore.videosBy(v => v.contestantId === user.id);
    const wrap = document.getElementById('myVideosGrid');
    if (!videos.length) {
      wrap.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
        <div class="ic">🎬</div>
        <h4>您还没有上传作品</h4>
        <p>每人限传 1 件作品，上传后等待评委打分。</p>
        <a href="upload.html" class="btn btn-primary">📤 立即上传</a>
      </div>`;
      return;
    }
    wrap.innerHTML = videos.map(v => {
      const scores = LisztStore.scoresForVideo(v.id);
      const avg = scores.length ? (scores.reduce((s, x) => s + x.overall, 0) / scores.length) : null;
      return `
        <div class="video-card" data-vid="${v.id}">
          <div class="video-thumb" data-play="${v.id}">
            <div class="play"></div>
            <div class="duration">${LisztUtil.escape(v.durationLabel || '—')}</div>
            <div class="status status-${v.status}">${statusLabel(v.status)}</div>
          </div>
          <div class="video-body">
            <h4>${LisztUtil.escape(v.title)}</h4>
            <div class="meta">
              <span>${LisztUtil.escape(v.composer || '')}</span> · 
              <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span>
            </div>
            <div class="desc">${LisztUtil.escape(v.notes || '无简介')}</div>
            <div class="footer">
              <span class="muted" style="font-size:.85rem;">${LisztUtil.formatDate(v.uploadedAt)}</span>
              ${avg ? `<span class="score-pill">★ ${avg.toFixed(2)}</span>` : '<span class="muted" style="font-size:.85rem;">待评审</span>'}
            </div>
          </div>
        </div>
      `;
    }).join('');
    wrap.querySelectorAll('[data-play]').forEach(el => el.addEventListener('click', () => openVideo(el.dataset.play)));
  }

  function statusLabel(s) {
    return s === 'pending' ? '待评审' : s === 'reviewing' ? '评审中' : '已评分';
  }

  // ---- 打开视频（带评分展示） ----
  async function openVideo(videoId) {
    const v = LisztStore.findVideo(x => x.id === videoId);
    if (!v) return;
    const scores = LisztStore.scoresForVideo(videoId);

    let videoHTML = '<div class="alert alert-info">视频文件尚未上传（演示场景无视频文件）。</div>';
    try {
      const url = await LisztVideoLoader.getObjectURL(videoId);
      if (url) videoHTML = `<video controls class="video-player" src="${url}"></video>`;
    } catch (e) {}

    const html = `
      ${videoHTML}
      <div style="margin-top: 20px;">
        <h3 style="margin-bottom: 6px;">${LisztUtil.escape(v.title)}</h3>
        <div class="muted">${LisztUtil.escape(v.composer || '')} · <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span></div>
        <p style="margin-top: 12px;">${LisztUtil.escape(v.notes || '')}</p>
      </div>

      <h3 style="margin-top: 30px; border-top: 1px solid var(--color-border); padding-top: 24px;">评委评分</h3>
      ${scores.length ? scores.map(s => scoreCard(s, videoId)).join('') : '<div class="alert alert-info">暂无评分</div>'}
    `;
    LisztModal.open(html, { title: '作品详情与评委评语' });
  }

  function scoreCard(s, videoId) {
    const dims = LisztData.SCORE_DIMS.map(d => `
      <tr>
        <td>${d.label}</td>
        <td>${s[d.key].toFixed(1)}</td>
        <td><div class="score-bar"><div style="width:${s[d.key]*10}%"></div></div></td>
      </tr>
    `).join('');
    const demo = s.demoVideoId ? `
      <div class="alert alert-info" style="margin-top: 14px;">
        <strong>评委上传了示范视频：</strong>
        <button class="btn btn-primary btn-sm" style="margin-left: 8px;" id="playDemoBtn_${s.demoVideoId}">▶ 播放示范</button>
      </div>
    ` : '';
    return `
      <div class="card" style="margin-top: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="color:var(--color-gold-2); font-family: var(--font-serif); font-size: 1.1rem;">${LisztUtil.escape(s.judgeName)}</strong>
            <span class="role-tag" style="font-size:.7rem; padding:2px 8px; background: rgba(200,164,92,.15); border-radius:999px; color: var(--color-gold-2); margin-left:6px;">评委</span>
          </div>
          <span class="score-pill" style="font-size:.95rem;">综合 ${s.overall.toFixed(2)} 分</span>
        </div>
        <table class="score-table" style="margin-top: 12px;">
          <thead><tr><th>维度</th><th style="width:80px;">分数</th><th></th></tr></thead>
          <tbody>${dims}</tbody>
        </table>
        <div style="margin-top: 14px;">
          <strong style="color:var(--color-text);">评委评语：</strong>
          <p style="margin-top: 6px;">${LisztUtil.escape(s.comment)}</p>
        </div>
        ${demo}
        ${s.reply ? `
          <div class="reply">
            <strong style="color: var(--color-text);">我的回复：</strong>
            <p style="margin-top: 6px;">${LisztUtil.escape(s.reply)}</p>
          </div>
        ` : `
          <div class="reply">
            <strong style="color: var(--color-text);">回复评委：</strong>
            <form data-reply="${s.id}" style="margin-top: 8px;">
              <textarea name="reply" placeholder="向评委表达感谢或提出问题..." style="min-height: 70px;"></textarea>
              <button class="btn btn-primary btn-sm" type="submit" style="margin-top: 8px;">发送回复</button>
            </form>
          </div>
        `}
      </div>
    `;
  }

  // 评分卡的交互（事件代理，modal 重新渲染后）
  document.addEventListener('click', async (e) => {
    const playDemo = e.target.closest('[id^="playDemoBtn_"]');
    if (playDemo) {
      const id = playDemo.id.replace('playDemoBtn_', '');
      const url = await LisztVideoLoader.getObjectURL(id);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '评委示范视频' });
      else LisztModal.open(`<div class="alert alert-info">示范视频文件不存在。</div>`, { title: '评委示范视频' });
    }
  });

  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-reply]')) return;
    e.preventDefault();
    const scoreId = e.target.dataset.reply;
    const reply = new FormData(e.target).get('reply');
    if (!reply.trim()) return;
    const scores = LisztStore.getScores();
    const s = scores.find(x => x.id === scoreId);
    if (s) {
      s.reply = reply.trim();
      LisztStore.setScores(scores);
      LisztUtil.toast('回复已发送', 'success');
      // 关闭 modal 重新打开以刷新
      const videoId = s.videoId;
      LisztModal.close();
      setTimeout(() => openVideo(videoId), 300);
    }
  });

  // ---- 我的成绩 ----
  function renderScores() {
    const videos = LisztStore.videosBy(v => v.contestantId === user.id);
    const scores = LisztStore.getScores().filter(s => videos.some(v => v.id === s.videoId));

    // 顶部汇总
    const summaryEl = document.getElementById('scoresSummary');
    if (videos.length && scores.length) {
      const avgAll = scores.reduce((a, b) => a + b.overall, 0) / scores.length;
      const max = Math.max(...scores.map(s => s.overall));
      summaryEl.innerHTML = `
        <div style="display:flex; gap: 14px; flex-wrap: wrap; align-items:center;">
          <div style="text-align:center; padding: 8px 16px; background: rgba(200,164,92,.08); border:1px solid var(--color-border); border-radius: var(--radius-sm);">
            <div style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--color-gold-2); font-weight:700;">${avgAll.toFixed(2)}</div>
            <div class="muted" style="font-size:.75rem; letter-spacing:.05em; text-transform: uppercase;">综合均分</div>
          </div>
          <div style="text-align:center; padding: 8px 16px; background: rgba(200,164,92,.08); border:1px solid var(--color-border); border-radius: var(--radius-sm);">
            <div style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--color-gold-2); font-weight:700;">${max.toFixed(2)}</div>
            <div class="muted" style="font-size:.75rem; letter-spacing:.05em; text-transform: uppercase;">最高单项</div>
          </div>
          <div style="text-align:center; padding: 8px 16px; background: rgba(200,164,92,.08); border:1px solid var(--color-border); border-radius: var(--radius-sm);">
            <div style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--color-gold-2); font-weight:700;">${scores.length}</div>
            <div class="muted" style="font-size:.75rem; letter-spacing:.05em; text-transform: uppercase;">收到的评分</div>
          </div>
        </div>
      `;
    } else {
      summaryEl.innerHTML = '';
    }

    const wrap = document.getElementById('scoresList');
    if (!videos.length) {
      wrap.innerHTML = `<div class="empty-state">
        <div class="ic">📋</div>
        <h4>您还没有上传作品</h4>
        <p>请先上传您的参赛作品，评委才能开始打分。</p>
        <a href="upload.html" class="btn btn-primary">📤 立即上传</a>
      </div>`;
      return;
    }
    if (!scores.length) {
      wrap.innerHTML = `<div class="alert alert-info">评委正在对您的作品进行评审，请耐心等待。</div>`;
      return;
    }

    wrap.innerHTML = videos.map(v => {
      const vScores = scores.filter(s => s.videoId === v.id);
      const avg = vScores.length ? vScores.reduce((a, b) => a + b.overall, 0) / vScores.length : 0;
      const status = vScores.length > 0 ? 'scored' : (v.status || 'pending');
      return `
        <article class="card score-work-card" style="margin-bottom: 22px; padding:0;">
          <!-- 作品头部 -->
          <header style="padding: 22px 26px; border-bottom: 1px solid var(--color-border);">
            <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:14px;">
              <div style="flex:1; min-width: 220px;">
                <h3 style="margin: 0 0 6px; color: var(--color-text);">${LisztUtil.escape(v.title)}</h3>
                <div class="muted" style="font-size:.9rem;">
                  ${LisztUtil.escape(v.composer || '')} · <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span> · 上传于 ${LisztUtil.formatDate(v.uploadedAt)}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-family: var(--font-serif); font-size: 2.4rem; color: var(--color-gold-2); font-weight: 700; line-height: 1;">${avg.toFixed(2)}</div>
                <div class="muted" style="font-size:.78rem; margin-top: 4px; letter-spacing:.05em;">综合评分 · ${vScores.length} 位评委</div>
                <button class="btn btn-ghost btn-sm" data-detail="${v.id}" style="margin-top: 8px;">查看完整评分 →</button>
              </div>
            </div>
          </header>

          <!-- 评委评语列表 -->
          <div style="padding: 18px 26px 26px;">
            ${vScores.length ? vScores.map(s => judgeScoreCard(s, v)).join('') : '<p class="muted">暂未收到评委的评分</p>'}
          </div>
        </article>
      `;
    }).join('');

    // 绑定查看详情
    wrap.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', () => {
      location.href = 'score-detail.html?vid=' + btn.dataset.detail;
    }));

    // 绑定播放评委示范
    wrap.querySelectorAll('[data-play-demo]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.playDemo;
      const demoInfo = LisztData.SEED_DEMOS?.find(d => d.id === id);
      const url = await LisztVideoLoader.getObjectURL(id);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '评委示范视频' });
      else LisztModal.open(`
        <div style="text-align:center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 14px;">🎬</div>
          <h3>${LisztUtil.escape(demoInfo?.title || '评委示范视频')}</h3>
          <p class="muted" style="margin-top: 10px;">${LisztUtil.escape(demoInfo?.durationLabel || demoInfo?.duration || '')}</p>
          <p class="muted" style="font-size:.85rem; margin-top:14px;">（演示场景下视频文件不存在，实际部署时会从云端加载）</p>
        </div>
      `, { title: '评委示范视频' });
    }));

    // 绑定回复表单
    wrap.querySelectorAll('[data-reply-form]').forEach(form => form.addEventListener('submit', e => {
      e.preventDefault();
      const scoreId = form.dataset.replyForm;
      const reply = new FormData(form).get('reply').toString().trim();
      if (!reply) { LisztUtil.toast('请输入回复内容', 'error'); return; }
      const scores = LisztStore.getScores();
      const s = scores.find(x => x.id === scoreId);
      if (s) {
        s.reply = reply;
        LisztStore.setScores(scores);
        LisztUtil.toast('回复已发送给评委', 'success');
        renderScores();
      }
    }));
  }

  // 单条评委评分卡（选手视角）
  function judgeScoreCard(s, video) {
    const judge = LisztData.SEED_JUDGES.find(j => j.id === s.judgeId) || { name: s.judgeName, avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)' };
    const dims = LisztData.SCORE_DIMS.map(d => `
      <tr>
        <td style="width: 100px;">${d.label}</td>
        <td style="width: 60px; font-weight:600; color: var(--color-gold-2);">${s[d.key].toFixed(1)}</td>
        <td><div class="score-bar"><div style="width:${s[d.key]*10}%"></div></div></td>
      </tr>
    `).join('');

    return `
      <div class="judge-score-card" style="background: rgba(12,10,8,.4); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 18px 20px; margin-bottom: 14px;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom: 14px;">
          <div class="judge-avatar-lg" style="background: ${LisztUtil.bg(judge)}; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; color: #1a1410; font-weight: 700; font-size: 1.1rem; position:relative; overflow:hidden;">${judge.avatarUrl ? '' : LisztUtil.escape(judge.initial || s.judgeName?.slice(0,1) || '评')}</div>
          <div style="flex:1;">
            <div>
              <strong style="color: var(--color-text); font-family: var(--font-serif); font-size: 1.1rem;">${LisztUtil.escape(s.judgeName)}</strong>
              <span class="role-tag" style="margin-left: 6px;">评委</span>
            </div>
            <div class="muted" style="font-size: .82rem; margin-top: 2px;">${LisztUtil.formatDate(s.scoredAt)} · ${LisztUtil.escape(judge.role || '')}</div>
          </div>
          <div style="text-align: right;">
            <div class="score-pill" style="font-size: 1rem; padding: 6px 14px;">★ ${s.overall.toFixed(2)}</div>
          </div>
        </div>

        <!-- 维度分布 -->
        <table class="score-table" style="margin: 12px 0; font-size: .9rem;">
          <tbody>${dims}</tbody>
        </table>

        <!-- 详细评语 -->
        <div style="margin-top: 14px; padding: 14px 16px; background: rgba(200,164,92,.05); border-left: 3px solid var(--color-gold); border-radius: 4px;">
          <div class="muted" style="font-size:.78rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px;">评委评语</div>
          <p style="margin: 0; line-height: 1.75; color: var(--color-text);">${LisztUtil.escape(s.comment)}</p>
        </div>

        ${s.demoVideoId ? `
          <div style="margin-top: 12px;">
            <button class="btn btn-ghost btn-sm" data-play-demo="${s.demoVideoId}">
              ▶ 观看评委示范视频${s.demoNote ? ` · ${LisztUtil.escape(s.demoNote)}` : ''}
            </button>
          </div>
        ` : ''}

        <!-- 回复 -->
        <div class="reply-section" style="margin-top: 16px;">
          ${s.reply ? `
            <div class="reply">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom: 4px;">
                <strong style="color: var(--color-gold-2);">我的回复</strong>
                <span class="muted" style="font-size:.78rem;">已发送给评委</span>
              </div>
              <p style="margin: 0;">${LisztUtil.escape(s.reply)}</p>
            </div>
          ` : `
            <form data-reply-form="${s.id}">
              <textarea name="reply" placeholder="回复评委：表达感谢、提出问题或说明后续改进计划..." style="min-height: 70px;"></textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span class="muted" style="font-size:.82rem;">回复将仅对评委可见</span>
                <button class="btn btn-primary btn-sm" type="submit">发送回复</button>
              </div>
            </form>
          `}
        </div>
      </div>
    `;
  }

  // ---- 评委示范 ----
  async function renderDemos() {
    // 收集所有评委上传的示范视频（评分里 demoVideoId 引用）
    const wrap = document.getElementById('demosGrid');
    const scores = LisztStore.getScores();
    const demoIds = [...new Set(scores.map(s => s.demoVideoId).filter(Boolean))];
    if (!demoIds.length) {
      wrap.innerHTML = `<div class="alert alert-info" style="grid-column: 1 / -1;">评委尚未上传示范视频。</div>`;
      return;
    }
    // 渲染卡片（缩略图用头像颜色代替）
    wrap.innerHTML = demoIds.map(id => {
      const score = scores.find(s => s.demoVideoId === id);
      const judge = LisztData.SEED_JUDGES.find(j => j.id === score.judgeId) || { name: score.judgeName, avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)' };
      return `
        <div class="video-card" data-play="${id}">
          <div class="video-thumb" style="background: ${LisztUtil.bg(judge)}">
            <div class="play"></div>
            <div class="status status-scored" style="top:12px;left:12px;">示 范</div>
          </div>
          <div class="video-body">
            <h4>${LisztUtil.escape(judge.name)} · 演奏示范</h4>
            <div class="meta">上传于 ${LisztUtil.formatDate(score.scoredAt)}</div>
            <div class="desc">评委针对您的作品上传的示范视频，供您学习参考。</div>
            <div class="footer">
              <span class="tag">${LisztUtil.escape(score.judgeName)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    wrap.querySelectorAll('[data-play]').forEach(el => el.addEventListener('click', async () => {
      const url = await LisztVideoLoader.getObjectURL(el.dataset.play);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '评委示范视频' });
      else LisztUtil.toast('示范视频文件不存在', 'error');
    }));
  }

  // ---- 个人资料 ----
  function renderProfile() {
    // 缴费状态卡
    const feeStatus = document.getElementById('feeStatus');
    if (feeStatus) {
      const paid = user.feePaid;
      const amount = user.feeAmount || LisztData.SEED_COMPETITION.feeAmount;
      const at = user.feeAt ? LisztUtil.formatDate(user.feeAt) : '';
      const method = user.feeMethod ? {alipay:'支付宝', wechat:'微信', bank:'银行转账'}[user.feeMethod] || user.feeMethod : '';
      if (paid) {
        feeStatus.className = 'fee-banner paid';
        feeStatus.innerHTML = `<div class="fee-icon">✓</div>
          <div class="fee-body">
            <strong>报名费已缴纳</strong>
            <div class="muted">￥${amount} · ${method} · ${at} · 凭证号 ${LisztUtil.escape(user.feeReceipt || '—')}</div>
          </div>
          <span class="tag tag-done">已缴</span>`;
      } else {
        feeStatus.className = 'fee-banner unpaid';
        feeStatus.innerHTML = `<div class="fee-icon">!</div>
          <div class="fee-body">
            <strong>报名费待缴纳</strong>
            <div class="muted">￥${amount} · 截止前完成缴费方可保留参赛资格</div>
          </div>
          <a class="btn btn-primary btn-sm" href="registration.html">前往缴费 →</a>
          <span class="tag tag-warn">待缴</span>`;
      }
    }
    const form = document.getElementById('profileForm');
    ['name','username','group','age','school','teacher','email','phone','bio'].forEach(k => {
      const el = form.elements[k];
      if (el) el.value = user[k] || '';
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const users = LisztStore.getUsers();
      const idx = users.findIndex(u => u.id === user.id);
      users[idx] = { ...users[idx], ...fd, age: Number(fd.age) || null };
      LisztStore.setUsers(users);
      Object.assign(user, users[idx]);
      LisztAuth.current = users[idx];
      LisztUtil.toast('资料已更新', 'success');
      renderMe();
    });
    document.getElementById('changePwdBtn').onclick = () => {
      // P1-6：替换 prompt() 为三字段 modal + 强度校验
      const modal = document.getElementById('modalBackdrop');
      const inner = document.getElementById('modalInner');
      if (!modal || !inner) return;
      inner.innerHTML = `
        <div class="modal show" role="dialog" aria-modal="true" aria-labelledby="changePwdTitle">
          <div class="modal-head">
            <h3 id="changePwdTitle">修改密码</h3>
            <button class="modal-close" aria-label="关闭" data-modal-close>×</button>
          </div>
          <div class="modal-body">
            <div class="field" style="margin-bottom:14px;">
              <label>当前密码</label>
              <input type="password" id="cp-cur" autocomplete="current-password">
            </div>
            <div class="field" style="margin-bottom:6px;">
              <label>新密码 <span class="muted">（≥ 6 位，含字母与数字）</span></label>
              <input type="password" id="cp-new" autocomplete="new-password">
              <div id="cp-strength" class="muted" style="font-size:.78rem; margin-top:4px;">强度：—</div>
            </div>
            <div class="field">
              <label>确认新密码</label>
              <input type="password" id="cp-confirm" autocomplete="new-password">
              <div id="cp-match" class="muted" style="font-size:.78rem; margin-top:4px;"></div>
            </div>
            <div class="modal-actions" style="margin-top:18px;">
              <button class="btn btn-ghost" data-modal-close>取消</button>
              <button class="btn btn-primary" id="cp-submit">提交</button>
            </div>
          </div>
        </div>
      `;
      modal.classList.add('open');
      const focusFirst = () => { const f = inner.querySelector('input'); if (f) setTimeout(() => f.focus(), 30); };
      focusFirst();
      // 强度提示
      const newEl = inner.querySelector('#cp-new');
      const strengthEl = inner.querySelector('#cp-strength');
      const matchEl = inner.querySelector('#cp-match');
      const submitBtn = inner.querySelector('#cp-submit');
      newEl.addEventListener('input', () => {
        const v = newEl.value;
        let level = '弱', color = '#f3b8b8';
        if (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) { level = '强'; color = '#b6e3c8'; }
        else if (v.length >= 6) { level = '中'; color = '#e6c97a'; }
        strengthEl.textContent = v ? `强度：${level}` : '强度：—';
        strengthEl.style.color = color;
        // 一致性
        if (inner.querySelector('#cp-confirm').value) checkMatch();
      });
      inner.querySelector('#cp-confirm').addEventListener('input', checkMatch);
      function checkMatch() {
        const a = newEl.value, b = inner.querySelector('#cp-confirm').value;
        if (!b) { matchEl.textContent = ''; return; }
        if (a === b) { matchEl.textContent = '✓ 一致'; matchEl.style.color = '#b6e3c8'; }
        else { matchEl.textContent = '✗ 两次输入不一致'; matchEl.style.color = '#f3b8b8'; }
      }
      // 关闭按钮
      inner.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', () => LisztModal.close()));
      // 提交
      submitBtn.onclick = () => {
        const cur = inner.querySelector('#cp-cur').value;
        const np = newEl.value;
        const cf = inner.querySelector('#cp-confirm').value;
        if (!cur || !np || !cf) { LisztUtil.toast('请填写完整', 'error'); return; }
        if (cur !== user.password) { LisztUtil.toast('当前密码不正确', 'error'); return; }
        if (np.length < 6) { LisztUtil.toast('新密码至少 6 位', 'error'); return; }
        if (!/[A-Za-z]/.test(np) || !/\d/.test(np)) { LisztUtil.toast('新密码需同时包含字母和数字', 'error'); return; }
        if (np !== cf) { LisztUtil.toast('两次输入不一致', 'error'); return; }
        const users = LisztStore.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        users[idx].password = np;
        LisztStore.setUsers(users);
        LisztUtil.toast('密码已修改', 'success');
        LisztModal.close();
      };
    };
  }

  // ---- 上传 ----
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadBar = document.getElementById('uploadBar');
  const uploadProgress = document.getElementById('uploadProgress');
  const uploadFileName = document.getElementById('uploadFileName');

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(file) {
    if (!file.type.startsWith('video/')) { LisztUtil.toast('请选择视频文件', 'error'); return; }
    if (file.size > 500 * 1024 * 1024) { LisztUtil.toast('文件超过 500MB 限制', 'error'); return; }
    currentVideoFile = file;
    uploadStatus.style.display = '';
    uploadFileName.textContent = file.name + ' · ' + LisztUtil.formatSize(file.size);

    // 获取视频时长
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      currentVideoDuration = v.duration;
      URL.revokeObjectURL(url);
    };
    v.src = url;

    // 模拟上传进度（IndexedDB 没有进度事件，所以用分块写入模拟）
    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(pct + 8, 90);
      uploadBar.style.width = pct + '%';
      uploadProgress.textContent = pct + '%';
    }, 100);
    setTimeout(() => {
      clearInterval(timer);
      uploadBar.style.width = '100%';
      uploadProgress.textContent = '100% · 待提交';
    }, 1200);
  }

  document.getElementById('uploadForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentVideoFile) { LisztUtil.toast('请先选择视频文件', 'error'); return; }
    // P0-6：跨入口 1 件作品校验
    if (!LisztStore.canUpload(user.id)) {
      const existing = LisztStore.myVideo(user.id);
      LisztUtil.toast('每位选手仅可提交 1 件作品，已存在作品：' + (existing?.title || '—'), 'error');
      switchPanel('myvideos');
      return;
    }
    const fd = Object.fromEntries(new FormData(e.target));
    const id = LisztStore.uid('v');
    const video = {
      id,
      contestantId: user.id,
      title: fd.title,
      composer: fd.composer || '',
      group: fd.group,
      notes: fd.notes || '',
      duration: currentVideoDuration,
      durationLabel: LisztUtil.formatDuration(currentVideoDuration),
      size: currentVideoFile.size,
      uploadedAt: new Date().toISOString(),
      status: 'pending'
    };

    await LisztStore.saveVideoBlob(id, currentVideoFile, { name: currentVideoFile.name, size: currentVideoFile.size });
    const videos = LisztStore.getVideos();
    videos.push(video);
    LisztStore.setVideos(videos);

    LisztUtil.toast('上传成功，等待评委评审', 'success');
    e.target.reset();
    currentVideoFile = null;
    uploadStatus.style.display = 'none';
    uploadBar.style.width = '0%';
    switchPanel('myvideos');
  });

  // ---- 初始化 ----
  renderMe();
  // 选手登录后默认进入「我的成绩」面板
  switchPanel('scores');
})();