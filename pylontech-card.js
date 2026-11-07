/*! Pylontech Card – Pylontech battery stack: SoC bar, optional ESS minimum-SoC slider, every module with
 *  SoC / voltage / current / cell min-max / temperature, and the BMS values as tiles.
 *  type: custom:pylontech-card     MIT License
 */
(() => {
  const VERSION = '1.0.0';
  const L = {
    de: {
      modules: 'Module', soc: 'SOC', voltage: 'SPANNUNG', current: 'STROM', cell: 'ZELLE MIN / MAX', temp: 'TEMP.', power: 'LEISTUNG', temperature: 'TEMPERATUR', soh: 'GESUNDHEIT (SOH)', capacity: 'KAPAZITÄT',
      cellV: 'ZELLSPANNUNG MIN / MAX', cellT: 'ZELLTEMP. MIN / MAX', online: 'MODULE ONLINE / OFFLINE', maxChg: 'MAX. LADESTROM', maxDis: 'MAX. ENTLADESTROM', ttg: 'RESTLAUFZEIT',
      limit: 'Limit', qLimit: (a, b) => 'Mindest-SoC (ESS) von ' + a + ' % auf ' + b + ' % ändern?', confirm: 'Bitte bestätigen', cancel: 'Abbrechen', ok: 'OK',
      states: { CHARGING: 'Lädt', DISCHARGING: 'Entlädt', IDLE: 'Ruhe', UNAVAILABLE: 'offline', UNKNOWN: '--' },
    },
    en: {
      modules: 'modules', soc: 'SOC', voltage: 'VOLTAGE', current: 'CURRENT', cell: 'CELL MIN / MAX', temp: 'TEMP.', power: 'POWER', temperature: 'TEMPERATURE', soh: 'HEALTH (SOH)', capacity: 'CAPACITY',
      cellV: 'CELL VOLTAGE MIN / MAX', cellT: 'CELL TEMP. MIN / MAX', online: 'MODULES ONLINE / OFFLINE', maxChg: 'MAX. CHARGE CURRENT', maxDis: 'MAX. DISCHARGE CURRENT', ttg: 'TIME TO GO',
      limit: 'Limit', qLimit: (a, b) => 'Change minimum SoC (ESS) from ' + a + ' % to ' + b + ' %?', confirm: 'Please confirm', cancel: 'Cancel', ok: 'OK',
      states: { CHARGING: 'Charging', DISCHARGING: 'Discharging', IDLE: 'Idle', UNAVAILABLE: 'offline', UNKNOWN: '--' },
    },
  };
  const esc = (x) => String(x === undefined || x === null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  const T = (x, y, s, size, col, a, w) => `<text x='${x}' y='${y}' font-size='${size}' fill='${col || '#FFFFFF'}' text-anchor='${a || 'start'}' dominant-baseline='hanging' font-weight='${w || 400}'>${s}</text>`;
  const R = (x, y, w, h, r, fill, stroke, sw) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${r}' fill='${fill}' stroke='${stroke || 'none'}' stroke-width='${sw || 0}'/>`;
  const C = (cx, cy, r, fill) => `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}'/>`;
  const PILL = (xr, y, txt, bg, fg) => { const w = String(txt).length * 7.6 + 22; return R(xr - w, y, w, 24, 12, bg) + T(xr - w / 2, y + 6, esc(txt), 12, fg, 'middle', 700); };
  const SVG = (w, h, body) => `<svg viewBox='0 0 ${w} ${h}' width='100%' style='display:block' font-family='Roboto, Arial, sans-serif' xmlns='http://www.w3.org/2000/svg'><rect x='0' y='0' width='${w}' height='${h}' fill='#0F1A26'/>${body}</svg>`;
  const TAP = (x, y, w, h, e) => e ? `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='6' fill='#FFFFFF' fill-opacity='0' data-act='info' data-e='${esc(e)}' style='cursor:pointer'/>` : '';
  const MC = [0.085, 0.20, 0.37, 0.52, 0.78];
  const MODULE = (x, y, w, n, ok, vals, fs) => { let b = R(x, y, w, 28, 3, '#F2F4F6', '#C9D0D6', 1) + R(x + 4, y + 7, 18, 14, 2, '#20262D') + T(x + 13, y + 9, String(n), 9, '#FFFFFF', 'middle', 700); vals.forEach((txt, k) => { b += T(x + w * MC[k], y + 19 - fs, txt, fs, k === 0 ? '#20262D' : '#3A4A5A', 'start', k === 0 ? 700 : 600); }); return b + C(x + w - 12, y + 14, 4, ok ? '#3CCF5A' : '#C9D0D6'); };
  const DEFAULT_KEYS = { soc: 'state_of_charge', voltage: 'voltage', current: 'current', cell_min: 'zelle_min_spannung', cell_max: 'zelle_max_spannung', temperature: 'temperatur' };
  const SINGLE = ['soc', 'power', 'voltage', 'current', 'temperature', 'soh', 'capacity', 'cell_voltage_min', 'cell_voltage_max', 'cell_temp_min', 'cell_temp_max', 'modules_online', 'modules_offline', 'max_charge_current', 'max_discharge_current', 'battery_state', 'time_to_go'];

  class PylontechCard extends HTMLElement {
    static getStubConfig() { return { title: 'Pylontech', soc: '', module_count: 0 }; }
    static getConfigElement() { return document.createElement('pylontech-card-editor'); }
    setConfig(c) {
      if (!c) throw new Error('Invalid configuration');
      this._c = Object.assign({ title: 'Pylontech', layout: 'auto', language: 'auto', module_count: 0, module_pattern: '' }, c);
      this._keys = Object.assign({}, DEFAULT_KEYS, c.module_keys || {});
      this._key = '';
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.addEventListener('click', (ev) => { const el = ev.composedPath().find((x) => x && x.dataset && x.dataset.act); if (!el) return; ev.stopPropagation(); this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: el.dataset.e } })); });
        this.shadowRoot.addEventListener('input', (ev) => this._slide(ev, false));
        this.shadowRoot.addEventListener('change', (ev) => this._slide(ev, true));
        this.shadowRoot.addEventListener('pointerdown', (ev) => { if (ev.target && ev.target.type === 'range') this._drag = true; });
      }
      if (this._h) this._render();
    }
    connectedCallback() { if (!this._ro && window.ResizeObserver) { this._ro = new ResizeObserver((en) => { const w = en[0].contentRect.width; if (!w) return; const m = w < 560; if (m !== this._mobW) { this._mobW = m; this._render(); } }); this._ro.observe(this); } }
    disconnectedCallback() { if (this._ro) { this._ro.disconnect(); this._ro = null; } }
    getGridOptions() { return { columns: 'full', rows: 'auto' }; }
    getCardSize() { return 9; }
    get _t() { const l = this._c.language && this._c.language !== 'auto' ? this._c.language : ((this._h && this._h.locale && this._h.locale.language) || 'en'); return L[String(l).slice(0, 2)] || L.en; }
    get _mob() { if (this._c.layout === 'mobile') return true; if (this._c.layout === 'desktop') return false; return this._mobW !== undefined ? this._mobW : window.innerWidth < 768; }
    _mod(n, k) { const p = this._c.module_pattern; if (!p || !this._keys[k]) return ''; return p.replace('{n}', n).replace('{key}', this._keys[k]); }
    _ids() { const l = SINGLE.map((k) => this._c[k]).filter(Boolean); if (this._c.min_soc) l.push(this._c.min_soc); for (let n = 1; n <= this._c.module_count; n++) Object.keys(DEFAULT_KEYS).forEach((k) => { const e = this._mod(n, k); if (e) l.push(e); }); return l; }
    set hass(h) { this._h = h; const k = this._ids().map((e) => { const s = h.states[e]; return s ? s.state + '@' + s.last_updated : '-'; }).join('|'); if (k === this._key) return; this._key = k; if (this._drag) { this._pending = true; return; } this._render(); }
    num(e) { const s = e && this._h.states[e]; return s ? parseFloat(s.state) : NaN; }
    st(e) { const s = e && this._h.states[e]; return s ? String(s.state) : 'unknown'; }
    _dec(n, d) { const s = n.toFixed(d); return this._t === L.de ? s.replace('.', ',') : s; }
    f(e, d, u) { const n = this.num(e); return (isNaN(n) ? '--' : this._dec(n, d)) + (u || ''); }
    W(n) { return isNaN(n) ? '-- W' : (Math.abs(n) >= 1000 ? this._dec(n / 1000, 2) + ' kW' : Math.round(n) + ' W'); }
    _render() {
      if (!this._h || !this._c || !this.shadowRoot) return;
      let body; try { body = this._draw(); } catch (x) { body = `<div style='padding:16px;color:#FF9EA1'>${esc(x.message)}</div>`; }
      this.shadowRoot.innerHTML = `<style>:host{display:block}.k{position:relative;background:#0F1A26;border:1px solid #1F3247;border-radius:14px;overflow:hidden;font-family:Roboto,Arial,sans-serif;line-height:0}.sl{position:absolute;border-radius:999px;background:#18293B;border:1px solid #24384E;box-sizing:border-box;overflow:hidden;container-type:size;line-height:1}.sl .fl{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:#387DC5}.sl .lb{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:700;font-size:55cqh;pointer-events:none}.sl input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;touch-action:none}</style><div class='k'>${body}</div>`;
    }
    _slider(x, y, w, h, W, H) {
      const e = this._c.min_soc; const s = e && this._h.states[e]; if (!s) return '';
      const a = s.attributes || {}; const mn = a.min != null ? Number(a.min) : 0, mx = a.max != null ? Number(a.max) : 100, sp = a.step != null ? Number(a.step) : 5;
      const cur = parseFloat(s.state); const v0 = isNaN(cur) ? mn : cur; this._sl = { mn, mx, e };
      return `<div class='sl' style='left:${x / W * 100}%;top:${y / H * 100}%;width:${w / W * 100}%;height:${h / H * 100}%'><div class='fl' style='width:${(v0 - mn) / (mx - mn) * 100}%'></div><div class='lb'>${this._t.limit} ${isNaN(cur) ? '--' : Math.round(cur)} %</div><input type='range' min='${mn}' max='${mx}' step='${sp}' value='${v0}' data-cur='${v0}' aria-label='Min SoC'></div>`;
    }
    _slide(ev, done) {
      const el = ev.target; if (!el || el.type !== 'range' || !this._sl) return;
      const { mn, mx, e } = this._sl; const v = Number(el.value), c = Number(el.dataset.cur); const w = el.parentNode;
      const show = (x) => { w.querySelector('.fl').style.width = ((x - mn) / (mx - mn) * 100) + '%'; w.querySelector('.lb').textContent = this._t.limit + ' ' + x + ' %'; };
      show(v); if (!done) return;
      const fin = () => { this._drag = false; if (this._pending) { this._pending = false; this._render(); } };
      if (v === c) { fin(); return; }
      this._ask(this._t.qLimit(c, v)).then((ok) => { if (ok) { this._h.callService(e.split('.')[0], 'set_value', { entity_id: e, value: v }); el.dataset.cur = String(v); } else { el.value = String(c); show(c); } fin(); });
    }
    _ask(msg) {
      const t = this._t;
      return new Promise((res) => {
        const o = document.createElement('div');
        o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-family:Roboto,Arial,sans-serif';
        const bs = 'height:42px;padding:0 20px;border-radius:10px;font:700 15px Roboto,Arial,sans-serif;cursor:pointer;';
        o.innerHTML = `<div style="background:#18293B;border:1px solid #2B4560;border-radius:14px;padding:18px;width:calc(100% - 48px);max-width:340px;color:#FFFFFF"><div style="font-size:17px;font-weight:700;margin-bottom:8px">${esc(t.confirm)}</div><div style="font-size:15px;color:#C9D6E3;line-height:1.4">${esc(msg)}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button data-a="0" style="${bs}background:#0F1A26;color:#FFFFFF;border:1px solid #2B4560">${esc(t.cancel)}</button><button data-a="1" style="${bs}background:#387DC5;color:#FFFFFF;border:none">${esc(t.ok)}</button></div></div>`;
        const fin = (ok) => { o.remove(); res(ok); };
        o.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) fin(b.dataset.a === '1'); else if (e.target === o) fin(false); });
        document.body.appendChild(o);
      });
    }
    _draw() {
      const c = this._c, t = this._t, mob = this._mob;
      const soc = this.num(c.soc); const socCol = isNaN(soc) ? '#FFFFFF' : (soc < 20 ? '#E5484D' : (soc < 50 ? '#F7AB3E' : '#5DBE6E'));
      const raw = this.st(c.battery_state), RU = raw.toUpperCase();
      const ttg = this.num(c.time_to_go); const ttgTxt = !isNaN(ttg) && ttg > 0 ? Math.floor(ttg / 3600) + ' h ' + Math.round((ttg % 3600) / 60) + ' min' : '--';
      const N = Math.max(0, Math.min(16, Number(c.module_count) || 0));
      const W = mob ? 400 : 960; let b = '';
      const cnt = c.modules_online ? this.f(c.modules_online, 0, '') : (N || '');
      b += T(mob ? 16 : 20, 14, esc(c.title) + (cnt !== '' ? ' · ' + cnt + ' ' + t.modules : ''), mob ? 17 : 18, '#FFFFFF', 'start', 700);
      if (c.battery_state) b += PILL(W - (mob ? 16 : 20), 12, t.states[RU] || raw, RU === 'CHARGING' ? '#5DBE6E' : (RU === 'DISCHARGING' ? '#F7AB3E' : '#2B3B4C'), RU === 'IDLE' ? '#9FB3C8' : '#0F1A26') + TAP(W - 140, 10, 120, 28, c.battery_state);
      const mods = [];
      for (let n = 1; n <= N; n++) {
        const zl = this.num(this._mod(n, 'cell_min')), zh = this.num(this._mod(n, 'cell_max'));
        const zT = isNaN(zl) || isNaN(zh) ? '--' : this._dec(zl, 3) + '/' + this._dec(zh, 3) + ' V';
        mods.push([!isNaN(this.num(this._mod(n, 'soc'))), [this.f(this._mod(n, 'soc'), 0, ' %'), this.f(this._mod(n, 'voltage'), 2, ' V'), this.f(this._mod(n, 'current'), 1, ' A'), zT, this.f(this._mod(n, 'temperature'), 1, ' °C')], n]);
      }
      const hdr = (x, y, w, fs) => { [t.soc, t.voltage, t.current, t.cell, t.temp].forEach((k, j) => { b += T(x + w * MC[j], y, k, fs, '#8AA0B6', 'start', 600); }); };
      const mtap = (x, y, w, n) => { const ks = ['soc', 'voltage', 'current', 'cell_min', 'temperature']; ks.forEach((k, j) => { const x0 = x + w * MC[j] - 4, x1 = j < 4 ? x + w * MC[j + 1] - 4 : x + w - 22; b += TAP(x0, y, x1 - x0, 28, this._mod(n, k)); }); };
      const pair = (a, z, d, u) => (a ? this.f(a, d, '') : '--') + ' / ' + (z ? this.f(z, d, u) : '--' + u);
      const tiles = [[t.power, this.W(this.num(c.power)), c.power], [t.voltage, this.f(c.voltage, 2, ' V'), c.voltage], [t.current, this.f(c.current, 1, ' A'), c.current], [t.temperature, this.f(c.temperature, 1, ' °C'), c.temperature], [t.soh, this.f(c.soh, 0, ' %'), c.soh], [t.capacity, this.f(c.capacity, 0, ' Ah'), c.capacity],
        [t.cellV, pair(c.cell_voltage_min, c.cell_voltage_max, 3, ' V'), c.cell_voltage_min || c.cell_voltage_max], [t.cellT, pair(c.cell_temp_min, c.cell_temp_max, 1, ' °C'), c.cell_temp_min || c.cell_temp_max], [t.online, (c.modules_online ? this.f(c.modules_online, 0, '') : '--') + ' / ' + (c.modules_offline ? this.f(c.modules_offline, 0, '') : '--'), c.modules_online || c.modules_offline],
        [t.maxChg, this.f(c.max_charge_current, 0, ' A'), c.max_charge_current], [t.maxDis, this.f(c.max_discharge_current, 0, ' A'), c.max_discharge_current], [t.ttg, ttgTxt, c.time_to_go]].filter((x) => x[2]);
      const bar = (x, y, w, h) => { b += R(x, y, w, h, h / 2, '#18293B', '#24384E', 1); if (!isNaN(soc)) b += R(x, y, Math.max(h, w * soc / 100), h, h / 2, socCol); b += T(x + w / 2, y + h / 2 - 11, isNaN(soc) ? '-- %' : Math.round(soc) + ' %', 22, '#FFFFFF', 'middle', 700) + TAP(x, y, w, h, c.soc); };
      const hasLim = !!(c.min_soc && this._h.states[c.min_soc]);
      if (!mob) {
        const left = N > 0;
        const tx = left ? 350 : 20, tw = left ? 590 : 920, cols = left ? 3 : 4, cw = (tw - (cols - 1) * 10) / cols;
        if (left) { hdr(20, 38, 300, 8); mods.forEach(([ok, vals, n], i) => { b += MODULE(20, 52 + i * 32, 300, n, ok, vals, 10); mtap(20, 52 + i * 32, 300, n); }); }
        bar(tx, 50, tw, 40);
        const ty = hasLim ? 156 : 104;
        tiles.forEach(([k, val, e], i) => { const x = tx + (i % cols) * (cw + 10), y = ty + Math.floor(i / cols) * 66; b += R(x, y, cw, 58, 10, '#18293B', '#24384E', 1) + T(x + 12, y + 9, k, 11, '#8AA0B6', 'start', 600) + T(x + 12, y + 27, val, 20, '#FFFFFF', 'start', 700) + TAP(x, y, cw, 58, e); });
        const H = Math.max(left ? 52 + N * 32 + 16 : 0, ty + Math.ceil(tiles.length / cols) * 66 + 8, 160);
        return SVG(960, H, b) + (hasLim ? this._slider(tx, 102, tw, 40, 960, H) : '');
      }
      bar(16, 44, 368, 38);
      let y = hasLim ? 140 : 96;
      if (N) { hdr(16, y, 368, 9); mods.forEach(([ok, vals, n], i) => { b += MODULE(16, y + 12 + i * 31, 368, n, ok, vals, 11); mtap(16, y + 12 + i * 31, 368, n); }); y += 12 + N * 31 + 10; }
      tiles.forEach(([k, val, e], i) => { const x = 16 + (i % 2) * 192, yy = y + Math.floor(i / 2) * 60; b += R(x, yy, 176, 52, 10, '#18293B', '#24384E', 1) + T(x + 12, yy + 8, k, 10, '#8AA0B6', 'start', 600) + T(x + 12, yy + 24, val, 17, '#FFFFFF', 'start', 700) + TAP(x, yy, 176, 52, e); });
      const H = y + Math.ceil(tiles.length / 2) * 60 + 4;
      return SVG(400, H, b) + (hasLim ? this._slider(16, 92, 368, 38, 400, H) : '');
    }
  }

  const LABELS = { title: 'Title', soc: 'SoC', power: 'Power', voltage: 'Voltage', current: 'Current', temperature: 'Temperature', soh: 'State of health', capacity: 'Capacity (Ah)', cell_voltage_min: 'Cell voltage min', cell_voltage_max: 'Cell voltage max', cell_temp_min: 'Cell temp min', cell_temp_max: 'Cell temp max', modules_online: 'Modules online', modules_offline: 'Modules offline', max_charge_current: 'Max. charge current', max_discharge_current: 'Max. discharge current', battery_state: 'Battery state (charging/discharging/idle)', time_to_go: 'Time to go (s)', min_soc: 'Minimum SoC number (ESS, optional slider)', module_count: 'Number of modules', module_pattern: 'Module entity pattern, e.g. sensor.pylontech_battery{n}_{key}', layout: 'Layout', language: 'Language' };
  class PylontechEditor extends HTMLElement {
    setConfig(c) { this._c = Object.assign({}, c); this._draw(); }
    set hass(h) { this._h = h; this._draw(); }
    _draw() {
      if (!this._h || !this._c) return;
      if (!this._f) { this._f = document.createElement('ha-form'); this._f.computeLabel = (s) => LABELS[s.name] || s.name; this._f.addEventListener('value-changed', (ev) => { this._c = Object.assign({}, this._c, ev.detail.value); this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._c }, bubbles: true, composed: true })); }); this.appendChild(this._f); }
      this._f.hass = this._h; this._f.data = this._c;
      this._f.schema = [{ name: 'title', selector: { text: {} } }].concat(SINGLE.map((n) => ({ name: n, selector: { entity: { domain: 'sensor' } } })), [{ name: 'min_soc', selector: { entity: { domain: ['number', 'input_number'] } } }, { name: 'module_count', selector: { number: { min: 0, max: 16, mode: 'box' } } }, { name: 'module_pattern', selector: { text: {} } }, { name: 'layout', selector: { select: { mode: 'dropdown', options: ['auto', 'desktop', 'mobile'] } } }, { name: 'language', selector: { select: { mode: 'dropdown', options: ['auto', 'de', 'en'] } } }]);
    }
  }
  if (!customElements.get('pylontech-card')) customElements.define('pylontech-card', PylontechCard);
  if (!customElements.get('pylontech-card-editor')) customElements.define('pylontech-card-editor', PylontechEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.find((x) => x.type === 'pylontech-card')) window.customCards.push({ type: 'pylontech-card', name: 'Pylontech Card', description: 'Pylontech battery stack with modules and BMS values', documentationURL: 'https://github.com/ossilampe/pylontech-card' });
  console.info('%c PYLONTECH-CARD %c ' + VERSION, 'background:#5DBE6E;color:#0F1A26;font-weight:700', '');
})();
