# Portal Biomédica Baak

Código del portal de inventario, mantenimiento, capacitaciones, proyectos y visitas a hospitales.

## Estado

Versión estática recuperada del portal existente. Los cambios hechos en las fichas y los archivos cargados manualmente se guardan actualmente en localStorage e IndexedDB del navegador. No hay todavía autenticación de administrador ni base de datos compartida. Esta copia no incorpora cambios que existan únicamente en el navegador del usuario.

Se incluyen el inventario inicial, el plan de mantenimiento 2026, las órdenes originales y sus vistas previas. La subida de los archivos se realiza en un commit posterior a este README.

## Uso local

Ejecutar `python -m http.server 8000 --directory dist` y abrir http://localhost:8000.

## Pendiente antes de operar como portal público

- Almacenamiento central para datos y documentos.
- Inicio de sesión con GitHub y autorización de escritura del lado del servidor para el administrador MaxYared09 (ID 355545085).
- Migración de datos y archivos que se hayan guardado manualmente en el navegador.
- Configurar el alojamiento y revisar los enlaces QR antes de cambiar de dominio.

La conexión de este repositorio con ChatGPT no configura automáticamente el inicio de sesión de los visitantes del portal.
