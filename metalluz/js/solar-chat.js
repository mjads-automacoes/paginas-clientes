(() => {
  'use strict';
  const launcher = document.createElement('button');
  launcher.id = 'solar-chat-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Abrir chat de energia solar');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'solar-chat-panel');
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>';
  const panel = document.createElement('section');
  panel.id = 'solar-chat-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Assistente de energia solar');
  panel.innerHTML = '<div id="solar-chat-bar"><span>Vamos simular seu projeto?</span><button id="solar-chat-close" type="button" aria-label="Minimizar chat">−</button></div>';
  const close = panel.querySelector('button');
  let frame;
  let autoTimer;
  let interacted = false;
  function cancelAutoOpen() {
    interacted = true;
    clearTimeout(autoTimer);
  }
  function hide() {
    cancelAutoOpen();
    frame?.contentWindow?.postMessage({type:'solar-chat-close'}, location.origin);
    panel.hidden = true;
    launcher.setAttribute('aria-expanded','false');
    launcher.focus({preventScroll:true});
  }
  function open(automatic = false) {
    cancelAutoOpen();
    if (location.protocol === 'file:') {
      if (!panel.querySelector('#solar-chat-file-warning')) {
        const warning = document.createElement('div');
        warning.id = 'solar-chat-file-warning';
        warning.setAttribute('role','status');
        warning.innerHTML = '<strong>Abra a LP pelo servidor local</strong><p>O chat não pode carregar quando o arquivo HTML é aberto diretamente.</p><a href="http://127.0.0.1:8080/">Abrir em 127.0.0.1:8080</a>';
        panel.append(warning);
      }
      panel.hidden = false;
      launcher.setAttribute('aria-expanded','true');
      if (!automatic) close.focus({preventScroll:true});
      return;
    }
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'solar-chat-frame';
      frame.title = 'Conversa para simulação de energia solar';
      const url = new URL('chat/index.html', document.baseURI);
      url.searchParams.set('v','20261022-6');
      new URLSearchParams(location.search).forEach((value,key) => {
        if (/^(utm_|gclid$|fbclid$|wbraid$|gbraid$|msclkid$)/i.test(key)) url.searchParams.set(key,value);
      });
      try {
        const stored = JSON.parse(sessionStorage.getItem('lp_attribution') || '{}');
        Object.entries(stored).forEach(([key,value]) => {
          if (/^(utm_|gclid$|fbclid$|wbraid$|gbraid$|msclkid$)/i.test(key) && value && !url.searchParams.has(key)) url.searchParams.set(key,String(value));
        });
      } catch {}
      frame.src = url.href;
      panel.append(frame);
    }
    panel.hidden = false;
    launcher.setAttribute('aria-expanded','true');
    if (!automatic) close.focus({preventScroll:true});
  }
  launcher.addEventListener('click', () => panel.hidden ? open() : hide());
  close.addEventListener('click',hide);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide();});
  window.addEventListener('message',e=>{
    if(e.origin===location.origin && e.source===frame?.contentWindow && e.data?.type==='solar-chat-minimize')hide();
  });
  document.body.append(panel,launcher);
  function scheduleAutoOpen() {
    const seconds = Number(window.LP_CONFIG?.chatAbrirAposSegundos ?? 15);
    if (interacted || !Number.isFinite(seconds) || seconds <= 0) return;
    autoTimer = setTimeout(() => { if (!interacted) open(true); }, seconds * 1000);
  }
  if (document.readyState === 'complete') scheduleAutoOpen();
  else window.addEventListener('load', scheduleAutoOpen, {once:true});
})();
