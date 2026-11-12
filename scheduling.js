function validServiceDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function addServiceMonths(date,months){if(!validServiceDate(date)||![6,12].includes(Number(months)))throw Error('Selecciona una fecha válida y un intervalo de 6 o 12 meses.');const [y,m,d]=date.split('-').map(Number);const first=new Date(Date.UTC(y,m-1+Number(months),1));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d,last));return first.toISOString().slice(0,10)}
function orderServiceDate(text){const months={ENE:'01',FEB:'02',MAR:'03',ABR:'04',MAY:'05',JUN:'06',JUL:'07',AGO:'08',SEP:'09',OCT:'10',NOV:'11',DIC:'12'};const p=String(text||'').toUpperCase().split(/[\/-]/);if(p.length!==3)return '';const s=(p[2].length===2?'20'+p[2]:p[2])+'-'+(months[p[1]]||p[1].padStart(2,'0'))+'-'+p[0].padStart(2,'0');return validServiceDate(s)?s:''}
function applyServiceSchedule(e,h){
 if(!validServiceDate(h.date)||h.date>today())throw Error('La fecha realizada debe ser válida y no futura.');
 if(!h.person.trim()||!h.description.trim())throw Error('Completa responsable y descripción.');
 if(h.orderId&&(e.history||[]).some(x=>x.orderId===h.orderId))throw Error('Esta orden ya está registrada en el historial.');
 const next=structuredClone(e);next.history=next.history||[];next.schedule=next.schedule||[];
 if(h.type==='Preventivo'){
 const latest=(e.history||[]).filter(x=>x.type==='Preventivo'&&validServiceDate(x.date)).map(x=>x.date).sort().at(-1);if(latest&&h.date<latest)throw Error('Ya hay un preventivo más reciente ('+latest+'). Usa esa orden para recalcular el siguiente servicio.');const due=addServiceMonths(h.date,h.interval);const chosen=h.planMonth?next.schedule.find(p=>p.month===h.planMonth&&p.status!=='rescheduled'):null;
 if(h.planMonth&&!chosen)throw Error('El periodo seleccionado ya no está disponible.');
 // Retain older outstanding work; replace only future pending dates with the newly calculated appointment.
 const moved=next.schedule.filter(p=>p.status==='pending'&&p.month>=h.date.slice(0,7)&&p!==chosen);
 next.planChanges=[...(next.planChanges||[]),{date:today(),serviceDate:h.date,nextDate:due,previousNext:e.next||'',previousSchedule:structuredClone(e.schedule||[]),orderId:h.orderId||'',interval:Number(h.interval)}];
 next.schedule=next.schedule.filter(p=>!moved.includes(p)&&p!==chosen);
 let completed=next.schedule.find(p=>p.month===h.date.slice(0,7)&&p.status==='completed');
 if(!completed){completed={month:h.date.slice(0,7),mark:'MP',status:'completed'};next.schedule.push(completed)}
 Object.assign(completed,{completedDate:h.date,orderId:h.orderId||'',originalPlanMonth:chosen?.month||h.date.slice(0,7)});
 if(chosen?.status==='completed')next.history=next.history.filter(x=>!(x.date===chosen.month&&x.description?.startsWith('Realizado según marca verde')));
 next.schedule.push({month:due.slice(0,7),date:due,mark:'MP',status:'pending',source:'Servicio realizado',interval:Number(h.interval)});
 next.next=due;next.preventiveInterval=Number(h.interval);h={...h,next:due,interval:Number(h.interval)};
 }else if(h.planMonth)throw Error('Solo un preventivo puede actualizar el plan preventivo.');
 next.history.push(h);return next;
}
registerService=function(e,order){
 const preventive=order?order.type==='Preventivo':serviceType!=='Correctivo';
 const options=(e.schedule||[]).filter(p=>['pending','completed'].includes(p.status));
 const initial=order?(order.warnings?.length?'':order.serviceDate||orderServiceDate(order.dateText)):today();
 modal(order?'Registrar servicio desde orden':'Registrar mantenimiento realizado',
 (order?`<p><b>Orden ${esc(order.folio||order.reference||order.name)}</b></p><p class="muted">Fecha en la orden: ${esc(order.dateText||order.serviceDate||'Por capturar')}. Revisa el documento y confirma la fecha real.</p>${order.warnings?.length?'<p class="badge amber">Hay diferencias en los datos. Captura la fecha verificada.</p>':''}`:'')+
 select('Tipo de servicio','type',preventive?['Preventivo','Correctivo','Inspección']:['Correctivo','Preventivo','Inspección'])+
 input('Fecha realizada según la orden','date','date',initial)+
 `<div id="preventive-options"><label>Periodo del plan que corresponde a esta orden<select name="planMonth"><option value="">Servicio adicional / sin asociar</option>${options.map(p=>`<option value="${p.month}">${fmt(p.month)} · ${planLabel(p)}</option>`).join('')}</select></label><label>Programar siguiente preventivo<select name="interval"><option value="">Selecciona un intervalo</option><option value="6">6 meses después</option><option value="12">1 año después</option></select></label><p id="next-service-preview" role="status"></p><p class="muted">Se reemplazan las fechas preventivas pendientes desde el mes realizado en adelante. Los pendientes anteriores se conservan, salvo el periodo que selecciones arriba. Se conserva un registro de la programación anterior.</p></div>`+
 input('Responsable del servicio','person')+`<label>Descripción del servicio<textarea name="description" required rows="4">${esc(order?.description||'')}</textarea></label>`,f=>{
 const h=Object.fromEntries(f);h.orderId=order?.id||'';h.reference=order?.folio||order?.reference||'';
 if(h.type!=='Preventivo'){h.planMonth='';h.interval=''}
 const updated=applyServiceSchedule(e,h),before=data;data=data.map(x=>x.id===e.id?updated:x);try{save()}catch(err){data=before;throw err}
 });
 const update=()=>{const isMP=$('#fields [name="type"]').value==='Preventivo';$('#preventive-options').hidden=!isMP;$('#fields [name="interval"]').required=isMP;try{$('#next-service-preview').textContent='Próximo preventivo: '+fmt(addServiceMonths($('#fields [name="date"]').value,$('#fields [name="interval"]').value))}catch{$('#next-service-preview').textContent='Selecciona la fecha y el intervalo para calcular el siguiente mantenimiento.'}};
 for(const n of ['type','date','interval'])$('#fields [name="'+n+'"]').addEventListener('change',update);update();
};
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-schedule-order]');if(!b)return;const e=data.find(a=>a.id===new URLSearchParams(location.hash.slice(1)).get('equipo'));if(!e)return;const imported=importedOrders.find(o=>o.id===b.dataset.scheduleOrder&&orderAsset(o)===e.id);const local=e.docs.find(d=>d.id===b.dataset.scheduleOrder);const order=imported||(local?{...local,type:local.maintenanceType||'Preventivo'}:null);if(order)registerService(e,order)});
