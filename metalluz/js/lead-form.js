(() => {
  'use strict';
  const attributionKeys = ['fbclid','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'];
  const query = new URLSearchParams(location.search);
  let attribution = {};
  try { attribution = JSON.parse(sessionStorage.getItem('lp_attribution') || '{}') || {}; } catch {}
  if (attributionKeys.some(key => query.get(key))) {
    attribution = Object.fromEntries(attributionKeys.map(key => [key,query.get(key) || '']));
    attribution.landing_page = location.href;
    attribution.referrer = document.referrer;
    try { sessionStorage.setItem('lp_attribution',JSON.stringify(attribution)); } catch {}
  }
  function updateContact() {
    const config = window.LP_CONFIG || {};
    const phone = String(config.whatsapp || '').replace(/\D/g,'');
    document.querySelectorAll('[data-whatsapp-contact]').forEach(link => {
      link.hidden = !phone;
      link.style.display = phone ? '' : 'none';
      if (phone) link.href = `https://wa.me/${phone}?text=${encodeURIComponent(config.mensagemWhatsapp || '')}`;
      else link.removeAttribute('href');
      if (link.hasAttribute('data-whatsapp-label')) link.textContent = `WhatsApp: +${phone}`;
    });
  }
  updateContact();
  window.addEventListener('lp:config-update',updateContact);
  const form = document.querySelector('.form-simulator');
  if (!form) return;
  const button = form.querySelector('.btn-calculate');
  const error = form.querySelector('.msg-error');
  const selectControllers = [...form.querySelectorAll('[data-visual-select]')].map(root => {
    const select = root.querySelector('select');
    const trigger = root.querySelector('.property-select__trigger');
    const menu = root.querySelector('.property-select__menu');
    const label = root.querySelector('[data-select-label]');
    let optionButtons = [];

    function setOpen(open) {
      if (select.disabled) open = false;
      root.classList.toggle('is-open',open);
      trigger.setAttribute('aria-expanded',String(open));
      menu.hidden = !open;
      if (open) {
        const selected = optionButtons.find(option => option.getAttribute('aria-selected') === 'true');
        (selected || optionButtons[0])?.focus({preventScroll:true});
      }
    }

    function choose(value, dispatch = true) {
      select.value = value;
      const selectedOption = [...select.options].find(option => option.value === value);
      label.textContent = selectedOption?.textContent || select.options[0]?.textContent || '';
      root.classList.remove('is-invalid');
      optionButtons.forEach(option => option.setAttribute('aria-selected',String(option.dataset.value === value)));
      if (dispatch) select.dispatchEvent(new Event('change',{bubbles:true}));
      setOpen(false);
    }

    function refresh() {
      menu.replaceChildren();
      optionButtons = [...select.options].filter(option => option.value).map((option,index,array) => {
        const button = document.createElement('button');
        button.className = 'property-select__option';
        button.type = 'button';
        button.setAttribute('role','option');
        button.setAttribute('aria-selected',String(option.value === select.value));
        button.dataset.value = option.value;
        button.textContent = option.textContent;
        button.addEventListener('click',() => choose(option.value));
        button.addEventListener('keydown',event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.focus(); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            array[(index + step + array.length) % array.length] && optionButtons[(index + step + array.length) % array.length]?.focus();
          }
        });
        menu.append(button);
        return button;
      });
      trigger.disabled = select.disabled;
      choose(select.value,false);
    }

    trigger.addEventListener('click',() => setOpen(menu.hidden));
    trigger.addEventListener('keydown',event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    });
    refresh();
    return {root,select,trigger,menu,setOpen,choose,refresh,required:root.hasAttribute('data-required')};
  });
  const controllerByName = name => selectControllers.find(controller => controller.select.name === name);
  const stateController = controllerByName('estado');
  const cityController = controllerByName('cidade');
  const cityCache = new Map();
  const consumptionReference = {
    '250_399': 325,
    '400_599': 500,
    '600_999': 800,
    '1000': 1200
  };

  function calculateSolarEstimate(consumptionRange) {
    const monthlyBill = consumptionReference[consumptionRange];
    if (!monthlyBill) return {};
    const monthlyConsumption = monthlyBill;
    const potenciaMin = monthlyConsumption / 130;
    const potenciaMax = monthlyConsumption / 110;
    return {
      potenciaMin,
      potenciaMax,
      geracaoMin: potenciaMin * 110,
      geracaoMax: potenciaMax * 130,
      economiaMin: monthlyBill * 0.7,
      economiaMax: monthlyBill * 0.9
    };
  }

  function prepareCity(options,placeholder,disabled) {
    const citySelect = cityController.select;
    citySelect.replaceChildren(new Option(placeholder,''));
    options.forEach(city => citySelect.add(new Option(city,city)));
    citySelect.disabled = disabled;
    cityController.refresh();
  }

  stateController?.select.addEventListener('change',async () => {
    const uf = stateController.select.value;
    if (!uf) return prepareCity([],'Cidade*',true);
    prepareCity([],'Carregando cidades...',true);
    try {
      let cities = cityCache.get(uf);
      if (!cities) {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`);
        if (!response.ok) throw new Error('city-load-failed');
        cities = (await response.json()).map(city => city.nome).sort((a,b) => a.localeCompare(b,'pt-BR'));
        cityCache.set(uf,cities);
      }
      prepareCity(cities,'Cidade*',false);
    } catch {
      prepareCity([],'Não foi possível carregar',true);
    }
  });
  document.addEventListener('click',event => {
    selectControllers.forEach(controller => {
      if (!controller.root.contains(event.target)) controller.setOpen(false);
    });
  });
  error.setAttribute('role','alert');
  let pending = false;
  let lastSignature = '';
  let requestId = '';
  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (pending) return;
    const invalidSelect = selectControllers.find(controller => controller.required && !controller.select.value);
    if (invalidSelect) {
      invalidSelect.root.classList.add('is-invalid');
      invalidSelect.setOpen(true);
      return;
    }
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    data.celular = String(data.celular || '').replace(/\D/g,'');
    const fail = message => {
      form.classList.add('form-error');
      error.querySelector('p').textContent = message;
      error.style.display = 'block';
    };
    if (data.celular.length < 10 || data.celular.length > 13) {
      fail('Confira seu telefone com DDD.'); return;
    }
    const endpoint = String(window.LP_CONFIG?.appsScriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)) {
      fail('O formulário ainda não está conectado à planilha. Entre em contato pelo WhatsApp.'); return;
    }
    const signature = JSON.stringify(data);
    if (signature !== lastSignature) {
      lastSignature = signature;
      requestId = crypto.randomUUID();
    }
    const estimate = calculateSolarEstimate(data.consumo);
    const payload = {...data,...estimate,...attribution,fbclid:attribution.fbclid || '',gclid:attribution.gclid || '',gbraid:attribution.gbraid || '',wbraid:attribution.wbraid || '',request_id:requestId,submitted_at:new Date().toISOString(),page_url:location.href};
    pending = true;
    button.disabled = true;
    form.classList.remove('form-error','success');
    form.classList.add('sending');
    error.style.display = 'none';
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),25000);
    try {
      const response = await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify(payload),
        redirect:'follow',
        signal:controller.signal
      });
      const result = await response.json();
      if (!response.ok || (result.ok !== true && result.success !== true)) throw new Error('unconfirmed');
      form.reset();
      selectControllers.forEach(controller => controller.choose('',false));
      prepareCity([],'Cidade*',true);
      form.classList.add('success');
      lastSignature = '';
      requestId = '';
      window.jQuery(document).trigger('lead.success');
    } catch {
      fail('Não foi possível confirmar o envio. Suas respostas foram mantidas. Tente novamente ou fale conosco pelo WhatsApp.');
    } finally {
      clearTimeout(timer);
      pending = false;
      button.disabled = false;
      form.classList.remove('sending');
    }
  });
})();
