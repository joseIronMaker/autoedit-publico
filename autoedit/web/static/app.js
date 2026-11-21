const { createApp } = Vue;

createApp({
  data() {
    return {
      // videos
      videos: [],
      selected: null,
      detail: null,
      wantClips: true,
      edlDirty: false,
      uploading: false,
      // generación individual
      tema: '',
      genModo: 'corto',   // 'corto' = crecimiento (~35s) · 'largo' = monetización (~90s)
      genJob: null,
      // series
      series: [],
      seriesJob: null,
      selectedSerie: null,
      serieTitulo: '',
      serieN: 6,
      serieModo: 'corto',
      serieAuto: true,
      creatingSerie: false,
      // temas del día
      topics: [],
      topicsAgent: { enabled: false, hour: 8 },
      topicsJob: null,
      // ui
      tab: {},
      costs: null,
      _timer: null,
    };
  },
  computed: {
    job() {
      return this.detail ? this.detail.job : null;
    },
    busy() {
      return !!(this.job && this.job.step !== 'listo' && this.job.step !== 'error');
    },
    genBusy() {
      return !!(this.genJob && this.genJob.step !== 'listo' && this.genJob.step !== 'error');
    },
    seriesBusy() {
      return !!(this.seriesJob && this.seriesJob.step !== 'listo' && this.seriesJob.step !== 'error');
    },
    topicsBusy() {
      return !!(this.topicsJob && this.topicsJob.step !== 'listo' && this.topicsJob.step !== 'error');
    },
    serieView() {
      return this.series.find((s) => s.slug === this.selectedSerie) || null;
    },
  },
  methods: {
    async api(path, opts, silent = false) {
      const r = await fetch('/api' + path, opts);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        if (!silent) alert(body.detail || 'Error ' + r.status);
        throw new Error(body.detail || r.status);
      }
      return r.json();
    },

    // ---------- carga / polling ----------
    async loadAll(silent = false) {
      const data = await this.api('/videos', undefined, silent);
      this.videos = data.videos;
      this.genJob = data.gen;
      const s = await this.api('/series', undefined, silent);
      this.series = s.series;
      this.seriesJob = s.job;
      const t = await this.api('/topics', undefined, silent);
      this.topics = t.today;
      this.topicsAgent = t.agent;
      this.topicsJob = t.job;
      this.costs = await this.api('/costs', undefined, true).catch(() => this.costs);
    },
    async refresh() {
      // el polling es silencioso: un error transitorio no debe abrir popups
      await this.loadAll(true).catch(() => {});
      if (this.selected) {
        const sel = this.selected;
        const wasBusy = this.busy;
        const d = await this.api('/video/' + sel, undefined, true).catch(() => null);
        if (!d || this.selected !== sel) return; // respuesta obsoleta: no pisar la vista
        if (!this.edlDirty || wasBusy) this.detail = d;
        else if (d.job) this.detail.job = d.job;
      }
    },

    // ---------- selección ----------
    async select(stem) {
      this.selected = stem;
      this.selectedSerie = null;
      this.edlDirty = false;
      this.detail = await this.api('/video/' + stem);
    },
    selectSerie(slug) {
      this.selectedSerie = slug;
      this.selected = null;
      this.detail = null;
    },
    doneCount(s) {
      return s.items.filter((i) => i.status === 'listo').length;
    },

    // ---------- crear ----------
    async generateVideo() {
      await this.api('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: this.tema, modo: this.genModo }),
      });
      this.genJob = { step: 'guion', detail: 'Gemini escribe el guion' };
    },
    async uploadVideo(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.uploading = true;
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await this.api('/upload', { method: 'POST', body: form });
        await this.loadAll();
        await this.select(res.stem);
      } finally {
        this.uploading = false;
        e.target.value = '';
      }
    },

    // ---------- pipeline de un video ----------
    async analyze() {
      await this.api('/analyze/' + this.selected, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips: this.wantClips }),
      });
      this.refresh();
    },
    async render() {
      if (this.edlDirty) await this.saveEdl();
      await this.api('/render/' + this.selected, { method: 'POST' });
      this.refresh();
    },
    toggleCut(i) {
      const c = this.detail.edl.cuts[i];
      c.disabled = !c.disabled;
      this.edlDirty = true;
    },
    async saveEdl() {
      await this.api('/edl/' + this.selected, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuts: this.detail.edl.cuts }),
      });
      this.edlDirty = false;
    },

    // ---------- series ----------
    async createSeries() {
      this.creatingSerie = true;
      try {
        const s = await this.api('/series', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: this.serieTitulo, n: this.serieN, auto: this.serieAuto, modo: this.serieModo }),
        });
        this.serieTitulo = '';
        if (s.auto_started) this.seriesJob = { step: 'arrancando', detail: s.titulo };
        await this.loadAll();
        this.selectSerie(s.slug);
      } finally {
        this.creatingSerie = false;
      }
    },
    async startSeries(slug) {
      await this.api('/series/' + slug + '/start', { method: 'POST' });
      this.seriesJob = { step: 'arrancando', detail: '' };
    },
    async stopSeries(slug) {
      await this.api('/series/' + slug + '/stop', { method: 'POST' });
    },
    async deleteSerie(s) {
      if (!confirm(`🗑 Eliminar la serie completa «${s.titulo}»?\n` +
                   'Se borran sus videos, copys y temario. No se puede deshacer.')) return;
      const r = await this.api('/series/' + s.slug, { method: 'DELETE' });
      this.selectedSerie = null;
      await this.loadAll();
      alert(`Serie eliminada (${r.freed_mb} MB liberados)`);
    },

    // ---------- limpieza / borrado de videos ----------
    serieJunk(s) {
      return s.items.reduce((sum, it) => sum + (it.junk_mb || 0), 0);
    },
    async cleanStem(stem, mb) {
      if (!confirm(`Borrar el material de origen de "${stem}" (${mb} MB)?\n` +
                   'Se conservan el video final y los copys. No se puede deshacer.')) return;
      const r = await this.api('/clean/' + stem, { method: 'POST' });
      await this.refresh();
      alert(`Liberados ${r.freed_mb} MB`);
    },
    async cleanSerie(s) {
      const total = this.serieJunk(s).toFixed(0);
      if (!confirm(`Borrar el material de origen de toda la serie (${total} MB)?\n` +
                   'Se conservan los videos finales y los copys. No se puede deshacer.')) return;
      let freed = 0;
      for (const it of s.items) {
        if (it.video && it.final && it.junk_mb > 0) {
          const r = await this.api('/clean/' + it.video, { method: 'POST' });
          freed += r.freed_mb;
        }
      }
      await this.loadAll();
      alert(`Liberados ${freed.toFixed(0)} MB`);
    },
    async deleteVideo(d) {
      if (!confirm(`🗑 Eliminar "${d.file}" con TODO su material?\n` +
                   '(original, finales, clips, análisis y copys). No se puede deshacer.')) return;
      const r = await this.api('/video/' + d.stem, { method: 'DELETE' });
      this.selected = null;
      this.detail = null;
      await this.loadAll();
      alert(`Video eliminado (${r.freed_mb} MB liberados)`);
    },

    // ---------- temas ----------
    async refreshTopics() {
      await this.api('/topics/refresh', { method: 'POST' });
      this.topicsJob = { step: 'buscando', detail: '' };
    },
    async toggleAgent() {
      this.topicsAgent = await this.api('/topics/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !this.topicsAgent.enabled }),
      });
    },
    copyText(text) {
      navigator.clipboard.writeText(text || '');
    },
  },
  mounted() {
    this.loadAll();
    this._timer = setInterval(() => this.refresh(), 2500);
  },
}).mount('#app');
