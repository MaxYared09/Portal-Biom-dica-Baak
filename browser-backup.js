/* Export an administrator's shared records without touching the old local backup. */
(()=>{
 const button=document.createElement('button');button.id='cloud-backup';button.type='button';button.textContent='Descargar respaldo compartido';
 const status=document.createElement('span');status.setAttribute('role','status');
 document.querySelector('.notice').append(button,status);
 button.onclick=async()=>{
  button.disabled=true;status.textContent=' Preparando respaldo…';
  try{const backup=await PortalCloud.backup();download('Respaldo-Biomedica-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',JSON.stringify(backup),'application/json');status.textContent=' Respaldo preparado: '+backup.snapshot.inventory.length+' activos y '+backup.files.length+' adjuntos.';}
  catch(error){status.textContent=' No se completó el respaldo: '+error.message;}
  finally{button.disabled=false;}
 };
})();
