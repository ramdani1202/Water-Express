/* =========================================================
   Water Express - App Logic
   ========================================================= */

let data = DB.load();

/* ---------------------------------------------------------
   Toast
   --------------------------------------------------------- */
function showToast(msg, type){
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' '+type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .25s'; setTimeout(()=>t.remove(),250); }, 2400);
}

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */
const views = ['input','rekap','invoice','pengeluaran','suratjalan'];

function switchView(name){
  views.forEach(v=>{
    document.getElementById('view-'+v).hidden = (v!==name);
  });
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view===name);
  });
  document.getElementById('app-main').scrollTop = 0;
  if(name==='rekap') renderRekap();
  if(name==='invoice') renderInvoiceView();
  if(name==='pengeluaran') renderPengeluaran();
  if(name==='suratjalan') renderSuratJalanView();
  if(name==='input') renderInputView();
}

document.getElementById('bottom-nav').addEventListener('click', e=>{
  const btn = e.target.closest('.nav-btn');
  if(btn) switchView(btn.dataset.view);
});

/* ---------------------------------------------------------
   Modal helpers
   --------------------------------------------------------- */
const backdrop = document.getElementById('modal-backdrop');
function openModal(id){
  document.querySelectorAll('.modal').forEach(m=>{
    m.hidden = (m.id!==id);
  });
  backdrop.hidden = false;
}
function closeModal(){
  backdrop.hidden = true;
  document.querySelectorAll('.modal').forEach(m=>{
    m.hidden = true;
  });
}
backdrop.addEventListener('click', e=>{
  if(e.target===backdrop) closeModal();
});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', closeModal));

document.getElementById('btn-menu').addEventListener('click', ()=> openModal('modal-menu'));

/* ---------------------------------------------------------
   Populate <select> helpers
   --------------------------------------------------------- */
function fillSelect(selectEl, items, {value='id', text='nama', placeholder=null} = {}){
  selectEl.innerHTML = '';
  if(placeholder){
    const o = document.createElement('option');
    o.value=''; o.textContent = placeholder;
    selectEl.appendChild(o);
  }
  items.forEach(it=>{
    const o = document.createElement('option');
    o.value = it[value];
    o.textContent = typeof text === 'function' ? text(it) : it[text];
    selectEl.appendChild(o);
  });
}

function refreshAllSelects(){
  fillSelect(document.getElementById('inp-karyawan'), data.karyawan.filter(k=>k.aktif!==false));
  fillSelect(document.getElementById('inp-kontraktor'), data.kontraktor);
  fillSelect(document.getElementById('inp-produk'), data.produk, {text:p=>`${p.nama} (${formatRupiah(p.harga)})`});
  fillPTSelectByKontraktor();

  fillSelect(document.getElementById('peng-karyawan'), data.karyawan.filter(k=>k.aktif!==false));
  fillSelect(document.getElementById('sj-karyawan'), data.karyawan.filter(k=>k.aktif!==false));
  fillSelect(document.getElementById('sj-pt'), data.pt, {text:p=>p.nama});

  fillSelect(document.getElementById('rekap-kontraktor-filter'), data.kontraktor, {placeholder:'Semua Kontraktor'});
}

function fillPTSelectByKontraktor(){
  const kontraktorId = document.getElementById('inp-kontraktor').value;
  const list = data.pt.filter(p=>p.kontraktorId===kontraktorId);
  fillSelect(document.getElementById('inp-pt'), list);
}
document.getElementById('inp-kontraktor').addEventListener('change', fillPTSelectByKontraktor);

/* ---------------------------------------------------------
   VIEW: INPUT HARIAN
   --------------------------------------------------------- */
function initInputForm(){
  document.getElementById('inp-tanggal').value = todayISO();
}

function updateSubtotalPreview(){
  const jumlah = Number(document.getElementById('inp-jumlah').value)||0;
  const harga = Number(document.getElementById('inp-harga').value)||0;
  document.getElementById('subtotal-preview').textContent = 'Subtotal: ' + formatRupiah(jumlah*harga);
}
document.getElementById('inp-jumlah').addEventListener('input', updateSubtotalPreview);
document.getElementById('inp-harga').addEventListener('input', updateSubtotalPreview);

document.getElementById('inp-produk').addEventListener('change', ()=>{
  const p = data.produk.find(x=>x.id===document.getElementById('inp-produk').value);
  if(p) document.getElementById('inp-harga').value = p.harga;
  updateSubtotalPreview();
});

