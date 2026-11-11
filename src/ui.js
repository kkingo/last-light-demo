export const MEMORIES = [
  { title: '第一束光', text: '在一切尚未拥有名字之前，光已经出发。穿过亿万年的寂静，只为落进某个人的眼睛。' },
  { title: '一场雨', text: '某个平凡的午后，雨落在窗沿。你什么也没有做，只是安静地听着。那一刻，永恒很小。' },
  { title: '未寄出的信', text: '那些没有说出口的话，没有消失。它们成为星际间极轻的尘埃，等待另一颗心经过。' },
  { title: '蓝色故乡', text: '那里曾有海，有夏天，有人喊你的名字。即使所有星图都被擦去，我们仍记得回家的方向。' },
  { title: '最后一次心跳', text: '宇宙即将安静下来。可还有一颗心，把最后的回声留给了未来：愿你仍然，热爱这个世界。' },
];

export function initUI(callbacks = {}) {
  const $ = (id) => document.getElementById(id);
  const state = { time: 0, chapter: 0, collected: [], paused: false, audio: false, quality: 'high', explored: false, rebirth: false };
  let toastTimer;
  let memoryTimer;
  const chapters = ['余晖', '静寂', '新生'];
  const archiveRows = MEMORIES.map((memory, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'archive-index';
    number.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('div');
    const title = document.createElement('h3');
    const text = document.createElement('p');
    content.append(title, text);
    row.append(number, content);
    $('archive-memories').append(row);
    return { row, title, text };
  });

  const invoke = (key, ...args) => callbacks[key]?.(...args);
  const openDialog = (id) => {
    const dialog = $(id);
    if (dialog.open) return;
    document.querySelectorAll('dialog[open]').forEach((open) => open.close());
    dialog.showModal();
  };
  const toast = (message) => {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3800);
  };

  $('archive-button').addEventListener('click', () => openDialog('archive-dialog'));
  $('help-button').addEventListener('click', () => openDialog('help-dialog'));
  $('explore-button').addEventListener('click', () => invoke('onExplore'));
  $('audio-button').addEventListener('click', () => invoke('onAudio'));
  $('pause-button').addEventListener('click', () => invoke('onPause'));
  $('reset-button').addEventListener('click', () => invoke('onReset'));
  $('brand-reset').addEventListener('click', (event) => { event.preventDefault(); invoke('onReset'); });
  $('quality-button').addEventListener('click', () => invoke('onQuality'));
  $('rebirth-button').addEventListener('click', () => { $('memory-reveal').hidden = true; invoke('onRebirth'); });
  $('time-slider').addEventListener('input', (event) => invoke('onTime', Number(event.target.value) / 1000));
  document.querySelectorAll('[data-era]').forEach((button) => button.addEventListener('click', () => invoke('onTime', Number(button.dataset.era))));
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  }));
  $('memory-close').addEventListener('click', () => { $('memory-reveal').hidden = true; clearTimeout(memoryTimer); });
  $('fullscreen-button').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('当前浏览器暂不支持全屏，请使用浏览器的全屏功能。');
    } catch { toast('未能进入全屏，请使用浏览器的全屏功能。'); }
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '进入全屏');
    $('fullscreen-button').title = document.fullscreenElement ? '退出全屏' : '全屏';
  });
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, a, [contenteditable], dialog') || document.querySelector('dialog[open]')) return;
    if (event.code === 'Space') { event.preventDefault(); invoke('onPause'); }
    else if (event.code === 'KeyR') invoke('onReset');
    else if (event.code === 'KeyM') invoke('onAudio');
    else if (event.code === 'KeyH') openDialog('help-dialog');
    else if (event.code === 'Escape') $('memory-reveal').hidden = true;
  });

  function update(patch = {}) {
    Object.assign(state, patch);
    if ('time' in patch) {
      const time = Math.max(0, Math.min(1, Number(state.time) || 0));
      $('time-slider').value = String(Math.round(time * 1000));
      $('time-slider').style.setProperty('--progress', `${time * 100}%`);
      $('time-slider').setAttribute('aria-valuetext', `${chapters[state.chapter] || chapters[0]}，${Math.round(time * 100)}%`);
    }
    if ('chapter' in patch) {
      document.querySelectorAll('[data-era]').forEach((button, index) => {
        button.classList.toggle('active', index === state.chapter);
        button.setAttribute('aria-pressed', String(index === state.chapter));
      });
      const readouts = ['10<sup>100</sup> 年之后', '时间失去刻度', '从零开始的永恒'];
      $('time-readout').innerHTML = readouts[state.chapter] || readouts[0];
      $('time-slider').setAttribute('aria-valuetext', `${chapters[state.chapter] || chapters[0]}，${Math.round(state.time * 100)}%`);
    }
    if ('collected' in patch || 'rebirth' in patch) {
      const collected = new Set(Array.isArray(state.collected) ? state.collected : []);
      $('collected-count').textContent = String(collected.size).padStart(2, '0');
      [...$('memory-pips').children].forEach((pip, index) => pip.classList.toggle('found', collected.has(index)));
      $('collection-hint').textContent = state.rebirth ? '所有被记住的，都将再次发光' : collected.size === 5 ? '让这些记忆，成为新的开始' : '寻找星海中闪烁的光点';
      $('rebirth-button').hidden = collected.size !== 5 && !state.rebirth;
      $('rebirth-button').querySelector('span').textContent = state.rebirth ? '再赴一次星海' : '唤醒一颗新星';
      archiveRows.forEach(({ row, title, text }, index) => {
        const found = collected.has(index);
        row.classList.toggle('unlocked', found);
        title.textContent = found ? MEMORIES[index].title : '尚未抵达的回声';
        text.textContent = found ? MEMORIES[index].text : '这段记忆仍漂浮在星海中，等待与你相遇。';
      });
    }
    if ('paused' in patch) {
      $('pause-button').setAttribute('aria-pressed', String(Boolean(state.paused)));
      $('pause-button').setAttribute('aria-label', state.paused ? '继续时间' : '暂停时间');
      $('pause-button').title = state.paused ? '继续时间 · 空格' : '暂停时间 · 空格';
    }
    if ('audio' in patch) {
      $('audio-button').setAttribute('aria-pressed', String(Boolean(state.audio)));
      $('audio-button').setAttribute('aria-label', state.audio ? '关闭声音' : '开启声音');
    }
    if ('quality' in patch) {
      const low = ['low', 'performance', 'medium', 'eco', '流畅'].includes(state.quality) || state.quality === false;
      $('quality-label').textContent = low ? '流畅' : '精致';
      $('quality-button').setAttribute('aria-label', `当前${low ? '流畅' : '精致'}画质，点击切换`);
    }
    if ('explored' in patch) {
      document.body.classList.toggle('exploring', Boolean(state.explored));
      const hero = document.querySelector('.hero');
      const moveFocus = state.explored && hero.contains(document.activeElement);
      hero.inert = Boolean(state.explored);
      if (moveFocus) $('universe').focus({ preventScroll: true });
    }
    if ('rebirth' in patch) document.body.classList.toggle('is-reborn', Boolean(state.rebirth));
  }

  function showMemory(index) {
    const memory = MEMORIES[index];
    if (!memory) return;
    clearTimeout(memoryTimer);
    $('memory-label').textContent = `MEMORY ${String(index + 1).padStart(2, '0')} / 05 · 记忆已回收`;
    $('memory-title').textContent = memory.title;
    $('memory-text').textContent = memory.text;
    $('memory-reveal').hidden = false;
    memoryTimer = setTimeout(() => { $('memory-reveal').hidden = true; }, 9000);
  }

  update(state);
  return {
    ready() { $('loading').classList.add('is-ready'); document.body.classList.add('is-ready'); },
    update,
    toast,
    showMemory,
    setError(message) {
      $('loading').classList.remove('is-ready');
      $('loading').classList.add('has-error');
      $('loading').querySelector('span').textContent = message;
      $('loading').querySelector('small').textContent = '请使用支持 WebGL 2 的现代浏览器，并确认硬件加速已开启。';
    },
  };
}
