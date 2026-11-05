# AI_LOG · Frontend · Sistema de solicitudes

Herramienta: Codex.
Modelo: GPT-6 Luna Medio
Rama: `user-requests`.

## 11. Modelos TypeScript

**Promt:**

Vale, pues ahora vamos con el frontend. Primero necesitamos los modelos para saber cómo son los datos de las solicitudes que nos llegan del backend.

Creamos el fichero `src/app/models/request.model.ts`, igual que tenemos el de usuarios o el de citas. Ahí ponemos la interfaz con el ID, título, cuerpo, estado, la cita, el autor y el historial. También lo de si está archivada y las fechas. Las fechas aquí las ponemos como `string`, porque es como llegan en el JSON.

Para el historial hacemos otra interfaz con el mensaje, la fecha y el booleano de si lo ha hecho un administrador. Y los estados serán los mismos que tenemos en el backend: `pending`, `accepted` y `denied`. En la pantalla los mostraremos como Pendiente, Aceptada y Denegada.

Y acuérdate de lo del populate, porque en el listado nos llegan los datos del usuario y de la cita, pero al consultar una solicitud por su ID nos llegan los IDs. O sea, no tienen exactamente la misma forma. Pon los tipos para cada caso y contempla también que la relación pueda llegar como `null` si se ha borrado ese usuario o esa cita.

Nos falta el tipo de la respuesta paginada, que será algo así:

```ts
interface RequestsPage {
  requests: RequestListItem[];
  total: number;
  page: number;
  pages: number;
}
```

Para crear solo mandaremos título, cuerpo y el ID de la cita. Para editar, título y cuerpo. Ni el autor ni el estado los elegimos desde ese formulario. Podemos usar `Pick` para esos tipos y exportarlo todo desde `models/index.ts`, como los demás.

## 12. Servicio de solicitudes

**Promt:**

Ahora creamos el servicio de Angular, que es desde donde vamos a mandar las peticiones. Lo ponemos en `src/app/services/request.service.ts`, fijándonos en `date.service.ts` para hacerlo de la misma manera.

Primero importamos `HttpClient` y los modelos que acabamos de hacer. La URL será la que tenemos en `environment.apiUrl` más `/requests`.

Aquí hacemos los métodos de crear, consultar una solicitud, sacar el listado, editar y los dos borrados. Que devuelvan el `Observable` con el tipo de respuesta que toca. En el DELETE será `Observable<void>`, porque ahí el backend nos devuelve `204` y no manda datos.

Para el listado pasamos la página, el límite y los filtros con `HttpParams`. Si no hemos escrito nada o no hemos seleccionado estado, no mandamos esos filtros. Lo de archivadas se manda cuando queremos ver las archivadas. Una llamada sería de este estilo:

```ts
return this.http.get<RequestsPage>(this.baseUrl, { params });
```

Entonces desde los componentes llamaremos a estos métodos y el servicio hará la petición. El token ya lo añade el interceptor, así que no hace falta ponerlo aquí también.

## 13. Listado y formulario dentro de Dates

**Promt:**

Vale, ahora sí vamos con la pantalla. Hacemos dos componentes standalone: el listado y el formulario. El formulario nos sirve tanto para crear como para ver una solicitud y editarla, como lo tenemos en usuarios.

Los ponemos en `src/app/components/requests-list` y `src/app/components/request-form`. Cada uno con su TypeScript, HTML y CSS. En el HTML dibujamos la tabla, los campos y los botones, y en el TypeScript va lo de cargar los datos y llamar al servicio. La apariencia que sea como la que tenemos ahora, todo sencillito y siguiendo las otras pantallas.

Como esto va relacionado con las citas, desde Dates ponemos arriba un enlace a Solicitudes. Y en cada cita ponemos Nueva solicitud, pero solo si el usuario está en esa cita. Al pulsarlo pasamos el ID de la cita por la ruta, así ya sabemos sobre cuál la estamos creando y no hay que escribir el ID.

Si entramos para crear, el formulario estará vacío y rellenamos título y cuerpo. Primero cargamos la cita para verla y comprobar que participamos; añade ese GET por ID al servicio de citas. Si entramos en una solicitud que ya existe, hacemos el GET de la solicitud y rellenamos los campos con lo que nos llega. Luego guardamos con PUT. Si está archivada, se puede ver pero no editar. Debajo ponemos también su historial.