document.getElementById('form-input').addEventListener('submit', e=>{
  e.preventDefault();
  const tanggal = document.getElementById('inp-tanggal').value;
  const karyawanId = document.getElementById('inp-karyawan').value;
  const kontraktorId = document.getElementById('inp-kontraktor').value;
  const ptId = document.getElementById('inp-pt').value;
  const produkId = document.getElementById('inp-produk').value;
  const jumlah = Number(document.getElementById('inp-jumlah').value);
  const harga = Number(document.getElementById('inp-harga').value);
  const catatan = document.getElementById('inp-catatan').value.trim();

  if(!karyawanId || !kontraktorId || !ptId || !produkId){
    showToast('Lengkapi semua data terlebih dahulu.', 'error');
    return;
  }
  if(!jumlah || jumlah<=0){
    showToast('Jumlah harus lebih dari 0.', 'error');
    return;
  }

  const entry = {
    id: uid('kr_e'),
    tanggal, karyawanId, kontraktorId, ptId, produkId,
    jumlah, harga, catatan,
    subtotal: jumlah*harga,
    invoiced: false,
  };
  data.kiriman.push(entry);
  DB.save();
  showToast('Kiriman tersimpan.', 'success');

  document.getElementById('inp-jumlah').value = '';
  document.getElementById('inp-harga').value = '';
  document.getElementById('inp-catatan').value = '';
  updateSubtotalPreview();
  renderInputView();
});

function renderInputView(){
  const today = document.getElementById('inp-tanggal').value || todayISO();
  const todays = data.kiriman.filter(k=>k.tanggal===today);

  // Summary strip
  const totalGalon = todays.reduce((s,k)=>s+k.jumlah,0);
  const totalRp = todays.reduce((s,k)=>s+k.subtotal,0);
  const belumInvoice = data.kiriman.filter(k=>!k.invoiced);
  const totalBelumInvoice = belumInvoice.reduce((s,k)=>s+k.subtotal,0);

  document.getElementById('today-summary').innerHTML = `
    <div class="droplet-stat"><div class="droplet-num">${totalGalon}</div><div class="droplet-label">Unit Hari Ini</div></div>
    <div class="droplet-stat"><div class="droplet-num">${formatRupiah(totalRp).replace('Rp ','')}</div><div class="droplet-label">Rp Hari Ini</div></div>
    <div class="droplet-stat"><div class="droplet-num">${belumInvoice.length}</div><div class="droplet-label">Belum Ditagih</div></div>
  `;

  // List
  const list = document.getElementById('today-list');
  if(todays.length===0){
    list.innerHTML = `<div class="empty-state">Belum ada kiriman tercatat hari ini.</div>`;
  } else {
    list.innerHTML = todays.slice().reverse().map(k=>{
      const pt = data.pt.find(p=>p.id===k.ptId);
      const produk = data.produk.find(p=>p.id===k.produkId);
      const kry = data.karyawan.find(x=>x.id===k.karyawanId);
      return `
        <div class="entry-item">
          <div class="entry-main">
            <div class="entry-title">${produk?produk.nama:'-'} &times; ${k.jumlah}</div>
            <div class="entry-sub">${pt?pt.nama:'-'} &middot; ${kry?kry.nama:'-'}${k.catatan?' &middot; '+k.catatan:''}</div>
          </div>
          <div class="entry-amount">${formatRupiah(k.subtotal)}</div>
          <button class="entry-del" data-del-kiriman="${k.id}" aria-label="Hapus">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
          </button>
        </div>`;
    }).join('');
  }

  list.querySelectorAll('[data-del-kiriman]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.delKiriman;
      const item = data.kiriman.find(k=>k.id===id);
      if(item && item.invoiced){
        showToast('Kiriman ini sudah masuk invoice, tidak bisa dihapus.', 'error');
        return;
      }
      if(confirm('Hapus catatan kiriman ini?')){
        data.kiriman = data.kiriman.filter(k=>k.id!==id);
        DB.save();
        renderInputView();
        showToast('Kiriman dihapus.');
      }
    });
  });
}
document.getElementById('inp-tanggal').addEventListener('change', renderInputView);

/* ---------------------------------------------------------
   VIEW: REKAP (belum di-invoice)
   --------------------------------------------------------- */
function renderRekap(){
  const filterKontraktor = document.getElementById('rekap-kontraktor-filter').value;
  let belum = data.kiriman.filter(k=>!k.invoiced);
  if(filterKontraktor) belum = belum.filter(k=>k.kontraktorId===filterKontraktor);

  // group by PT
  const groups = {};
  belum.forEach(k=>{
    if(!groups[k.ptId]) groups[k.ptId] = [];
    groups[k.ptId].push(k);
  });

  const container = document.getElementById('rekap-groups');
  const ptIds = Object.keys(groups);

  if(ptIds.length===0){
    container.innerHTML = `<div class="empty-state">Belum ada data untuk direkap.</div>`;
  } else {
    container.innerHTML = ptIds.map(ptId=>{
      const pt = data.pt.find(p=>p.id===ptId);
      const items = groups[ptId];
      const total = items.reduce((s,k)=>s+k.subtotal,0);

      // group by produk within PT
      const byProduk = {};
      items.forEach(k=>{
        if(!byProduk[k.produkId]) byProduk[k.produkId] = {jumlah:0, subtotal:0};
        byProduk[k.produkId].jumlah += k.jumlah;
        byProduk[k.produkId].subtotal += k.subtotal;
      });

      const rows = Object.keys(byProduk).map(pid=>{
        const p = data.produk.find(x=>x.id===pid);
        const d = byProduk[pid];
        return `<div class="rekap-row"><span class="rekap-row-label">${p?p.nama:'-'} &times; ${d.jumlah}</span><span class="rekap-row-value">${formatRupiah(d.subtotal)}</span></div>`;
      }).join('');

      return `
        <div class="rekap-group">
          <div class="rekap-group-head">
            <h3>${pt?pt.nama:'PT tidak diketahui'}</h3>
            <span class="rekap-group-total">${formatRupiah(total)}</span>
          </div>
          ${rows}
        </div>`;
    }).join('');
  }

  const grandTotal = belum.reduce((s,k)=>s+k.subtotal,0);
  document.getElementById('rekap-grand-total').innerHTML = `
    <div class="t-label">Total Belum Ditagih</div>
    <div class="t-value">${formatRupiah(grandTotal)}</div>
  `;
}
document.getElementById('rekap-kontraktor-filter').addEventListener('change', renderRekap);

