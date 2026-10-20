/* ============================================================
   result.js — 选手查看成绩页（2026 完整版）
   - 80 分以上显示"晋级"徽章
   - 取消选手回复
   - 显示专业 / 组别 / 评分
   ============================================================ */
(function () {
  'use strict';

  const me = LisztAuth.current;
  if (!me) {
    const next = 'result.html' + (location.search || '');
    location.href = 'login.html?next=' + encodeURIComponent(next);
    return;
  }

  if (me.role === 'judge') {
    location.href = 'score.html';
    return;
  }

  const targetUserId = me.role === 'admin' && new URLSearchParams(location.search).get('uid')
    ? new URLSearchParams(location.search).get('uid')
    : me.id;

  const user = LisztStore.findUser(u => u.id === targetUserId);
  if (!user) {
    document.getElementById('resultContent').innerHTML = `<div class="alert alert-error">未找到用户</div>`;
    return;
  }

  // =============== 渲染 hero ===============
  const MAJORS = LisztData.MAJORS;
  document.getElementById('heroTitle').textContent = `${user.name} 的成绩`;
  const isMe = user.id === me.id;
  const videos = LisztStore.videosBy(v => v.contestantId === user.id);
  const scores = LisztStore.getScores();
  const myScores = scores.filter(s => videos.some(v => v.id === s.videoId));
  const avg = myScores.length ? myScores.reduce((a, b) => a + b.overall, 0) / myScores.length : 0;
  const max = myScores.length ? Math.max(...myScores.map(s => s.overall)) : 0;
  const pending = videos.filter(v => v.status === 'pending' || v.status === 'reviewing').length;

  // 顶部"报名详情"按钮
  const heroActions = document.getElementById('heroActions');
  if (heroActions && isMe) {
    const paid = user.feePaid;
    const feeBadge = paid
      ? `<span class="tag tag-done" title="报名费已缴纳">✓ 已缴</span>`
      : `<span class="tag tag-warn" title="报名费待缴">! 待缴</span>`;
    heroActions.innerHTML = `
      ${feeBadge}
      <a class="btn btn-ghost btn-sm" href="registration.html">📋 报名详情</a>
      <a class="btn btn-ghost btn-sm" href="upload.html">📤 ${videos.length ? '修改作品' : '上传作品'}</a>
    `;
  }

  document.getElementById('heroStats').innerHTML = `
    <div class="stat"><div class="num">${videos.length}</div><div class="lbl">已上传</div></div>
    <div class="stat"><div class="num">${myScores.length}</div><div class="lbl">收到的评分</div></div>
    <div class="stat"><div class="num">${avg ? avg.toFixed(2) : '—'}</div><div class="lbl">综合均分</div></div>
    <div class="stat"><div class="num">${max ? max.toFixed(2) : '—'}</div><div class="lbl">最高单项</div></div>
    <div class="stat" style="${pending ? 'border-color: var(--color-gold);' : ''}"><div class="num">${pending}</div><div class="lbl">待评审</div></div>
  `;

  if (!videos.length) {
    document.getElementById('resultContent').innerHTML = `
      <div class="empty">
        <div class="icon">🎼</div>
        <h3>您还没有上传任何作品</h3>
        <p>每人限传 1 件。点击下方"上传作品"开始您的参赛之旅。</p>
        <a href="upload.html" class="btn btn-primary" style="margin-top: 18px;">📤 立即上传</a>
      </div>
    `;
    return;
  }

  // 默认显示哪个视频
  const params = new URLSearchParams(location.search);
  let activeVid = params.get('vid');
  if (!activeVid || !videos.find(v => v.id === activeVid)) {
    const scoredFirst = videos.find(v => scores.some(s => s.videoId === v.id));
    activeVid = scoredFirst ? scoredFirst.id : videos[0].id;
  }

  function renderShell() {
    document.getElementById('resultContent').innerHTML = `
      <div class="video-stack">
        <aside class="video-list-card">
          <h3>我的作品</h3>
          ${videos.map(v => {
            const vScores = scores.filter(s => s.videoId === v.id);
            const a = vScores.length ? vScores.reduce((x, y) => x + y.overall, 0) / vScores.length : null;
            const promoted = a !== null && a >= LisztData.PROMOTION_SCORE;
            const status = vScores.length ? 'scored' : v.status;
            return `
              <a class="video-list-item ${v.id === activeVid ? 'active' : ''}" data-vid="${v.id}">
                <div class="mini-thumb">${vScores.length ? '★' : '⏳'}</div>
                <div class="meta">
                  <div class="t">${LisztUtil.escape(v.title)}</div>
                  <div class="s">
                    <span>${LisztUtil.escape(v.group)}</span>
                    <span>·</span>
                    <span>${a ? '★ ' + a.toFixed(2) : statusLabel(status)}</span>
                    ${promoted ? ' · <span style="color:#7ac0a0;font-weight:600;">晋级 ✓</span>' : ''}
                  </div>
                </div>
              </a>
            `;
          }).join('')}
        </aside>
        <section class="video-detail-card" id="videoDetail"></section>
      </div>
    `;
    document.querySelectorAll('[data-vid]').forEach(el => el.addEventListener('click', e => {
      e.preventDefault();
      activeVid = el.dataset.vid;
      const u = new URL(location.href);
      u.searchParams.set('vid', activeVid);
      history.replaceState(null, '', u);
      document.querySelectorAll('.video-list-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      renderDetail();
    }));
    renderDetail();
  }

  async function renderDetail() {
    const v = LisztStore.getVideos().find(x => x.id === activeVid);
    if (!v) {
      document.getElementById('videoDetail').innerHTML = `<div class="alert alert-error">未找到该作品</div>`;
      return;
    }
    const vScores = scores.filter(s => s.videoId === v.id);
    const vAvg = vScores.length ? vScores.reduce((a, b) => a + b.overall, 0) / vScores.length : null;
    const vMax = vScores.length ? Math.max(...vScores.map(s => s.overall)) : 0;
    const promoted = vAvg !== null && vAvg >= LisztData.PROMOTION_SCORE;
    const judgeCount = vScores.length;
    const judgeTotal = LisztData.JUDGES_PER_VIDEO;

    // 视频
    let videoHTML = `<div class="video-frame"><div style="text-align:center;"><div style="font-size: 3rem;">🎬</div><p>视频文件未上传（演示场景）</p></div></div>`;
    try {
      const url = await LisztVideoLoader.getObjectURL(v.id);
      if (url) videoHTML = `<video controls class="video-frame" src="${url}"></video>`;
    } catch (e) {}

    // 维度平均
    const dimAvg = {};
    LisztData.SCORE_DIMS.forEach(d => {
      dimAvg[d.key] = vScores.length ? vScores.reduce((a, b) => a + b[d.key], 0) / vScores.length : 0;
    });

    // 选手信息
    const major = MAJORS.find(m => m.key === (v.major || user.major)) || { label: '—', icon: '' };

    // 进度：3 位评委点评
    const judgeProgress = vScores.length ? `
      <div style="display:flex; align-items:center; gap:8px; margin: 8px 0 16px; padding: 8px 12px; background: rgba(200,164,92,.08); border-radius: 8px;">
        <span style="color: var(--color-gold-2); font-weight:600;">${judgeCount} / ${judgeTotal}</span>
        <span style="color: var(--color-text-dim); font-size:.88rem;">位评委已点评</span>
        <div style="flex:1; height:6px; background: rgba(200,164,92,.2); border-radius:3px; overflow:hidden; margin-left:8px;">
          <div style="width: ${(judgeCount/judgeTotal*100)}%; height:100%; background: linear-gradient(90deg, var(--color-gold), var(--color-gold-2)); transition: width .3s;"></div>
        </div>
      </div>
    ` : '';

    // 综合分 + 晋级/未晋级徽章
    const summary = vScores.length ? `
      <div style="display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap; margin: 16px 0 8px;">
        <div class="box" style="flex: 0 0 auto; min-width: 140px; text-align:center; padding: 18px 24px; background: linear-gradient(135deg, rgba(200,164,92,.18), rgba(200,164,92,.05)); border: 1px solid var(--color-gold); border-radius: 12px;">
          <div style="font-size: 2.4rem; font-weight: 700; color: var(--color-gold-2); font-family: var(--font-serif);">${vAvg.toFixed(2)}</div>
          <div style="font-size: .82rem; color: var(--color-text-dim);">综合均分 / 10.00</div>
        </div>
        <div class="box" style="flex: 1; min-width: 220px; padding: 16px 20px; border: 1px solid var(--color-border); border-radius: 12px;">
          <div style="font-size: .82rem; color: var(--color-text-dim); margin-bottom: 6px;">结果</div>
          ${promoted
            ? `<div style="font-size: 1.6rem; font-weight: 700; color: #7ac0a0;">🏆 晋级</div>
               <div style="font-size: .85rem; color: var(--color-text-dim); margin-top: 4px;">您的综合均分（${vAvg.toFixed(2)}）已超过晋级分数线（${LisztData.PROMOTION_SCORE_LABEL}），恭喜晋级！</div>`
            : `<div style="font-size: 1.6rem; font-weight: 700; color: #f0a59a;">📭 未晋级</div>
               <div style="font-size: .85rem; color: var(--color-text-dim); margin-top: 4px;">综合均分（${vAvg.toFixed(2)}）未达到晋级分数线（${LisztData.PROMOTION_SCORE_LABEL}）。</div>`}
        </div>
      </div>

      <div class="score-summary-row">
        <div class="box"><div class="n">${vMax.toFixed(2)}</div><div class="l">最高单项</div></div>
        <div class="box"><div class="n">${judgeCount}</div><div class="l">已点评评委</div></div>
        <div class="box"><div class="n">${dimAvg.technical.toFixed(1)}</div><div class="l">技巧</div></div>
        <div class="box"><div class="n">${dimAvg.musicality.toFixed(1)}</div><div class="l">音乐性</div></div>
        <div class="box"><div class="n">${dimAvg.artistry.toFixed(1)}</div><div class="l">艺术处理</div></div>
        <div class="box"><div class="n">${dimAvg.interpretation.toFixed(1)}</div><div class="l">作品诠释</div></div>
      </div>
    ` : `<div class="alert alert-info" style="margin: 16px 0;">⏳ 评委正在评审中，请耐心等待（${judgeCount} / ${judgeTotal} 位评委已点评）</div>`;

    const judgesHTML = vScores.length ? vScores.map(s => renderJudgeRow(s)).join('') : '';

    // 选手信息（简化）
    const contestant = user;
    document.getElementById('videoDetail').innerHTML = `
      <h2>${LisztUtil.escape(v.title)}</h2>
      <div class="meta-line">
        <strong>选手：</strong>${LisztUtil.escape(contestant.name)} &nbsp;·&nbsp;
        <strong>组别：</strong><span class="tag tag-cat">${LisztUtil.escape(v.group)}</span> &nbsp;·&nbsp;
        <strong>专业：</strong>${LisztUtil.escape(major.label)} &nbsp;·&nbsp;
        <strong>作品：</strong>${LisztUtil.escape(v.title)} &nbsp;·&nbsp;
        <strong>作曲家：</strong>${LisztUtil.escape(v.composer || '—')}
      </div>
      <div class="meta-line" style="color: var(--color-text-dim); font-size: .85rem;">
        上传于 ${LisztUtil.formatDate(v.uploadedAt)} · 时长 ${LisztUtil.escape(v.durationLabel || '—')} · ${LisztUtil.formatSize(v.size || 0)}
      </div>
      ${videoHTML}
      ${judgeProgress}
      ${summary}
      ${v.intro ? `<div style="margin-top: 14px; padding: 12px 14px; background: rgba(200,164,92,.06); border-left: 3px solid var(--color-gold); border-radius: 4px; font-size: .92rem; color: var(--color-text-2); line-height: 1.6;"><strong>作品介绍：</strong>${LisztUtil.escape(v.intro)}</div>` : ''}
      ${v.notes ? `<div style="margin-top: 14px; padding: 12px 14px; background: rgba(200,164,92,.06); border-left: 3px solid var(--color-gold); border-radius: 4px; font-size: .92rem; color: var(--color-text-2); line-height: 1.6;">${LisztUtil.escape(v.notes)}</div>` : ''}
      <h3 style="margin: 28px 0 14px; font-size: 1.05rem;">评委评分详情</h3>
      ${judgesHTML}
    `;

    bindDemos();
  }

  function renderJudgeRow(s) {
    const judge = LisztData.SEED_JUDGES.find(j => j.id === s.judgeId) || { name: s.judgeName, avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)', initial: s.judgeName?.slice(0,1) };
    const dims = LisztData.SCORE_DIMS.map(d => `
      <tr>
        <td>${LisztUtil.escape(d.label)}</td>
        <td>${s[d.key].toFixed(1)}</td>
        <td><div class="score-bar"><div style="width:${s[d.key]*10}%"></div></div></td>
      </tr>
    `).join('');

    // 签字：使用 SVG 渲染评委手写字体感的姓名（演示）
    const signature = s.signature || judge.name.replace(/\s+/g, '');

    return `
      <article class="judge-row-wrap" style="margin-bottom: 18px;">
        <div class="judge-row">
          <div class="avatar" style="background: ${LisztUtil.bg(judge)}; position:relative;">${judge.avatarUrl ? '' : LisztUtil.escape(judge.initial || '评')}</div>
          <div class="body">
            <div class="nm">${LisztUtil.escape(s.judgeName)}</div>
            <div class="when">${LisztUtil.escape(judge.title || judge.role || '评委')} · ${LisztUtil.formatDate(s.scoredAt)}</div>
          </div>
          <div class="ov">★ ${s.overall.toFixed(2)}</div>
        </div>

        <div style="padding: 0 16px 14px;">
          <table class="dim-table">
            <tbody>${dims}</tbody>
          </table>

          <div style="background: rgba(12,10,8,.4); border-left: 3px solid var(--color-gold); padding: 14px 16px; border-radius: 4px; margin: 10px 0;">
            <div style="font-size: .72rem; color: var(--color-text-dim); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px;">评委评语</div>
            <p style="margin: 0; line-height: 1.7; color: var(--color-text); white-space: pre-wrap;">${LisztUtil.escape(s.comment)}</p>
            <div class="judge-signature" style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed rgba(200,164,92,.3); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <span class="signature-text" style="font-family: 'Brush Script MT', 'STKaiti', 'KaiTi', cursive; font-size: 1.6rem; color: var(--color-gold-2); letter-spacing: .04em; transform: rotate(-2deg); display: inline-block;">${LisztUtil.escape(signature)}</span>
              <span class="muted" style="font-size: .78rem;">评委签字 · ${LisztUtil.formatDate(s.scoredAt)}</span>
            </div>
          </div>

          ${s.demoVideoId ? `
            <button class="btn btn-ghost btn-sm" data-play-demo="${s.demoVideoId}">
              ▶ 观看评委示范${s.demoNote ? ` · ${LisztUtil.escape(s.demoNote)}` : ''}
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  function bindDemos() {
    document.querySelectorAll('[data-play-demo]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.playDemo;
      const demoInfo = LisztData.SEED_DEMOS?.find(d => d.id === id);
      const url = await LisztVideoLoader.getObjectURL(id);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '评委示范视频' });
      else LisztModal.open(`
        <div style="text-align:center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 14px;">🎬</div>
          <h3>${LisztUtil.escape(demoInfo?.title || '评委示范视频')}</h3>
          <p class="muted" style="margin-top: 10px;">${LisztUtil.escape(demoInfo?.duration || '')}</p>
          <p class="muted" style="font-size:.85rem; margin-top:14px;">（演示场景下视频文件不存在，实际部署时会从云端加载）</p>
        </div>
      `, { title: '评委示范视频' });
    }));
  }

  function statusLabel(s) {
    return s === 'pending' ? '待评审' : s === 'reviewing' ? '评审中' : '已评分';
  }

  renderShell();
})();
