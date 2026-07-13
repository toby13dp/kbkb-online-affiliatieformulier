"""Vul uitsluitend toegelaten cellen in een kopie van het officiële XLSX-bestand.

Deze module gebruikt alleen de Python-standaardbibliotheek en bewaart alle
bestaande stijlen, afbeeldingen, pagina-instellingen en overige werkmapbestanden.
"""

from __future__ import annotations

import io
import re
import zipfile
from xml.sax.saxutils import escape as xml_escape


def column_number(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        return 0
    number = 0
    for char in letters.group(0):
        number = number * 26 + ord(char) - 64
    return number


def clean_cell_opening(opening: str, reference: str, has_value: bool) -> str:
    attributes = opening[2:-1]
    attributes = re.sub(r"/\s*$", "", attributes)
    attributes = re.sub(r"\s+t=(['\"]).*?\1", "", attributes)
    if not re.search(r"\br=(['\"])" + re.escape(reference) + r"\1", attributes):
        attributes += f' r="{reference}"'
    if has_value:
        attributes += ' t="inlineStr"'
    return "<c" + attributes + ">"


def cell_xml(reference: str, value: str, opening: str | None = None) -> str:
    has_value = bool(value)
    start = clean_cell_opening(opening or f'<c r="{reference}">', reference, has_value)
    if not has_value:
        return start + "</c>"
    escaped = xml_escape(value, {'"': "&quot;", "'": "&apos;"})
    return start + f'<is><t xml:space="preserve">{escaped}</t></is></c>'


def replace_cell(sheet_xml: str, reference: str, value: str) -> str:
    # Het negatieve lookbehind voorkomt dat een zelfsluitende <c .../>-cel
    # per ongeluk als een normale openings-tag wordt geïnterpreteerd.
    full_pattern = re.compile(
        rf'(<c\b[^>]*\br=["\']{re.escape(reference)}["\'][^>]*?(?<!/)>)([\s\S]*?)(</c>)'
    )
    match = full_pattern.search(sheet_xml)
    if match:
        return (
            sheet_xml[: match.start()]
            + cell_xml(reference, value, match.group(1))
            + sheet_xml[match.end() :]
        )

    short_pattern = re.compile(
        rf'(<c\b[^>]*\br=["\']{re.escape(reference)}["\'][^>]*/>)'
    )
    match = short_pattern.search(sheet_xml)
    if match:
        opening = re.sub(r"/\s*>$", ">", match.group(1))
        return (
            sheet_xml[: match.start()]
            + cell_xml(reference, value, opening)
            + sheet_xml[match.end() :]
        )

    row_number = int(re.search(r"\d+", reference).group(0))
    row_pattern = re.compile(
        rf'(<row\b[^>]*\br=["\']{row_number}["\'][^>]*>)([\s\S]*?)(</row>)'
    )
    row_match = row_pattern.search(sheet_xml)
    new_cell = cell_xml(reference, value)

    if row_match:
        content = row_match.group(2)
        target_column = column_number(reference)
        insert_at = len(content)
        for cell_match in re.finditer(
            r'<c\b[^>]*\br=["\']([A-Z]+\d+)["\']', content
        ):
            if column_number(cell_match.group(1)) > target_column:
                insert_at = cell_match.start()
                break
        new_content = content[:insert_at] + new_cell + content[insert_at:]
        replacement = row_match.group(1) + new_content + row_match.group(3)
        return (
            sheet_xml[: row_match.start()]
            + replacement
            + sheet_xml[row_match.end() :]
        )

    sheet_data_end = sheet_xml.find("</sheetData>")
    if sheet_data_end < 0:
        raise RuntimeError("Het werkblad bevat geen herkenbare sheetData-sectie.")
    return (
        sheet_xml[:sheet_data_end]
        + f'<row r="{row_number}">{new_cell}</row>'
        + sheet_xml[sheet_data_end:]
    )


def build_temporary_workbook(template: bytes, cells: dict[str, str]) -> bytes:
    source = io.BytesIO(template)
    output = io.BytesIO()

    with zipfile.ZipFile(source, "r") as archive_in, zipfile.ZipFile(output, "w") as archive_out:
        for info in archive_in.infolist():
            data = archive_in.read(info.filename)
            if info.filename == "xl/worksheets/sheet1.xml":
                xml = data.decode("utf-8")
                references = sorted(
                    cells,
                    key=lambda ref: (
                        int(re.search(r"\d+", ref).group(0)),
                        column_number(ref),
                    ),
                )
                for reference in references:
                    xml = replace_cell(xml, reference, cells[reference])
                data = xml.encode("utf-8")
            archive_out.writestr(info, data)

    workbook = output.getvalue()
    if not workbook.startswith(b"PK"):
        raise RuntimeError("De tijdelijke Excelkopie kon niet worden opgebouwd.")
    return workbook