/* ---------------------------------------------------------
   VIEW: INVOICE
   --------------------------------------------------------- */
function renderInvoiceView(){
  fillSelect(document.getElementById('invoice-pt-select'), data.pt, {text:p=>p.nama});
  renderInvoicePreview();
  renderInvoiceHistory();
}

function getBelumInvoiceByPT(ptId){
  return data.kiriman.filter(k=>!k.invoiced && k.ptId===ptId);
}

function renderInvoicePreview(){
  const ptId = document.getElementById('invoice-pt-select').value;
  const items = getBelumInvoiceByPT(ptId);
  const box = document.getElementById('invoice-preview');
  if(items.length===0){
    box.innerHTML = `<div class="invoice-preview-empty">Tidak ada kiriman yang belum ditagih untuk PT ini.</div>`;
    return;
  }
  const total = items.reduce((s,k)=>s+k.subtotal,0);
  box.innerHTML = items.map(k=>{
    const produk = data.produk.find(p=>p.id===k.produkId);
    return `<div class="invoice-preview-row"><span>${formatTanggalSingkat(k.tanggal)} &middot; ${produk?produk.nama:'-'} &times;${k.jumlah}</span><span>${formatRupiah(k.subtotal)}</span></div>`;
  }).join('') + `<div class="invoice-preview-row" style="font-weight:700;color:var(--blue-main)"><span>Total</span><span>${formatRupiah(total)}</span></div>`;
}
document.getElementById('invoice-pt-select').addEventListener('change', renderInvoicePreview);

document.getElementById('btn-preview-invoice').addEventListener('click', ()=>{
  const ptId = document.getElementById('invoice-pt-select').value;
  const pt = data.pt.find(p=>p.id===ptId);
  const items = getBelumInvoiceByPT(ptId);
  const body = document.getElementById('modal-invoice-body');
  if(items.length===0){
    body.innerHTML = `<div class="empty-state">Tidak ada data.</div>`;
  } else {
    const total = items.reduce((s,k)=>s+k.subtotal,0);
    body.innerHTML = `
      <h3 style="margin-bottom:12px;">${pt?pt.nama:'-'}</h3>
      ${items.map(k=>{
        const produk = data.produk.find(p=>p.id===k.produkId);
        const kry = data.karyawan.find(x=>x.id===k.karyawanId);
        return `<div class="rekap-row"><span class="rekap-row-label">${formatTanggalSingkat(k.tanggal)} &middot; ${produk?produk.nama:'-'} &times;${k.jumlah} <span style="color:var(--ink-soft)">(${kry?kry.nama:'-'})</span></span><span class="rekap-row-value">${formatRupiah(k.subtotal)}</span></div>`;
      }).join('')}
      <div class="total-card" style="margin-top:14px;"><div class="t-label">Total</div><div class="t-value">${formatRupiah(total)}</div></div>
    `;
  }
  openModal('modal-invoice-preview');
});

document.getElementById('btn-terbitkan-invoice').addEventListener('click', ()=>{
  const ptId = document.getElementById('invoice-pt-select').value;
  const pt = data.pt.find(p=>p.id===ptId);
  const items = getBelumInvoiceByPT(ptId);
  if(items.length===0){
    showToast('Tidak ada kiriman untuk ditagih ke PT ini.', 'error');
    return;
  }
  if(!confirm(`Terbitkan invoice untuk ${pt.nama}? Rekap berjalan untuk PT ini akan ditutup dan direset.`)){
    return;
  }

  data.meta.lastInvoiceNumber = (data.meta.lastInvoiceNumber||0) + 1;
  const nomor = `INV-${String(data.meta.lastInvoiceNumber).padStart(4,'0')}`;

  const snapshotItems = items.map(k=>{
    const produk = data.produk.find(p=>p.id===k.produkId);
    return {
      tanggal: k.tanggal,
      produkNama: produk?produk.nama:'-',
      jumlah: k.jumlah,
      harga: k.harga,
      subtotal: k.subtotal,
    };
  });
  const total = snapshotItems.reduce((s,i)=>s+i.subtotal,0);

  const record = {
    id: uid('inv'),
    nomor,
    ptId,
    tanggal: todayISO(),
    items: snapshotItems,
    total,
  };
  data.invoiceHistory.push(record);

  // mark as invoiced (tutup buku)
  items.forEach(k=>{ k.invoiced = true; });

  DB.save();
  showToast(`Invoice ${nomor} diterbitkan.`, 'success');

  generateInvoicePDF(record, pt.nama);

  renderInvoiceView();
  renderRekap();
});

