/* ============================================================
   upload.js — 选手上传作品（2026 完整版）
   - 单一作品限制（每人 1 件，已上传只能修改）
   - 专业来自报名，组别下拉
   - 原创 checkbox + 作品介绍联动
   - 视频规格校验（大小/分辨率/格式）
   ============================================================ */
(function () {
  'use strict';

  const me = LisztAuth.current;
  if (!me) {
    location.href = 'login.html?next=' + encodeURIComponent('upload.html');
    return;
  }
  if (me.role !== 'contestant') {
    location.href = me.role === 'judge' ? 'score.html' : 'admin.html';
    return;
  }

  // =============== 常量 ===============
  const SPEC = LisztData.VIDEO_SPEC;
  const MAJORS = LisztData.MAJORS;
  const DRAFT_KEY = 'liszt_upload_draft';
  const DRAFT_INTERVAL = 800;
  const saveTimer = { id: null };
  let lastSavedAt = 0;
  let chosenFile = null;
  let detectedDuration = 0;
  let detectedResolution = '';
  let thumbnailDataUrl = null;
  let cancelUpload = false;
  let existingVideo = null;     // 当前选手已上传的作品
  let editMode = false;          // 是否处于"修改作品"模式

  // =============== DOM ===============
  const form = document.getElementById('uploadForm');
  const dz = document.getElementById('dropzone');
  const fi = document.getElementById('fileInput');
  const emptyState = document.getElementById('emptyState');
  const filePreview = document.getElementById('filePreview');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const submitBtn = document.getElementById('submitBtn');
  const draftBar = document.getElementById('draftBar');
  const draftText = document.getElementById('draftText');
  const restorePrompt = document.getElementById('restorePrompt');
  const restoreInfo = document.getElementById('restoreInfo');
  const dupWarning = document.getElementById('dupWarning');
  const dupExisted = document.getElementById('dupExisted');
  const groupRules = document.getElementById('groupRules');
  const titleInput = document.getElementById('titleInput');
  const recordDate = document.getElementById('recordDate');
  const durationInput = document.getElementById('durationInput');
  const groupSelect = document.getElementById('groupSelect');
  const majorDisplay = document.getElementById('majorDisplay');
  const isOriginalCheck = document.getElementById('isOriginalCheck');
  const introField = document.getElementById('introField');
  const introInput = document.getElementById('introInput');
  const existingNotice = document.getElementById('existingNotice');
  const existingMeta = document.getElementById('existingMeta');
  const videoSpecText = document.getElementById('videoSpecText');
  const videoSpecHint = document.getElementById('videoSpecHint');
  const dropzoneHint = document.getElementById('dropzoneHint');

  // 视频规格提示
  videoSpecText.textContent = `分辨率 ${SPEC.resolution}（最低 ${SPEC.minResolution}）；码率 ${SPEC.bitrate}；单文件 ${SPEC.minSizeMB}–${SPEC.maxSizeMB}MB；支持 ${SPEC.formats.map(f => f.toUpperCase()).join(' / ')}。`;
  videoSpecHint.textContent = `${SPEC.formats.map(f => f.toUpperCase()).join(' / ')} · ${SPEC.minSizeMB}–${SPEC.maxSizeMB}MB · ≥ ${SPEC.minResolution}`;
  dropzoneHint.textContent = `单文件 ${SPEC.minSizeMB}–${SPEC.maxSizeMB}MB · 分辨率 ≥ ${SPEC.minResolution}`;

  // 录制日期默认今天
  recordDate.valueAsDate = new Date();

  // P1-11：监听其他 tab 的草稿更新
  window.addEventListener('storage', (e) => {
    if (e.key === DRAFT_KEY && e.newValue) {
      LisztUtil.toast('其他标签页更新了草稿，刷新页面可加载最新内容', 'info');
    }
  });

  // =============== 专业 & 组别 渲染 ===============
  function renderMajor() {
    const m = MAJORS.find(x => x.key === me.major);
    if (m) {
      majorDisplay.textContent = `${m.icon}  ${m.label}  ·  ${m.desc}`;
    } else {
      majorDisplay.textContent = '未在报名信息中选择专业（请到注册页补全）';
      majorDisplay.style.color = '#f0a59a';
    }
  }

  function renderGroupOptions() {
    const m = MAJORS.find(x => x.key === me.major);
    const groups = m ? m.groups : ['儿童组', '少年组', '青年组', '专业组'];
    groupSelect.innerHTML = '<option value="">请选择组别</option>' +
      groups.map(g => {
        const limit = SPEC.durationLimit[g];
        const limitText = limit ? `（≤ ${Math.round(limit/60)} 分钟）` : '';
        return `<option value="${g}">${g}${limitText}</option>`;
      }).join('');
  }

  function showGroupRules() {
    const g = groupSelect.value;
    if (!g) { groupRules.classList.remove('show'); return; }
    const limit = SPEC.durationLimit[g] || 0;
    groupRules.innerHTML = `本赛事 <strong>${g}</strong> 时长限制：≤ <strong>${Math.round(limit/60)} 分钟</strong>（${limit} 秒）。${g === '专业组' ? '可选择协奏曲乐章或大型炫技作品。' : ''}`;
    groupRules.classList.add('show');
  }

  // =============== 已上传作品检查 ===============
  function checkExisting() {
    const mine = LisztStore.videosBy(v => v.contestantId === me.id);
    if (mine.length > 0 && !editMode) {
      existingVideo = mine[0];   // 只取第一个
      const scores = LisztStore.scoresForVideo(existingVideo.id);
      existingMeta.textContent = `${existingVideo.title}（${existingVideo.composer || '—'}）· ${existingVideo.group} · 上传于 ${LisztUtil.formatDate(existingVideo.uploadedAt)} · ${scores.length} 位评委已评`;
      existingNotice.style.display = '';
      // 隐藏表单，提示用户"修改作品"
      form.style.display = 'none';
      draftBar.style.display = 'none';
      return true;
    }
    return false;
  }

  document.getElementById('btnEditExisting').addEventListener('click', () => {
    if (!existingVideo) return;
    if (!confirm('进入修改模式后，原作品将保留至您点击"提交修改"为止。继续？')) return;
    editMode = true;
    // P0-7：两阶段编辑——只切状态、不删原作品/原评分
    // 预填旧数据
    titleInput.value = existingVideo.title || '';
    form.composer.value = existingVideo.composer || '';
    if (existingVideo.group) groupSelect.value = existingVideo.group;
    if (existingVideo.recordDate) recordDate.value = existingVideo.recordDate;
    if (existingVideo.isOriginal) {
      isOriginalCheck.checked = true;
      introField.style.display = '';
      introInput.value = existingVideo.intro || '';
    }
    if (existingVideo.notes) {
      const notesEl = form.querySelector('[name="notes"]');
      if (notesEl) notesEl.value = existingVideo.notes;
    }
    showGroupRules();
    // 隐藏提示，显示表单
    existingNotice.style.display = 'none';
    form.style.display = '';
    LisztUtil.toast('已切换到修改模式', 'info');
  });

  // =============== 原创切换 ===============
  isOriginalCheck.addEventListener('change', () => {
    if (isOriginalCheck.checked) {
      introField.style.display = '';
      introInput.required = true;
    } else {
      introField.style.display = 'none';
      introInput.required = false;
      introInput.value = '';
    }
    updateCounters();
  });

  // =============== 草稿恢复 ===============
  function checkDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if ((Date.now() - (draft.savedAt || 0)) / 60000 > 60 * 24 * 3) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const preview = draft.title ? `"${draft.title}"` : '一份未完成的作品';
      const when = LisztUtil.relativeTime(draft.savedAt);
      restoreInfo.textContent = `${preview}（${when}）`;
      restorePrompt.classList.add('show');
      document.getElementById('restoreYes').onclick = () => {
        applyDraft(draft);
        restorePrompt.classList.remove('show');
        LisztUtil.toast('已恢复草稿', 'success');
      };
      document.getElementById('restoreNo').onclick = () => {
        localStorage.removeItem(DRAFT_KEY);
        restorePrompt.classList.remove('show');
      };
    } catch (e) {}
  }

  function applyDraft(d) {
    if (d.title) titleInput.value = d.title;
    if (d.composer) form.composer.value = d.composer;
    if (d.group) groupSelect.value = d.group;
    if (d.recordDate) recordDate.value = d.recordDate;
    if (d.isOriginal) {
      isOriginalCheck.checked = true;
      introField.style.display = '';
      if (d.intro) introInput.value = d.intro;
    }
    showGroupRules();
  }

  function saveDraft() {
    const data = {
      title: titleInput.value.trim(),
      composer: form.composer.value.trim(),
      group: groupSelect.value,
      recordDate: recordDate.value,
      isOriginal: isOriginalCheck.checked,
      intro: introInput.value.trim(),
      savedAt: Date.now()
    };
    if (!data.group && !data.title) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    // P1-11：跨 tab 通知
    try {
      const ch = new BroadcastChannel('liszt-upload-draft');
      ch.postMessage({ type: 'saved', at: data.savedAt });
      ch.close();
    } catch (e) {}
    lastSavedAt = Date.now();
    draftBar.style.display = '';
    updateDraftText();
  }
  function updateDraftText() {
    const elapsed = Math.floor((Date.now() - lastSavedAt) / 1000);
    draftText.textContent = elapsed < 5
      ? '草稿已自动保存'
      : `草稿已自动保存 · ${LisztUtil.relativeTime(lastSavedAt)}`;
  }
  setInterval(updateDraftText, 10000);
  function maybeSave() {
    clearTimeout(saveTimer.id);
    saveTimer.id = setTimeout(saveDraft, DRAFT_INTERVAL);
  }

  // =============== 字符计数 ===============
  function updateCounters() {
    document.querySelectorAll('[data-counter]').forEach(c => {
      const name = c.dataset.counter;
      let input, max;
      if (name === 'title') { input = titleInput; max = 80; }
      else if (name === 'intro') { input = introInput; max = 500; }
      else { input = form[name]; max = parseInt(input && input.maxLength || 300, 10); }
      if (!input) return;
      const len = input.value.length;
      c.textContent = `${len} / ${max}`;
      c.classList.toggle('over', len > max * 0.9);
    });
  }
  document.querySelectorAll('[data-counter]').forEach(c => {
    const name = c.dataset.counter;
    let input = name === 'title' ? titleInput
              : name === 'intro' ? introInput
              : form[name];
    if (input) input.addEventListener('input', () => { updateCounters(); maybeSave(); });
  });
  updateCounters();

  // =============== 组别联动 ===============
  groupSelect.addEventListener('change', () => { showGroupRules(); maybeSave(); validateDuration(); });

  // =============== 重复检测 ===============
  function checkDuplicate() {
    const t = titleInput.value.trim();
    if (!t) { dupWarning.classList.remove('show'); return; }
    const existing = LisztStore.videosBy(v =>
      v.contestantId === me.id &&
      v.title.toLowerCase() === t.toLowerCase() &&
      (!existingVideo || v.id !== existingVideo.id)
    );
    if (existing.length) {
      const v = existing[0];
      dupWarning.classList.add('show');
      dupExisted.textContent = `已存在：${LisztUtil.escape(v.title)} · 上传于 ${LisztUtil.formatDate(v.uploadedAt)}`;
    } else {
      dupWarning.classList.remove('show');
    }
  }
  titleInput.addEventListener('input', () => { checkDuplicate(); maybeSave(); });
  form.composer.addEventListener('input', maybeSave);
  introInput.addEventListener('input', maybeSave);
  recordDate.addEventListener('change', maybeSave);

  // =============== 拖拽上传 ===============
  dz.addEventListener('click', e => {
    if (e.target.closest('.file-preview')) {
      if (e.target.closest('.change-btn')) fi.click();
      return;
    }
    if (!chosenFile) fi.click();
  });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(f) {
    // 格式校验
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!SPEC.formats.includes(ext)) {
      LisztUtil.toast(`仅支持 ${SPEC.formats.map(x => x.toUpperCase()).join(' / ')} 格式`, 'error');
      return;
    }
    // 大小校验
    const sizeMB = f.size / 1024 / 1024;
    if (sizeMB < SPEC.minSizeMB) {
      LisztUtil.toast(`文件过小（${sizeMB.toFixed(1)}MB），建议 ≥ ${SPEC.minSizeMB}MB`, 'error');
      return;
    }
    if (sizeMB > SPEC.maxSizeMB) {
      LisztUtil.toast(`文件超过 ${SPEC.maxSizeMB}MB 限制`, 'error');
      return;
    }
    chosenFile = f;
    thumbnailDataUrl = null;
    renderPreview(f);
    detectVideo(f);
  }

  function renderPreview(f) {
    emptyState.style.display = 'none';
    filePreview.style.display = '';
    dz.classList.add('has-file');
    filePreview.innerHTML = `
      <div class="thumb" id="thumbBox">
        <div style="text-align:center;"><div style="font-size:2rem;">⏳</div><div style="font-size:.8rem;">生成缩略图…</div></div>
      </div>
      <div class="info">
        <h4>${LisztUtil.escape(f.name)}</h4>
        <div class="meta" id="fileMeta">
          <span>${LisztUtil.formatSize(f.size)}</span>
          <span>·</span>
          <span>${f.type || 'video/*'}</span>
          <span>·</span>
          <span id="resInfo">分辨率检测中…</span>
          <span>·</span>
          <span id="bitrateInfo">码率检测中…</span>
        </div>
        <div class="warn" id="durationWarn"></div>
        <div class="warn" id="resolutionWarn"></div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-ghost btn-sm change-btn">🔄 更换</button>
        <button type="button" class="btn btn-ghost btn-sm" id="removeFileBtn" style="color:#e07b6e;">✕ 删除</button>
      </div>
    `;
    document.getElementById('removeFileBtn').addEventListener('click', removeFile);
  }

  function detectVideo(f) {
    const url = URL.createObjectURL(f);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      detectedDuration = Math.round(v.duration);
      detectedResolution = `${v.videoWidth}×${v.videoHeight}`;
      durationInput.value = LisztUtil.formatDuration(detectedDuration);
      const resInfo = document.getElementById('resInfo');
      if (resInfo) resInfo.textContent = detectedResolution;
      // P1-12：码率估算（文件大小 / 时长）并提示
      const bitrateInfo = document.getElementById('bitrateInfo');
      if (bitrateInfo && detectedDuration > 0) {
        const mbps = (f.size * 8 / detectedDuration) / 1_000_000;
        const minMbps = 8;
        bitrateInfo.innerHTML = mbps >= minMbps
          ? `<span style="color:#b6e3c8;">✓ 码率 ${mbps.toFixed(1)} Mbps（满足 ≥ ${minMbps} Mbps 要求）</span>`
          : `<span style="color:#f0a59a;">⚠ 码率 ${mbps.toFixed(1)} Mbps 低于建议 ${minMbps} Mbps，可能影响画质</span>`;
      }
      validateDuration();
      validateResolution();
      v.currentTime = Math.min(2, v.duration * 0.1);
    };
    v.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(320, v.videoWidth);
        canvas.height = canvas.width * v.videoHeight / v.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const thumbBox = document.getElementById('thumbBox');
        if (thumbBox) {
          thumbBox.innerHTML = `
            <img src="${thumbnailDataUrl}" alt="缩略图">
            <div class="duration-overlay">${LisztUtil.formatDuration(detectedDuration)}</div>
          `;
        }
      } catch (e) {}
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      const thumbBox = document.getElementById('thumbBox');
      if (thumbBox) thumbBox.innerHTML = `<div style="text-align:center;"><div style="font-size:2rem;">🎬</div><div style="font-size:.8rem;">无法读取</div></div>`;
      URL.revokeObjectURL(url);
    };
    v.src = url;
  }

  function validateDuration() {
    const warn = document.getElementById('durationWarn');
    if (!warn) return;
    if (!detectedDuration || !groupSelect.value) { warn.classList.remove('show', 'ok', 'short'); return; }
    const limit = SPEC.durationLimit[groupSelect.value];
    // P1-12：时长过短提示（< 60s 可能影响评分）
    if (detectedDuration < 60) {
      warn.classList.add('show', 'short');
      warn.classList.remove('ok');
      warn.innerHTML = `⚠ 视频时长仅 ${Math.round(detectedDuration)} 秒，过短可能影响评委打分，建议补充完整演奏片段`;
      return;
    }
    if (!limit) return;
    if (detectedDuration > limit) {
      warn.classList.add('show');
      warn.classList.remove('ok', 'short');
      warn.innerHTML = `⚠ 视频时长 ${LisztUtil.formatDuration(detectedDuration)} 超过${groupSelect.value}限制（${Math.round(limit/60)} 分钟），建议剪辑后重新上传`;
    } else {
      warn.classList.add('show', 'ok');
      warn.classList.remove('short');
      warn.innerHTML = `✓ 时长符合${groupSelect.value}要求（${LisztUtil.formatDuration(detectedDuration)} / ${Math.round(limit/60)} 分钟）`;
    }
  }

  function validateResolution() {
    const warn = document.getElementById('resolutionWarn');
    if (!warn) return;
    if (!detectedResolution) { warn.classList.remove('show', 'ok'); return; }
    const m = detectedResolution.match(/^(\d+)×(\d+)$/);
    if (!m) return;
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (w < 1280 || h < 720) {
      warn.classList.add('show');
      warn.classList.remove('ok');
      warn.style.background = 'rgba(199,85,85,.15)';
      warn.style.color = '#f3b8b8';
      warn.style.borderColor = 'rgba(199,85,85,.4)';
      warn.innerHTML = `⚠ 分辨率 ${detectedResolution} 低于 ${SPEC.minResolution}，建议重新录制`;
    } else {
      warn.classList.add('show', 'ok');
      warn.innerHTML = `✓ 分辨率 ${detectedResolution} 符合要求`;
    }
  }

  function removeFile() {
    chosenFile = null;
    thumbnailDataUrl = null;
    detectedDuration = 0;
    detectedResolution = '';
    fi.value = '';
    emptyState.style.display = '';
    filePreview.style.display = 'none';
    dz.classList.remove('has-file');
    durationInput.value = '';
    progressWrap.style.display = 'none';
  }

  // =============== 进度上传（演示） ===============
  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      cancelUpload = false;
      progressWrap.style.display = '';
      let pct = 0;
      const total = file.size;
      const tickMs = Math.max(40, Math.min(120, 5000 / Math.max(1, total / 1024 / 1024)));
      const stepSize = Math.max(0.5, Math.min(3, 5 / Math.max(1, total / 1024 / 1024)));
      const t = setInterval(() => {
        if (cancelUpload) { clearInterval(t); reject(new Error('已取消')); return; }
        pct = Math.min(pct + stepSize, 100);
        progressBar.style.width = pct + '%';
        progressLabel.textContent = pct < 100 ? `上传中… ${pct.toFixed(0)}%` : '服务器处理中…';
        if (pct >= 100) {
          setTimeout(() => {
            clearInterval(t);
            progressBar.style.width = '100%';
            progressLabel.textContent = '上传完成 ✓';
            resolve();
          }, 300);
        }
      }, tickMs);
    });
  }

  document.getElementById('cancelBtn').addEventListener('click', () => {
    cancelUpload = true;
    progressWrap.style.display = 'none';
    progressBar.style.width = '0%';
    LisztUtil.toast('已取消上传', 'info');
  });

  // =============== 提交 ===============
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;
    if (!chosenFile) { LisztUtil.toast('请先选择视频文件', 'error'); return; }

    const confirmed = await new Promise(resolve => {
      const overDuration = SPEC.durationLimit[groupSelect.value] && detectedDuration > SPEC.durationLimit[groupSelect.value];
      const overHtml = overDuration ? `<div class="row"><span>⚠ 超出时长</span><span class="v" style="color:#f0a59a;">${LisztUtil.formatDuration(detectedDuration)}</span></div>` : '';
      const originalText = isOriginalCheck.checked ? `<div class="row"><span>原创作品</span><span class="v">是</span></div>` : '';
      document.getElementById('modalInner').innerHTML = `
        <h3>确认提交参赛作品？</h3>
        <p class="muted" style="font-size: .9rem;">提交后将进入待评审状态，由 3 位评委为您打分与点评。${editMode ? '<br><strong style="color:#f0a59a;">⚠ 这是修改模式，将覆盖原作品。</strong>' : ''}</p>
        <div class="review-list">
          <div class="row"><span>参赛专业</span><span class="v">${LisztUtil.escape((MAJORS.find(m => m.key === me.major) || {}).label || '—')}</span></div>
          <div class="row"><span>参赛组别</span><span class="v">${LisztUtil.escape(groupSelect.value)}</span></div>
          <div class="row"><span>作品名称</span><span class="v">${LisztUtil.escape(titleInput.value.trim())}</span></div>
          <div class="row"><span>作曲家</span><span class="v">${LisztUtil.escape(form.composer.value.trim() || '—')}</span></div>
          <div class="row"><span>录制日期</span><span class="v">${LisztUtil.escape(recordDate.value || '—')}</span></div>
          <div class="row"><span>视频文件</span><span class="v">${LisztUtil.escape(chosenFile.name)}</span></div>
          <div class="row"><span>文件大小</span><span class="v">${LisztUtil.formatSize(chosenFile.size)}</span></div>
          <div class="row"><span>分辨率</span><span class="v">${detectedResolution || '—'}</span></div>
          <div class="row"><span>演奏时长</span><span class="v">${LisztUtil.formatDuration(detectedDuration)}</span></div>
          ${originalText}
          ${overHtml}
        </div>
        <div class="actions">
          <button class="btn btn-ghost" id="cancelSubmit">返回修改</button>
          <button class="btn btn-primary" id="confirmSubmit">确认提交</button>
        </div>
      `;
      LisztModal.open();
      document.getElementById('cancelSubmit').onclick = () => { LisztModal.close(); resolve(false); };
      document.getElementById('confirmSubmit').onclick = () => { LisztModal.close(); resolve(true); };
    });

    if (!confirmed) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '上传中…';

    const id = existingVideo && editMode ? existingVideo.id : LisztStore.uid('v');
    try {
      await uploadFile(chosenFile);
      await LisztStore.saveVideoBlob(id, chosenFile, { name: chosenFile.name, size: chosenFile.size, thumbnail: thumbnailDataUrl });
      const video = {
        id,
        contestantId: me.id,
        major: me.major,
        title: titleInput.value.trim(),
        composer: form.composer.value.trim(),
        group: groupSelect.value,
        isOriginal: isOriginalCheck.checked,
        intro: isOriginalCheck.checked ? introInput.value.trim() : '',
        recordDate: recordDate.value,
        notes: (form.querySelector('[name="notes"]') || {}).value || '',
        duration: detectedDuration,
        durationLabel: LisztUtil.formatDuration(detectedDuration),
        size: chosenFile.size,
        resolution: detectedResolution,
        fileMeta: { resolution: detectedResolution, format: chosenFile.name.split('.').pop() },
        thumbnail: thumbnailDataUrl,
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      };
      const videos = LisztStore.getVideos();
      const existingIdx = videos.findIndex(v => v.id === id);
      if (existingIdx >= 0) {
        // P0-7：编辑模式——原子覆盖：清掉原评分（基于旧作品打的分不再有效），写入新 video
        if (editMode) {
          const oldId = existingVideo?.id;
          if (oldId) {
            const oldScores = LisztStore.getScores().filter(s => s.videoId === oldId);
            oldScores.forEach(s => LisztStore.removeScore(s.id));
            // 删除旧视频二进制
            try { await LisztStore.deleteVideoBlob(oldId); } catch (e) {}
          }
        }
        videos[existingIdx] = video;
      } else {
        videos.push(video);
      }
      LisztStore.setVideos(videos);

      localStorage.removeItem(DRAFT_KEY);

      submitBtn.textContent = '✓ 提交成功';
      submitBtn.style.background = 'linear-gradient(135deg, #4f9d6f, #2d6843)';
      LisztUtil.toast(editMode ? '作品修改成功！正在跳转…' : '作品上传成功！正在跳转…', 'success');

      setTimeout(() => {
        location.href = 'result.html?vid=' + id;
      }, 800);
    } catch (err) {
      LisztUtil.toast('上传失败：' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 提交参赛作品';
      submitBtn.style.background = '';
      progressWrap.style.display = 'none';
    }
  });

  // =============== 验证 ===============
  function validate() {
    let ok = true;
    if (!titleInput.value.trim()) {
      titleInput.classList.add('error');
      document.querySelector('[data-error="title"]').classList.add('show');
      ok = false;
    } else {
      titleInput.classList.remove('error');
      document.querySelector('[data-error="title"]').classList.remove('show');
    }
    if (!groupSelect.value) { LisztUtil.toast('请选择参赛组别', 'error'); ok = false; }
    if (isOriginalCheck.checked && introInput.value.trim().length < 30) {
      introInput.classList.add('error');
      document.querySelector('[data-error="intro"]').classList.add('show');
      LisztUtil.toast('原创作品需填写至少 30 字的作品介绍', 'error');
      ok = false;
    } else {
      introInput.classList.remove('error');
      const introErr = document.querySelector('[data-error="intro"]');
      if (introErr) introErr.classList.remove('show');
    }
    return ok;
  }
  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      titleInput.classList.remove('error');
      document.querySelector('[data-error="title"]').classList.remove('show');
    }
  });
  introInput.addEventListener('input', () => {
    if (introInput.value.trim().length >= 30) {
      introInput.classList.remove('error');
      const e = document.querySelector('[data-error="intro"]');
      if (e) e.classList.remove('show');
    }
  });

  // =============== 清空 ===============
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('清空当前表单与已选视频？')) return;
    form.reset();
    recordDate.valueAsDate = new Date();
    isOriginalCheck.checked = false;
    introField.style.display = 'none';
    introInput.value = '';
    removeFile();
    localStorage.removeItem(DRAFT_KEY);
    draftBar.style.display = 'none';
    showGroupRules();
    updateCounters();
    LisztUtil.toast('已清空', 'info');
  });
  document.getElementById('clearDraftBtn').addEventListener('click', () => {
    if (!confirm('清除已保存的草稿？')) return;
    localStorage.removeItem(DRAFT_KEY);
    draftBar.style.display = 'none';
    LisztUtil.toast('草稿已清除', 'info');
  });

  // =============== 快捷键 ===============
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (form.style.display !== 'none') form.requestSubmit();
    }
  });

  // =============== 启动 ===============
  renderMajor();
  renderGroupOptions();
  showGroupRules();
  if (!checkExisting()) {
    checkDraft();
  }
  updateCounters();
})();
