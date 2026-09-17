let me=null, editingId=null;
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);

async function init(){
  if(SUPABASE_URL.startsWith("PASTE_")) return msg("Isi config.js terlebih dahulu.");
  const {data:{session}}=await sb.auth.getSession();
  if(session) await enter(session.user); else showLogin();
  sb.auth.onAuthStateChange(async(_e,session)=>{if(session) await enter(session.user); else showLogin();});
}
function msg(t){$("authMsg").textContent=t}
function showLogin(){$("loginView").classList.remove("hidden");$("registerView").classList.add("hidden");$("app").classList.add("hidden")}
$("showRegister").onclick=()=>{$("loginView").classList.add("hidden");$("registerView").classList.remove("hidden")}
$("backLogin").onclick=showLogin;

$("loginForm").onsubmit=async e=>{
 e.preventDefault();msg("Memeriksa...");
 const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error)msg(error.message);
};
$("registerForm").onsubmit=async e=>{
 e.preventDefault();$("regMsg").textContent="Mendaftarkan...";
 const {data,error}=await sb.auth.signUp({email:$("regEmail").value.trim(),password:$("regPassword").value,options:{data:{nama:$("regNama").value.trim()}}});
 if(error){$("regMsg").textContent=error.message;return}
 $("regMsg").textContent=data.session?"Akun dibuat.":"Akun dibuat. Jika verifikasi email aktif, cek email lalu login.";
};
$("logoutBtn").onclick=()=>sb.auth.signOut();

async function enter(user){
 const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).single();
 if(error){msg(error.message);return}
 me=data;
 $("loginView").classList.add("hidden");$("registerView").classList.add("hidden");$("app").classList.remove("hidden");
 $("userInfo").textContent=`${me.nama} • ${me.role==="admin"?"Admin/Bendahara":"Warga"}`;
 document.querySelectorAll(".admin-only").forEach(x=>x.style.display=me.role==="admin"?"":"none");
 await renderAll();
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.tab-content").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");if(b.dataset.tab==="laporan")renderReport()});

async function getAll(){
 const [k,w,c]=await Promise.all([
  sb.from("kas").select("*").order("tanggal",{ascending:false}),
  sb.from("profiles").select("*").order("nama"),
  sb.from("cicilan").select("*").order("tanggal",{ascending:false})
 ]);
 if(k.error||w.error||c.error) throw new Error(k.error?.message||w.error?.message||c.error?.message);
 return {kas:k.data,warga:w.data,cicilan:c.data};
}
async function renderAll(){try{const d=await getAll();renderDashboard(d);renderKas(d);renderWarga(d);renderCicilan(d);renderReport(d)}catch(e){alert(e.message)}}

function renderDashboard(d){
 const masuk=d.kas.filter(x=>x.jenis==="masuk").reduce((a,b)=>a+Number(b.nominal),0),keluar=d.kas.filter(x=>x.jenis==="keluar").reduce((a,b)=>a+Number(b.nominal),0);
 $("saldo").textContent=rupiah(masuk-keluar);$("masuk").textContent=rupiah(masuk);$("keluar").textContent=rupiah(keluar);$("jumlahWarga").textContent=d.warga.length;
 $("recentKas").innerHTML=d.kas.slice(0,5).map(x=>`<p>${x.tanggal} — ${esc(x.keterangan)} — <b class="${x.jenis==="masuk"?"in":"out"}">${x.jenis==="masuk"?"+":"-"}${rupiah(x.nominal)}</b></p>`).join("")||"<p class='muted'>Belum ada transaksi.</p>";
}
function renderKas(d){
 $("kasBody").innerHTML=d.kas.map(x=>`<tr><td>${x.tanggal}</td><td>${x.jenis==="masuk"?"Masuk":"Keluar"}</td><td>${esc(x.keterangan)}</td><td class="${x.jenis==="masuk"?"in":"out"}">${rupiah(x.nominal)}</td><td>${adminActions("kas",x.id)}</td></tr>`).join("");
}
function renderWarga(d){
 $("wargaBody").innerHTML=d.warga.map(x=>{
  const total=Number(x.total_cicilan)||0;
  const dibayar=d.cicilan.filter(c=>c.warga_id===x.id).reduce((s,c)=>s+Number(c.nominal||0),0);
  const sisa=Math.max(total-dibayar,0);
  return `<tr><td>${esc(x.nama)}</td><td>${esc(x.alamat||"")}</td><td>${esc(x.hp||"")}</td><td>${rupiah(total)}</td><td>${rupiah(dibayar)}</td><td>${rupiah(sisa)}</td><td>${adminActions("warga",x.id)}</td></tr>`;
 }).join("");
}
function renderCicilan(d){
 $("cicilanBody").innerHTML=d.cicilan.map(x=>{let w=d.warga.find(z=>z.id===x.warga_id);return `<tr><td>${x.tanggal}</td><td>${esc(w?.nama||"Warga")}</td><td>${x.ke}</td><td>${rupiah(x.nominal)}</td><td>${esc(x.keterangan||"")}</td><td>${adminActions("cicilan",x.id)}</td></tr>`}).join("");
}
function adminActions(type,id){return me.role==="admin"?`<div class="actions"><button class="btn small" onclick="editItem('${type}','${id}')">Edit</button><button class="btn small danger" onclick="deleteItem('${type}','${id}')">Hapus</button></div>`:"-"}

function openModal(title,html,fn){$("modalTitle").textContent=title;$("modalForm").innerHTML=html;$("modalForm").onsubmit=e=>{e.preventDefault();fn(new FormData(e.target))};$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden");editingId=null}
$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};

