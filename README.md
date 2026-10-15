# ¿Cuánto sabés de bondis?

Proyecto completo para subir a GitHub y desplegar en Coolify.

## Qué contiene

- En la raíz: versión portable Next.js / Node.js 24, SQLite y Docker.
- `original-sites/`: copia íntegra de los archivos de código versionados del proyecto original, conservada como referencia. No es la carpeta que debe desplegar Coolify.
- Logo, diseño responsive, juego, cuentas, panel, roles, países, premios y migraciones SQL.
- Scripts de inicialización, copia de seguridad e importación de preguntas.

No se incluyen `node_modules`, compilaciones, historial `.git`, secretos, sesiones ni la base de datos alojada en Cloudflare. Las preguntas cargadas desde el panel, usuarios, puntuaciones y premios reclamados son datos de esa base de datos, no archivos del código. El despliegue nuevo arranca con una base vacía; ver la importación de contenido más abajo.

El sitio original no se modifica por usar este paquete.

## 1. Subir a GitHub

1. Descomprimir el ZIP.
2. Crear un repositorio, preferentemente privado durante las pruebas.
3. Subir **el contenido** de `cuanto-sabes-de-bondis/`: `Dockerfile`, `package.json`, `app/`, etc. deben quedar en la raíz del repositorio.
4. No subir `.env`, archivos `.sqlite`, copias de seguridad ni claves reales.

Con Git, desde la carpeta descomprimida:

```bash
git init
git add .
git commit -m "Proyecto inicial de Cuánto sabés de bondis"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

## 2. Configurar Coolify

1. Crear una aplicación desde el repositorio GitHub.
2. Elegir el build pack **Dockerfile**.
3. Base directory: `/`. Dockerfile: `/Dockerfile`.
4. Puerto interno: **3000**.
5. Asignar tu dominio con **HTTPS**. Las sesiones usan cookies seguras.
6. En Persistent Storage agregar un volumen persistente montado en **`/data`**.
7. Usar **una sola réplica en un único servidor** con esta versión SQLite. No escalar horizontalmente con el mismo archivo.
8. Cargar las variables de entorno siguientes y desplegar.

| Variable | Valor |
| --- | --- |
| `ADMIN_KEY` | Una clave nueva y privada de al menos 24 caracteres aleatorios |
| `OWNER_EMAIL` | El correo que usarás para tu cuenta principal |
| `PUBLIC_ORIGIN` | Tu dirección pública, por ejemplo `https://juego.tudominio.com` |
| `DATABASE_PATH` | `/data/bondis.sqlite` |
| `PORT` | `3000` |
| `COOKIE_SECURE` | `true` |

`ADMIN_KEY` y `OWNER_EMAIL` son variables de ejecución; no hace falta configurarlas como build arguments. Para generar una clave sin usar ejemplos públicos:

```bash
openssl rand -hex 32
```

No pongas la clave generada en un commit. El programa no inicia en producción sin una clave suficientemente larga y un correo de propietario y la dirección pública.

El contenedor corre como el usuario `node` (UID 1000). Si elegís un bind mount a un directorio del servidor en vez de un volumen, ese directorio debe permitir escritura a UID 1000. Los datos viven en `/data`; sin el volumen persistente se pierden al reemplazar el contenedor.

La verificación de salud usa `/api/health`. El Dockerfile incluye la configuración. No se ejecutó Docker ni un despliegue real en tu servidor Coolify desde este entorno; sí se comprueba la aplicación localmente, según `VALIDACION.md`.

## 3. Habilitar tu administración

1. Abrir `/cuenta` y crear tu cuenta con el mismo correo configurado en `OWNER_EMAIL`.
2. Abrir `/admin` e ingresar con `ADMIN_KEY` en el formulario de acceso original de Juan.
3. Ir a **Usuarios y roles** y seleccionar **Vincular como mi cuenta principal** en tu cuenta.
4. Desde entonces podés ingresar con tu usuario y contraseña y administrar roles.

No hay autenticación de ChatGPT en esta versión. Ningún encabezado de identidad enviado por el navegador se considera confiable. Los jugadores crean sus propias cuentas; solo el propietario asigna roles. Los administradores gestionan contenido, países y premios; los colaboradores gestionan sus propias preguntas.

## 4. Traer las preguntas que ya cargaste

En el panel del sitio original, usar **Descargar respaldo**. Ese JSON contiene preguntas y países. Guardarlo fuera del repositorio si contiene información interna.

Copiarlo al contenedor, por ejemplo a `/data/contenido.json`, y ejecutar desde la terminal de Coolify:

```bash
node scripts/import-content.mjs /data/contenido.json
```

El importador valida el archivo y aplica todo en una transacción. No duplica preguntas con el mismo ID y no reemplaza preguntas existentes. Sí reemplaza la lista de países. Usarlo con una copia de seguridad previa si la nueva instalación ya tiene contenido.

No importa cuentas, contraseñas, puntuaciones, configuraciones de premios ni premios reclamados. Estos requieren una migración específica de la base de datos; no están incluidos en este ZIP. La configuración de premios se realiza en el panel nuevo y parte desactivada. Este paquete no es un respaldo de los datos de producción.

## 5. Copias de seguridad

En la terminal del contenedor:

```bash
node scripts/backup.mjs /data/copia-bondis.sqlite
```

El script usa el mecanismo de copia consistente de SQLite, incluyendo los cambios del WAL. Descargar la copia a otro lugar: un volumen persistente no reemplaza una copia de seguridad. Las copias contienen datos privados y no deben guardarse en GitHub.

Para restaurar: detener la aplicación, sustituir `/data/bondis.sqlite` por una copia consistente y quitar únicamente los archivos WAL/SHM residuales de esa base detenida. Reiniciar. Conservar el archivo original antes de reemplazarlo.

## 6. Desarrollo local

Instalar Node.js 24 y pnpm 11.25.0. En la raíz:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Completar `ADMIN_KEY`, `OWNER_EMAIL`, poner `PUBLIC_ORIGIN=http://localhost:3000`, cambiar `DATABASE_PATH` a `./data/bondis.sqlite` y usar `COOKIE_SECURE=false` solo para HTTP local. Después:

```bash
pnpm dev
```

Next.js carga `.env.local` durante desarrollo. Los scripts CLI ejecutados directamente con Node deben recibir las variables del entorno o usar `node --env-file=.env.local scripts/migrate.mjs`.

Pruebas y compilación:

```bash
pnpm test
pnpm build
```

Para ejecutar una compilación local sin Docker, exportar las variables correspondientes y usar `pnpm start`. El servidor inicializa las migraciones pendientes antes de escuchar peticiones. No modificar migraciones ya aplicadas; agregar una nueva.

## Funciones que siguen siendo manuales

- Recuperación de contraseñas: Juan genera un enlace de un uso y una hora de duración desde el panel y lo comparte con la persona correspondiente. No hay servicio de envío automático de correos.
- Descuentos: crear el cupón de un solo uso en la tienda y registrarlo en el premio solicitado. No hay conexión automática con Tienda Nube ni otra tienda.

## Referencias de despliegue

- https://coolify.io/docs/applications/builds/dockerfile
- https://coolify.io/docs/applications/configuration/persistent-storage
- https://nextjs.org/docs/app/api-reference/config/next-config-js/output
