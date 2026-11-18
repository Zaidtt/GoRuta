# GoRuta · Frontend Angular

Aplicación universitaria de catálogo de viajes conectada a una API propia en
Python con Django REST Framework y MariaDB de XAMPP.

## Iniciar desde un clon

Requisitos: Node.js compatible con Angular 21, npm y el backend local en marcha.

```powershell
git clone https://github.com/Zaidtt/GoRuta.git
cd GoRuta
npm ci
npm start
```

Abre http://localhost:4200. El backend está en
https://github.com/Zaidtt/GoRuta_API y se inicia con `start.ps1` después de su
instalación. MySQL debe estar encendido en XAMPP.

La URL local de la API se define en `src/app/core/api.ts`:
`http://127.0.0.1:8000/api/`.

## Funciones

- Login real y validación del rol desde el servidor.
- Panel de administrador para crear, editar, publicar y eliminar destinos,
  vuelos, hoteles y paquetes propios.
- Paquetes que relacionan un destino, un vuelo y un hotel.
- Fotografías locales optimizadas por el backend.
- Reservas y favoritos persistidos en MariaDB.

Los catálogos se administran en la propia aplicación; no se importan datos de
proveedores externos. Los datos reales de la base y los archivos de `media/`
del backend permanecen en tu equipo.

## Cuentas de demostración locales

El comando `seed_demo` del backend crea estas cuentas para pruebas:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@travelbooking.com | admin123 |
| Viajero | viajero@ejemplo.com | viajero123 |

## Verificar

```powershell
npm run build
node node_modules\@angular\cli\bin\ng.js test --watch=false
```

Git excluye `node_modules/`, `dist/`, la caché de Angular, archivos `.env`, claves,
logs y exportaciones SQL. Instala las dependencias con `npm ci` en cada equipo.
