# Format spec — Master CV template (OBLIGATOIRE)

Valeurs **extraites du DOCX de référence** (`2026.06 Benoit SIGWALD Master CV.docx`, XML Word) — ne pas improviser.
Vérification croisée : conversion LibreOffice → PDF → PyMuPDF, le rendu doit donner les mêmes
rectangles/positions que le master converti par la même chaîne.

## ⚠ Variante « aérée » (validée 13/07/2026 — layout courant)

`scripts/generate-cv.mjs` implémente la variante validée par Benoît, qui prime sur les valeurs master ci-dessous quand elles diffèrent :
- **Header réduit** : hauteur de rangée 1000 atLeast (rendu ~58pt vs 90 master), marges cellules 80 twips (vs 200), espacements internes resserrés ; **photo compacte 42×50pt** (56×67px), toujours flottante hors barre, même ancre
- **Titre header sur UNE SEULE ligne** : auto-réduction 9.5→8pt (estimation 0.52em/char sur 287pt utiles) puis warning — viser ≤55 caractères dans les données
- **Polices corps +0.5pt** : accroche 10pt, titres de cellules skills 10pt, contenu skills 9pt (le reste inchangé)
- **Espacements aérés** pour maximiser l'A4 : titres de section before 140/after 100, accroche before 160/after 120, projets after 90, bullets after 60, inter-postes (marges bas cellules carrière) 70, formation marges 55, skills marges 70
- **Objectif de remplissage** : dernier texte vers y≈800-825pt (limite 827), 1 page, rendu aéré
- **Validation TOUJOURS en local** (generate + soffice + PyMuPDF sur disque local) — jamais mesurer un fichier sur G:/Google Drive (cache = mesures périmées)

## Page

- A4 portrait, **une seule page** (non négociable)
- Marges (twips) : haut **142** (~7pt), gauche **720** (36pt), droite **720** (36pt), bas **300** (15pt)
- Un paragraphe vide (line 276) précède le header → la barre bleue démarre à y≈21.6pt
- Police **Calibri** partout, séparateurs « · » (pas « • »)

## Couleurs exactes (XML du master)

| Usage | Hex |
|---|---|
| Fond header + tous les titres (sections, skills, sociétés, rôles) | `1F4E79` |
| Règles sous titres de section (1.5pt, sz 12) + ligne verticale carrière (0.75pt, sz 6) | `2E75B6` |
| Fond cellules skills et formation | `F2F4F8` |
| Texte pâle header (contact, valeurs) | `D5E8F0` |
| Dates/lieux carrière (italique) | `595959` |
| Séparateurs lignes formation (0.5pt, sz 4, haut+bas de chaque cellule) | `BFBFBF` |

## Structure (haut → bas)

1. **Header** : tableau fixe **9360 DXA** (colonnes 6300 + 3060 = 468pt, PAS pleine largeur),
   fond `1F4E79`, hauteur de rangée 1399 atLeast, vAlign center.
   Cellule gauche (marges 200/360/200/200) : nom Calibri-Bold 20pt blanc (after 60) ;
   titre 9.5pt blanc NON gras majuscules (after 60) ; contact 8pt `D5E8F0`.
   Cellule droite (marges 200) : label LANGUES bold 9.5 blanc (after 30) ; valeurs 8.5 `D5E8F0`
   (after 60) ; « Disponibilité »/« Âge » : label bold 9.5 blanc + valeur 8.5 pâle (after 30).
   **Photo flottante** ancrée au paragraphe vide initial, HORS de la barre : posH 5934075 EMU
   (column), posV 180975 EMU (paragraph), 762000×905363 EMU (60×71.3pt), wrapNone —
   elle se pose à droite de la barre, x≈503pt.
2. **Accroche** : 9.5pt noir, spacing before/after 120.
3. **Titres de section** : Calibri-Bold 11pt `1F4E79` majuscules, before 120 after 80,
   **règle 1.5pt `2E75B6`** dessous (sz 12, space 2), pleine largeur.
4. **COMPÉTENCES** : tableau fixe **10590 DXA**, colonnes 3525/270/3360/345/3090
   (3 cellules + 2 gouttières blanches), rangée-espaceur vide entre les 2 rangées de contenu.
   Cellules `F2F4F8`, marges 80/140/80/140, vAlign top, rangée 1 hauteur 387 atLeast.
   Titre de cellule bold 9.5 `1F4E79` (after 40), contenu 8.5 noir.
5. **PROJETS** : « **Société —** description » — société Calibri-Bold 10pt `1F4E79`,
   texte 10pt noir, after 80.
6. **PARCOURS** : tableau fixe **10380 DXA**, colonnes **1980/8400** (gauche 99pt).
   Cellule gauche : marges 40/0/60/160, **bordure droite 0.75pt `2E75B6`** (sz 6) ;
   société bold 10 `1F4E79` (after 40), dates puis lieu italique 9 `595959` (after 40).
   Cellule droite : marges 40/200/60/0 ; rôle bold 10.5 `1F4E79` (suffixe « (…) » bold 9.5),
   after 40 ; bullets « • » + tab, 9.5pt noir, indent left 360 hanging 240,
   spacing after 20 line 240 auto.
7. **FORMATION** : tableau fixe **10470 DXA**, colonnes **1410/9060** (label 70.5pt).
   TOUTES cellules `F2F4F8`, marges 40/140/40/140, vAlign center,
   **bordures haut+bas 0.5pt `BFBFBF`** (sz 4) sur chaque cellule.
   Label bold 9.5 `1F4E79`, contenu 9pt noir.

## Validation

Rendre la première page en image (LibreOffice → PDF → PyMuPDF PNG) et vérifier visuellement :
1 page, rien de coupé. Ne pas se fier à pdfinfo. Si débordement : couper dans les bullets les
moins alignés avec l'offre, jamais dans les métriques. Pour un doute de style, dumper les
drawings/spans PyMuPDF des deux PDF (master et généré, convertis par le même LibreOffice)
et comparer les valeurs.
