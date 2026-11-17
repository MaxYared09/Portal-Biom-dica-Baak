let portalTrash=[];
/* Shared portal persistence. Only the publishable API key belongs in this file. */
const PortalCloud = (() => {
 'use strict';
 const api = 'https://iabapmeuipdglxjdwjnz.supabase.co';
 const publicKey = 'sb_publishable_0GcsKddGgeWWUBQ-ST21YQ_1K5_ANxR';
 const mutations = '[data-open-trash],[data-remove-asset],[data-remove-doc],[data-restore-removed],[data-classify],[data-new],[data-move],[data-service],[data-doc],[data-edit-asset],[data-hospital-destination],[data-upload-qr],[data-switch-qr],[data-assign-order],[data-service-order],[data-schedule-order],[data-module-new],[data-module-edit],[data-module-note],[data-module-file]';
 let client, revision = 0, refreshing = false, authGeneration = 0;
 const state = {ready:false, admin:false, busy:false};
 const message = text => {document.querySelector('#cloud-status').textContent=text;};
 function snapshot(){return structuredClone({inventory:data,training:collections.training,projects:collections.projects,orderLinks,trash:portalTrash});}
 function restore(payload){data=structuredClone(payload.inventory);collections.training=structuredClone(payload.training||[]);collections.projects=structuredClone(payload.projects||[]);orderLinks=structuredClone(payload.orderLinks||{});portalTrash=structuredClone(payload.trash||[]);}
 function assertAdmin(){if(!state.ready||!state.admin)throw Error('Inicia sesión con la cuenta administradora para editar.');}
 function applyAccess(){
  document.body.classList.toggle('portal-admin',state.admin);
  document.querySelector('#account-status').textContent=state.admin?'Administrador':'Solo consulta';
  document.querySelector('#account-button').textContent=state.admin?'Cerrar sesión':'Iniciar sesión para editar';
 }
 async function checkAccess(){
  const generation=++authGeneration;
  const {data:result,error}=await client.auth.getUser();
  let allowed=false;
  if(!error&&result.user){const query=await client.from('portal_admin').select('user_id').eq('user_id',result.user.id).maybeSingle();allowed=!query.error&&!!query.data;}
  if(generation===authGeneration){state.admin=allowed;applyAccess();}
  return allowed;
 }
 async function refresh(){
  if(refreshing||state.busy||document.querySelector('#modal').open)return;
  refreshing=true;
  try{
   const {data:row,error}=await client.from('portal_state').select('payload,revision').eq('id',1).single();
   if(error)throw error;
   if(!row||!Array.isArray(row.payload?.inventory))throw Error('Respuesta de inventario inválida.');
   // A form may have opened while the request was in flight.
   if(state.busy||document.querySelector('#modal').open)return;
   const changed=!state.ready||revision!==row.revision;
   if(changed){restore(row.payload);revision=row.revision;state.ready=true;render();}
   message('Inventario compartido · Cambios confirmados en línea · Adjuntos nuevos: acceso de administrador.');
  }catch(error){message(state.ready?'Sin conexión al guardado compartido. Los cambios no se confirmarán hasta recuperar la conexión.':'No se pudo cargar el inventario compartido. Se reintentará automáticamente.');}
  finally{refreshing=false;}
 }
 async function commit(){
  assertAdmin();
  const {data:rows,error}=await client.from('portal_state').update({payload:snapshot(),revision:revision+1}).eq('id',1).eq('revision',revision).select('revision');
  if(error)throw Error('No se confirmó el guardado. Comprueba la conexión y vuelve a abrir el registro.');
  if(rows?.length!==1)throw Error('El inventario cambió en otra ventana o tu permiso venció. Actualiza la página y vuelve a intentar.');
  revision=rows[0].revision;
  message('Guardado compartido confirmado · '+new Date().toLocaleTimeString('es-MX'));
 }
 function encode(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.readAsDataURL(file);});}
 async function putFile(id,file){
  assertAdmin();
  if(!file.size||file.size>20*1024*1024)throw Error('El archivo debe tener entre 1 byte y 20 MB.');
  const {error}=await client.from('portal_files').insert({id,name:file.name,mime_type:file.type||'application/octet-stream',size:file.size,data_url:await encode(file)});
  if(error)throw Error('No se pudo subir el adjunto. Comprueba la conexión y tu sesión.');
 }
 async function getFile(id){
  assertAdmin();
  const {data:row,error}=await client.from('portal_files').select('name,mime_type,data_url').eq('id',id).single();
  if(error||!row)throw Error('No se pudo abrir el adjunto. Comprueba tu sesión de administrador.');
  const blob=await (await fetch(row.data_url)).blob();
  return new File([blob],row.name,{type:row.mime_type});
 }
 async function backup(){
  assertAdmin();
  const copy=snapshot();const files=[];
  // Fetch only referenced files; original GitHub documents stay in the repository.
  const ids=new Set();
  for(const list of [copy.inventory,copy.training,copy.projects])for(const item of list){for(const d of item.docs||[])if(d.id)ids.add(d.id);if(item.customQR?.id)ids.add(item.customQR.id);}
  for(const entry of copy.trash||[]){if(entry.kind==='asset'){for(const doc of entry.record.docs||[])if(doc.id)ids.add(doc.id);if(entry.record.customQR?.id)ids.add(entry.record.customQR.id);}else if(entry.record.id)ids.add(entry.record.id);}
  for(const id of ids){const file=await getFile(id);files.push({key:id,name:file.name,type:file.type,size:file.size,dataUrl:await encode(file)});}
  return {format:'baak-browser-backup',version:2,createdAt:new Date().toISOString(),origin:location.origin,path:location.pathname,snapshot:copy,files,missingFileIds:[],localStorage:{},note:'Respaldo de datos compartidos. Los documentos originales de GitHub permanecen en el repositorio.'};
 }
 async function start(){
  applyAccess();
  document.addEventListener('click',event=>{
   if(event.target.closest(mutations)&&(!state.admin||!state.ready||state.busy)){event.preventDefault();event.stopImmediatePropagation();toast(state.busy?'Espera a que termine el guardado.':'Inicia sesión como administrador para editar.');}
  },true);
  const dialog=document.querySelector('#login-dialog'),form=document.querySelector('#login-form');
  document.querySelector('#account-button').onclick=async()=>{
   if(state.busy){toast('Espera a que termine el guardado.');return;}
   if(!client){toast('No se pudo cargar el inicio de sesión. Actualiza la página.');return;}
   if(state.admin){
    const {error}=await client.auth.signOut();
    if(error){toast('No se pudo cerrar la sesión. Intenta de nuevo.');return;}
    state.admin=false;applyAccess();document.querySelector('#modal').close();toast('Sesión cerrada');
   }else{form.reset();document.querySelector('#login-error').textContent='';dialog.showModal();}
  };
  document.querySelector('#login-cancel').onclick=()=>dialog.close();
  form.onsubmit=async event=>{
   event.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;document.querySelector('#login-error').textContent='';
   try{
    const fields=new FormData(form);
    const {error}=await client.auth.signInWithPassword({email:String(fields.get('email')).trim(),password:fields.get('password')});
    if(error)throw Error('No se pudo iniciar sesión. Revisa tu correo y contraseña.');
    if(!await checkAccess()){await client.auth.signOut();throw Error('Esta cuenta no tiene permiso de edición.');}
    form.reset();dialog.close();toast('Sesión de administrador iniciada');await refresh();
   }catch(error){document.querySelector('#login-error').textContent=error.message;}
   finally{submit.disabled=false;}
  };
  try{
   if(!window.supabase)throw Error('No se cargó el servicio de sesión.');
   client=window.supabase.createClient(api,publicKey,{auth:{storageKey:'baak-portal-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   client.auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'){state.admin=false;applyAccess();}
    else setTimeout(()=>checkAccess().catch(()=>{state.admin=false;applyAccess();}),0);
   });
   await Promise.all([refresh(),checkAccess()]);
   setInterval(()=>{if(!document.hidden)refresh();},30000);
   window.addEventListener('focus',()=>{refresh();checkAccess().catch(()=>{state.admin=false;applyAccess();});});
  }catch(error){message('No se pudo conectar al portal. Actualiza la página para reintentar.');}
 }
 return Object.assign(state,{snapshot,restore,assertAdmin,refresh,commit,putFile,getFile,backup,start});
})();
