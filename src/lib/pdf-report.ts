'use client';

import { sortDailyMenuDishes, type DailyMenuRecord, type RestaurantSettings } from './db';
import { joinPhoneNumbers } from './phone';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_Y = 28;
const MIN_Y = 54;

/**
 * Normalise une chaîne UTF-16 en octets WinAnsi (Windows-1252) pour les polices Type1 PDF
 * afin de conserver tous les accents français sans dépendance externe.
 */
function toWinAnsiRaw(input: string): string {
  const normalized = (input || '')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\u2022/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\r?\n|\r/g, ' ');

  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 0x20ac) {
      out += '\x80';
    } else if (code === 0x0152) {
      out += '\x8c';
    } else if (code === 0x0153) {
      out += '\x9c';
    } else if (code >= 0x20 && code <= 0xff) {
      out += String.fromCharCode(code);
    } else {
      out += '?';
    }
  }
  return out;
}

function pdfTextLiteral(input: string): string {
  const raw = toWinAnsiRaw(input);
  let escaped = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\') escaped += '\\\\';
    else if (ch === '(') escaped += '\\(';
    else if (ch === ')') escaped += '\\)';
    else escaped += ch;
  }
  return `(${escaped})`;
}

function truncateText(input: string, maxChars: number): string {
  const clean = (input || '').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function formatPriceText(price: number): string {
  const n = Math.max(0, Math.round(Number(price) || 0));
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

function formatDateHeading(isoStr: string): string {
  try {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  } catch {}
  return isoStr;
}

class PdfPageBuilder {
  public pages: string[][] = [];
  public y = PAGE_HEIGHT;

  constructor(private readonly restaurantName: string, private readonly subHeader: string) {
    this.startNewPage(true);
  }

  public startNewPage(isFirst: boolean): void {
    const cmds: string[] = [];
    if (isFirst) {
      // Bannière bordeaux + filet or en haut de la page 1
      cmds.push('0.533 0.075 0.075 rg');
      cmds.push(`0 ${PAGE_HEIGHT - 78} ${PAGE_WIDTH} 78 re f`);
      cmds.push('0.918 0.702 0.031 rg');
      cmds.push(`0 ${PAGE_HEIGHT - 82} ${PAGE_WIDTH} 4 re f`);

      cmds.push('1 1 1 rg');
      cmds.push(`BT /F2 15 Tf ${MARGIN_X} ${PAGE_HEIGHT - 32} Td ${pdfTextLiteral(this.restaurantName.toUpperCase())} Tj ET`);
      cmds.push('0.980 0.800 0.082 rg');
      cmds.push(`BT /F2 10 Tf ${MARGIN_X} ${PAGE_HEIGHT - 50} Td ${pdfTextLiteral('Rapport Officiel des Menus du Jour')} Tj ET`);
      cmds.push('0.980 0.940 0.880 rg');
      cmds.push(`BT /F1 8.5 Tf ${MARGIN_X} ${PAGE_HEIGHT - 66} Td ${pdfTextLiteral(this.subHeader)} Tj ET`);

      const todayLabel = `Genere le ${new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })}`;
      cmds.push('1 1 1 rg');
      cmds.push(`BT /F1 8.5 Tf ${PAGE_WIDTH - 175} ${PAGE_HEIGHT - 32} Td ${pdfTextLiteral(todayLabel)} Tj ET`);

      this.y = PAGE_HEIGHT - 104;
    } else {
      cmds.push('0.533 0.075 0.075 rg');
      cmds.push(`0 ${PAGE_HEIGHT - 34} ${PAGE_WIDTH} 34 re f`);
      cmds.push('0.918 0.702 0.031 rg');
      cmds.push(`0 ${PAGE_HEIGHT - 36} ${PAGE_WIDTH} 2 re f`);
      cmds.push('1 1 1 rg');
      cmds.push(
        `BT /F2 9.5 Tf ${MARGIN_X} ${PAGE_HEIGHT - 22} Td ${pdfTextLiteral(
          `${this.restaurantName} - Rapport des Menus du Jour (suite)`
        )} Tj ET`
      );
      this.y = PAGE_HEIGHT - 58;
    }
    this.pages.push(cmds);
  }

  public get current(): string[] {
    return this.pages[this.pages.length - 1];
  }

  public ensureSpace(neededHeight: number): boolean {
    if (this.y - neededHeight < MIN_Y) {
      this.startNewPage(false);
      return true;
    }
    return false;
  }

  public drawFilledRect(x: number, y: number, w: number, h: number, rgb: string, strokeRgb?: string): void {
    this.current.push(`${rgb} rg`);
    if (strokeRgb) {
      this.current.push(`${strokeRgb} RG 0.6 w`);
      this.current.push(`${x} ${y} ${w} ${h} re B`);
    } else {
      this.current.push(`${x} ${y} ${w} ${h} re f`);
    }
  }

  public drawText(
    x: number,
    y: number,
    text: string,
    font: 'F1' | 'F2' = 'F1',
    size = 9,
    rgb = '0.169 0.094 0.063'
  ): void {
    this.current.push(`${rgb} rg`);
    this.current.push(`BT /${font} ${size} Tf ${x} ${y} Td ${pdfTextLiteral(text)} Tj ET`);
  }
}

function buildPdfBytes(pages: string[][], footerLeft: string): Uint8Array {
  const totalPages = pages.length;
  const pageObjs: string[] = [];

  for (let i = 0; i < totalPages; i++) {
    const cmds = [...pages[i]];
    // Pied de page avec pagination exacte
    cmds.push('0.820 0.760 0.680 RG 0.5 w');
    cmds.push(`${MARGIN_X} ${FOOTER_Y + 12} m ${PAGE_WIDTH - MARGIN_X} ${FOOTER_Y + 12} l S`);
    cmds.push('0.450 0.400 0.360 rg');
    cmds.push(`BT /F1 8 Tf ${MARGIN_X} ${FOOTER_Y} Td ${pdfTextLiteral(footerLeft)} Tj ET`);
    cmds.push(
      `BT /F2 8 Tf ${PAGE_WIDTH - MARGIN_X - 58} ${FOOTER_Y} Td ${pdfTextLiteral(`Page ${i + 1} / ${totalPages}`)} Tj ET`
    );
    pageObjs.push(cmds.join('\n'));
  }

  const objects: string[] = [];
  const kidsRefs: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    kidsRefs.push(`${6 + i * 2} 0 R`);
  }

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${totalPages} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  for (let i = 0; i < totalPages; i++) {
    const stream = pageObjs[i];
    const contentId = 5 + i * 2;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  }

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Génère et télécharge directement un rapport PDF officiel sans passer par la boîte de dialogue d'impression.
 */
export function downloadMenuReportsPdf(
  reports: DailyMenuRecord[],
  settings: Partial<RestaurantSettings>,
  filename: string
): void {
  const restaurantName = settings.restaurant_name || 'Restaurant La Gratitude';
  const address = settings.address || 'Zagtouli, route de Bobo - Ouagadougou';
  const phone = joinPhoneNumbers(settings.phone, settings.phone_2);

  const doc = new PdfPageBuilder(restaurantName, `${address} | Tel : ${phone}`);

  const totalDishesCount = reports.reduce((sum, r) => sum + (r.dishes_json?.length || 0), 0);
  const avg = reports.length > 0 ? (totalDishesCount / reports.length).toFixed(1) : '0';

  // Encadré récapitulatif en haut
  doc.drawFilledRect(MARGIN_X, doc.y - 30, CONTENT_WIDTH, 34, '0.992 0.961 0.910', '0.871 0.776 0.655');
  doc.drawText(
    MARGIN_X + 12,
    doc.y - 11,
    `Periode : ${reports.length} ${reports.length > 1 ? 'journees selectionnees' : 'journee selectionnee'}`,
    'F2',
    9.5,
    '0.533 0.075 0.075'
  );
  doc.drawText(
    MARGIN_X + 260,
    doc.y - 11,
    `Total plats : ${totalDishesCount} | Moyenne : ${avg} plats/jour`,
    'F2',
    9.5
  );
  doc.drawText(
    MARGIN_X + 12,
    doc.y - 24,
    'Classement automatique : Plats de Riz, Soupes, Accompagnements, Grillades et Boissons.',
    'F1',
    8,
    '0.420 0.380 0.350'
  );
  doc.y -= 46;

  const drawTableHeader = () => {
    doc.drawFilledRect(MARGIN_X, doc.y - 16, CONTENT_WIDTH, 18, '0.961 0.922 0.878', '0.871 0.776 0.655');
    doc.drawText(MARGIN_X + 6, doc.y - 10, 'N.', 'F2', 8);
    doc.drawText(MARGIN_X + 28, doc.y - 10, 'Plat', 'F2', 8);
    doc.drawText(MARGIN_X + 275, doc.y - 10, 'Categorie', 'F2', 8);
    doc.drawText(MARGIN_X + 365, doc.y - 10, 'Prix FCFA', 'F2', 8);
    doc.drawText(MARGIN_X + 448, doc.y - 10, 'Statut', 'F2', 8);
    doc.y -= 18;
  };

  for (const rep of reports) {
    const sorted = sortDailyMenuDishes(rep.dishes_json || []);

    // S'assure qu'il y a au moins place pour l'en-tête du jour + entête tableau + 1 ligne
    doc.ensureSpace(72);

    // Barre de titre de la journée
    doc.drawFilledRect(MARGIN_X, doc.y - 18, CONTENT_WIDTH, 20, '0.533 0.075 0.075');
    const heading = `${formatDateHeading(rep.menu_date)} (${rep.menu_date})`;
    doc.drawText(MARGIN_X + 8, doc.y - 12, truncateText(heading, 58), 'F2', 9.5, '1 1 1');
    doc.drawText(
      PAGE_WIDTH - MARGIN_X - 88,
      doc.y - 12,
      `${sorted.length} plats`,
      'F2',
      9,
      '0.980 0.800 0.082'
    );
    doc.y -= 20;

    drawTableHeader();

    if (sorted.length === 0) {
      doc.ensureSpace(20);
      doc.drawFilledRect(MARGIN_X, doc.y - 16, CONTENT_WIDTH, 18, '1 1 1', '0.918 0.847 0.745');
      doc.drawText(MARGIN_X + 12, doc.y - 10, 'Aucun plat enregistre pour cette date.', 'F1', 8.5, '0.50 0.45 0.42');
      doc.y -= 20;
    } else {
      for (let i = 0; i < sorted.length; i++) {
        const dish = sorted[i];
        const broke = doc.ensureSpace(20);
        if (broke) {
          doc.drawText(MARGIN_X, doc.y - 4, `${formatDateHeading(rep.menu_date)} (suite)`, 'F2', 8.5, '0.533 0.075 0.075');
          doc.y -= 12;
          drawTableHeader();
        }

        const bg = i % 2 === 0 ? '1 0.992 0.976' : '0.984 0.961 0.929';
        doc.drawFilledRect(MARGIN_X, doc.y - 16, CONTENT_WIDTH, 17, bg, '0.918 0.847 0.745');
        doc.drawText(MARGIN_X + 6, doc.y - 10, String(i + 1), 'F1', 8, '0.45 0.42 0.40');
        doc.drawText(MARGIN_X + 28, doc.y - 10, truncateText(dish.name || '', 44), 'F2', 8.2);
        doc.drawText(MARGIN_X + 275, doc.y - 10, truncateText(dish.category || '', 16), 'F1', 8);
        doc.drawText(MARGIN_X + 365, doc.y - 10, formatPriceText(dish.price), 'F2', 8.2, '0.533 0.075 0.075');

        const statusLabel =
          dish.stock_status === 'low'
            ? 'Presque fini'
            : dish.is_available_today
            ? 'Disponible'
            : 'Non disponible';
        const statusColor =
          dish.stock_status === 'low'
            ? '0.706 0.325 0.035'
            : dish.is_available_today
            ? '0.086 0.498 0.243'
            : '0.550 0.500 0.480';
        doc.drawText(MARGIN_X + 448, doc.y - 10, statusLabel, 'F2', 8, statusColor);

        doc.y -= 17;
      }
    }

    if (rep.notes) {
      doc.ensureSpace(16);
      doc.drawText(
        MARGIN_X + 6,
        doc.y - 10,
        truncateText(`Note : ${rep.notes}`, 92),
        'F1',
        7.5,
        '0.450 0.420 0.400'
      );
      doc.y -= 15;
    }

    doc.y -= 10;
  }

  // Bloc visas / signatures en fin de rapport
  doc.ensureSpace(75);
  doc.y -= 8;
  doc.drawText(MARGIN_X, doc.y - 10, 'Le Responsable de Cuisine :', 'F2', 8.5);
  doc.drawText(PAGE_WIDTH / 2 + 20, doc.y - 10, `La Direction - ${restaurantName} :`, 'F2', 8.5);
  doc.current.push('0.600 0.550 0.500 RG 0.6 w');
  doc.current.push(`${MARGIN_X} ${doc.y - 46} m ${MARGIN_X + 210} ${doc.y - 46} l S`);
  doc.current.push(`${PAGE_WIDTH / 2 + 20} ${doc.y - 46} m ${PAGE_WIDTH - MARGIN_X} ${doc.y - 46} l S`);
  doc.drawText(MARGIN_X, doc.y - 56, 'Visa & Date', 'F1', 7.5, '0.480 0.450 0.420');
  doc.drawText(PAGE_WIDTH / 2 + 20, doc.y - 56, 'Cachet & Signature', 'F1', 7.5, '0.480 0.450 0.420');

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const bytes = buildPdfBytes(doc.pages, `${restaurantName} - ${address}`);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Lance l'impression navigateur en attribuant temporairement un nom de document automatique
 * (utilisé comme nom par défaut si l'utilisateur imprime en PDF).
 */
export function printWithAutoDocumentTitle(docTitle: string): void {
  const prevTitle = document.title;
  document.title = docTitle;
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 2000);
}
