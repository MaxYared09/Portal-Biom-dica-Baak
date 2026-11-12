const assetSites=['CDMX','Guanajuato','Querétaro'];
function normalizedAssetSite(site){const s=String(site||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return ({cdmx:'CDMX',leon:'Guanajuato',guanajuato:'Guanajuato',queretaro:'Querétaro'})[s]||''}
function assetChoice(label,name,options,value){return `<label>${label}<select name="${name}" required>${options.includes(value)?'':'<option value="" selected disabled>Selecciona una opción</option>'}${options.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`}
function assetEdits(e,form){
 const keys=['name','category','brand','model','serial','site','location','status','assetType','inventoryCode','notes'];
 const values=Object.fromEntries(keys.map(k=>[k,String(form.get(k)||'').trim()]));
 values.assetType=values.category;
 if(!assetTypes.includes(values.category)||!assetSites.includes(values.site))throw Error('Selecciona una categoría y sede de las opciones disponibles.');
 for(const k of ['name','category','location'])if(!values[k])throw Error('Completa nombre, categoría y ubicación.');
 if(!assetTypes.includes(values.assetType)||!states.includes(values.status))throw Error('Selecciona una clasificación y un estado válidos.');
 if(values.inventoryCode&&data.some(other=>other.id!==e.id&&(other.inventoryCode||other.id).toLowerCase()===values.inventoryCode.toLowerCase()))throw Error('Ese código de inventario ya pertenece a otro activo.');
 const updated={...e,...values};
 if(e.category&&!assetTypes.includes(e.category)&&!e.originalCategory)updated.originalCategory=e.category;
 if(e.location!==values.location||e.status!==values.status)updated.moves=[...(e.moves||[]),{location:values.location,status:values.status,person:'Edición manual de ficha',date:today()}];
 updated.updatedAt=new Date().toISOString();
 return updated;
}
function editAsset(e){
 modal('Editar datos del activo',
 '<p class="muted">Modifica los datos del equipo o instrumental. Los cambios se guardan en este navegador.</p>'+
 input('Identificador del expediente (permanente)','fixedId','text',e.id,false).replace('name="fixedId"','name="fixedId" readonly')+
 '<p class="muted">El identificador mantiene el enlace y el QR del expediente. Puedes modificar el código de inventario de abajo.</p>'+
 input('Código de inventario','inventoryCode','text',e.inventoryCode||e.id,false)+
 input('Nombre del equipo, pieza o conjunto','name','text',e.name)+
 assetChoice('Categoría','category',assetTypes,assetType(e))+
 input('Marca','brand','text',e.brand||'',false)+
 input('Modelo / referencia','model','text',e.model||'',false)+
 input('Número de serie','serial','text',e.serial||'',false)+
 assetChoice('Sede','site',assetSites,normalizedAssetSite(e.site))+
 input('Ubicación actual','location','text',e.location)+
 select('Estado operativo','status',[e.status,...states.filter(s=>s!==e.status)])+surgeryFields(e)+
 `<label>Observaciones del activo<textarea name="notes" rows="4">${esc(e.notes||'')}</textarea></label>`,
 form=>{
 const updated=withHospitalDestination(e,assetEdits(e,form),form),previous=data;
 data=data.map(row=>row.id===e.id?updated:row);
 try{save()}catch(err){data=previous;throw err}
 const params=new URLSearchParams(location.hash.slice(1));
 if(params.get('vista')==='maintenance'){params.set('grupo',updated.assetType==='Instrumental'?'instrumental':'equipo');history.replaceState(null,'',location.pathname+'#'+params)}
 });
}
document.addEventListener('click',ev=>{if(!ev.target.closest('[data-edit-asset]'))return;const e=data.find(row=>row.id===new URLSearchParams(location.hash.slice(1)).get('equipo'));if(e)editAsset(e)});
