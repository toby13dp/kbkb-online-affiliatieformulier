#!/usr/bin/env python3
"""Start de lokale toepassing met de gevalideerde XLSX-patcher."""

from __future__ import annotations

import local_server
from xlsx_patch import build_temporary_workbook

# convert_workbook_to_pdf() zoekt deze globale functie op het moment van export.
# Daardoor gebruikt de server altijd de apart geteste en gevalideerde patcher.
local_server.build_temporary_workbook = build_temporary_workbook

# Mobiele ondertekeningssessies blijven maximaal 30 minuten in het geheugen.
local_server.SESSION_TTL_SECONDS = 30 * 60


if __name__ == "__main__":
    raise SystemExit(local_server.main())
