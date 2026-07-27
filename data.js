/* =========================================================
   Water Express - Data Layer
   Semua data disimpan di localStorage, auto-save tiap perubahan.
   ========================================================= */

const STORAGE_KEY = 'we_data_v1';

function uid(prefix){
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function todayISO(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off*60000).toISOString().slice(0,10);
}

function formatRupiah(n){
  n = Math.round(Number(n)||0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggalPanjang(iso){
  if(!iso) return '-';
  const d = new Date(iso+'T00:00:00');
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTanggalSingkat(iso){
  if(!iso) return '-';
  const d = new Date(iso+'T00:00:00');
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------------------------------------------------------
   Default master data — dibangun dari brief & sheet asli
   --------------------------------------------------------- */
function defaultData(){
  const kontraktorId1 = uid('kt');
  const kontraktorId2 = uid('kt');
  const kontraktorId3 = uid('kt');

  const ptTaisei = uid('pt');
  const ptNuk = uid('pt');
  const ptEnggal = uid('pt');

  const karyawan1 = uid('kr');

  const produkList = [
    { id: uid('pr'), nama: 'Air Aqua 19L', satuan: 'galon', harga: 25000 },
    { id: uid('pr'), nama: 'Air Isi Ulang 19L', satuan: 'galon', harga: 10000 },
    { id: uid('pr'), nama: 'Aqua 330ml (dus)', satuan: 'dus', harga: 52000 },
    { id: uid('pr'), nama: 'Aqua 600ml (dus)', satuan: 'dus', harga: 55000 },
    { id: uid('pr'), nama: 'Aqua 1,5L (dus)', satuan: 'dus', harga: 62000 },
    { id: uid('pr'), nama: 'Aqua Cup 240ml (dus)', satuan: 'dus', harga: 46000 },
    { id: uid('pr'), nama: 'Le Minerale 15L', satuan: 'galon', harga: 24000 },
    { id: uid('pr'), nama: 'Le Minerale 330ml (dus)', satuan: 'dus', harga: 52000 },
    { id: uid('pr'), nama: 'Le Minerale 600ml (dus)', satuan: 'dus', harga: 55000 },
    { id: uid('pr'), nama: 'Le Minerale 1,5L (dus)', satuan: 'dus', harga: 60000 },
  ];

  return {
    meta: {
      companyName: 'Depot Air Galon Water Express',
      companyAddress: 'Jl. H. Nibon Kp. Cicau RT.001 RW.001 Ds. Cicau, Cikarang Pusat - Bekasi',
      companyPhone: '0819-2747-7544 (Naman / Ancung)',
      lastInvoiceNumber: 0,
      lastSJNumber: 0,
    },
    kontraktor: [
      { id: kontraktorId1, nama: 'PT Taisei' },
      { id: kontraktorId2, nama: 'Pulau Intan' },
      { id: kontraktorId3, nama: 'Deltamas' },
    ],
    pt: [
      { id: ptTaisei, nama: 'PT Taisei Pulau Intan', kontraktorId: kontraktorId1 },
      { id: ptNuk, nama: 'PT Nuk', kontraktorId: kontraktorId1 },
      { id: ptEnggal, nama: 'PT Enggal Family', kontraktorId: kontraktorId1 },
    ],
    produk: produkList,
    karyawan: [
      { id: karyawan1, nama: 'Karyawan 1', aktif: true },
    ],
    kiriman: [],       // {id, tanggal, karyawanId, kontraktorId, ptId, produkId, jumlah, harga, catatan, subtotal, invoiced:false}
    pengeluaran: [],   // {id, tanggal, jenis, karyawanId, jumlah, keterangan}
    invoiceHistory: [],// {id, nomor, ptId, tanggal, items:[...kiriman snapshot], total}
    suratJalanHistory: [], // {id, nomor, tanggal, karyawanId, ptId, items:[{produkId,jumlah}], catatan}
  };
}

/* ---------------------------------------------------------
   Storage engine
   --------------------------------------------------------- */
const DB = {
  _data: null,

  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        this._data = JSON.parse(raw);
        this._migrate();
      } else {
        this._data = defaultData();
        this.save();
      }
    }catch(e){
      console.error('Gagal memuat data, memakai data default.', e);
      this._data = defaultData();
    }
    return this._data;
  },

  _migrate(){
    // Pastikan semua field ada walau data lama
    const d = defaultData();
    for(const k in d){
      if(!(k in this._data)) this._data[k] = d[k];
    }
  },

  save(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      return true;
    }catch(e){
      console.error('Gagal menyimpan data', e);
      showToast('Gagal menyimpan data! Penyimpanan mungkin penuh.', 'error');
      return false;
    }
  },

  get(){ return this._data; },

  exportBackup(){
    const blob = new Blob([JSON.stringify(this._data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `water-express-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  importBackup(jsonStr){
    try{
      const parsed = JSON.parse(jsonStr);
      if(!parsed || typeof parsed !== 'object' || !('kiriman' in parsed)){
        throw new Error('Format file tidak sesuai');
      }
      this._data = parsed;
      this._migrate();
      this.save();
      return true;
    }catch(e){
      console.error(e);
      return false;
    }
  },

  resetAll(){
    this._data = defaultData();
    this.save();
  }
};
