/* ============================================================
   auth.js — 登录 / 注册 / 会话
   ============================================================ */
(function (global) {
  'use strict';

  const Auth = {
    // 当前用户（内存缓存）
    current: null,

    init() {
      const session = LisztStore.getSession();
      if (session) {
        const user = LisztStore.findUser(u => u.id === session.userId);
        if (user) {
          this.current = user;
        }
      }
      this.renderNav();
    },

    login(username, password) {
      const user = LisztStore.findUser(u => u.username === username && u.password === password);
      if (!user) return { ok: false, msg: '账号或密码错误' };
      this.current = user;
      LisztStore.setSession({ userId: user.id, loginAt: Date.now() });
      this.renderNav();
      return { ok: true, user };
    },

    logout() {
      this.current = null;
      LisztStore.clearSession();
      this.renderNav();
      window.location.href = 'index.html';
    },

    register(payload) {
      if (!payload.username || !payload.password) return { ok: false, msg: '请输入账号和密码' };
      if (LisztStore.findUser(u => u.username === payload.username)) {
        return { ok: false, msg: '该账号已存在' };
      }
      // 身份证号唯一性校验（同一身份证不可重复注册）
      if (payload.idCardHash && LisztStore.findUser(u => u.idCardHash === payload.idCardHash)) {
        return { ok: false, msg: '该身份证号已注册，请直接登录或联系组委会' };
      }
      const user = {
        id: LisztStore.uid('u'),
        role: 'contestant',
        avatarColor: payload.avatarColor || 'linear-gradient(135deg, #c8a45c, #8a6a2c)',
        avatarUrl: payload.avatarUrl || '',
        createdAt: new Date().toISOString(),
        ...payload
      };
      const users = LisztStore.getUsers();
      users.push(user);
      LisztStore.setUsers(users);
      this.current = user;
      LisztStore.setSession({ userId: user.id, loginAt: Date.now() });
      this.renderNav();
      return { ok: true, user };
    },

    require(role) {
      if (!this.current) {
        window.location.href = 'login.html?next=' + encodeURIComponent(location.pathname);
        return false;
      }
      if (role && this.current.role !== role) {
        alert('您没有访问该页面的权限');
        return false;
      }
      return true;
    },

    isRole(role) { return this.current && this.current.role === role; },

    renderNav() {
      const u = this.current;
      const nav = document.querySelector('.nav-actions');
      if (!nav) return;
      if (u) {
        const initials = (u.name || u.username).trim().slice(0, 1);
        // 登录后头像链接到对应角色的核心页面
        const dashHref = u.role === 'judge' ? 'review.html'
                       : u.role === 'admin'  ? 'admin.html'
                                             : 'result.html';
        // 选手看到「上传/成绩」/评委看到「点评」/组委会看到「后台」
        const extra = u.role === 'contestant' ? `
          <a class="btn btn-ghost btn-sm" href="upload.html">📤 上传作品</a>
        ` : u.role === 'judge' ? `
          <a class="btn btn-ghost btn-sm" href="judge-panel.html">评审中心</a>
        ` : '';
        nav.innerHTML = `
          <a class="user-chip" href="${dashHref}">
            <span class="avatar${u.avatarUrl ? ' has-img' : ''}" style="background:${LisztUtil.bg(u, 'linear-gradient(135deg, #c8a45c, #8a6a2c)')};">${u.avatarUrl ? `<img src="${LisztUtil.escape(u.avatarUrl)}" alt="头像">` : LisztUtil.escape(initials)}</span>
            <span>${u.name || u.username} <span class="muted" style="opacity:.6;font-size:.8rem;">· ${this._roleLabel(u.role)}</span></span>
          </a>
          ${extra}
          <button class="btn btn-ghost btn-sm" id="btnLogout">退出</button>
        `;
        const btn = document.getElementById('btnLogout');
        if (btn) btn.addEventListener('click', () => this.logout());
      } else {
        nav.innerHTML = `
          <a class="btn btn-ghost btn-sm" href="login.html">登录</a>
          <a class="btn btn-primary btn-sm" href="register.html">报名注册</a>
        `;
      }
    },

    _roleLabel(role) {
      return role === 'admin' ? '组委会' : role === 'judge' ? '评委' : '选手';
    }
  };

  global.LisztAuth = Auth;

  // 关键：同步恢复会话。页面级脚本（upload.js/review.js/result.js 等）
  // 在 DOMContentLoaded 之前立即执行并读取 LisztAuth.current，
  // 因此必须在此处（脚本加载时）就完成 seed + init，
  // 而不能等到 main.js 的 DOMContentLoaded 回调。
  try { LisztStore.seed(); } catch (e) { console.error('seed error', e); }
  Auth.init();
})(window);