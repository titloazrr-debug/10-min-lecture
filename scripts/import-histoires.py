#!/usr/bin/env python3
"""Découpe les manuscrits existants en chapitres Markdown, sans réécriture."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path("/Users/thierryloiseau/10-min-lecture/public/histoires")
PAND = re.compile(r"\{\.unnumbered\}")
NEWPAGE = re.compile(r"\\newpage")
YAML = re.compile(r"^---\n.*?\n---\n+", re.S)


def clean(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = YAML.sub("", text, count=1)
    text = PAND.sub("", text)
    text = NEWPAGE.sub("", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def split_by(text: str, pattern: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(pattern, text, re.M))
    out: list[tuple[str, str]] = []
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk = text[match.start() : end].strip()
        if re.search(r"^### — FIN —", chunk, re.M):
            chunk = re.split(r"^### — FIN —", chunk, maxsplit=1, flags=re.M)[0].strip()
        title = re.sub(r"^#+\s*", "", match.group(0)).strip()
        title = re.sub(r"\s*\{\.unnumbered\}\s*", "", title)
        out.append((title, chunk + "\n"))
    return out


def write_series(slug: str, chapters: list[tuple[str, str]], meta: dict) -> None:
    folder = ROOT / slug
    folder.mkdir(parents=True, exist_ok=True)
    episodes = []
    for index, (title, body) in enumerate(chapters, start=1):
        name = f"{index:02d}.md"
        (folder / name).write_text(clean(body), encoding="utf-8")
        episodes.append({"n": index, "title": title, "file": name})
    meta = {
        **meta,
        "slug": slug,
        "cover": meta.get("cover", ""),
        "buyUrl": meta.get("buyUrl", ""),
        "freeUntil": 2,
        "chapterCount": len(episodes),
        "episodes": episodes,
    }
    (folder / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    words = sum(len((folder / ep["file"]).read_text(encoding="utf-8").split()) for ep in episodes)
    print(f"{slug}: {len(episodes)} chapitres, {words} mots")


def avare() -> list[tuple[str, str]]:
    path = Path("/Users/thierryloiseau/Obsidian/01 - Classiques Revisites Dystopiques/L'Avare 2052/L_Avare_2052_MANUSCRIT_COMPLET.md")
    return split_by(path.read_text(encoding="utf-8"), r"^# Chapitre \d+[^\n]*")


def abel() -> list[tuple[str, str]]:
    path = Path("/Users/thierryloiseau/Documents/Obsidian Vault/07 - Romans KDP/02 - Abel doit nuire/Abel_doit_nuire_MANUSCRIT.md")
    return split_by(path.read_text(encoding="utf-8"), r"^# Chapitre \d+[^\n]*")


def odyssee() -> list[tuple[str, str]]:
    path = Path("/Users/thierryloiseau/Documents/Obsidian Vault/07 - Romans KDP/01 - Odyssee de la Poisse/L_Odyssee_Fiscale_MANUSCRIT.md")
    return split_by(path.read_text(encoding="utf-8"), r"^## (Prologue|Chapitre)[^\n]*")


def maison() -> list[tuple[str, str]]:
    base = Path("/Users/thierryloiseau/Documents/Obsidian Vault/07 - Romans KDP/03 - Maison qui ecoutait")
    files = [
        base / "VF - Chapitre 01 — Le silence minéral.md",
        base / "VF - Chapitre 02 — La fréquence résiduelle.md",
        base / "VF - Chapitre 03 — La voix d'à côté.md",
        base / "VF - Chapitre 04 — La respiration morte.md",
        base / "VF - Chapitre 05 — La dose prescrite.md",
        base / "VF - Chapitre 06 — L’Écho.md",
        base / "LMChapitre 7 — .md",
        base / "LMChapitre 8 — Le docteur Larrieu.md",
        base / "LMChapitre 9 — La soirée du chemin.md",
        base / "Archives_Brouillons/LMChapitre 10 — Les gens d’ici.md",
        base / "Archives_Brouillons/LMChapitre 11 — Nadia entend.md",
        base / "Archives_Brouillons/LMChapitre 12 — Les vestiges.md",
        base / "Archives_Brouillons/LMChapitre 13 — Deuxième voix.md",
        base / "Archives_Brouillons/LMChapitre 14 — La pharmacie.md",
    ]
    out: list[tuple[str, str]] = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        first = text.splitlines()[0]
        title = re.sub(r"^#+\s*", "", first)
        title = title.replace("**", "").strip()
        out.append((title, text))
    return out


def minutes_label(chapters: list[tuple[str, str]]) -> str:
    words = sum(len(body.split()) for _, body in chapters)
    minutes = max(10, round(words / 200))
    if minutes < 60:
        return f"{minutes} min"
    hours, rest = divmod(minutes, 60)
    if rest == 0:
        return f"{hours} h"
    return f"{hours} h {rest:02d}"


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    series = []

    a = avare()
    write_series(
        "lavare-2052",
        a,
        {
            "title": "L'Avare 2052",
            "author": "Ulysse Truffaut",
            "genre": "Satire post-apo",
            "status": "completed",
            "estimatedTime": minutes_label(a),
            "pitch": "Une comédie post-apocalyptique librement inspirée de Molière. Harpagon règne sur la Cuve-Basse, là où chaque litre d'eau et chaque goutte de brut se comptent.",
            "summary": "Une comédie post-apocalyptique librement inspirée de Molière. En 2052, Harpagon règne sur la Cuve-Basse, une forteresse de ferraille au milieu du Secteur 7, là où chaque litre d'eau et chaque goutte de brut se comptent.",
        },
    )
    series.append({"slug": "lavare-2052", "title": "L'Avare 2052", "author": "Ulysse Truffaut"})

    b = abel()
    write_series(
        "abel-doit-nuire",
        b,
        {
            "title": "Abel doit nuire",
            "author": "Ulysse Truffaut",
            "genre": "Fable de l'audit",
            "status": "completed",
            "estimatedTime": minutes_label(b),
            "pitch": "Une colonie pilote affiche un taux de criminalité trop bas — ce que la Guidance considère comme une anomalie statistique. Dans un système où la déviance est nécessaire à l'équilibre, quelqu'un doit commettre des crimes.",
            "summary": "Une colonie pilote « La Concorde » affiche un taux de criminalité trop bas — ce que la Guidance (l'IA qui fournit tout aux habitants) considère comme une anomalie statistique. Dans un système où la déviance est nécessaire à l'équilibre, quelqu'un doit commettre des crimes. Et ce quelqu'un, c'est Abel — l'homme le plus gentil de la colonie.",
        },
    )
    series.append({"slug": "abel-doit-nuire", "title": "Abel doit nuire", "author": "Ulysse Truffaut"})

    o = odyssee()
    write_series(
        "lodyssee-fiscale",
        o,
        {
            "title": "L'Odyssée (fiscale) d'Ulysse",
            "author": "Ulysse Truffaut",
            "genre": "Parodie mythologique",
            "status": "completed",
            "estimatedTime": minutes_label(o),
            "pitch": "L'Histoire est écrite par les vainqueurs. Elle est corrigée par leurs comptables.",
            "summary": "L'Histoire est écrite par les vainqueurs. Elle est corrigée par leurs comptables. Au lendemain de Troie, Ulysse d'Ithaque est bredouille, lombaires en berne, et attendu par des créanciers dont les intérêts composés dépassent le PIB de son île.",
        },
    )
    series.append({"slug": "lodyssee-fiscale", "title": "L'Odyssée (fiscale) d'Ulysse", "author": "Ulysse Truffaut"})

    m = maison()
    write_series(
        "la-maison-qui-ecoutait",
        m,
        {
            "title": "La Maison qui écoutait",
            "author": "T.R. Loiseau",
            "genre": "Thriller psychologique",
            "status": "ongoing",
            "estimatedTime": minutes_label(m),
            "pitch": "Une femme victime d'une agression traumatisante à Paris se retire dans une maison isolée dans les Pyrénées pour se reconstruire. Mais la maison est une smart home connectée — et son mari, resté à Paris, l'utilise pour la déstabiliser.",
            "summary": "Une femme victime d'une agression traumatisante à Paris se retire dans une maison isolée dans les Pyrénées pour se reconstruire. Mais la maison est une « smart home » connectée — et son mari, resté à Paris, l'utilise pour la déstabiliser, la faire douter de sa santé mentale, la reconquérir par la peur.",
        },
    )
    series.append({"slug": "la-maison-qui-ecoutait", "title": "La Maison qui écoutait", "author": "T.R. Loiseau"})

    index = []
    for item in series:
        meta = json.loads((ROOT / item["slug"] / "meta.json").read_text(encoding="utf-8"))
        index.append(
            {
                "slug": meta["slug"],
                "title": meta["title"],
                "author": meta["author"],
                "pitch": meta["pitch"],
                "estimatedTime": meta["estimatedTime"],
                "chapterCount": meta["chapterCount"],
                "status": meta["status"],
                "genre": meta["genre"],
                "cover": meta.get("cover", ""),
            }
        )
    (ROOT / "catalog.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("catalog.json", len(index), "séries")


if __name__ == "__main__":
    main()
