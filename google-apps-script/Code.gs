/**
 * Asistente PM · Repositorio de Plantillas CMMI / PMP
 * Web App de Google Apps Script para la CARGA INICIAL (una sola vez) de las plantillas
 * estándar: crea cada documento de Google Docs con formato corporativo directamente
 * en la carpeta madre y devuelve su URL para registrarla en la base de datos de la app.
 * Si el documento ya existe en la carpeta madre, devuelve el existente (no duplica).
 *
 * Seguridad: solo atiende peticiones que incluyan el token guardado en las
 * Propiedades del script (API_TOKEN). La carpeta madre se fija aquí o en la
 * propiedad ROOT_FOLDER_ID; nunca la decide quien llama.
 */

var DEFAULT_ROOT_FOLDER_ID = '1ZoHiDJTooOMsiOYM_2smklcSgAYyprhh';

var STYLE = {
  font: 'Roboto',
  orange: '#F05A22',
  dark: '#333333',
  muted: '#6B7076',
  headerFill: '#FDEDE6',
  noteFill: '#F3F4F5',
  border: '#D9DCDF',
};

var CONFIDENTIAL = 'Documento de Uso Confidencial. Contiene información propietaria.';

/** Punto de entrada HTTP (POST con cuerpo JSON en texto plano). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('API_TOKEN');
    if (!token || req.token !== token) return json_({ ok: false, error: 'unauthorized' });

    // Organización de carpetas Cliente / Proyecto / Fase y guardado de archivos (Carpetas.gs).
    if (req.action === 'organizeFiles') {
      return json_(organizarDocumentosProyecto(req.client, req.project, req.phase, req.files || []));
    }

    var problem = validate_(req);
    if (problem) return json_({ ok: false, error: problem });

    // Evita carpetas o documentos duplicados si llegan dos peticiones a la vez.
    lock.waitLock(20000);

    // Los documentos se guardan directamente en la carpeta madre.
    var folder = DriveApp.getFolderById(props.getProperty('ROOT_FOLDER_ID') || DEFAULT_ROOT_FOLDER_ID);

    var existing = findFile_(folder, req.docName);
    if (existing) {
      return json_({ ok: true, reused: true, id: existing.getId(), url: existing.getUrl(), folder: folder.getName() });
    }

    var doc = DocumentApp.create(req.docName);
    var file = DriveApp.getFileById(doc.getId());
    file.moveTo(folder);
    try {
      buildDocument_(doc, req);
      doc.saveAndClose();
    } catch (buildErr) {
      // Si falla el formato, no se deja un documento incompleto que luego se reutilizaría.
      file.setTrashed(true);
      throw buildErr;
    }

    return json_({ ok: true, reused: false, id: doc.getId(), url: doc.getUrl(), folder: folder.getName() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

/** Prueba rápida desde el editor: Ejecutar > testGenerate (requiere API_TOKEN). */
function testGenerate() {
  var token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        token: token,
        action: 'seedTemplate',
        docName: 'Prueba — Acta de Reunión',
        title: 'Acta de Reunión',
        client: '[Nombre del cliente]',
        project: '[Nombre del proyecto]',
        date: '[dd/mm/aaaa]',
        typesLabel: 'General',
        phasesLabel: 'Ejecución · Monitoreo y Control',
        purpose: 'Documentar acuerdos.',
        sections: [{ title: 'Elementos de acción', instruction: '[Instrucción: Cada acción con Responsable (Dueño) y Fecha Límite.]', table: { headers: ['#', 'Acción', 'Responsable (Dueño)', 'Fecha Límite'], rows: 2 } }],
      }),
    },
  });
  Logger.log(res.getContent());
}

/* ----------------------------- Utilidades ----------------------------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function validate_(req) {
  if (req.action !== 'seedTemplate') return 'Acción no permitida';
  var fields = ['docName', 'title', 'client', 'project', 'date'];
  for (var i = 0; i < fields.length; i++) {
    var v = req[fields[i]];
    if (typeof v !== 'string' || !v.trim() || v.length > 200) return 'Campo inválido: ' + fields[i];
  }
  if (!req.sections || !req.sections.length) return 'La plantilla no tiene secciones';
  return null;
}

function findFile_(folder, name) {
  var it = folder.getFilesByName(name);
  while (it.hasNext()) {
    var f = it.next();
    if (!f.isTrashed()) return f;
  }
  return null;
}

/* ------------------------- Construcción del documento ------------------------- */

