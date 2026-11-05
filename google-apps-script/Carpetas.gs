/**
 * Asistente PM · Organización de carpetas y documentos por Cliente / Proyecto / Fase
 *
 * Estructura que mantiene dentro de la carpeta madre de proyectos:
 *
 *   Carpeta madre (PROJECTS_ROOT_FOLDER_ID)
 *   └── <Nombre del Cliente>          ← Nivel 1 (se reutiliza si existe)
 *       └── <Nombre del Proyecto>     ← Nivel 2 (se reutiliza si existe)
 *           └── <Fase del Proyecto>   ← Nivel 3 (se reutiliza si existe)
 *               └── documentos de esa fase
 *
 * Función principal: organizarDocumentosProyecto(nombreCliente, nombreProyecto, faseProyecto, archivos)
 * También se invoca desde la app web vía doPost (Code.gs) con action = 'organizeFiles'.
 */

/** Carpeta madre de los proyectos. Puede sobrescribirse con la propiedad PROJECTS_ROOT_FOLDER_ID. */
var PROJECTS_ROOT_FOLDER_ID = '1qr8xOeGgvwJSuJJPFzdNaqZxSKL1gClt';

/** Longitud máxima de un nombre de carpeta (evita nombres abusivos). */
var MAX_NOMBRE = 150;

/**
 * Crea (o reutiliza) la ruta Cliente / Proyecto / Fase y guarda allí los archivos recibidos.
 *
 * @param {string} nombreCliente   Nombre del cliente (Nivel 1).
 * @param {string} nombreProyecto  Nombre del proyecto (Nivel 2).
 * @param {string} faseProyecto    Fase del proyecto, p. ej. "Iniciación" (Nivel 3).
 * @param {Array<Object>} archivos Lista de archivos. Cada elemento puede ser:
 *        - { nombre, mimeType, contenidoBase64 }  → se crea un archivo nuevo con ese contenido.
 *        - { fileId }                             → se mueve un archivo que ya existe en Drive.
 * @return {Object} { ok, carpetas: { cliente, proyecto, fase }, archivos: [...], error }
 */
function organizarDocumentosProyecto(nombreCliente, nombreProyecto, faseProyecto, archivos) {
  var resultado = { ok: false, carpetas: {}, archivos: [], error: null };
  var lock = LockService.getScriptLock();

  try {
    // ── 1. Validación y normalización de entradas ─────────────────────────────
    // Se recortan espacios y se colapsan espacios múltiples para que "Kruger  S.A. "
    // y "Kruger S.A." se traten como el mismo nombre (búsqueda exacta sobre el nombre limpio).
    var cliente = normalizarNombre_(nombreCliente);
    var proyecto = normalizarNombre_(nombreProyecto);
    var fase = normalizarNombre_(faseProyecto);
    if (!cliente) throw new Error('Falta el nombre del cliente.');
    if (!proyecto) throw new Error('Falta el nombre del proyecto.');
    if (!fase) throw new Error('Falta la fase del proyecto.');
    if (archivos && !Array.isArray(archivos)) throw new Error('"archivos" debe ser una lista.');

    // ── 2. Exclusión mutua ────────────────────────────────────────────────────
    // Si llegan dos solicitudes a la vez para el mismo cliente, ambas podrían "no encontrar"
    // la carpeta y crearla dos veces. El bloqueo serializa la búsqueda + creación.
    lock.waitLock(30000);

    // ── 3. Carpeta madre (raíz) ───────────────────────────────────────────────
    var idRaiz = PropertiesService.getScriptProperties().getProperty('PROJECTS_ROOT_FOLDER_ID') || PROJECTS_ROOT_FOLDER_ID;
    var raiz;
    try {
      raiz = DriveApp.getFolderById(idRaiz);
    } catch (e) {
      throw new Error('No se pudo abrir la carpeta madre (' + idRaiz + '). Verifica el ID y los permisos de la cuenta.');
    }

    // ── 4. Nivel 1 · Cliente: buscar por nombre exacto; si no existe, crear ───
    var nivelCliente = obtenerOCrearCarpeta_(raiz, cliente);
    resultado.carpetas.cliente = describirCarpeta_(nivelCliente);

    // ── 5. Nivel 2 · Proyecto: dentro de la carpeta del cliente ───────────────
    var nivelProyecto = obtenerOCrearCarpeta_(nivelCliente.carpeta, proyecto);
    resultado.carpetas.proyecto = describirCarpeta_(nivelProyecto);

    // ── 6. Nivel 3 · Fase: dentro de la carpeta del proyecto ──────────────────
    var nivelFase = obtenerOCrearCarpeta_(nivelProyecto.carpeta, fase);
    resultado.carpetas.fase = describirCarpeta_(nivelFase);

    // ── 7. Guardado de archivos en la carpeta de la fase ──────────────────────
    // Cada archivo se procesa con su propio try/catch: si uno falla, los demás se guardan
    // y el error queda informado individualmente.
    var lista = archivos || [];
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i] || {};
      try {
        var guardado = guardarArchivo_(nivelFase.carpeta, item);
        resultado.archivos.push({ ok: true, nombre: guardado.getName(), id: guardado.getId(), url: guardado.getUrl() });
      } catch (errArchivo) {
        resultado.archivos.push({ ok: false, nombre: item.nombre || item.fileId || '(sin nombre)', error: mensaje_(errArchivo) });
      }
    }

    // La operación es exitosa si la ruta quedó lista y todos los archivos se guardaron.
    resultado.ok = resultado.archivos.every(function (a) { return a.ok; });
    if (!resultado.ok) resultado.error = 'Algunos archivos no se pudieron guardar.';
  } catch (err) {
    // Errores de validación, permisos o de creación de carpetas.
    resultado.ok = false;
    resultado.error = mensaje_(err);
  } finally {
    // El bloqueo siempre se libera, aunque haya habido errores.
    try {
      lock.releaseLock();
    } catch (ignorar) {}
  }
  return resultado;
}