function renderInvoiceHistory(){
  const list = document.getElementById('invoice-history');
  const hist = data.invoiceHistory.slice().reverse();
  if(hist.length===0){
    list.innerHTML = `<div class="empty-state">Belum ada invoice diterbitkan.</div>`;
    return;
  }
  list.innerHTML = hist.map(inv=>{
    const pt = data.pt.find(p=>p.id===inv.ptId);
    return `
      <div class="entry-item">
        <div class="entry-main">
          <div class="entry-title">${inv.nomor} &middot; ${pt?pt.nama:'-'}</div>
          <div class="entry-sub">${formatTanggalSingkat(inv.tanggal)} &middot; ${inv.items.length} item</div>
        </div>
        <div class="entry-amount">${formatRupiah(inv.total)}</div>
        <button class="entry-del" data-reprint="${inv.id}" aria-label="Unduh ulang" style="color:var(--blue-main);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-reprint]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const inv = data.invoiceHistory.find(i=>i.id===btn.dataset.reprint);
      const pt = data.pt.find(p=>p.id===inv.ptId);
      generateInvoicePDF(inv, pt?pt.nama:'PT');
    });
  });
}

/* ---------------------------------------------------------
   VIEW: PENGELUARAN
   --------------------------------------------------------- */
function initPengeluaranForm(){
  document.getElementById('peng-tanggal').value = todayISO();
}

document.getElementById('peng-jenis').addEventListener('change', ()=>{
  const jenis = document.getElementById('peng-jenis').value;
  document.getElementById('peng-karyawan-field').style.display = (jenis==='Bayar Karyawan') ? '' : 'none';
});

document.getElementById('form-pengeluaran').addEventListener('submit', e=>{
  e.preventDefault();
  const tanggal = document.getElementById('peng-tanggal').value;
  const jenis = document.getElementById('peng-jenis').value;
  const karyawanId = document.getElementById('peng-karyawan').value;
  const jumlah = Number(document.getElementById('peng-jumlah').value);
  const keterangan = document.getElementById('peng-keterangan').value.trim();

  if(!jumlah || jumlah<=0){
    showToast('Jumlah harus lebih dari 0.', 'error');
    return;
  }

  data.pengeluaran.push({
    id: uid('pg'),
    tanggal, jenis,
    karyawanId: jenis==='Bayar Karyawan' ? karyawanId : '',
    jumlah, keterangan,
  });
  DB.save();
  showToast('Pengeluaran tersimpan.', 'success');

  document.getElementById('peng-jumlah').value = '';
  document.getElementById('peng-keterangan').value = '';
  renderPengeluaran();
});

function renderPengeluaran(){
  const totalKaryawan = data.pengeluaran.filter(p=>p.jenis==='Bayar Karyawan').reduce((s,p)=>s+p.jumlah,0);
  const totalTransport = data.pengeluaran.filter(p=>p.jenis==='Biaya Transport').reduce((s,p)=>s+p.jumlah,0);
  const totalLain = data.pengeluaran.filter(p=>p.jenis==='Lainnya').reduce((s,p)=>s+p.jumlah,0);

  document.getElementById('pengeluaran-summary').innerHTML = `
    <div class="droplet-stat"><div class="droplet-num">${formatRupiah(totalKaryawan).replace('Rp ','')}</div><div class="droplet-label">Bayar Karyawan</div></div>
    <div class="droplet-stat"><div class="droplet-num">${formatRupiah(totalTransport).replace('Rp ','')}</div><div class="droplet-label">Transport</div></div>
    <div class="droplet-stat"><div class="droplet-num">${formatRupiah(totalLain).replace('Rp ','')}</div><div class="droplet-label">Lainnya</div></div>
  `;

  const list = document.getElementById('pengeluaran-list');
  const items = data.pengeluaran.slice().reverse();
  if(items.length===0){
    list.innerHTML = `<div class="empty-state">Belum ada pengeluaran tercatat.</div>`;
    return;
  }
  list.innerHTML = items.map(p=>{
    const kry = p.karyawanId ? data.karyawan.find(k=>k.id===p.karyawanId) : null;
    return `
      <div class="entry-item">
        <div class="entry-main">
          <div class="entry-title">${p.jenis}${kry?' &middot; '+kry.nama:''}</div>
          <div class="entry-sub">${formatTanggalSingkat(p.tanggal)}${p.keterangan?' &middot; '+p.keterangan:''}</div>
        </div>
        <div class="entry-amount">${formatRupiah(p.jumlah)}</div>
        <button class="entry-del" data-del-peng="${p.id}" aria-label="Hapus">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-del-peng]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('Hapus catatan pengeluaran ini?')){
        data.pengeluaran = data.pengeluaran.filter(p=>p.id!==btn.dataset.delPeng);
        DB.save();
        renderPengeluaran();
        showToast('Pengeluaran dihapus.');
      }
    });
  });
}