function buildDocument_(doc, req) {
  var body = doc.getBody();
  body.setMarginTop(56).setMarginBottom(56).setMarginLeft(64).setMarginRight(64);
  setTypography_(body);

  // Encabezado y pie de página limpios.
  var header = doc.addHeader();
  styleSmall_(header.appendParagraph(req.project + ' · ' + req.title));
  removeFirstEmpty_(header);
  var footer = doc.addFooter();
  styleSmall_(footer.appendParagraph(CONFIDENTIAL + ' · ' + req.client));
  removeFirstEmpty_(footer);

  // 1. Título y encabezado visual (tabla sin bordes).
  // Paragraph.setText() no devuelve el párrafo (void): no se puede encadenar.
  var title = body.getParagraphs()[0];
  title.setText(req.title);
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  var subtitle = body.appendParagraph((req.typesLabel || '') + '  ·  ' + (req.phasesLabel || ''));
  subtitle.editAsText().setForegroundColor(STYLE.muted).setFontSize(10);

  var info = body.appendTable([
    ['CLIENTE', 'PROYECTO', 'FECHA DE ELABORACIÓN'],
    [req.client, req.project, req.date],
  ]);
  info.setBorderWidth(0);
  for (var c = 0; c < 3; c++) {
    var labelCell = info.getRow(0).getCell(c);
    labelCell.setAttributes(attrs_(8, STYLE.muted, true));
    labelCell.setPaddingBottom(0);
    info.getRow(1).getCell(c).setAttributes(attrs_(12, STYLE.dark, true));
  }

  // 2. Confidencialidad.
  var conf = body.appendTable([[CONFIDENTIAL]]);
  conf.setBorderColor(STYLE.border);
  var confCell = conf.getRow(0).getCell(0);
  confCell.setBackgroundColor(STYLE.noteFill).setAttributes(attrs_(10, STYLE.dark, true));
  setPadding_(confCell, 8);

  if (req.purpose) {
    var purpose = body.appendParagraph('Propósito: ' + req.purpose);
    purpose.editAsText().setFontSize(10).setForegroundColor(STYLE.dark);
    purpose.editAsText().setBold(0, 9, true);
  }

  // 3. Control de versiones.
  heading_(body, 'Control de versiones', DocumentApp.ParagraphHeading.HEADING1);
  instruction_(
    body,
    '[Instrucción: Registre cada versión del documento. Marque "Sí" en ¿Es Línea Base? solo cuando la versión haya sido aprobada formalmente; desde ese momento cualquier cambio requiere una Solicitud de Cambio aprobada.]',
  );
  modernTable_(
    body,
    ['Fecha', 'Versión', 'Descripción del Cambio', 'Autor', '¿Es Línea Base? (Sí/No)'],
    [
      [req.date, 'v1.0', 'Creación del documento a partir de la plantilla estándar', '', 'No'],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
    ],
  );

  // 4. Secciones con instrucciones de llenado.
  for (var i = 0; i < req.sections.length; i++) {
    var s = req.sections[i];
    heading_(body, (i + 1) + '. ' + s.title, DocumentApp.ParagraphHeading.HEADING1);
    instruction_(body, s.instruction);
    if (s.table) modernTable_(body, s.table.headers, emptyRows_(s.table));
    var subs = s.subsections || [];
    for (var j = 0; j < subs.length; j++) {
      heading_(body, (i + 1) + '.' + (j + 1) + ' ' + subs[j].title, DocumentApp.ParagraphHeading.HEADING2);
      instruction_(body, subs[j].instruction);
      if (subs[j].table) modernTable_(body, subs[j].table.headers, emptyRows_(subs[j].table));
    }
  }

  // 6. Aprobaciones.
  heading_(body, 'Aprobaciones', DocumentApp.ParagraphHeading.HEADING1);
  instruction_(body, '[Instrucción: Complete nombre, cargo y fecha. La firma del Aprobador formaliza el documento; si es una línea base, actualice el Control de versiones.]');
  modernTable_(
    body,
    ['Rol', 'Nombre', 'Cargo', 'Firma', 'Fecha'],
    [
      ['Elaborador / Revisor', '', '', '', ''],
      ['Aprobador', '', '', '', ''],
    ],
    true,
  );
}

