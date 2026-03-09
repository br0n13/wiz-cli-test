#!/usr/bin/env python3
"""Compute new vulnerabilities between baseline and current Wiz scan outputs."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def load_findings(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text())
    findings = data.get("findings", data)

    index = {}
    for finding in findings:
        key = str(
            finding.get("id")
            or finding.get("vulnerabilityId")
            or finding.get("name")
            or finding.get("title")
        )
        if key and key != "None":
            index[key] = finding
    return index


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: diff_wiz_results.py <baseline.json> <current.json> <out.json>")
        return 2

    baseline = load_findings(Path(sys.argv[1]))
    current = load_findings(Path(sys.argv[2]))

    new_ids = sorted(set(current) - set(baseline))
    diff = {
        "new_count": len(new_ids),
        "new_findings": [current[x] for x in new_ids],
    }

    Path(sys.argv[3]).write_text(json.dumps(diff, indent=2))
    print(f"New findings: {diff['new_count']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