/* ---------------------------------------------------------
   VIEW: SURAT JALAN
   --------------------------------------------------------- */
function initSuratJalanForm(){
  document.getElementById('sj-tanggal').value = todayISO();
  document.getElementById('sj-item-list').innerHTML = '';
  addSJItemRow();
}

function addSJItemRow(){
  const container = document.getElementById('sj-item-list');
  const row = document.createElement('div');
  row.className = 'sj-item-row';
  const selectId = uid('sel');
  row.innerHTML = `
    <select class="sj-produk-select"></select>
    <input type="number" class="sj-jumlah-input" min="1" step="1" placeholder="Jml" value="1">
    <button type="button" class="sj-item-del" aria-label="Hapus baris">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
    </button>
  `;
  container.appendChild(row);
  fillSelect(row.querySelector('.sj-produk-select'), data.produk, {text:p=>p.nama});
  row.querySelector('.sj-item-del').addEventListener('click', ()=>{
    if(container.children.length>1) row.remove();
    else showToast('Minimal harus ada 1 produk.', 'error');
  });
}
document.getElementById('btn-sj-add-item').addEventListener('click', addSJItemRow);

function collectSJItems(){
  const rows = document.querySelectorAll('#sj-item-list .sj-item-row');
  const items = [];
  rows.forEach(row=>{
    const produkId = row.querySelector('.sj-produk-select').value;
    const jumlah = Number(row.querySelector('.sj-jumlah-input').value);
    if(produkId && jumlah>0){
      const p = data.produk.find(x=>x.id===produkId);
      items.push({ produkId, produkNama: p?p.nama:'-', satuan: p?p.satuan:'', jumlah });
    }
  });
  return items;
}

function buildSJRecord(){
  const tanggal = document.getElementById('sj-tanggal').value;
  const karyawanId = document.getElementById('sj-karyawan').value;
  const ptId = document.getElementById('sj-pt').value;
  const catatan = document.getElementById('sj-catatan').value.trim();
  const items = collectSJItems();

  if(!karyawanId || !ptId){
    showToast('Lengkapi karyawan dan tujuan.', 'error');
    return null;
  }
  if(items.length===0){
    showToast('Tambahkan minimal 1 produk.', 'error');
    return null;
  }

  data.meta.lastSJNumber = (data.meta.lastSJNumber||0) + 1;
  const nomor = `SJ-${String(data.meta.lastSJNumber).padStart(4,'0')}`;

  return {
    id: uid('sj'),
    nomor, tanggal, karyawanId, ptId, items, catatan,
  };
}

document.getElementById('form-suratjalan').addEventListener('submit', e=>{
  e.preventDefault();
  const record = buildSJRecord();
  if(!record) { data.meta.lastSJNumber--; return; }

  data.suratJalanHistory.push(record);
  DB.save();

  const kry = data.karyawan.find(k=>k.id===record.karyawanId);
  const pt = data.pt.find(p=>p.id===record.ptId);
  generateSuratJalanPDF(record, kry?kry.nama:'-', pt?pt.nama:'-', {printDirect:false});

  showToast(`Surat jalan ${record.nomor} diterbitkan.`, 'success');
  renderSuratJalanView();
});

document.getElementById('btn-sj-print').addEventListener('click', ()=>{
  const record = buildSJRecord();
  if(!record) { data.meta.lastSJNumber--; return; }

  data.suratJalanHistory.push(record);
  DB.save();

  const kry = data.karyawan.find(k=>k.id===record.karyawanId);
  const pt = data.pt.find(p=>p.id===record.ptId);
  generateSuratJalanPDF(record, kry?kry.nama:'-', pt?pt.nama:'-', {printDirect:true});

  showToast(`Surat jalan ${record.nomor} siap dicetak.`, 'success');
  renderSuratJalanView();
});