Las rutas las añadimos en `app.routes.ts`: el listado, el detalle y la de crear desde una cita. Usa los parámetros de ruta como en `UserForm`, que ya tenemos `withComponentInputBinding`. Para archivar y borrar reutiliza el modal de confirmación, y para las páginas el componente `Pagination`.

## 14. Peticiones desde la pantalla, búsqueda y paginación

**Promt:**

Ahora conectamos todo esto con las llamadas del servicio. Cuando entramos en el listado, automáticamente hace un GET y nos muestra la primera página. Ponemos un límite de 10 solicitudes por página.

Arriba ponemos el buscador, el desplegable de estado y la opción de ver archivadas. Si busco algo o cambio un filtro, vuelve a la primera página. Y si pulso siguiente o anterior, pide esa página al backend con los mismos filtros. La paginación tiene que hacerla el servidor, como nos pide el enunciado.

Guardamos el listado, la página, el total y lo de cargando o error en signals, como en las pantallas que ya tenemos. Para las peticiones de páginas usa el mismo patrón de `Subject` y `switchMap` de Dates, para que si cambio de filtro antes de que termine una petición no se quede mostrando la respuesta anterior.

En el formulario, si es nueva hacemos POST y si estamos editando hacemos PUT. Si sale bien volvemos al listado. Si da error, que aparezca el mensaje y no se borre lo que había escrito, porque igual solo tengo que corregir un campo.

Para archivar o eliminar, primero sale el modal de confirmar. Hasta que no confirme, no hacemos la petición. Cuando termina bien recargamos el listado. Y si hemos quitado la última que quedaba en esa página, volvemos a la anterior si la hay, para no quedarnos en una página vacía.

Si no hay resultados, ponemos que no hay solicitudes con esos filtros. Si lo que falla es la petición, mostramos el error, porque no es lo mismo. Comprueba estas llamadas y que compile y pase el lint, manteniendo la forma de trabajar del proyecto.

**Incoherencias detectadas:**

Al compilar salió un error en la función de confirmar. Se estaba usando la misma variable para archivar y para eliminar, pero archivar devuelve la solicitud y eliminar no devuelve datos. TypeScript no aceptaba usar `pipe` y `subscribe` sobre esa combinación de tipos.

**Solución / adaptación:**

Se puso `Observable<unknown>` en esa variable, porque ahí solo hace falta saber que la petición ha acabado para recargar la lista. Los tipos de los métodos del servicio se quedaron como estaban. Con eso compiló y no hubo que hacer dos funciones casi iguales.

## 15. Token, guard y acciones según el usuario

**Promt:**

Vale, nos queda lo del token y los permisos de la pantalla. El token lo sigue poniendo el interceptor que ya tenemos. No hace falta guardarlo en otro sitio ni añadirlo a mano en cada método.

En `app.routes.ts` ponemos `authGuard` en las tres rutas nuevas: listado, detalle y crear. Así, si no has iniciado sesión, te lleva al login como hace en el resto de pantallas.

Los botones los mostramos según el usuario y el rol que tenemos en `AuthService`. Si la solicitud es mía o soy admin, puedo editarla o archivarla. Cuando esté archivada, ya no puedo editarla, pero sí verla y eliminarla del todo.

Lo de crear es distinto: solo se puede hacer si participas en esa cita, aunque seas admin, porque asi es como lo hemos hecho en el backend. Por eso el botón Nueva solicitud tiene que comprobar que el usuario aparece entre los participantes.

Para el usuario normal pondremos Mis solicitudes y para el admin Solicitudes, porque él puede verlas todas. Y aunque ocultemos los botones, el backend sigue comprobando los permisos. O sea, que no dependa solo de que el botón se vea o no.

Prueba que el interceptor añade el token y que los formularios no mandan el autor ni el estado. Revisa también los botones con los distintos permisos y que sigan pasando las pruebas que ya había en el frontend.

P. D.: La IA ha ajustado la redacción y la estructura de los prompts para facilitar su lectura, manteniendo el sentido y las indicaciones originales.

---

Registro anterior conservado: Sprint 1.

# AI_LOG

Herramienta: Claude Code (Anthropic). Modelo: Claude Opus 5.5.

## 1. Limpieza del código del Seminario 7

