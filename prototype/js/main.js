/* ============================================================
   main.js — 公共工具与初始化
   ============================================================ */
(function (global) {
  'use strict';

  // ---------- 工具 ----------
  const Util = {
    // 综合分计算：4 个维度平均，保留 2 位小数
    computeOverall(dims) {
      const vals = Object.values(dims || {}).filter(v => typeof v === 'number' && !isNaN(v));
      if (!vals.length) return 0;
      const sum = vals.reduce((a, b) => a + b, 0);
      return Math.round((sum / vals.length) * 100) / 100;
    },
    // 从 <input type="range"> 节点或对象收集 dim 值
    collectDims(els) {
      const out = {};
      Object.entries(els).forEach(([k, el]) => {
        if (!el) return;
        if (el.value !== undefined) out[k] = Number(el.value);
      });
      return out;
    },
    // 头像背景：有 avatarUrl 时返回 url(...) 背景图，否则 fallback 渐变
    bg(entity, fallback) {
      if (!entity) return fallback || '';
      if (entity.avatarUrl) return `url('${entity.avatarUrl}') center/cover`;
      return entity.avatarColor || fallback || '';
    },
    // 头像首字母：用于 fallback（无 avatarUrl 时）
    initial(entity, alt) {
      if (!entity) return alt || '?';
      return entity.initial || (entity.name || '').trim().slice(0, 1) || alt || '?';
    },
    formatDate(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    formatSize(bytes) {
      if (!bytes) return '—';
      const units = ['B','KB','MB','GB'];
      let i = 0, n = bytes;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
    },
    // 身份证号校验（GB 11643-1999）：18 位，含校验位
    isValidIdCard(id) {
      if (!id) return false;
      const v = String(id).trim().toUpperCase();
      if (!/^[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dX]$/.test(v)) return false;
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const codes = ['1','0','X','9','8','7','6','5','4','3','2'];
      let sum = 0;
      for (let i = 0; i < 17; i++) sum += parseInt(v[i], 10) * weights[i];
      return codes[sum % 11] === v[17];
    },
    // 解析身份证号：返回 { birth, gender, genderLabel, age, region }
    parseIdCard(id) {
      const v = String(id || '').trim().toUpperCase();
      if (!/^\d{17}[\dX]$/.test(v)) return { birth: '', gender: '', genderLabel: '', age: null, region: '' };
      const birth = `${v.slice(6,10)}-${v.slice(10,12)}-${v.slice(12,14)}`;
      const genderCode = parseInt(v[16], 10);
      const gender = genderCode % 2 === 1 ? 'male' : 'female';
      const genderLabel = gender === 'male' ? '男' : '女';
      const age = Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000)));
      // 地区（简化）：按前 2 位映射到省 / 直辖市
      const REGION = { 11:'北京', 12:'天津', 13:'河北', 14:'山西', 15:'内蒙古', 21:'辽宁', 22:'吉林', 23:'黑龙江',
        31:'上海', 32:'江苏', 33:'浙江', 34:'安徽', 35:'福建', 36:'江西', 37:'山东', 41:'河南', 42:'湖北', 43:'湖南',
        44:'广东', 45:'广西', 46:'海南', 50:'重庆', 51:'四川', 52:'贵州', 53:'云南', 54:'西藏', 61:'陕西', 62:'甘肃',
        63:'青海', 64:'宁夏', 65:'新疆', 71:'台湾', 81:'香港', 82:'澳门', 91:'海外' };
      const region = REGION[v.slice(0, 2)] || '';
      return { birth, gender, genderLabel, age, region };
    },
    // 身份证号哈希（脱敏存储：用于后台去重，不存明文到日志）
    hashIdCard(id) {
      const v = String(id || '').toUpperCase();
      let h = 5381;
      for (let i = 0; i < v.length; i++) h = ((h << 5) + h + v.charCodeAt(i)) >>> 0;
      return 'idh_' + h.toString(36);
    },
    // 身份证号脱敏展示：保留前 4 后 4
    maskIdCard(id) {
      if (!id) return '—';
      const v = String(id);
      if (v.length < 8) return v;
      return v.slice(0, 4) + '*'.repeat(Math.max(4, v.length - 8)) + v.slice(-4);
    },
    // 压缩图片到指定尺寸，返回 base64 dataURL（用 canvas 缩放）
    compressImage(file, maxSize = 320, quality = 0.85) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
              if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
              else { width = Math.round(width * maxSize / height); height = maxSize; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            try { resolve(canvas.toDataURL('image/jpeg', quality)); }
            catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error('图片加载失败'));
          img.src = fr.result;
        };
        fr.onerror = () => reject(new Error('文件读取失败'));
        fr.readAsDataURL(file);
      });
    },
    // 根据姓名稳定地选一个头像渐变色
    pickAvatarColor(name) {
      const palette = [
        'linear-gradient(135deg, #c8a45c, #8a6a2c)',
        'linear-gradient(135deg, #b13b3b, #6b2828)',
        'linear-gradient(135deg, #5b9ed1, #2c5e8a)',
        'linear-gradient(135deg, #4f9d6f, #2d5a3e)',
        'linear-gradient(135deg, #8a6a2c, #4f3a18)',
        'linear-gradient(135deg, #a87fbf, #5a3d80)',
        'linear-gradient(135deg, #d1894f, #8a5424)'
      ];
      let h = 0;
      const s = String(name || '');
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return palette[h % palette.length];
    },
    formatDuration(seconds) {
      if (!seconds && seconds !== 0) return '—';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${String(s).padStart(2,'0')}`;
    },
    relativeTime(ts) {
      if (!ts) return '—';
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 5) return '刚刚';
      if (diff < 60) return `${diff} 秒前`;
      if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
      return this.formatDate(new Date(ts).toISOString());
    },
    escape(s) {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    toast(msg, type = 'info') {
      let el = document.getElementById('toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:1000;padding:12px 24px;border-radius:8px;font-size:.95rem;backdrop-filter:blur(10px);transition:all .25s ease;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:calc(100vw - 32px);text-align:center;';
        document.body.appendChild(el);
      }
      // 与 .alert-* 调色板对齐
      // info 用冷色蓝（与主色金分离，避免与"重要提示"撞色）
      // success / error 维持绿/红
      const colors = {
        info:    'background:rgba(91,158,209,.18);color:#a8c7e6;border:1px solid rgba(91,158,209,.45);',
        success: 'background:rgba(79,157,111,.18);color:#b6e3c8;border:1px solid rgba(79,157,111,.5);',
        error:   'background:rgba(199,85,85,.18);color:#f3b8b8;border:1px solid rgba(199,85,85,.5);',
        warn:    'background:rgba(200,164,92,.18);color:#e6c97a;border:1px solid rgba(200,164,92,.45);'
      };
      el.setAttribute('style', el.style.cssText + colors[type]);
      el.textContent = msg;
      el.style.opacity = '1';
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
    }
  };

  // ---------- 视频加载辅助 ----------
  const VideoLoader = {
    async getObjectURL(videoId) {
      const blob = await LisztStore.getVideoBlob(videoId);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    }
  };

  // ---------- Modal 控制（a11y: focus trap + ARIA + close callback） ----------
  const Modal = {
    _lastFocus: null,
    _onClose: null,
    open(html, opts = {}) {
      const backdrop = document.getElementById('modalBackdrop');
      const inner = document.getElementById('modalInner');
      if (!backdrop || !inner) return;
      Modal._lastFocus = document.activeElement;
      Modal._onClose = opts.onClose || null;
      inner.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div class="modal-head">
            <h3 id="modalTitle">${Util.escape(opts.title || '')}</h3>
            <button class="modal-close" aria-label="关闭">×</button>
          </div>
          <div class="modal-body">${html}</div>
        </div>
      `;
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      // focus trap
      const dialog = inner.querySelector('.modal');
      if (dialog) {
        setTimeout(() => {
          const f = dialog.querySelector('input, select, textarea, button:not(.modal-close)');
          if (f) f.focus();
        }, 30);
        Modal._trapHandler = (e) => {
          if (e.key !== 'Tab') return;
          const focusable = dialog.querySelectorAll('input, select, textarea, button, a[href]');
          if (!focusable.length) return;
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        dialog.addEventListener('keydown', Modal._trapHandler);
      }
      backdrop.querySelector('.modal-close').addEventListener('click', Modal.close);
    },
    close() {
      const backdrop = document.getElementById('modalBackdrop');
      const inner = document.getElementById('modalInner');
      if (backdrop) backdrop.classList.remove('open');
      document.body.style.overflow = '';
      // 清理所有 URL.createObjectURL
      document.querySelectorAll('video').forEach(v => {
        if (v.src && v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
      });
      if (inner) inner.innerHTML = '';
      // 恢复焦点
      if (Modal._lastFocus && Modal._lastFocus.focus) {
        try { Modal._lastFocus.focus(); } catch (e) {}
      }
      // 关闭回调
      if (typeof Modal._onClose === 'function') {
        try { Modal._onClose(); } catch (e) {}
      }
      Modal._onClose = null;
    }
  };

  // ---------- 初始化 ----------
  function bootstrap() {
    LisztStore.seed();
    LisztAuth.init();
    // 角色感知 nav（统一所有内页）
    renderGlobalNav();
    // 全局组件：倒计时 + 截止公告 banner
    injectGlobalStyles();
    injectDeadlineBanner();
    if (LisztAuth.current && LisztAuth.current.role === 'contestant'
        && !location.pathname.endsWith('registration.html')) {
      injectCountdown();
    }
    // Modal 全局关闭
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) Modal.close();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Modal.close();
        // 关闭移动端 nav 抽屉
        document.querySelectorAll('.nav-drawer.open').forEach(d => d.classList.remove('open'));
        document.body.classList.remove('nav-open');
      }
    });
  }

  // 角色感知导航：渲染到所有带 .nav-links 的容器，并补上汉堡按钮
  // （若 HTML 中已写死 nav-links，只在 .nav-actions 侧补 user chip + 汉堡）
  function renderGlobalNav() {
    const me = LisztAuth.current;
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // 各角色导航配置（权威链接命名表：见 P1-1 报告）
    const NAVS = {
      guest: [
        { href: 'index.html',      label: '首页' },
        { href: 'judges.html',     label: '专家评委' },
        { href: 'index.html#schedule', label: '赛事日程' },
        { href: 'index.html#groups',   label: '组别设置' },
        { href: 'login.html',      label: '登录 / 注册', primary: true }
      ],
      contestant: [
        { href: 'index.html',         label: '首页' },
        { href: 'upload.html',        label: '上传作品' },
        { href: 'result.html',        label: '我的成绩' },
        { href: 'registration.html',  label: '报名详情' },
        { href: 'judges.html',        label: '专家评委' }
      ],
      judge: [
        { href: 'index.html',         label: '首页' },
        { href: 'score.html',         label: '评审打分', primary: true },
        { href: 'judge-panel.html',   label: '评审中心' },
        { href: 'judges.html',        label: '专家评委' }
      ],
      admin: [
        { href: 'index.html',         label: '首页' },
        { href: 'admin.html',         label: '管理后台', primary: true },
        { href: 'judges.html',        label: '专家评委' }
      ]
    };
    const role = me ? me.role : 'guest';
    const links = NAVS[role] || NAVS.guest;

    // 1. 渲染主导航 <nav class="nav-links">
    document.querySelectorAll('.nav-links').forEach(ul => {
      // 已存在自定义链接的页面（如 upload.html / result.html）→ 保留并补 active
      if (ul.dataset.managed === '1') {
        ul.querySelectorAll('a').forEach(a => {
          const href = (a.getAttribute('href') || '').toLowerCase();
          if (href === path) a.classList.add('active');
          else if (href && href.indexOf('#') < 0) a.classList.remove('active');
        });
        return;
      }
      ul.dataset.managed = '1';
      ul.innerHTML = links.map(l => {
        const target = l.href.split('#')[0].toLowerCase();
        const active = target === path ? ' class="active"' : '';
        return `<a href="${l.href}"${active}>${l.label}</a>`;
      }).join('');
    });

    // 2. 在每个 <header> 顶部添加汉堡按钮（仅移动端显示）
    document.querySelectorAll('header').forEach(hdr => {
      if (hdr.querySelector('.nav-toggle')) return;
      const btn = document.createElement('button');
      btn.className = 'nav-toggle';
      btn.setAttribute('aria-label', '打开导航菜单');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span></span><span></span><span></span>';
      btn.addEventListener('click', () => {
        const drawer = document.querySelector('.nav-drawer');
        if (drawer) {
          const open = drawer.classList.toggle('open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
          document.body.classList.toggle('nav-open', open);
        }
      });
      const brand = hdr.querySelector('.brand');
      if (brand) brand.parentNode.insertBefore(btn, brand.nextSibling);
      else hdr.insertBefore(btn, hdr.firstChild);
    });

    // 3. 在 <body> 末尾创建抽屉
    if (!document.querySelector('.nav-drawer')) {
      const drawer = document.createElement('div');
      drawer.className = 'nav-drawer';
      drawer.setAttribute('role', 'navigation');
      drawer.innerHTML = `
        <div class="nav-drawer-head">
          <span class="brand-mini">Liszt IPC</span>
          <button class="nav-drawer-close" aria-label="关闭">×</button>
        </div>
        <nav class="nav-drawer-links">
          ${links.map(l => {
            const target = l.href.split('#')[0].toLowerCase();
            const active = target === path ? ' class="active"' : '';
            return `<a href="${l.href}"${active}>${l.label}</a>`;
          }).join('')}
        </nav>
        ${me ? `<div class="nav-drawer-user">
          <div class="who">${LisztUtil.escape(me.name || me.username)}</div>
          <div class="role-tag">${roleLabel(me.role)}</div>
          <button class="btn btn-ghost btn-sm" id="navDrawerLogout">退出登录</button>
        </div>` : ''}
      `;
      document.body.appendChild(drawer);
      const closeBtn = drawer.querySelector('.nav-drawer-close');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.body.classList.remove('nav-open');
      });
      const logoutBtn = drawer.querySelector('#navDrawerLogout');
      if (logoutBtn) logoutBtn.addEventListener('click', () => LisztAuth.logout());
    }

    // 4. 在所有 .nav-actions 中放置 user chip（如果还没）
    document.querySelectorAll('.nav-actions').forEach(el => {
      if (me) {
        if (!el.querySelector('.user-chip')) {
          el.innerHTML = `
            <span class="user-chip" title="${LisztUtil.escape(me.name || me.username)}">
              <span class="avatar${me.avatarUrl ? ' has-img' : ''}" style="background:${LisztUtil.bg(me, 'linear-gradient(135deg, #c8a45c, #8a6a2c)')};">${me.avatarUrl ? `<img src="${LisztUtil.escape(me.avatarUrl)}" alt="头像">` : LisztUtil.escape((me.name || me.username || 'U').slice(0,1))}</span>
              <span class="who">${LisztUtil.escape(me.name || me.username)}</span>
              <span class="role-tag">${roleLabel(me.role)}</span>
            </span>
            <button class="btn btn-ghost btn-sm" data-logout>退出</button>
          `;
          el.querySelector('[data-logout]')?.addEventListener('click', () => LisztAuth.logout());
        }
      } else {
        if (!el.querySelector('a[href*="login"]')) {
          el.innerHTML = `<a class="btn btn-ghost btn-sm" href="login.html">登录</a><a class="btn btn-primary btn-sm" href="login.html?tab=register">注册</a>`;
        }
      }
    });
  }

  function roleLabel(r) {
    return ({ contestant: '选手', judge: '评委', admin: '组委会' })[r] || r;
  }

  // 动态注入全局组件所需 CSS（避免修改 style.css）
  function injectGlobalStyles() {
    if (document.getElementById('liszt-global-styles')) return;
    const css = `
      /* 报名截止公告 banner */
      .deadline-banner {
        background: linear-gradient(90deg, rgba(200,164,92,.18), rgba(200,164,92,.08));
        border-bottom: 1px solid rgba(200,164,92,.35);
        padding: 8px 24px; font-size: .85rem;
        color: var(--color-text);
        text-align: center; position: relative; z-index: 5;
      }
      .deadline-banner .pill {
        display: inline-block; padding: 2px 10px; border-radius: 999px;
        background: rgba(200,164,92,.18); border: 1px solid rgba(200,164,92,.4);
        color: var(--color-gold-2); margin-left: 8px; font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .deadline-banner .pill.expired { background: rgba(199,85,85,.2); border-color: rgba(199,85,85,.5); color: #f3b8b8; }

      /* 右上角倒计时固定卡片（仅选手登录时显示） */
      .countdown-card {
        position: fixed; top: 80px; right: 22px; z-index: 50;
        background: rgba(20,17,13,.92); backdrop-filter: blur(10px);
        border: 1px solid rgba(200,164,92,.4); border-radius: 12px;
        padding: 10px 14px; box-shadow: 0 8px 28px rgba(0,0,0,.55);
        font-size: .82rem; color: var(--color-text);
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; transition: transform .2s;
        max-width: 240px;
      }
      .countdown-card:hover { transform: translateY(-2px); }
      .countdown-card .icon { font-size: 1.1rem; }
      .countdown-card .label { color: var(--color-text-dim); font-size: .72rem; letter-spacing: .04em; }
      .countdown-card .nums {
        font-variant-numeric: tabular-nums; font-weight: 700;
        color: var(--color-gold-2); font-size: .95rem;
        white-space: nowrap;
      }
      .countdown-card.expired .nums { color: #f3b8b8; }
      .countdown-card .nums small { font-size: .65rem; color: var(--color-text-dim); margin-left: 2px; font-weight: 500; }

      /* 汉堡按钮：仅 ≤960 显示 */
      .nav-toggle {
        display: none;
        width: 40px; height: 40px;
        background: transparent; border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer;
        flex-direction: column; align-items: center; justify-content: center;
        gap: 4px; padding: 0; margin-left: 12px;
      }
      .nav-toggle span {
        display: block; width: 20px; height: 2px;
        background: var(--color-text); border-radius: 2px;
        transition: all .2s;
      }
      .nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
      .nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
      .nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

      /* 移动端抽屉 */
      .nav-drawer {
        position: fixed; inset: 0 0 0 auto;
        width: min(360px, 88vw);
        background: linear-gradient(180deg, #15110d, #0c0a08);
        border-left: 1px solid var(--color-border);
        transform: translateX(100%);
        transition: transform .3s ease;
        z-index: 100;
        display: flex; flex-direction: column;
        box-shadow: -12px 0 40px rgba(0,0,0,.6);
        overflow-y: auto;
      }
      .nav-drawer.open { transform: translateX(0); }
      body.nav-open::before {
        content: ''; position: fixed; inset: 0;
        background: rgba(0,0,0,.55); z-index: 99;
      }
      .nav-drawer-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid var(--color-border);
      }
      .nav-drawer-head .brand-mini {
        font-family: var(--font-serif);
        font-size: 1.4rem; color: var(--color-gold-2);
        letter-spacing: .12em;
      }
      .nav-drawer-close {
        background: transparent; border: 0; color: var(--color-text);
        font-size: 2rem; line-height: 1; cursor: pointer; padding: 0;
        width: 32px; height: 32px;
      }
      .nav-drawer-links {
        display: flex; flex-direction: column;
        padding: 12px;
      }
      .nav-drawer-links a {
        padding: 14px 16px; border-radius: 10px;
        color: var(--color-text-2); text-decoration: none;
        font-size: 1.05rem; font-weight: 500;
        transition: all .15s;
      }
      .nav-drawer-links a:hover, .nav-drawer-links a.active {
        background: rgba(200,164,92,.12);
        color: var(--color-gold-2);
      }
      .nav-drawer-user {
        margin-top: auto;
        padding: 24px;
        border-top: 1px solid var(--color-border);
        text-align: center;
      }
      .nav-drawer-user .who { color: var(--color-text); font-weight: 600; margin-bottom: 6px; }
      .nav-drawer-user .role-tag {
        display: inline-block; padding: 2px 10px;
        background: rgba(200,164,92,.18);
        border: 1px solid var(--color-border);
        color: var(--color-gold-2);
        border-radius: 999px;
        font-size: .75rem; letter-spacing: .08em;
        margin-bottom: 14px;
      }
      .nav-drawer-user .btn { width: 100%; }

      @media (max-width: 960px) {
        .nav-toggle { display: flex; }
        header .nav-links { display: none !important; }
      }
      @media (min-width: 961px) {
        .nav-drawer { display: none; }
      }

      @media (max-width: 720px) {
        .countdown-card { top: auto; bottom: 16px; right: 12px; left: 12px; max-width: none; }
        .deadline-banner { font-size: .78rem; padding: 6px 12px; }
        /* toast mobile 改底部居中，避免遮挡顶部 nav */
        #toast { top: auto !important; bottom: 80px; }
      }
    `;
    const s = document.createElement('style');
    s.id = 'liszt-global-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // 报名截止公告（插入 header 之后）
  function injectDeadlineBanner() {
    if (document.querySelector('.deadline-banner')) return;
    const dl = LisztData.SEED_COMPETITION.deadline;
    if (!dl) return;
    const deadline = new Date(dl);
    const remaining = remainingMs(deadline);
    const banner = document.createElement('div');
    banner.className = 'deadline-banner';
    banner.innerHTML = `
      📅 报名截止：${formatDate(deadline)}
      <span class="pill ${remaining <= 0 ? 'expired' : ''}">${formatRemainingShort(remaining)}</span>
    `;
    // 插入到 header 之后
    const header = document.querySelector('header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else if (header) {
      header.parentNode.appendChild(banner);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  // 右上角倒计时（仅选手）
  function injectCountdown() {
    if (document.getElementById('countdownCard')) return;
    const dl = LisztData.SEED_COMPETITION.deadline;
    if (!dl) return;
    const deadline = new Date(dl);
    const card = document.createElement('a');
    card.id = 'countdownCard';
    card.className = 'countdown-card';
    card.href = 'registration.html';
    card.title = '点击查看报名详情';
    card.innerHTML = `
      <span class="icon">⏳</span>
      <div>
        <div class="label">距报名截止</div>
        <div class="nums" id="countdownNums">计算中…</div>
      </div>
    `;
    document.body.appendChild(card);
    const tick = () => {
      const r = remainingMs(deadline);
      const nums = document.getElementById('countdownNums');
      if (!nums) return;
      if (r <= 0) {
        nums.innerHTML = '<small>已截止</small>';
        card.classList.add('expired');
        return;
      }
      const d = Math.floor(r / 86400000);
      const h = Math.floor((r % 86400000) / 3600000);
      const m = Math.floor((r % 3600000) / 60000);
      const s = Math.floor((r % 60000) / 1000);
      nums.innerHTML = `${d}<small>天</small> ${pad2(h)}<small>:</small>${pad2(m)}<small>:</small>${pad2(s)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function remainingMs(deadline) { return deadline.getTime() - Date.now(); }
  function formatDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function formatRemainingShort(ms) {
    if (ms <= 0) return '已截止';
    const d = Math.floor(ms / 86400000);
    return `还有 ${d} 天`;
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  global.LisztUtil = Util;
  global.LisztVideoLoader = VideoLoader;
  global.LisztModal = Modal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window);