function renderSuratJalanView(){
  const list = document.getElementById('suratjalan-list');
  const items = data.suratJalanHistory.slice().reverse();
  if(items.length===0){
    list.innerHTML = `<div class="empty-state">Belum ada surat jalan diterbitkan.</div>`;
    return;
  }
  list.innerHTML = items.map(sj=>{
    const kry = data.karyawan.find(k=>k.id===sj.karyawanId);
    const pt = data.pt.find(p=>p.id===sj.ptId);
    return `
      <div class="entry-item">
        <div class="entry-main">
          <div class="entry-title">${sj.nomor} &middot; ${pt?pt.nama:'-'}</div>
          <div class="entry-sub">${formatTanggalSingkat(sj.tanggal)} &middot; ${kry?kry.nama:'-'} &middot; ${sj.items.length} produk</div>
        </div>
        <button class="entry-del" data-sj-reprint="${sj.id}" aria-label="Unduh ulang" style="color:var(--blue-main);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-sj-reprint]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const sj = data.suratJalanHistory.find(x=>x.id===btn.dataset.sjReprint);
      const kry = data.karyawan.find(k=>k.id===sj.karyawanId);
      const pt = data.pt.find(p=>p.id===sj.ptId);
      generateSuratJalanPDF(sj, kry?kry.nama:'-', pt?pt.nama:'-', {printDirect:false});
    });
  });
}

/* ---------------------------------------------------------
   MENU: Backup / Restore / Reset
   --------------------------------------------------------- */
document.querySelectorAll('#modal-menu .menu-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const action = btn.dataset.action;
    if(action==='open-master'){
      closeModal();
      openModal('modal-master'); renderMasterPanel('kontraktor');
    } else if(action==='export-backup'){
      DB.exportBackup();
      showToast('Cadangan data berhasil diunduh.', 'success');
    } else if(action==='import-backup'){
      document.getElementById('import-file-input').click();
    } else if(action==='reset-all'){
      if(confirm('Yakin ingin menghapus SEMUA data? Sebaiknya unduh cadangan terlebih dahulu. Tindakan ini tidak bisa dibatalkan.')){
        DB.resetAll();
        data = DB.get();
        refreshAllSelects();
        initInputForm();
        initPengeluaranForm();
        initSuratJalanForm();
        renderInputView();
        closeModal();
        showToast('Semua data telah dihapus.', 'success');
      }
    }
  });
});

document.getElementById('import-file-input').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if(!confirm('Memulihkan cadangan akan MENGGANTI seluruh data saat ini. Lanjutkan?')){
      e.target.value = '';
      return;
    }
    const ok = DB.importBackup(reader.result);
    if(ok){
      data = DB.get();
      refreshAllSelects();
      initInputForm();
      initPengeluaranForm();
      initSuratJalanForm();
      renderInputView();
      closeModal();
      showToast('Data berhasil dipulihkan dari cadangan.', 'success');
    } else {
      showToast('File cadangan tidak valid.', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

/* ---------------------------------------------------------
   MASTER DATA MANAGEMENT
   --------------------------------------------------------- */
let currentMasterTab = 'kontraktor';

document.querySelectorAll('.master-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.master-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    currentMasterTab = tab.dataset.mtab;
    renderMasterPanel(currentMasterTab);
  });
});

function renderMasterPanel(tab){
  const panel = document.getElementById('master-panel');

  if(tab==='kontraktor'){
    panel.innerHTML = data.kontraktor.map(k=>{
      const jumlahPT = data.pt.filter(p=>p.kontraktorId===k.id).length;
      return `<div class="master-item-row">
        <div class="master-item-info"><div class="master-item-name">${k.nama}</div><div class="master-item-meta">${jumlahPT} subcon/warung</div></div>
        <div class="master-item-actions">
          <button class="icon-action edit" data-edit-kontraktor="${k.id}">✎</button>
          <button class="icon-action del" data-del-kontraktor="${k.id}">🗑</button>
        </div>
      </div>`;
    }).join('') + `<button class="add-master-btn" id="add-kontraktor-btn">+ Tambah Kontraktor</button>`;

    panel.querySelectorAll('[data-edit-kontraktor]').forEach(b=>b.addEventListener('click',()=>promptEditKontraktor(b.dataset.editKontraktor, {returnToMaster:true})));
    panel.querySelectorAll('[data-del-kontraktor]').forEach(b=>b.addEventListener('click',()=>deleteKontraktor(b.dataset.delKontraktor)));
    document.getElementById('add-kontraktor-btn').addEventListener('click', ()=>promptEditKontraktor(null, {returnToMaster:true}));
  }

  if(tab==='pt'){
    panel.innerHTML = data.pt.map(p=>{
      const kt = data.kontraktor.find(k=>k.id===p.kontraktorId);
      return `<div class="master-item-row">
        <div class="master-item-info"><div class="master-item-name">${p.nama}</div><div class="master-item-meta">${kt?kt.nama:'-'}</div></div>
        <div class="master-item-actions">
          <button class="icon-action edit" data-edit-pt="${p.id}">✎</button>
          <button class="icon-action del" data-del-pt="${p.id}">🗑</button>
        </div>
      </div>`;
    }).join('') + `<button class="add-master-btn" id="add-pt-btn">+ Tambah Subcon/Warung</button>`;

    panel.querySelectorAll('[data-edit-pt]').forEach(b=>b.addEventListener('click',()=>promptEditPT(b.dataset.editPt, {returnToMaster:true})));
    panel.querySelectorAll('[data-del-pt]').forEach(b=>b.addEventListener('click',()=>deletePT(b.dataset.delPt)));
    document.getElementById('add-pt-btn').addEventListener('click', ()=>promptEditPT(null, {returnToMaster:true}));
  }

  if(tab==='produk'){
    panel.innerHTML = data.produk.map(p=>{
      return `<div class="master-item-row">
        <div class="master-item-info"><div class="master-item-name">${p.nama}</div><div class="master-item-meta">${formatRupiah(p.harga)} / ${p.satuan}</div></div>
        <div class="master-item-actions">
          <button class="icon-action edit" data-edit-produk="${p.id}">✎</button>
          <button class="icon-action del" data-del-produk="${p.id}">🗑</button>
        </div>
      </div>`;
    }).join('') + `<button class="add-master-btn" id="add-produk-btn">+ Tambah Produk</button>`;

    panel.querySelectorAll('[data-edit-produk]').forEach(b=>b.addEventListener('click',()=>promptEditProduk(b.dataset.editProduk, {returnToMaster:true})));
    panel.querySelectorAll('[data-del-produk]').forEach(b=>b.addEventListener('click',()=>deleteProduk(b.dataset.delProduk)));
    document.getElementById('add-produk-btn').addEventListener('click', ()=>promptEditProduk(null, {returnToMaster:true}));
  }

  if(tab==='karyawan'){
    panel.innerHTML = data.karyawan.map(k=>{
      return `<div class="master-item-row">
        <div class="master-item-info"><div class="master-item-name">${k.nama}</div><div class="master-item-meta">${k.aktif===false?'Nonaktif':'Aktif'}</div></div>
        <div class="master-item-actions">
          <button class="icon-action edit" data-edit-karyawan="${k.id}">✎</button>
          <button class="icon-action del" data-del-karyawan="${k.id}">🗑</button>
        </div>
      </div>`;
    }).join('') + `<button class="add-master-btn" id="add-karyawan-btn">+ Tambah Karyawan</button>`;

    panel.querySelectorAll('[data-edit-karyawan]').forEach(b=>b.addEventListener('click',()=>promptEditKaryawan(b.dataset.editKaryawan, {returnToMaster:true})));
    panel.querySelectorAll('[data-del-karyawan]').forEach(b=>b.addEventListener('click',()=>deleteKaryawan(b.dataset.delKaryawan)));
    document.getElementById('add-karyawan-btn').addEventListener('click', ()=>promptEditKaryawan(null, {returnToMaster:true}));
  }
}

function genericFormModal(title, fieldsHtml, onSave){
  document.getElementById('modal-generic-title').textContent = title;
  document.getElementById('modal-generic-body').innerHTML = fieldsHtml + `<button class="btn-primary btn-full" id="generic-save-btn" style="margin-top:8px;">Simpan</button>`;
  openModal('modal-generic');
  document.getElementById('generic-save-btn').addEventListener('click', onSave);
}

// Kontraktor CRUD
function promptEditKontraktor(id, opts){
  opts = opts || {};
  const existing = id ? data.kontraktor.find(k=>k.id===id) : null;
  genericFormModal(existing?'Ubah Kontraktor':'Tambah Kontraktor', `
    <div class="field"><label>Nama Kontraktor</label><input type="text" id="gf-nama" value="${existing?existing.nama:''}" placeholder="Contoh: PT Taisei"></div>
  `, ()=>{
    const nama = document.getElementById('gf-nama').value.trim();
    if(!nama){ showToast('Nama tidak boleh kosong.', 'error'); return; }
    let record = existing;
    if(existing){ existing.nama = nama; }
    else { record = { id: uid('kt'), nama }; data.kontraktor.push(record); }
    DB.save();
    refreshAllSelects();
    closeModal();
    if(opts.returnToMaster){
      openModal('modal-master'); renderMasterPanel('kontraktor');
    } else if(!existing){
      document.getElementById('inp-kontraktor').value = record.id;
      fillPTSelectByKontraktor();
    }
    showToast('Kontraktor tersimpan.', 'success');
  });
}
function deleteKontraktor(id){
  const usedByPT = data.pt.some(p=>p.kontraktorId===id);
  if(usedByPT){ showToast('Tidak bisa dihapus: masih ada subcon/warung terkait.', 'error'); return; }
  if(confirm('Hapus kontraktor ini?')){
    data.kontraktor = data.kontraktor.filter(k=>k.id!==id);
    DB.save();
    refreshAllSelects();
    renderMasterPanel('kontraktor');
    showToast('Kontraktor dihapus.');
  }
}

// PT CRUD
function promptEditPT(id, opts){
  opts = opts || {};
  const existing = id ? data.pt.find(p=>p.id===id) : null;
  const options = data.kontraktor.map(k=>`<option value="${k.id}" ${existing&&existing.kontraktorId===k.id?'selected':(!existing && k.id===document.getElementById('inp-kontraktor').value?'selected':'')}>${k.nama}</option>`).join('');
  genericFormModal(existing?'Ubah Subcon/Warung':'Tambah Subcon/Warung', `
    <div class="field"><label>Nama</label><input type="text" id="gf-nama" value="${existing?existing.nama:''}" placeholder="Contoh: PT Nuk"></div>
    <div class="field"><label>Kontraktor Induk</label><select id="gf-kontraktor">${options}</select></div>
  `, ()=>{
    const nama = document.getElementById('gf-nama').value.trim();
    const kontraktorId = document.getElementById('gf-kontraktor').value;
    if(!nama){ showToast('Nama tidak boleh kosong.', 'error'); return; }
    let record = existing;
    if(existing){ existing.nama = nama; existing.kontraktorId = kontraktorId; }
    else { record = { id: uid('pt'), nama, kontraktorId }; data.pt.push(record); }
    DB.save();
    refreshAllSelects();
    closeModal();
    if(opts.returnToMaster){
      openModal('modal-master'); renderMasterPanel('pt');
    } else if(!existing){
      fillPTSelectByKontraktor();
      document.getElementById('inp-pt').value = record.id;
    }
    showToast('Data tersimpan.', 'success');
  });
}
function deletePT(id){
  const used = data.kiriman.some(k=>k.ptId===id);
  if(used){ showToast('Tidak bisa dihapus: sudah ada kiriman tercatat untuk PT ini.', 'error'); return; }
  if(confirm('Hapus data ini?')){
    data.pt = data.pt.filter(p=>p.id!==id);
    DB.save();
    refreshAllSelects();
    renderMasterPanel('pt');
    showToast('Data dihapus.');
  }
}

// Produk CRUD
function promptEditProduk(id, opts){
  opts = opts || {};
  const existing = id ? data.produk.find(p=>p.id===id) : null;
  genericFormModal(existing?'Ubah Produk':'Tambah Produk', `
    <div class="field"><label>Nama Produk</label><input type="text" id="gf-nama" value="${existing?existing.nama:''}" placeholder="Contoh: Aqua 600ml"></div>
    <div class="field"><label>Satuan</label><input type="text" id="gf-satuan" value="${existing?existing.satuan:'galon'}" placeholder="galon / dus / pcs"></div>
    <div class="field"><label>Harga Default (Rp)</label><input type="number" id="gf-harga" value="${existing?existing.harga:''}" placeholder="0"></div>
  `, ()=>{
    const nama = document.getElementById('gf-nama').value.trim();
    const satuan = document.getElementById('gf-satuan').value.trim() || 'unit';
    const harga = Number(document.getElementById('gf-harga').value)||0;
    if(!nama){ showToast('Nama tidak boleh kosong.', 'error'); return; }
    let record = existing;
    if(existing){ existing.nama = nama; existing.satuan = satuan; existing.harga = harga; }
    else { record = { id: uid('pr'), nama, satuan, harga }; data.produk.push(record); }
    DB.save();
    refreshAllSelects();
    closeModal();
    if(opts.returnToMaster){
      openModal('modal-master'); renderMasterPanel('produk');
    } else if(!existing){
      document.getElementById('inp-produk').value = record.id;
      document.getElementById('inp-harga').value = record.harga;
      updateSubtotalPreview();
    }
    showToast('Produk tersimpan.', 'success');
  });
}
function deleteProduk(id){
  const used = data.kiriman.some(k=>k.produkId===id);
  if(used){ showToast('Tidak bisa dihapus: sudah dipakai di catatan kiriman.', 'error'); return; }
  if(confirm('Hapus produk ini?')){
    data.produk = data.produk.filter(p=>p.id!==id);
    DB.save();
    refreshAllSelects();
    renderMasterPanel('produk');
    showToast('Produk dihapus.');
  }
}

// Karyawan CRUD
function promptEditKaryawan(id, opts){
  opts = opts || {};
  const existing = id ? data.karyawan.find(k=>k.id===id) : null;
  genericFormModal(existing?'Ubah Karyawan':'Tambah Karyawan', `
    <div class="field"><label>Nama Karyawan</label><input type="text" id="gf-nama" value="${existing?existing.nama:''}" placeholder="Nama lengkap"></div>
  `, ()=>{
    const nama = document.getElementById('gf-nama').value.trim();
    if(!nama){ showToast('Nama tidak boleh kosong.', 'error'); return; }
    let record = existing;
    if(existing){ existing.nama = nama; }
    else { record = { id: uid('kr'), nama, aktif:true }; data.karyawan.push(record); }
    DB.save();
    refreshAllSelects();
    closeModal();
    if(opts.returnToMaster){
      openModal('modal-master'); renderMasterPanel('karyawan');
    } else if(!existing){
      document.getElementById('inp-karyawan').value = record.id;
    }
    showToast('Karyawan tersimpan.', 'success');
  });
}
function deleteKaryawan(id){
  if(confirm('Nonaktifkan karyawan ini? (Riwayat tetap tersimpan)')){
    const k = data.karyawan.find(x=>x.id===id);
    if(k) k.aktif = false;
    DB.save();
    refreshAllSelects();
    renderMasterPanel('karyawan');
    showToast('Karyawan dinonaktifkan.');
  }
}

// Quick-add buttons on Input form
document.querySelectorAll('[data-action="add-karyawan"]').forEach(b=>b.addEventListener('click', ()=>promptEditKaryawan(null)));
document.querySelectorAll('[data-action="add-kontraktor"]').forEach(b=>b.addEventListener('click', ()=>promptEditKontraktor(null)));
document.querySelectorAll('[data-action="add-pt"]').forEach(b=>b.addEventListener('click', ()=>promptEditPT(null)));
document.querySelectorAll('[data-action="add-produk"]').forEach(b=>b.addEventListener('click', ()=>promptEditProduk(null)));

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
function init(){
  refreshAllSelects();
  initInputForm();
  initPengeluaranForm();
  initSuratJalanForm();
  renderInputView();

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}
init();