- **Pregunta:** cómo quitar las pantallas de autores, libros y chat.
- **Prompt:** «Lo mismo que en el backend: esto es el frontend del seminario 7 copiado tal cual. Hay que limpiarlo para Studate: quitar las pantallas de autores, libros y chat y dejar la estructura simple para luego meter lo nuestro. Solo quitar y limpiar. Dime el plan de acción de cómo lo harías.»
- **Incoherencias:** algunos tests usaban `/books` como URL de ejemplo.
- **Solución:** cambiados a `/users`. Mantuvimos paginación, modal de confirmar, selector de vista y utils para reutilizarlos.

## 2. Lista de usuarios

- **Pregunta:** lista paginada con búsqueda y filtros.
- **Prompt:** «Empezamos por la lista de usuarios paginada con búsqueda y filtros. Primero quiero ver cómo está montada la paginación en el backend antes de decidir cómo hacer esto, explícamela. ...Vale, ahora que lo entiendo: quiero 10 usuarios por página y algunos filtros, los más típicos. ¿Qué filtros me sugieres? Dame el plan de acción.»
- **Incoherencias:** propuso filtrar por titulación y la API no tenía ese filtro. En el móvil, el select de titulaciones se salía de la pantalla.
- **Solución:** añadimos el filtro en el backend y limitamos el ancho del select.

## 3. Formulario de usuario

- **Pregunta:** crear y editar usuarios con rol y activo.
- **Prompt:** «Ahora el formulario de usuario: crear, editar, rol y activo. Es básicamente el register que ya tenemos, pero hecho bien y adaptado a los roles. Lo de activo es importante, porque todo lo que venga después tiene que saber si un usuario está activo o no: si no lo está, no puede usar la API. Dame el plan de acción.»
- **Incoherencias:** un usuario desactivado seguía usando la API con su token. El test del formulario navegaba a `/users` sin esa ruta y Vitest daba errores.
- **Solución:** arreglo en `VerifyToken` del backend (el interceptor ya cerraba la sesión con el 401) y una ruta vacía `users` en el test.

## 4. Archivar, restaurar y eliminar

- **Pregunta:** acciones de soft delete y hard delete en la lista.
- **Prompt:** «Ahora archivar, restaurar y eliminar desde el backoffice. Aquí ya hay un poco más de chicha. Como hacemos soft delete, primero se archiva y se puede restaurar; eliminar ya es el hard delete. Cuando quiera eliminar para siempre, que me salga un modal de "¿Estás seguro de que quieres eliminar esto?" y, si le doy, se elimina. ¿Cómo lo harías? Plan de acción.»
- **Incoherencias:** ninguna importante.
- **Solución:** un solo `confirm-modal` para archivar y eliminar, y sin botones en la fila del propio admin.

## 5. Backoffice solo para admin

- **Pregunta:** que el backoffice solo lo use el admin.
- **Prompt:** «Ahora que ya tenemos la zona de usuarios, esto lo tienen que administrar los administradores. Hay que rehacer el backoffice bien hecho: login y guards solo para admin, y adaptarlo a los modelos nuevos. Plan de acción.»
- **Incoherencias:** los tests seguían usando la contraseña del seminario.
- **Solución:** `adminGuard` en todas las rutas del backoffice, la etiqueta "Backoffice" en la barra y los tests con la contraseña nueva.

## 6. Pantallas de La Orla

- **Pregunta:** mockup y pantallas de los votos.
- **Prompt:** «Ahora las pantallas de La Orla (Grade). Antes de programar, hazme un mockup para ver cómo quedaría esta pantalla.» y «Y si luego hay que usarlo desde el teléfono, que esta pantalla sea responsive, que se vea bien en el móvil.»
- **Incoherencias:** puso la ayuda "si los dos se han dado A+, se abre un Date" cuando los Dates todavía no existían.
- **Solución:** la quitamos y la volvimos a poner al hacer los Dates.

## 7. Pantallas de Dates

- **Pregunta:** pantallas de Dates para el admin y para cada usuario.
- **Prompt:** «Las pantallas de Dates, igual que las de La Orla: primero el mockup para verlo, y responsive desde el principio para que se vea en el móvil.»
- **Incoherencias:** una interfaz llamada `Date` tapa el `Date` de JavaScript. Para elegir "con quién", un usuario normal no puede llamar a `GET /users`.
- **Solución:** la interfaz se llama `StudateDate` y se usa `GET /users/directory`, que añadimos en el backend.
