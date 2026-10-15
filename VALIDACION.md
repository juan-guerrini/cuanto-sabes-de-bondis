# Validación de la entrega

Fecha: 15 de octubre de 2026.

Se verificó en Node.js 24.19.0:

- Compilación de producción Next.js 16.3.4 y comprobación TypeScript.
- Lockfile coherente: instalación de lockfile en modo frozen y offline, sin instalar ni ejecutar scripts de dependencias.
- Migraciones SQLite repetibles y transacciones con rollback.
- Puntuaciones e intentos sin duplicación ante respuestas repetidas.
- Copia consistente y restauración de SQLite.
- Servidor standalone real: salud, registro, cookies, login, vinculación del propietario, creación de preguntas, autor oculto al público y persistencia de puntuación al volver a ingresar.

Comandos reproducibles:

```bash
pnpm test
pnpm build
node tests/http-smoke.mjs
```

El test HTTP crea y elimina su propia base temporal y usa el puerto 3188. No utiliza datos reales.

No se ejecutó `docker build` ni un despliegue real en Coolify, ya que Docker y el servidor del usuario no están disponibles en este entorno. Tampoco se hizo revisión visual de navegador.

La carpeta original-sites conserva el código anterior. La versión portable cambia solamente el entorno de ejecución, el adaptador de base de datos, la autenticación dependiente de ChatGPT y la configuración necesaria para alojar el juego fuera de Sites.
