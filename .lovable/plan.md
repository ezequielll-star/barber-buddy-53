# Panel de Administración General (Superadmin)

Plan técnico. No se implementa nada hasta que lo autorices.

## Lo que encontré en la arquitectura actual

- Hay 1 cuenta, 1 barbería ("Navaja"), 3 clientes y 7 reservas. No se borra ni se mueve nada.
- Cada dueño ve solo su barbería gracias a reglas en la base de datos. Esas reglas además bloquean a las barberías pausadas.
- Hoy nadie puede cambiar "activa/pausada" desde la app; solo desde la base de datos.
- Cuando cualquier cuenta entra al panel por primera vez, se le crea una barbería automáticamente. Esto hay que ajustarlo para que tu cuenta de administrador no termine con una barbería vacía propia.

## 1. Cambios en la base de datos

Todo es agregado; no se elimina ni se renombra nada existente.

- **Roles de administrador** (`user_roles`): una lista aparte de las barberías, con el rol `superadmin`. Una función segura `has_role(usuario, rol)` permite consultarla desde las reglas.
- **Suscripciones** (`subscriptions`, una por barbería): precio mensual acordado, fecha de vencimiento, estado (pendiente / pagado), fecha en que recibiste el pago, observaciones.
- **Historial de pagos** (`subscription_payments`): cada pago registrado queda guardado (monto, fecha, período, nota), así no se pisa el historial al marcar el mes siguiente.
- **Registro de acciones** (`admin_audit_log`): quién, qué, cuándo y sobre qué barbería (pausa, reactivación, cambio de pago, alta de barbería, cambio de dueño), con valores anteriores y nuevos. Solo se puede agregar; nadie puede editarlo ni borrarlo, ni siquiera el superadmin.
- **Barberías:** se agrega una "eliminación lógica" (`archived_at`) en lugar de borrar. Archivar requiere escribir el nombre de la barbería para confirmar. Nunca se borra de verdad desde la app.
- **Funciones de administración** (seguras, del lado de la base): `admin_set_shop_active`, `admin_upsert_subscription`, `admin_record_payment`, `admin_archive_shop`. Cada una verifica `superadmin` al empezar y escribe en el registro de acciones en la misma operación, así ninguna acción queda sin registrar.
- **Ajuste del candado de "activa/pausada":** hoy bloquea a todos los usuarios; se permitirá el cambio solo cuando lo hace un superadmin.

## 2. Cómo se crea y protege el rol Superadmin

- No hay pantalla, botón ni registro para ser superadmin.
- El rol se asigna **una sola vez, a mano, desde la base de datos** a tu cuenta (por su email confirmado).
- La lista de roles no tiene permisos de escritura para nadie desde la app: ni dueños ni visitantes pueden insertar, cambiar o borrar filas. Solo se puede leer el rol propio.
- El panel vive en rutas aparte (`/admin`). Al entrar, el servidor verifica el rol; si no sos superadmin, te devuelve al inicio. Pero la protección real está en las funciones del servidor y de la base, no en la pantalla.

## 3. Cómo evitar que un dueño obtenga permisos

- El rol no se guarda en la barbería, en el perfil ni en los datos de la cuenta que el usuario puede editar (eso sería fácil de falsificar).
- La tabla de roles no acepta escrituras desde la app, por lo que un dueño no puede darse el rol aunque arme una solicitud a mano.
- Cada función de administración verifica el rol en la base al ejecutarse. Si un dueño la llama directamente, la rechaza.
- Las reglas actuales de cada dueño no cambian: sigue viendo solo su barbería.

## 4. Gestión manual de pagos

- Por cada barbería: precio mensual, próximo vencimiento, estado, fecha del último pago y observaciones.
- **Registrar pago:** cargás monto y fecha. Queda en el historial, el estado pasa a "pagado" y el vencimiento avanza un mes. Todo queda en el registro de acciones.
- **Vencido:** si pasó la fecha de vencimiento y no está pagado, se marca como **"Vencido"** en rojo (calculado, sin cambiar nada solo). **No se pausa automáticamente**; la pausa la decidís vos con un botón.
- Filtros: pagado, pendiente, vencido.

