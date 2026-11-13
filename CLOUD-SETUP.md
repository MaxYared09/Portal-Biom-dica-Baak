# Guardado compartido del portal

El portal carga el inventario, capacitaciones, proyectos y asignaciones de órdenes desde Supabase. No importa automáticamente datos antiguos de `localStorage`: así una computadora desactualizada no sobrescribe los registros compartidos. Los datos locales previos permanecen intactos.

## Uso

- El inventario puede consultarse mediante el enlace del portal.
- **Iniciar sesión para editar** utiliza el correo y contraseña del usuario autorizado en Supabase Auth. La contraseña de PostgreSQL y las cuentas de GitHub/ChatGPT no son las credenciales del portal.
- La cuenta autorizada está en `public.portal_admin`. El navegador no puede asignar administradores.
- Cada formulario confirma el guardado remoto antes de indicar éxito. Ante error, restaura el estado previo. Una revisión numérica evita sobrescribir cambios de otra ventana: vuelve a cargar antes de reintentar un conflicto.
- Las otras computadoras reciben los cambios al abrir, volver a la ventana o en la siguiente consulta automática (cada 30 segundos).
- Los adjuntos migrados y nuevos requieren la cuenta administradora. Los documentos originales ya publicados en GitHub conservan su acceso original.
- **Descargar respaldo compartido** exporta registros y adjuntos referenciados. El respaldo puede contener información de la organización; consérvalo bajo su control.

## Datos y acceso

`portal_state` contiene una instantánea JSON del portal y su revisión. Tiene lectura pública y actualización restringida por RLS al administrador. `portal_files` conserva adjuntos de hasta 20 MB en la base de datos, sin permisos anónimos; solo el administrador puede leer o agregar archivos. No se permite reemplazar o borrar adjuntos desde el cliente. Esto conserva documentos si falla un guardado posterior.

Los archivos consumen almacenamiento de base de datos y ancho de banda (base64 añade aproximadamente un tercio al tamaño original). Para una colección grande conviene migrarlos a Supabase Storage manteniendo sus identificadores y políticas de acceso. El respaldo inicial de noviembre de 2026 contiene cuatro archivos, 769140 bytes antes de codificarlos.

`cloud.js` incluye únicamente una clave **publishable**. Nunca incluir claves secretas o `service_role`. Supabase JS está fijado a la versión 2.119.0 y se carga con verificación SRI.

## Verificaciones de esta integración

- Migrados 207 activos y 4 adjuntos; verificación de tamaño y hash de los adjuntos.
- Políticas: usuario ajeno, cero actualizaciones y cero adjuntos visibles; administrador, actualización autorizada y cuatro adjuntos visibles. Pruebas en transacciones revertidas.
- La lectura pública del inventario se prueba contra la API real. Las pruebas de interfaz de inicio de sesión usan una sesión simulada; la contraseña real no se comparte con el desarrollador.
- La comprobación de contraseñas filtradas está deshabilitada en la configuración actual de Supabase Auth; no se modificó el plan del proyecto.