$("addKas").onclick=()=>openKas();$("addWarga").onclick=()=>openWarga();$("addCicilan").onclick=()=>openCicilan();

async function openKas(id=null){
 let x=id?(await sb.from("kas").select("*").eq("id",id).single()).data:{};
 openModal(id?"Edit Kas":"Tambah Kas",`<label>Tanggal</label><input name="tanggal" type="date" value="${x?.tanggal||today()}" required><label>Jenis</label><select name="jenis"><option value="masuk" ${x?.jenis==="masuk"?"selected":""}>Kas Masuk</option><option value="keluar" ${x?.jenis==="keluar"?"selected":""}>Kas Keluar</option></select><label>Keterangan</label><input name="keterangan" value="${esc(x?.keterangan||"")}" required><label>Nominal</label><input name="nominal" type="number" min="0" value="${x?.nominal||""}" required><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Batal</button><button class="btn primary">Simpan</button></div>`,async f=>{
 const row={tanggal:f.get("tanggal"),jenis:f.get("jenis"),keterangan:f.get("keterangan"),nominal:Number(f.get("nominal")),created_by:me.id};
 const r=id?await sb.from("kas").update(row).eq("id",id):await sb.from("kas").insert(row);if(r.error)alert(r.error.message);else{closeModal();renderAll()}});
}
async function openWarga(id=null){
 let x=id?(await sb.from("profiles").select("*").eq("id",id).single()).data:{};
 openModal(id?"Edit Warga":"Tambah Warga",`<label>Nama</label><input name="nama" value="${esc(x?.nama||"")}" required><label>Alamat</label><input name="alamat" value="${esc(x?.alamat||"")}"><label>No. HP</label><input name="hp" value="${esc(x?.hp||"")}"><label>Total Cicilan</label><input name="total_cicilan" type="number" min="0" value="${x?.total_cicilan||0}" required><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Batal</button><button class="btn primary">Simpan</button></div>`,async f=>{
 const row={nama:f.get("nama"),alamat:f.get("alamat"),hp:f.get("hp"),total_cicilan:Number(f.get("total_cicilan")||0)};const r=id?await sb.from("profiles").update(row).eq("id",id):await sb.from("profiles").insert({...row,id:crypto.randomUUID()});
 if(r.error)alert(r.error.message);else{closeModal();renderAll()}});
}
async function openCicilan(id=null){
 const {data:warga}=await sb.from("profiles").select("id,nama").order("nama");let x=id?(await sb.from("cicilan").select("*").eq("id",id).single()).data:{};
 openModal(id?"Edit Cicilan":"Tambah Cicilan",`<label>Tanggal</label><input name="tanggal" type="date" value="${x?.tanggal||today()}" required><label>Warga</label><select name="warga_id">${warga.map(w=>`<option value="${w.id}" ${x?.warga_id===w.id?"selected":""}>${esc(w.nama)}</option>`).join("")}</select><label>Cicilan ke</label><input name="ke" type="number" min="1" value="${x?.ke||1}" required><label>Nominal</label><input name="nominal" type="number" min="0" value="${x?.nominal||""}" required><label>Keterangan</label><input name="keterangan" value="${esc(x?.keterangan||"")}"><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Batal</button><button class="btn primary">Simpan</button></div>`,async f=>{
 const row={tanggal:f.get("tanggal"),warga_id:f.get("warga_id"),ke:Number(f.get("ke")),nominal:Number(f.get("nominal")),keterangan:f.get("keterangan"),created_by:me.id};
 const r=id?await sb.from("cicilan").update(row).eq("id",id):await sb.from("cicilan").insert(row);if(r.error)alert(r.error.message);else{closeModal();renderAll()}});
}
function editItem(t,id){if(t==="kas")openKas(id);else if(t==="warga")openWarga(id);else openCicilan(id)}
async function deleteItem(t,id){if(!confirm("Hapus data ini?"))return;const table=t==="kas"?"kas":t==="warga"?"profiles":"cicilan";const r=await sb.from(table).delete().eq("id",id);if(r.error)alert(r.error.message);else renderAll()}

function renderReport(d){
 const masuk=d.kas.filter(x=>x.jenis==="masuk").reduce((a,b)=>a+Number(b.nominal),0),keluar=d.kas.filter(x=>x.jenis==="keluar").reduce((a,b)=>a+Number(b.nominal),0);
 $("report").innerHTML=`<h2>Laporan Kas Warga RT 08</h2><p>Dibuat: ${new Date().toLocaleString("id-ID")}</p><p><b>Saldo:</b> ${rupiah(masuk-keluar)} | <b>Masuk:</b> ${rupiah(masuk)} | <b>Keluar:</b> ${rupiah(keluar)}</p><h3>Kas</h3><table><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Nominal</th></tr>${d.kas.map(x=>`<tr><td>${x.tanggal}</td><td>${x.jenis}</td><td>${esc(x.keterangan)}</td><td>${rupiah(x.nominal)}</td></tr>`).join("")}</table><h3>Cicilan</h3><table><tr><th>Tanggal</th><th>Warga</th><th>Ke</th><th>Nominal</th></tr>${d.cicilan.map(x=>{let w=d.warga.find(z=>z.id===x.warga_id);return `<tr><td>${x.tanggal}</td><td>${esc(w?.nama||"")}</td><td>${x.ke}</td><td>${rupiah(x.nominal)}</td></tr>`}).join("")}</table>`;
}
$("printBtn").onclick=()=>window.print();
init();