## 5. Pantallas

```text
/admin                 Resumen: totales (barberías, activas, pausadas, clientes, reservas,
                       pagos pendientes/vencidos) + lista con buscador por nombre y filtros
/admin/b/$id           Ficha: nombre, dirección pública, dueño (email), WhatsApp, fecha de alta,
                       cantidad de clientes y reservas, suscripción, historial de pagos,
                       acciones (pausar / reactivar / archivar) y registro de acciones
/admin/nueva           Alta de barbería: nombre, dirección de página y email del dueño
/admin/registro        Registro de acciones de todas las barberías
```

- Mismo estilo: fondo oscuro, detalles bronce, botones grandes. Navegación propia (no la del dueño): Resumen, Nueva barbería, Registro.
- **Privacidad de clientes:** el panel muestra solo cantidades de clientes y reservas, nunca nombres ni teléfonos de los clientes de cada barbería.

## 6. Pruebas que voy a ejecutar

Contra la base de datos y el servidor, con cuentas de prueba que luego se borran:
1. Un dueño no puede leer `/admin` ni llamar ninguna función de administración (rechazo).
2. Un dueño no puede insertarse ni modificar un rol en la tabla de roles.
3. Un dueño no puede cambiar "activa/pausada" de su barbería ni de otra.
4. El superadmin puede pausar y reactivar; el dueño pausado queda bloqueado y vuelve a entrar al reactivar.
5. Cada acción deja su línea en el registro, y el registro no se puede editar ni borrar.
6. Registrar un pago actualiza estado, vencimiento e historial.
7. El superadmin no ve nombres ni teléfonos de clientes.
8. Siguen funcionando: separación entre barberías, reservas públicas de `/b/navaja`, límite de 3 pendientes y rechazo de fechas pasadas (las 37 pruebas actuales).
9. Recorrido en el navegador: entrar como superadmin, buscar, filtrar, pausar, registrar pago.

## Detalles técnicos

- Migración nueva: enum `app_role`, `user_roles` (FK a `auth.users` con cascade, unique user+role, GRANT SELECT a authenticated, sin INSERT/UPDATE/DELETE), `has_role()` SECURITY DEFINER, tablas `subscriptions`, `subscription_payments`, `admin_audit_log` con GRANTs y RLS (lectura solo `has_role(auth.uid(),'superadmin')`, escritura solo vía funciones SECURITY DEFINER), columna `barbershops.archived_at`, `protect_shop_is_active` permite el cambio si el llamador es superadmin.
- Servidor: `src/lib/admin.functions.ts` con `requireSupabaseAuth` + chequeo `has_role` vía `context.supabase` en cada función. El alta de barbería con dueño usa el cliente privilegiado solo después del chequeo (invitación por email al dueño).
- `ensureMyShop`: no crea barbería si la cuenta es superadmin; tras login, el superadmin va a `/admin`.
- Rutas nuevas: `src/routes/_admin.tsx` (ssr:false, gate de sesión + rol) y `src/routes/_admin/admin.*.tsx`. Sin cambios en `_barbero/*`, `b.$slug.tsx` ni la Caja.
- Tests nuevos junto a `src/lib/booking-rules.test.ts` para el cálculo de "vencido" y el avance de vencimiento.
- AGENTS.md: regla nueva sobre roles en tabla aparte y acciones admin vía funciones auditadas.

## Decisiones que necesito de vos

1. **Tu cuenta de superadmin:** ¿usás la misma cuenta con la que manejás "Navaja" o creamos una cuenta separada con otro email? (Recomiendo separada: si alguien entra a tu barbería, no obtiene el panel general.)
2. **Alta de barbería nueva:** ¿el dueño recibe un email de invitación para crear su contraseña, o preferís que se registre solo y vos le asignás la barbería después?
3. **Vencimiento:** ¿mensual desde la fecha de alta, o el mismo día de cada mes para todos?
