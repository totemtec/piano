/* ============================================================
   score-detail.js — 评分详情独立页面
   ============================================================ */
(function () {
  'use strict';

  // 选手 / 评委 / 组委会都可以查看此页面
  if (!LisztAuth.current) {
    const next = 'score-detail.html?' + location.search;
    window.location.href = 'login.html?next=' + encodeURIComponent(next);
    return;
  }

  const params = new URLSearchParams(location.search);
  const videoId = params.get('vid');
  const wrap = document.getElementById('content');

  if (!videoId) {
    wrap.innerHTML = `<div class="alert alert-error">缺少作品 ID 参数</div>`;
    return;
  }

  const video = LisztStore.findVideo(v => v.id === videoId);
  if (!video) {
    wrap.innerHTML = `<div class="alert alert-error">未找到该作品</div>`;
    return;
  }

  // 权限：选手只能看自己的；评委/组委会可看全部
  const me = LisztAuth.current;
  if (me.role === 'contestant' && video.contestantId !== me.id) {
    wrap.innerHTML = `<div class="alert alert-error">您无权查看此作品的评分</div>`;
    return;
  }

  const contestant = LisztStore.findUser(u => u.id === video.contestantId);
  const scores = LisztStore.scoresForVideo(videoId);
  const avg = scores.length ? scores.reduce((a, b) => a + b.overall, 0) / scores.length : 0;
  const max = scores.length ? Math.max(...scores.map(s => s.overall)) : 0;
  const min = scores.length ? Math.min(...scores.map(s => s.overall)) : 0;

  // 平均维度分
  const dimAvg = {};
  LisztData.SCORE_DIMS.forEach(d => {
    dimAvg[d.key] = scores.length ? (scores.reduce((a, b) => a + b[d.key], 0) / scores.length) : 0;
  });

  async function render() {
    let videoHTML = `<div class="video-frame" style="background: linear-gradient(135deg, #1a1410, #2a241c);"><div style="text-align:center;"><div style="font-size:3rem;">🎬</div><p style="margin-top: 10px;">视频文件未上传（演示场景）</p></div></div>`;
    try {
      const url = await LisztVideoLoader.getObjectURL(videoId);
      if (url) videoHTML = `<video controls class="video-frame" src="${url}" style="display:block;"></video>`;
    } catch (e) {}

    const heroHTML = `
      <section class="work-hero">
        <div>
          ${videoHTML}
        </div>
        <div class="work-info">
          <span class="eyebrow-line">评分详情</span>
          <h1>${LisztUtil.escape(video.title)}</h1>
          <div class="meta-line">
            ${LisztUtil.escape(video.composer || '')} · <span class="tag tag-cat">${LisztUtil.escape(video.group)}</span>
          </div>
          <div class="meta-line" style="margin-top: 6px;">
            选手 <strong style="color: var(--color-text);">${LisztUtil.escape(contestant?.name || '—')}</strong>
            <span style="opacity:.6;"> · ${LisztUtil.escape(contestant?.school || '')} · ${contestant?.age || '—'}岁</span>
          </div>
          <div class="meta-line" style="margin-top: 6px;">上传于 ${LisztUtil.formatDate(video.uploadedAt)} · ${LisztUtil.formatSize(video.size)} · 时长 ${video.durationLabel || '—'}</div>

          ${video.notes ? `<div class="notes">${LisztUtil.escape(video.notes)}</div>` : ''}

          <div class="score-overview">
            <div class="box"><div class="num">${avg ? avg.toFixed(2) : '—'}</div><div class="label">综合均分</div></div>
            <div class="box"><div class="num">${max ? max.toFixed(2) : '—'}</div><div class="label">最高分</div></div>
            <div class="box"><div class="num">${scores.length}</div><div class="label">评委人数</div></div>
          </div>

          ${scores.length ? `
            <div class="radar-wrap">
              <h4>各维度平均分</h4>
              ${LisztData.SCORE_DIMS.map(d => `
                <div style="display:flex; align-items:center; gap: 12px; margin: 8px 0;">
                  <span style="width: 80px; font-size: .9rem;">${LisztUtil.escape(d.label)}</span>
                  <div style="flex:1; height: 8px; background: rgba(12,10,8,.6); border-radius: 999px; overflow:hidden;">
                    <div style="height: 100%; width: ${dimAvg[d.key] * 10}%; background: linear-gradient(90deg, var(--color-gold-3), var(--color-gold-2)); transition: width .3s ease;"></div>
                  </div>
                  <span style="width: 50px; text-align: right; font-family: var(--font-serif); font-size: 1.05rem; color: var(--color-gold-2); font-weight: 600;">${dimAvg[d.key].toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </section>
    `;

    const judgesHTML = scores.length ? scores.map(s => renderJudgeCard(s, video)).join('') : `
      <div class="alert alert-info">${me.role === 'judge' ? '您尚未对此作品评分。' : '评委正在评审中，请耐心等待。'}</div>
    `;

    wrap.innerHTML = `
      ${heroHTML}
      <h2 style="margin-top: 28px;">评委评分详情</h2>
      <p class="muted" style="margin-bottom: 18px;">每位评委独立给出 4 个维度分数（满分 10 分），综合分由系统自动计算。</p>
      ${judgesHTML}
    `;

    bindEvents();
  }

  function renderJudgeCard(s, video) {
    const judge = LisztData.SEED_JUDGES.find(j => j.id === s.judgeId) || { name: s.judgeName, avatarColor: 'linear-gradient(135deg, #c8a45c, #8a6a2c)', initial: s.judgeName?.slice(0,1), role: '评委', title: '' };
    const dims = LisztData.SCORE_DIMS.map(d => `
      <tr>
        <td style="width: 100px; padding: 10px 0;">${LisztUtil.escape(d.label)}</td>
        <td style="width: 70px; padding: 10px 0; text-align: right; font-weight: 600; color: var(--color-gold-2);">${s[d.key].toFixed(1)}</td>
        <td style="padding: 10px 0;"><div class="score-bar"><div style="width:${s[d.key]*10}%"></div></div></td>
      </tr>
    `).join('');

    return `
      <article class="judge-detail-card">
        <header class="judge-detail-head">
          <div class="avatar-xl" style="background: ${LisztUtil.bg(judge)}; position:relative;">${judge.avatarUrl ? '' : LisztUtil.escape(judge.initial || '评')}</div>
          <div style="flex:1;">
            <h3>${LisztUtil.escape(s.judgeName)}</h3>
            <div class="sub">${LisztUtil.escape(judge.title || judge.role || '评委')} · 评分于 ${LisztUtil.formatDate(s.scoredAt)}</div>
          </div>
          <div class="score-pill">★ ${s.overall.toFixed(2)}</div>
        </header>

        <table class="score-table" style="margin-bottom: 8px;">
          <tbody>${dims}</tbody>
        </table>

        <div class="judge-comment-block">
          <div class="label">评委评语</div>
          <p>${LisztUtil.escape(s.comment)}</p>
        </div>

        ${s.demoVideoId ? `
          <div style="margin-top: 16px;">
            <button class="btn btn-ghost" data-play-demo="${s.demoVideoId}">
              ▶ 观看评委上传的示范视频
            </button>
            ${s.demoNote ? `<span class="muted" style="margin-left: 12px; font-size:.9rem;">${LisztUtil.escape(s.demoNote)}</span>` : ''}
          </div>
        ` : ''}

        <!-- 选手回复 -->
        <div style="margin-top: 18px;">
          ${s.reply ? `
            <div class="reply-block">
              <div class="label">我的回复 · 已发送给评委</div>
              <p style="margin: 0; color: var(--color-text); line-height: 1.7;">${LisztUtil.escape(s.reply)}</p>
            </div>
          ` : me.role === 'contestant' ? `
            <form data-reply="${s.id}">
              <div class="field" style="margin-bottom: 8px;">
                <label style="margin-bottom: 6px;">回复评委</label>
                <textarea name="reply" placeholder="表达感谢、提出问题或说明后续改进计划..." style="min-height: 80px;"></textarea>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="muted" style="font-size:.82rem;">回复将仅对评委可见</span>
                <button class="btn btn-primary btn-sm" type="submit">发送回复</button>
              </div>
            </form>
          ` : ''}
        </div>
      </article>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('[data-play-demo]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.playDemo;
      const demoInfo = LisztData.SEED_DEMOS?.find(d => d.id === id);
      const url = await LisztVideoLoader.getObjectURL(id);
      if (url) LisztModal.open(`<video controls class="video-player" src="${url}"></video>`, { title: '评委示范视频' });
      else LisztModal.open(`
        <div style="text-align:center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 14px;">🎬</div>
          <h3>${LisztUtil.escape(demoInfo?.title || '评委示范视频')}</h3>
          <p class="muted" style="margin-top: 10px;">${LisztUtil.escape(demoInfo?.duration || '')} · 上传于 ${LisztUtil.formatDate(demoInfo?.uploadedAt)}</p>
          <p class="muted" style="font-size:.85rem; margin-top:14px;">（演示场景下视频文件不存在，实际部署时会从云端加载）</p>
        </div>
      `, { title: '评委示范视频' });
    }));

    document.querySelectorAll('[data-reply]').forEach(form => form.addEventListener('submit', e => {
      e.preventDefault();
      const scoreId = form.dataset.reply;
      const reply = new FormData(form).get('reply').toString().trim();
      if (!reply) { LisztUtil.toast('请输入回复内容', 'error'); return; }
      const scores = LisztStore.getScores();
      const s = scores.find(x => x.id === scoreId);
      if (s) {
        s.reply = reply;
        s.replyAt = new Date().toISOString();
        LisztStore.setScores(scores);
        LisztUtil.toast('回复已发送', 'success');
        render();
      }
    }));
  }

  render();
})();