/* ───────────────────────────── Funciones auxiliares ───────────────────────────── */

/**
 * Busca dentro de "padre" una subcarpeta cuyo nombre sea EXACTAMENTE "nombre" (y que no esté
 * en la papelera). getFoldersByName ya filtra por nombre, pero se vuelve a comparar el nombre
 * normalizado para garantizar coincidencia exacta. Si no existe, la crea.
 * @return {{carpeta: Folder, creada: boolean}}
 */
function obtenerOCrearCarpeta_(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  while (it.hasNext()) {
    var candidata = it.next();
    if (!candidata.isTrashed() && normalizarNombre_(candidata.getName()) === nombre) {
      return { carpeta: candidata, creada: false }; // Ya existe: se reutiliza (no se duplica).
    }
  }
  return { carpeta: padre.createFolder(nombre), creada: true }; // No existe: se crea.
}

/**
 * Guarda un archivo en la carpeta de la fase.
 * - Con fileId: mueve un archivo existente de Drive a la carpeta.
 * - Con contenidoBase64: crea el archivo. Si ya hay uno con el mismo nombre, se agrega la
 *   fecha y hora al nombre para no sobrescribir versiones anteriores.
 */
function guardarArchivo_(carpeta, item) {
  if (item.fileId) {
    var existente = DriveApp.getFileById(item.fileId);
    existente.moveTo(carpeta);
    return existente;
  }
  if (!item.nombre || !item.contenidoBase64) throw new Error('Cada archivo necesita "nombre" y "contenidoBase64" (o "fileId").');
  var bytes = Utilities.base64Decode(item.contenidoBase64);
  var nombreFinal = nombreDisponible_(carpeta, String(item.nombre));
  var blob = Utilities.newBlob(bytes, item.mimeType || 'application/octet-stream', nombreFinal);
  return carpeta.createFile(blob);
}

/** Devuelve el mismo nombre o, si ya existe en la carpeta, "nombre (aaaa-mm-dd hh-mm-ss).ext". */
function nombreDisponible_(carpeta, nombre) {
  var it = carpeta.getFilesByName(nombre);
  while (it.hasNext()) {
    if (!it.next().isTrashed()) {
      var punto = nombre.lastIndexOf('.');
      var base = punto > 0 ? nombre.slice(0, punto) : nombre;
      var ext = punto > 0 ? nombre.slice(punto) : '';
      var sello = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm-ss');
      return base + ' (' + sello + ')' + ext;
    }
  }
  return nombre;
}

/** Recorta, colapsa espacios y limita la longitud del nombre. */
function normalizarNombre_(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);
}

function describirCarpeta_(nivel) {
  return { id: nivel.carpeta.getId(), nombre: nivel.carpeta.getName(), url: nivel.carpeta.getUrl(), creada: nivel.creada };
}

function mensaje_(err) {
  return String(err && err.message ? err.message : err);
}

/**
 * Prueba manual desde el editor: Ejecutar > probarOrganizacion.
 * Crea (o reutiliza) "Cliente Demo / Proyecto Demo / Iniciación" y guarda un archivo de texto.
 */
function probarOrganizacion() {
  var res = organizarDocumentosProyecto('Cliente Demo', 'Proyecto Demo', 'Iniciación', [
    { nombre: 'prueba.txt', mimeType: 'text/plain', contenidoBase64: Utilities.base64Encode('Archivo de prueba') },
  ]);
  Logger.log(JSON.stringify(res, null, 2));
}
