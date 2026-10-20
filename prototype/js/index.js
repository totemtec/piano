/* ============================================================
   index.js — 首页角色化逻辑
   ============================================================ */
(function () {
  'use strict';

  const me = LisztAuth.current;

  // 渲染评委预览（所有人可见）
  (function renderJudgePreview() {
    const judges = LisztData.SEED_JUDGES.slice(0, 4);
    const wrap = document.getElementById('judgePreview');
    if (!wrap) return;
    wrap.innerHTML = judges.map(j => `
      <article class="judge-card">
        <div class="judge-photo" style="background:${LisztUtil.bg(j)}">
          <span class="badge">${LisztUtil.escape(j.role)}</span>
          <span class="initial">${LisztUtil.escape(j.initial)}</span>
        </div>
        <div class="judge-body">
          <h3>${LisztUtil.escape(j.name)}</h3>
          <div class="title">${LisztUtil.escape(j.title)}</div>
          <p>${LisztUtil.escape(j.bio.slice(0, 60))}…</p>
        </div>
      </article>
    `).join('');
  })();

  // 渲染实时活动流（所有人可见）
  (function renderActivityFeed() {
    const wrap = document.getElementById('activityFeed');
    if (!wrap) return;
    const allScores = LisztStore.getScores();
    const allVideos = LisztStore.getVideos();

    const activities = [];
    allVideos.forEach(v => {
      const c = LisztStore.findUser(u => u.id === v.contestantId);
      activities.push({
        type: 'upload',
        time: v.uploadedAt,
        icon: '🎬',
        text: `<strong style="color:var(--color-text);">${LisztUtil.escape(c?.name || '匿名选手')}</strong> 上传了 <strong style="color:var(--color-gold-2);">${LisztUtil.escape(v.title)}</strong>`,
        sub: `${LisztUtil.escape(v.composer || '')} · ${LisztUtil.escape(v.group)}`
      });
    });
    allScores.forEach(s => {
      const v = LisztStore.findVideo(x => x.id === s.videoId);
      activities.push({
        type: 'score',
        time: s.scoredAt,
        icon: '🏆',
        text: `<strong style="color:var(--color-gold-2);">${LisztUtil.escape(s.judgeName)}</strong> 为《${LisztUtil.escape(v?.title || '')}》评出 <strong style="color:var(--color-gold-2);">★ ${s.overall.toFixed(2)}</strong>`,
        sub: s.comment ? s.comment.slice(0, 60) + (s.comment.length > 60 ? '…' : '') : ''
      });
    });
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (!activities.length) {
      wrap.innerHTML = '<p class="muted" style="margin: 0;">暂无动态</p>';
      return;
    }
    wrap.innerHTML = activities.slice(0, 10).map(a => `
      <div class="item">
        <div class="icon">${a.icon}</div>
        <div class="body">
          <div>${a.text}</div>
          <div class="when">${LisztUtil.escape(a.sub)} · ${LisztUtil.formatDate(a.time)}</div>
        </div>
      </div>
    `).join('');
  })();

  // 根据登录状态切换区块
  const roleSection = document.getElementById('roleSection');
  const contestantSection = document.getElementById('contestantSection');
  const judgeSection = document.getElementById('judgeSection');
  const adminSection = document.getElementById('adminSection');
  const guestSection = document.getElementById('guestSection');
  const heroSub = document.getElementById('heroSub');
  const heroActions = document.getElementById('heroActions');

  // ---- 角色化：未登录 ----
  if (!me) {
    if (guestSection) guestSection.style.display = '';
    if (heroActions) {
      heroActions.innerHTML = `
        <a class="btn btn-primary" href="register.html">立即报名参赛</a>
        <a class="btn btn-ghost" href="login.html">选手/评委/组委会登录</a>
        <a class="btn btn-ghost" href="judges.html">评委阵容 →</a>
      `;
    }
    return;
  }

  // ---- 角色化：已登录 ----
  if (roleSection) roleSection.style.display = '';
  if (guestSection) guestSection.style.display = 'none';

  const avatar = document.getElementById('roleAvatar');
  if (avatar) {
    avatar.textContent = (me.name || me.username).slice(0, 1);
    avatar.style.background = me.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)';
  }

  const greeting = document.getElementById('roleGreeting');
  const subLine = document.getElementById('roleSubLine');
  const roleStats = document.getElementById('roleStats');
  const roleActions = document.getElementById('roleActions');

  // 角色中文名
  const roleText = me.role === 'admin' ? '组委会' : me.role === 'judge' ? '评委' : '选手';
  const groupText = me.role === 'contestant' && me.group ? ` · ${me.group}` : '';

  if (greeting) greeting.textContent = `您好，${me.name || me.username}`;
  if (subLine) subLine.textContent = `${roleText}账号${groupText} · 已登录`;

  // Hero CTA：根据角色定制
  if (heroActions) {
    if (me.role === 'contestant') {
      const hasWorks = LisztStore.videosBy(v => v.contestantId === me.id).length > 0;
      heroActions.innerHTML = hasWorks ? `
        <a class="btn btn-primary" href="upload.html">📤 上传新作品</a>
        <a class="btn btn-ghost" href="result.html">查看我的成绩 →</a>
      ` : `
        <a class="btn btn-primary" href="upload.html">📤 上传作品</a>
        <a class="btn btn-ghost" href="result.html">查看我的成绩 →</a>
      `;
    } else if (me.role === 'judge') {
      heroActions.innerHTML = `
        <a class="btn btn-primary" href="review.html">🎼 立即点评作品</a>
        <a class="btn btn-ghost" href="judge-panel.html">评审中心</a>
      `;
    } else if (me.role === 'admin') {
      heroActions.innerHTML = `
        <a class="btn btn-primary" href="admin.html">⚙ 进入管理后台</a>
        <a class="btn btn-ghost" href="#adminSection">查看赛事数据</a>
      `;
    }
  }
  if (heroSub) {
    if (me.role === 'contestant') {
      heroSub.innerHTML = `欢迎回到选手工作台。<strong style="color:var(--color-gold-2);">上传作品</strong>后，评委将在评审周期内为您提供 4 维度打分与详细文字评语。`;
    } else if (me.role === 'judge') {
      heroSub.innerHTML = `欢迎回到评委评审台。所有待评审作品已在右侧排队等候，<strong style="color:var(--color-gold-2);">请在评审周期内完成打分</strong>。`;
    } else {
      heroSub.innerHTML = `欢迎回到组委会数据台。下方为您呈现赛事实时数据总览与最近活动。`;
    }
  }

  // ==================== 首页角色入口（不展示工作台内容） ====================
  if (me.role === 'contestant') {
    contestantSection.style.display = 'none';

    // 顶部统计
    const videos = LisztStore.videosBy(v => v.contestantId === me.id);
    const myScores = LisztStore.getScores().filter(s => videos.some(v => v.id === s.videoId));
    const avg = myScores.length ? myScores.reduce((a, b) => a + b.overall, 0) / myScores.length : 0;
    const pendingCount = videos.filter(v => v.status === 'pending' || v.status === 'reviewing').length;

    roleStats.innerHTML = `
      <div class="stat-mini"><div class="num">${videos.length}</div><div class="label">已上传</div></div>
      <div class="stat-mini"><div class="num">${myScores.length}</div><div class="label">收到的评分</div></div>
      <div class="stat-mini"><div class="num">${avg ? avg.toFixed(2) : '—'}</div><div class="label">综合均分</div></div>
      <div class="stat-mini" style="${pendingCount ? 'border-color: var(--color-gold);' : ''}"><div class="num" style="${pendingCount ? 'color: var(--color-gold-2);' : ''}">${pendingCount}</div><div class="label">待评审</div></div>
    `;
    roleActions.innerHTML = `
      <a class="btn btn-primary btn-sm" href="upload.html">📤 上传 / 修改作品</a>
      <a class="btn btn-ghost btn-sm" href="result.html">查看成绩 →</a>
      <a class="btn btn-ghost btn-sm" href="registration.html">报名详情 →</a>
    `;
  }

  // ==================== 评委入口（工作台去非首页查看） ====================
  else if (me.role === 'judge') {
    judgeSection.style.display = 'none';

    const judgeInfo = LisztData.SEED_JUDGES.find(j => j.id === me.judgeId) || { name: me.name };
    const myScores = LisztStore.scoresByJudge(me.judgeId);
    const allVideos = LisztStore.getVideos();
    const pending = allVideos.filter(v => !myScores.some(s => s.videoId === v.id));

    roleStats.innerHTML = `
      <div class="stat-mini" style="${pending.length ? 'border-color: var(--color-gold);' : ''}">
        <div class="num" style="${pending.length ? '' : 'color: var(--color-success);'}">${pending.length}</div>
        <div class="label">待评审</div>
      </div>
      <div class="stat-mini"><div class="num">${myScores.length}</div><div class="label">已完成</div></div>
      <div class="stat-mini"><div class="num">${allVideos.length}</div><div class="label">总作品</div></div>
    `;
    roleActions.innerHTML = `
      <a class="btn btn-primary btn-sm" href="score.html">🎼 开始评审</a>
      <a class="btn btn-ghost btn-sm" href="judge-panel.html">评审中心 →</a>
    `;
  }

  // ==================== 组委会入口（工作台去非首页查看） ====================
  else if (me.role === 'admin') {
    adminSection.style.display = 'none';

    const users = LisztStore.getUsers().filter(u => u.role === 'contestant');
    const videos = LisztStore.getVideos();
    const scores = LisztStore.getScores();

    roleStats.innerHTML = `
      <div class="stat-mini"><div class="num">${users.length}</div><div class="label">注册选手</div></div>
      <div class="stat-mini"><div class="num">${videos.length}</div><div class="label">参赛作品</div></div>
      <div class="stat-mini"><div class="num">${scores.length}</div><div class="label">评分数</div></div>
      <div class="stat-mini"><div class="num">${LisztData.SEED_JUDGES.length}</div><div class="label">评委</div></div>
    `;
    roleActions.innerHTML = `
      <a class="btn btn-primary btn-sm" href="admin.html">⚙ 进入管理后台</a>
    `;
  }

  function statusLabel(s) {
    return s === 'pending' ? '待评审' : s === 'reviewing' ? '评审中' : '已评分';
  }

  // ==================== 选手快速上传 ====================
  function initQuickUpload() {
    let file = null;
    let duration = 0;

    const dz = document.getElementById('quickDropzone');
    const fi = document.getElementById('quickFileInput');
    const status = document.getElementById('quickUploadStatus');
    const bar = document.getElementById('quickBar');
    const prog = document.getElementById('quickProgress');
    const nameEl = document.getElementById('quickFileName');

    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    function handleFile(f) {
        if (!f.type.startsWith('video/')) { LisztUtil.toast('请选择视频文件', 'error'); return; }
        if (f.size > 500 * 1024 * 1024) { LisztUtil.toast('文件超过 500MB 限制', 'error'); return; }
        file = f;
        duration = 0;
        status.style.display = '';
        nameEl.textContent = f.name + ' · ' + LisztUtil.formatSize(f.size);

        const url = URL.createObjectURL(f);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          duration = v.duration;
          URL.revokeObjectURL(url);
        };
        v.src = url;

        let pct = 0;
        const timer = setInterval(() => {
          pct = Math.min(pct + 8, 90);
          bar.style.width = pct + '%';
          prog.textContent = pct + '%';
        }, 100);
        setTimeout(() => {
          clearInterval(timer);
          bar.style.width = '100%';
          prog.textContent = '100% · 待提交';
        }, 1200);
      }

    document.getElementById('quickUploadForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (!file) { LisztUtil.toast('请先选择视频文件', 'error'); return; }
      // P0-6：1 件作品限制
      if (!LisztStore.canUpload(me.id)) {
        const existing = LisztStore.myVideo(me.id);
        LisztUtil.toast('您已提交过作品：' + (existing?.title || '—') + '，请前往「上传作品」页修改', 'error');
        return;
      }
      const fd = Object.fromEntries(new FormData(e.target));
      const id = LisztStore.uid('v');
      const video = {
        id,
        contestantId: me.id,
        title: fd.title,
        composer: fd.composer || '',
        group: fd.group,
        notes: fd.notes || '',
        duration,
        durationLabel: LisztUtil.formatDuration(duration),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      };

      try {
        await LisztStore.saveVideoBlob(id, file, { name: file.name, size: file.size });
        const videos = LisztStore.getVideos();
        videos.push(video);
        LisztStore.setVideos(videos);

        LisztUtil.toast('作品上传成功，等待评委评审', 'success');
        e.target.reset();
        file = null;
        status.style.display = 'none';
        bar.style.width = '0%';
        // 刷新页面状态
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        LisztUtil.toast('上传失败：' + err.message, 'error');
      }
    });
  }
})();