function setTypography_(body) {
  var base = {};
  base[DocumentApp.Attribute.FONT_FAMILY] = STYLE.font;
  base[DocumentApp.Attribute.FONT_SIZE] = 11;
  base[DocumentApp.Attribute.FOREGROUND_COLOR] = STYLE.dark;
  body.setHeadingAttributes(DocumentApp.ParagraphHeading.NORMAL, base);

  var t = {};
  t[DocumentApp.Attribute.FONT_FAMILY] = STYLE.font;
  t[DocumentApp.Attribute.FONT_SIZE] = 24;
  t[DocumentApp.Attribute.BOLD] = true;
  t[DocumentApp.Attribute.FOREGROUND_COLOR] = STYLE.dark;
  body.setHeadingAttributes(DocumentApp.ParagraphHeading.TITLE, t);

  var h1 = {};
  h1[DocumentApp.Attribute.FONT_FAMILY] = STYLE.font;
  h1[DocumentApp.Attribute.FONT_SIZE] = 15;
  h1[DocumentApp.Attribute.BOLD] = true;
  h1[DocumentApp.Attribute.FOREGROUND_COLOR] = STYLE.orange;
  body.setHeadingAttributes(DocumentApp.ParagraphHeading.HEADING1, h1);

  var h2 = {};
  h2[DocumentApp.Attribute.FONT_FAMILY] = STYLE.font;
  h2[DocumentApp.Attribute.FONT_SIZE] = 12;
  h2[DocumentApp.Attribute.BOLD] = true;
  h2[DocumentApp.Attribute.FOREGROUND_COLOR] = STYLE.dark;
  body.setHeadingAttributes(DocumentApp.ParagraphHeading.HEADING2, h2);
}

function attrs_(size, color, bold) {
  var a = {};
  a[DocumentApp.Attribute.FONT_FAMILY] = STYLE.font;
  a[DocumentApp.Attribute.FONT_SIZE] = size;
  a[DocumentApp.Attribute.FOREGROUND_COLOR] = color;
  a[DocumentApp.Attribute.BOLD] = !!bold;
  return a;
}

function heading_(body, text, level) {
  var p = body.appendParagraph(text).setHeading(level);
  p.setSpacingBefore(level === DocumentApp.ParagraphHeading.HEADING1 ? 18 : 10).setSpacingAfter(6);
  return p;
}

/** Texto instructivo: cursiva, gris sutil y fondo claro. */
function instruction_(body, text) {
  var p = body.appendParagraph(text);
  p.editAsText().setItalic(true).setForegroundColor(STYLE.muted).setBackgroundColor(STYLE.noteFill).setFontSize(10);
  p.setSpacingAfter(8);
  return p;
}

/** Tabla moderna: bordes sutiles y encabezado sombreado. */
function modernTable_(body, headers, rows, boldFirstColumn) {
  var table = body.appendTable([headers].concat(rows));
  table.setBorderColor(STYLE.border).setBorderWidth(1);
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      setPadding_(cell, 5);
      if (r === 0) {
        cell.setBackgroundColor(STYLE.headerFill).setAttributes(attrs_(9, STYLE.dark, true));
      } else {
        cell.setAttributes(attrs_(10, STYLE.dark, c === 0 && (boldFirstColumn || false)));
      }
    }
  }
  body.appendParagraph('');
  return table;
}

function emptyRows_(t) {
  var rows = [];
  var n = Math.max(t.rows || 1, (t.firstColumn || []).length);
  for (var r = 0; r < n; r++) {
    var row = [];
    for (var c = 0; c < t.headers.length; c++) row.push(c === 0 && t.firstColumn && t.firstColumn[r] ? t.firstColumn[r] : '');
    rows.push(row);
  }
  return rows;
}

function setPadding_(cell, pt) {
  cell.setPaddingTop(pt).setPaddingBottom(pt).setPaddingLeft(pt + 2).setPaddingRight(pt + 2);
}

function styleSmall_(p) {
  p.editAsText().setFontSize(8).setForegroundColor(STYLE.muted).setFontFamily(STYLE.font);
  return p;
}

function removeFirstEmpty_(section) {
  var first = section.getChild(0);
  if (section.getNumChildren() > 1 && first.getType() === DocumentApp.ElementType.PARAGRAPH && first.asParagraph().getText() === '') {
    first.removeFromParent();
  }
}
