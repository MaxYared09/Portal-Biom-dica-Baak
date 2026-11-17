/* Reversible removal. Files remain stored so an administrator can restore them. */
function removalParent(kind,id){return (kind==='inventory'?data:collections[kind]||[]).find(r=>r.id===id)}
function trashAsset(id){
 PortalCloud.assertAdmin();const asset=removalParent('inventory',id);if(!asset)throw Error('El activo ya no está en el inventario.');
 portalTrash.push({id:crypto.randomUUID(),kind:'asset',deletedAt:new Date().toISOString(),record:structuredClone(asset)});
 data=data.filter(r=>r.id!==id);
}
function trashDocument(kind,parentId,id){
 PortalCloud.assertAdmin();const parent=removalParent(kind,parentId),doc=parent?.docs?.find(d=>d.id===id);
 if(!doc)throw Error('El documento ya no está en este expediente.');
 portalTrash.push({id:crypto.randomUUID(),kind:'document',scope:kind,parentId,parentName:parent.name,deletedAt:new Date().toISOString(),record:structuredClone(doc)});
 parent.docs=parent.docs.filter(d=>d.id!==id);
}
function restoreRemoved(id){
 PortalCloud.assertAdmin();const entry=portalTrash.find(e=>e.id===id);if(!entry)throw Error('Este elemento ya fue restaurado.');
 if(entry.kind==='asset'){
  if(data.some(r=>r.id===entry.record.id||(r.inventoryCode||r.id).toLowerCase()===(entry.record.inventoryCode||entry.record.id).toLowerCase()))throw Error('Ya existe un activo con ese identificador o código. Corrígelo antes de restaurar.');
  data.push(structuredClone(entry.record));
 }else{
  const parent=removalParent(entry.scope,entry.parentId);if(!parent)throw Error('Primero restaura el activo al que pertenece el documento.');
  if((parent.docs||[]).some(d=>d.id===entry.record.id))throw Error('El documento ya está en el expediente.');
  parent.docs=[...(parent.docs||[]),structuredClone(entry.record)];
 }
 portalTrash=portalTrash.filter(e=>e.id!==id);
}
function confirmRemoval(title,description,action){
 modal(title,`<p>${description}</p><p>Podrás recuperarlo desde <b>Papelera</b>. Esta acción no borra definitivamente los archivos.</p><label><input type="checkbox" name="confirmRemoval" required> Confirmo que quiero mover este elemento a la papelera.</label>`,f=>{if(!f.get('confirmRemoval'))throw Error('Confirma la acción para continuar.');action();});
}
function removalButtons(kind,r){
 const content=$('#content');
 if(kind==='inventory'){
  const area=content.querySelector('.heading');if(area){const b=document.createElement('button');b.type='button';b.className='remove-control';b.dataset.removeAsset=r.id;b.textContent='Eliminar activo';area.append(b);}
 }
 content.querySelectorAll('[data-preview-pdf],[data-pdf]').forEach(open=>{
  const id=open.dataset.previewPdf||open.dataset.pdf;if(!(r.docs||[]).some(d=>d.id===id))return;
  const b=document.createElement('button');b.type='button';b.className='linkbtn remove-control';b.dataset.removeDoc=id;b.dataset.removeScope=kind;b.dataset.removeParent=r.id;b.textContent='Eliminar documento';open.insertAdjacentElement('afterend',b);
 });
}
const detailBeforeRemoval=detail;
detail=function(e){detailBeforeRemoval(e);removalButtons('inventory',e)};
const moduleDetailBeforeRemoval=renderModuleDetail;
renderModuleDetail=function(kind,r){moduleDetailBeforeRemoval(kind,r);removalButtons(kind,r)};
const trashDialog=document.createElement('dialog');trashDialog.id='portal-trash';trashDialog.setAttribute('aria-label','Papelera');document.body.append(trashDialog);
function showPortalTrash(){
 PortalCloud.assertAdmin();
 trashDialog.innerHTML='<div class="modalhead"><h2>Papelera</h2><button type="button" data-close-trash aria-label="Cerrar papelera">×</button></div><div class="cardbody"><p>Los elementos de esta lista están fuera de los registros activos. Puedes restaurarlos; no se eliminan definitivamente.</p>'+([...portalTrash].reverse().map(e=>`<div class="row"><div><b>${esc(e.record.title||e.record.name||e.record.id)}</b><small>${e.kind==='asset'?'Activo · '+esc(e.record.id):'Documento · '+esc(e.parentName)} · ${fmt(e.deletedAt.slice(0,10))}</small></div><button type="button" data-restore-removed="${esc(e.id)}">Restaurar</button></div>`).join('')||'<p>La papelera está vacía.</p>')+'</div>';
 trashDialog.showModal();
}
const trashButton=document.createElement('button');trashButton.type='button';trashButton.className='remove-control';trashButton.dataset.openTrash='';trashButton.textContent='Papelera';document.querySelector('.account-controls').append(trashButton);
document.addEventListener('click',ev=>{
 const b=ev.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-close-trash')){trashDialog.close();return;}
 if(b.hasAttribute('data-open-trash')){showPortalTrash();return;}
 if(b.dataset.removeAsset){const r=removalParent('inventory',b.dataset.removeAsset);if(!r)return;confirmRemoval('Eliminar activo',`Se retirará <b>${esc(r.name)} (${esc(r.id)})</b> del inventario, calendario e indicadores. Su expediente y adjuntos se conservarán en la papelera.`,()=>{trashAsset(r.id);page='inventory';history.replaceState(null,'',location.pathname+'#vista=inventory');});}
 if(b.dataset.removeDoc){const kind=b.dataset.removeScope,parentId=b.dataset.removeParent,id=b.dataset.removeDoc,parent=removalParent(kind,parentId),doc=parent?.docs?.find(d=>d.id===id);if(!doc)return;confirmRemoval('Eliminar documento',`Se quitará <b>${esc(doc.title||doc.name)}</b> del expediente <b>${esc(parent.name)}</b>.`,()=>trashDocument(kind,parentId,id));}
 if(b.dataset.restoreRemoved){const id=b.dataset.restoreRemoved,entry=portalTrash.find(e=>e.id===id);if(!entry)return;trashDialog.close();modal('Restaurar elemento',`<p>Se recuperará <b>${esc(entry.record.title||entry.record.name)}</b> en su expediente original.</p>`,()=>restoreRemoved(id));}
});
