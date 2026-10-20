/* ============================================================
   admin.js — 组委会管理后台
   ============================================================ */
(function () {
  'use strict';

  if (!LisztAuth.require('admin')) return;

  const admin = LisztAuth.current;

  function renderMe() {
    document.getElementById('meName').textContent = admin.name;
    document.getElementById('meAvatar').textContent = '组';
  }

  // ---- 面板切换 ----
  document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });
  function switchPanel(name) {
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    if (name === 'overview')       renderOverview();
    if (name === 'registrations')  renderRegistrations();
    if (name === 'fee')            renderFee();
    if (name === 'videos')         renderVideosTable();
    if (name === 'users')          renderUsersTable();
    if (name === 'judges')         renderJudgesTable();
    if (name === 'scores')         renderScoresTable();
  }

  // ---- 数据总览 ----
  function renderOverview() {
    const users = LisztStore.getUsers().filter(u => u.role === 'contestant');
    const videos = LisztStore.getVideos();
    const scores = LisztStore.getScores();
    const judges = LisztData.SEED_JUDGES;

    document.getElementById('overviewStats').innerHTML = `
      <div class="stat-box"><div class="num">${users.length}</div><div class="label">注册选手</div></div>
      <div class="stat-box"><div class="num">${videos.length}</div><div class="label">作品总数</div></div>
      <div class="stat-box"><div class="num">${scores.length}</div><div class="label">评分数</div></div>
      <div class="stat-box"><div class="num">${judges.length}</div><div class="label">评委</div></div>
    `;

    // 组别分布
    const groups = ['儿童组','少年组','青年组','专业组'];
    document.getElementById('groupDistribution').innerHTML = groups.map(g => {
      const cnt = videos.filter(v => v.group === g).length;
      const avgScores = scores.filter(s => {
        const v = videos.find(x => x.id === s.videoId);
        return v && v.group === g;
      });
      const avg = avgScores.length ? (avgScores.reduce((a, b) => a + b.overall, 0) / avgScores.length) : 0;
      return `
        <div class="card">
          <h3 style="margin:0 0 10px;">${g}</h3>
          <div class="stat-grid" style="grid-template-columns: 1fr 1fr;">
            <div><div style="font-size:1.5rem; color:var(--color-gold-2); font-family:var(--font-serif);">${cnt}</div><div class="muted" style="font-size:.85rem;">作品</div></div>
            <div><div style="font-size:1.5rem; color:var(--color-gold-2); font-family:var(--font-serif);">${avg ? avg.toFixed(2) : '—'}</div><div class="muted" style="font-size:.85rem;">平均分</div></div>
          </div>
        </div>
      `;
    }).join('');

    // 最近活动
    const activities = [];
    videos.forEach(v => activities.push({ time: v.uploadedAt, icon: '🎬', text: `选手 ${LisztStore.findUser(u => u.id === v.contestantId)?.name || ''} 上传了《${v.title}》` }));
    scores.forEach(s => {
      const v = LisztStore.findVideo(x => x.id === s.videoId);
      activities.push({ time: s.scoredAt, icon: '🏆', text: `评委 ${s.judgeName} 对《${v?.title || ''}》评出 ${s.overall.toFixed(2)} 分` });
    });
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    document.getElementById('recentActivity').innerHTML = activities.length ? activities.slice(0, 8).map(a => `
      <div style="display:flex; align-items:center; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--color-border);">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(200,164,92,.12); display: grid; place-items: center; font-size: 1rem;">${a.icon}</div>
        <div style="flex:1;">${LisztUtil.escape(a.text)}</div>
        <div class="muted" style="font-size:.85rem;">${LisztUtil.formatDate(a.time)}</div>
      </div>
    `).join('') : '<div class="muted">暂无活动</div>';
  }

  // ---- 作品管理 ----
  function renderVideosTable(keyword = '') {
    const videos = LisztStore.getVideos();
    const kw = keyword.trim().toLowerCase();
    const rows = videos.filter(v => {
      if (!kw) return true;
      const c = LisztStore.findUser(u => u.id === v.contestantId);
      return v.title.toLowerCase().includes(kw) || (c?.name || '').toLowerCase().includes(kw);
    });

    document.getElementById('videosTable').innerHTML = `
      <thead><tr><th>作品</th><th>选手</th><th>组别</th><th>上传时间</th><th>评分</th><th>操作</th></tr></thead>
      <tbody>${rows.length ? rows.map(v => {
        const c = LisztStore.findUser(u => u.id === v.contestantId);
        const vScores = LisztStore.scoresForVideo(v.id);
        const avg = vScores.length ? vScores.reduce((a, b) => a + b.overall, 0) / vScores.length : null;
        return `
          <tr>
            <td>
              <strong style="color:var(--color-text);">${LisztUtil.escape(v.title)}</strong>
              <div class="muted" style="font-size:.85rem;">${LisztUtil.escape(v.composer || '')}</div>
            </td>
            <td>${LisztUtil.escape(c?.name || '—')}</td>
            <td><span class="tag tag-cat">${LisztUtil.escape(v.group)}</span></td>
            <td><span class="muted" style="font-size:.85rem;">${LisztUtil.formatDate(v.uploadedAt)}</span></td>
            <td>${avg ? `<span class="score-pill" style="font-size:.8rem;">★ ${avg.toFixed(2)} <span class="muted">(${vScores.length})</span></span>` : '<span class="muted">—</span>'}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-view-video="${v.id}">查看</button>
              <button class="btn btn-danger btn-sm" data-del-video="${v.id}">删除</button>
            </td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="6" class="muted" style="text-align:center; padding: 30px;">暂无作品</td></tr>`}</tbody>
    `;

    document.getElementById('videosTable').querySelectorAll('[data-view-video]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.viewVideo;
      const url = await LisztVideoLoader.getObjectURL(id);
      const scores = LisztStore.scoresForVideo(id);
      const v = LisztStore.findVideo(x => x.id === id);
      LisztModal.open(`
        ${url ? `<video controls class="video-player" src="${url}"></video>` : '<div class="alert alert-info">视频文件不存在</div>'}
        <h3 style="margin-top:18px;">${LisztUtil.escape(v.title)}</h3>
        <div class="muted">${LisztUtil.escape(v.composer || '')} · <span class="tag tag-cat">${LisztUtil.escape(v.group)}</span></div>
        <p style="margin-top:10px;">${LisztUtil.escape(v.notes || '')}</p>
        <h3 style="margin-top: 24px; border-top: 1px solid var(--color-border); padding-top: 18px;">评分记录</h3>
        ${scores.length ? scores.map(s => `
          <div class="comment" style="margin-top: 10px;">
            <div class="comment-head">
              <div class="author">
                <strong>${LisztUtil.escape(s.judgeName)}</strong>
                <span class="role-tag">评委</span>
              </div>
              <span class="score-pill" style="font-size:.85rem;">${s.overall.toFixed(2)}</span>
            </div>
            <div class="comment-body">${LisztUtil.escape(s.comment)}</div>
          </div>
        `).join('') : '<p class="muted">暂无评分</p>'}
      `, { title: '作品详情' });
    }));

    document.getElementById('videosTable').querySelectorAll('[data-del-video]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.delVideo;
      if (!confirm('确认删除该作品及其所有评分？此操作不可恢复。')) return;
      const videos = LisztStore.getVideos().filter(v => v.id !== id);
      LisztStore.setVideos(videos);
      const scores = LisztStore.getScores().filter(s => s.videoId !== id);
      LisztStore.setScores(scores);
      await LisztStore.deleteVideoBlob(id);
      LisztUtil.toast('已删除', 'success');
      renderVideosTable(document.getElementById('videoSearch').value);
    }));
  }

  document.getElementById('videoSearch').addEventListener('input', e => renderVideosTable(e.target.value));

  // ---- 选手管理 ----
  function renderUsersTable() {
    const users = LisztStore.getUsers().filter(u => u.role === 'contestant');
    document.getElementById('usersTable').innerHTML = `
      <thead><tr><th>姓名</th><th>账号</th><th>组别</th><th>年龄</th><th>学校</th><th>作品数</th><th>操作</th></tr></thead>
      <tbody>${users.length ? users.map(u => {
        const vids = LisztStore.videosBy(v => v.contestantId === u.id).length;
        return `
          <tr>
            <td><strong style="color:var(--color-text);">${LisztUtil.escape(u.name)}</strong></td>
            <td><span class="kbd">${LisztUtil.escape(u.username)}</span></td>
            <td><span class="tag tag-cat">${LisztUtil.escape(u.group || '—')}</span></td>
            <td>${u.age || '—'}</td>
            <td>${LisztUtil.escape(u.school || '—')}</td>
            <td>${vids}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-view-user="${u.id}">查看</button>
              <button class="btn btn-danger btn-sm" data-del-user="${u.id}">删除</button>
            </td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="7" class="muted" style="text-align:center; padding: 30px;">暂无选手</td></tr>`}</tbody>
    `;

    document.getElementById('usersTable').querySelectorAll('[data-view-user]').forEach(b => b.addEventListener('click', () => {
      const u = LisztStore.findUser(x => x.id === b.dataset.viewUser);
      if (!u) return;
      LisztModal.open(`
        <h3 style="margin: 0 0 6px;">${LisztUtil.escape(u.name)}</h3>
        <div class="muted">账号：${LisztUtil.escape(u.username)} · ${LisztUtil.escape(u.group || '—')}</div>
        <table class="score-table" style="margin-top: 18px;">
          <tbody>
            <tr><td>姓名</td><td>${LisztUtil.escape(u.name)}</td></tr>
            <tr><td>账号</td><td>${LisztUtil.escape(u.username)}</td></tr>
            <tr><td>组别</td><td>${LisztUtil.escape(u.group || '—')}</td></tr>
            <tr><td>年龄</td><td>${u.age || '—'}</td></tr>
            <tr><td>学校</td><td>${LisztUtil.escape(u.school || '—')}</td></tr>
            <tr><td>指导教师</td><td>${LisztUtil.escape(u.teacher || '—')}</td></tr>
            <tr><td>邮箱</td><td>${LisztUtil.escape(u.email || '—')}</td></tr>
            <tr><td>电话</td><td>${LisztUtil.escape(u.phone || '—')}</td></tr>
            <tr><td>简介</td><td>${LisztUtil.escape(u.bio || '—')}</td></tr>
          </tbody>
        </table>
      `, { title: '选手详情' });
    }));

    document.getElementById('usersTable').querySelectorAll('[data-del-user]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.delUser;
      if (!confirm('确认删除该选手账号及其所有作品？')) return;
      const users = LisztStore.getUsers().filter(u => u.id !== id);
      LisztStore.setUsers(users);
      const vids = LisztStore.videosBy(v => v.contestantId === id);
      vids.forEach(async v => { await LisztStore.deleteVideoBlob(v.id); });
      LisztStore.setVideos(LisztStore.getVideos().filter(v => v.contestantId !== id));
      LisztUtil.toast('已删除', 'success');
      renderUsersTable();
    }));
  }

  // ---- 评委管理 ----
  function renderJudgesTable() {
    document.getElementById('judgesTable').innerHTML = `
      <thead><tr><th>评委</th><th>职务</th><th>专长</th><th>已评</th><th>平均分</th></tr></thead>
      <tbody>${LisztData.SEED_JUDGES.map(j => {
        const scores = LisztStore.scoresByJudge(j.id);
        const avg = scores.length ? (scores.reduce((a, b) => a + b.overall, 0) / scores.length) : 0;
        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; border-radius:50%; background:${LisztUtil.bg(j)}; display:grid; place-items:center; color:#1a1410; font-weight:700; position:relative; overflow:hidden;">${j.avatarUrl ? '' : LisztUtil.escape(j.initial)}</div>
                <div>
                  <strong style="color:var(--color-text);">${LisztUtil.escape(j.name)}</strong>
                  <div class="muted" style="font-size:.85rem;">${LisztUtil.escape(j.title)}</div>
                </div>
              </div>
            </td>
            <td><span class="tag">${LisztUtil.escape(j.role)}</span></td>
            <td>${j.expertise.map(x => `<span class="tag">${LisztUtil.escape(x)}</span>`).join('')}</td>
            <td>${scores.length}</td>
            <td>${avg ? `<span class="score-pill" style="font-size:.85rem;">${avg.toFixed(2)}</span>` : '<span class="muted">—</span>'}</td>
          </tr>
        `;
      }).join('')}</tbody>
    `;
  }

  // ---- 成绩汇总 ----
  function renderScoresTable(filterGroup = '') {
    const videos = LisztStore.getVideos();
    const scores = LisztStore.getScores();
    const rows = videos.filter(v => !filterGroup || v.group === filterGroup).map(v => {
      const vScores = scores.filter(s => s.videoId === v.id);
      if (!vScores.length) return null;
      const avg = vScores.reduce((a, b) => a + b.overall, 0) / vScores.length;
      const c = LisztStore.findUser(u => u.id === v.contestantId);
      return { v, c, avg, count: vScores.length };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg);

    document.getElementById('scoresTable').innerHTML = `
      <thead><tr><th>排名</th><th>选手</th><th>作品</th><th>组别</th><th>评分人数</th><th>综合分</th></tr></thead>
      <tbody>${rows.length ? rows.map((r, i) => `
        <tr>
          <td><strong style="color:var(--color-gold-2); font-family: var(--font-serif); font-size: 1.05rem;">#${i + 1}</strong></td>
          <td>${LisztUtil.escape(r.c?.name || '—')}</td>
          <td><strong style="color:var(--color-text);">${LisztUtil.escape(r.v.title)}</strong></td>
          <td><span class="tag tag-cat">${LisztUtil.escape(r.v.group)}</span></td>
          <td>${r.count} 位评委</td>
          <td><span class="score-pill">★ ${r.avg.toFixed(2)}</span></td>
        </tr>
      `).join('') : `<tr><td colspan="6" class="muted" style="text-align:center; padding: 30px;">暂无评分数据</td></tr>`}</tbody>
    `;
  }
  document.getElementById('groupFilter').addEventListener('change', e => renderScoresTable(e.target.value));

  // ---- 报名列表 ----
  const MAJORS = LisztData.MAJORS;
  function getContestants() { return LisztStore.getUsers().filter(u => u.role === 'contestant'); }
  function getFilteredContestants() {
    const q = (document.getElementById('regSearch')?.value || '').trim().toLowerCase();
    const g = document.getElementById('regGroupFilter')?.value || '';
    const m = document.getElementById('regMajorFilter')?.value || '';
    return getContestants().filter(u => {
      if (g && u.group !== g) return false;
      if (m && u.major !== m) return false;
      if (q && !((u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.phone || '').toLowerCase().includes(q) || (u.school || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }

  function renderRegistrations() {
    const all = getContestants();
    const list = getFilteredContestants();
    const feePaid = all.filter(u => u.feePaid).length;
    const withVideo = all.filter(u => LisztStore.videosBy(v => v.contestantId === u.id).length > 0).length;

    // 概览
    document.getElementById('regSummary').innerHTML = `
      <div class="stat-box"><div class="num">${all.length}</div><div class="label">报名总人数</div></div>
      <div class="stat-box"><div class="num">${feePaid}</div><div class="label">已缴费</div></div>
      <div class="stat-box"><div class="num">${all.length - feePaid}</div><div class="label">未缴费</div></div>
      <div class="stat-box"><div class="num">${withVideo}</div><div class="label">已上传作品</div></div>
    `;

    const rows = list.map(u => {
      const major = MAJORS.find(m => m.key === u.major) || { label: '—', icon: '' };
      const videos = LisztStore.videosBy(v => v.contestantId === u.id);
      const regTime = u.createdAt ? LisztUtil.formatDate(u.createdAt) : '—';
      return `
        <tr>
          <td><strong>${LisztUtil.escape(u.name || '—')}</strong></td>
          <td>${LisztUtil.escape(u.username || '—')}</td>
          <td>${major.icon || ''} ${LisztUtil.escape(major.label)}</td>
          <td><span class="tag tag-cat">${LisztUtil.escape(u.group || '—')}</span></td>
          <td>${u.age || '—'}</td>
          <td>${LisztUtil.escape(u.phone || '—')}</td>
          <td>${LisztUtil.escape(u.email || '—')}</td>
          <td>${LisztUtil.escape(u.school || '—')}</td>
          <td>${LisztUtil.escape(u.teacher || '—')}</td>
          <td>${videos.length}</td>
          <td>${u.feePaid ? '<span class="tag tag-done">✓ 已缴</span>' : '<span class="tag tag-warn">未缴</span>'}</td>
          <td style="white-space:nowrap; font-size:.82rem; color:var(--color-text-dim);">${regTime}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('registrationsTable').innerHTML = `
      <thead><tr>
        <th>姓名</th><th>账号</th><th>专业</th><th>组别</th><th>年龄</th>
        <th>手机号</th><th>邮箱</th><th>学校</th><th>指导教师</th>
        <th>作品</th><th>缴费</th><th>注册时间</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="12" class="muted" style="text-align:center; padding: 30px;">无匹配选手</td></tr>`}</tbody>
    `;
  }

  // 报名列表事件
  ['regSearch', 'regGroupFilter', 'regMajorFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderRegistrations);
  });

  // 报名列表导出
  document.getElementById('btnExportReg')?.addEventListener('click', () => {
    const list = getFilteredContestants();
    const headers = ['姓名', '账号', '专业', '组别', '年龄', '手机号', '邮箱', '学校', '指导教师', '已上传作品', '缴费状态', '缴费金额', '缴费时间', '缴费方式', '缴费凭证', '注册时间'];
    const rows = list.map(u => {
      const major = MAJORS.find(m => m.key === u.major) || { label: '' };
      const videos = LisztStore.videosBy(v => v.contestantId === u.id);
      return [
        u.name, u.username, major.label, u.group, u.age, u.phone, u.email, u.school, u.teacher,
        videos.length, u.feePaid ? '已缴' : '未缴', u.feeAmount || '', u.feeAt || '', u.feeMethod || '', u.feeReceipt || '',
        u.createdAt ? LisztUtil.formatDate(u.createdAt) : ''
      ];
    });
    exportCsv('报名列表_' + Date.now() + '.csv', headers, rows);
  });

  // ---- 缴费管理 ----
  function renderFee() {
    const all = getContestants();
    const f = document.getElementById('feeFilter')?.value || '';
    const list = f === 'paid' ? all.filter(u => u.feePaid) : f === 'unpaid' ? all.filter(u => !u.feePaid) : all;
    const totalAmount = all.filter(u => u.feePaid).reduce((a, b) => a + (b.feeAmount || LisztData.SEED_COMPETITION.feeAmount), 0);

    document.getElementById('feeSummary').innerHTML = `
      <div class="stat-box"><div class="num">${all.filter(u => u.feePaid).length}</div><div class="label">已缴费</div></div>
      <div class="stat-box"><div class="num">${all.filter(u => !u.feePaid).length}</div><div class="label">未缴费</div></div>
      <div class="stat-box"><div class="num">￥ ${totalAmount.toLocaleString()}</div><div class="label">已收金额</div></div>
      <div class="stat-box"><div class="num">￥ ${(all.filter(u => !u.feePaid).length * LisztData.SEED_COMPETITION.feeAmount).toLocaleString()}</div><div class="label">应收未收</div></div>
    `;

    const rows = list.map(u => {
      const major = MAJORS.find(m => m.key === u.major) || { label: '—', icon: '' };
      return `
        <tr>
          <td><strong>${LisztUtil.escape(u.name || '—')}</strong></td>
          <td>${LisztUtil.escape(u.username)}</td>
          <td>${major.icon || ''} ${LisztUtil.escape(major.label)}</td>
          <td>${LisztUtil.escape(u.group || '—')}</td>
          <td>${LisztUtil.escape(u.phone || '—')}</td>
          <td>${u.feePaid ? '<span class="tag tag-done">✓ 已缴</span>' : '<span class="tag tag-warn">未缴</span>'}</td>
          <td>￥ ${u.feeAmount || LisztData.SEED_COMPETITION.feeAmount}</td>
          <td>${u.feeAt ? LisztUtil.formatDate(u.feeAt) : '—'}</td>
          <td>${({ alipay: '支付宝', wechat: '微信', bank: '银行转账' })[u.feeMethod] || '—'}</td>
          <td style="font-family:monospace; font-size:.8rem; color:var(--color-text-dim);">${u.feeReceipt || '—'}</td>
          <td>
            ${u.feePaid
              ? `<button class="btn btn-ghost btn-sm" data-toggle-fee="${u.id}">标记为未缴</button>`
              : `<button class="btn btn-primary btn-sm" data-toggle-fee="${u.id}">标记为已缴</button>`}
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('feeTable').innerHTML = `
      <thead><tr>
        <th>姓名</th><th>账号</th><th>专业</th><th>组别</th><th>手机号</th>
        <th>状态</th><th>金额</th><th>缴费时间</th><th>方式</th><th>凭证号</th><th>操作</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="11" class="muted" style="text-align:center; padding: 30px;">暂无数据</td></tr>`}</tbody>
    `;

    document.querySelectorAll('[data-toggle-fee]').forEach(btn => {
      btn.addEventListener('click', () => {
        const users = LisztStore.getUsers();
        const idx = users.findIndex(u => u.id === btn.dataset.toggleFee);
        if (idx >= 0) {
          if (users[idx].feePaid) {
            users[idx].feePaid = false;
            users[idx].feeAt = null;
            users[idx].feeMethod = null;
            users[idx].feeReceipt = null;
          } else {
            users[idx].feePaid = true;
            users[idx].feeAt = new Date().toISOString();
            users[idx].feeMethod = 'alipay';
            users[idx].feeAmount = LisztData.SEED_COMPETITION.feeAmount;
            users[idx].feeReceipt = 'AUTO-' + Date.now();
          }
          LisztStore.setUsers(users);
          LisztUtil.toast('缴费状态已更新', 'success');
          renderFee();
        }
      });
    });
  }

  document.getElementById('feeFilter')?.addEventListener('change', renderFee);

  document.getElementById('btnExportFee')?.addEventListener('click', () => {
    const f = document.getElementById('feeFilter')?.value || '';
    const all = getContestants();
    const list = f === 'paid' ? all.filter(u => u.feePaid) : f === 'unpaid' ? all.filter(u => !u.feePaid) : all;
    const headers = ['姓名', '账号', '专业', '组别', '手机号', '缴费状态', '金额', '缴费时间', '方式', '凭证号'];
    const rows = list.map(u => {
      const major = MAJORS.find(m => m.key === u.major) || { label: '' };
      return [
        u.name, u.username, major.label, u.group, u.phone,
        u.feePaid ? '已缴' : '未缴',
        u.feeAmount || LisztData.SEED_COMPETITION.feeAmount,
        u.feeAt ? LisztUtil.formatDate(u.feeAt) : '',
        ({ alipay: '支付宝', wechat: '微信', bank: '银行转账' })[u.feeMethod] || '',
        u.feeReceipt || ''
      ];
    });
    exportCsv('缴费管理_' + Date.now() + '.csv', headers, rows);
  });

  // ---- 通用导出 CSV ----
  function exportCsv(filename, headers, rows) {
    const csv = [headers, ...rows].map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
    // 加 BOM 以便 Excel 正确识别 UTF-8
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    LisztUtil.toast('已导出：' + filename, 'success');
  }

  // ---- 初始化 ----
  renderMe();
  renderOverview();
})();