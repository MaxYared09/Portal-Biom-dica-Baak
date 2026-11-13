/* Read-only browser backup. Does not clear or modify portal data. */
(() => {
  'use strict';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Descargar respaldo completo';
  button.style.cssText = 'margin:8px 12px;white-space:normal';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.style.cssText = 'display:block;margin:0 12px 8px';
  const notice = document.querySelector('.notice');
  if (!notice) return;
  notice.append(button, status);
  function readFiles(db) {
    return new Promise((resolve, reject) => {
      const records = [];
      const tx = db.transaction('pdf', 'readonly');
      const request = tx.objectStore('pdf').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { records.push({key:cursor.key, value:cursor.value}); cursor.continue(); }
      };
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error || new Error('No se pudo leer el almacenamiento de archivos.'));
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve(records);
    });
  }
  function encode(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Preparando respaldo; espera antes de editar registros…';
    try {
      const local = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('biomedica-')) local[key] = localStorage.getItem(key);
      }
      const snapshot = JSON.parse(JSON.stringify({
        inventory: data,
        training: collections.training,
        projects: collections.projects
      }));
      const records = await readFiles(await dbp);
      const files = [];
      for (const record of records) {
        if (!(record.value instanceof Blob)) throw new Error('Un archivo local no tiene un formato compatible.');
        files.push({
          key: record.key, name: record.value.name || '',
          type: record.value.type, size: record.value.size,
          lastModified: record.value.lastModified || null,
          dataUrl: await encode(record.value)
        });
      }
      const referenced = new Set();
      for (const group of Object.values(snapshot)) {
        for (const entry of group) for (const doc of entry.docs || []) if (doc.id) referenced.add(doc.id);
      }
      const found = new Set(files.map(file => file.key));
      const missing = [...referenced].filter(id => !found.has(id));
      const backup = {
        format: 'baak-browser-backup', version: 1,
        createdAt: new Date().toISOString(), origin: location.origin, path: location.pathname,
        snapshot, localStorage: local, files, missingFileIds: missing,
        note: 'Incluye registros y archivos locales. Los documentos publicados en GitHub permanecen en el repositorio.'
      };
      const blob = new Blob([JSON.stringify(backup)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Respaldo-Biomedica-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'Respaldo preparado: ' + snapshot.inventory.length + ' activos y ' + files.length +
        ' archivos locales. Comprueba que se descargó el JSON.' +
        (missing.length ? ' Atención: faltan ' + missing.length + ' adjuntos en este navegador; el respaldo lo indica.' : '');
    } catch (error) {
      status.textContent = 'No se completó el respaldo: ' + error.message + '. No se modificaron tus datos.';
    } finally { button.disabled = false; }
  });
})();
