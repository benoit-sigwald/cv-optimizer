# Format spec — Master CV template (OBLIGATOIRE)

Valeurs **extraites du PDF de référence** (2026.06 Master CV) via PyMuPDF — ne pas improviser.
Toute génération reproduit exactement ce layout ; jamais un autre sans validation explicite.

## Page

- A4 portrait, **une seule page** (non négociable)
- Marges : haut 22pt (440 DXA), gauche 36pt (720), droite 37pt (740), bas ~22pt
- Police **Calibri** partout, séparateurs « · » (pas « • »)

## Couleurs exactes

| Usage | Hex |
|---|---|
| Fond header | `1F4E78` |
| Titres (sections, skills, sociétés, rôles) | `1F4E79` |
| Règles sous titres de section (2pt) + ligne verticale carrière (1pt) | `2E74B5` |
| Fond cellules skills et formation | `F1F4F7` |
| Texte pâle header (contact, valeurs) | `D5E8F0` |
| Dates/lieux carrière (italique) | `595959` |
| Séparateurs lignes formation (1pt) | `BEBEBE` |

## Structure (haut → bas)

1. **Header** : barre `1F4E78` pleine largeur, hauteur ~72pt. Gauche : nom (Calibri-Bold 20pt blanc), titre (Calibri 9.5 blanc, NON gras, majuscules), contact (8pt `D5E8F0`, « · »). Milieu : label LANGUES (bold 9.5 blanc), valeurs 8.5 `D5E8F0` ; « Disponibilité »/« Âge » : label bold blanc + valeur pâle. Droite : **photo 60×71pt collée au bord**, pleine hauteur du header.
2. **Accroche** : paragraphe 9.5pt noir.
3. **Titres de section** : Calibri-Bold 11pt `1F4E79` majuscules + **règle 2pt `2E74B5`** dessous, pleine largeur.
4. **COMPÉTENCES** : grille 3 colonnes × 2 rangées, **toutes** les cellules `F1F4F7` (pas d'alternance), gouttières blanches ~14–17pt entre colonnes et ~13pt entre rangées. Titre de cellule bold 9.5 `1F4E79`, contenu 8.5 noir.
5. **PROJETS** : lignes « **Société —** description » — société Calibri-Bold 10pt `1F4E79`, texte 10pt noir.
6. **PARCOURS** : tableau 2 colonnes — gauche **étroite ~100pt** (société bold 10 `1F4E79`, dates et lieu italique 9 `595959`) ; **ligne verticale 1pt `2E74B5`** entre les colonnes ; droite : rôle bold 10.5 `1F4E79` (suffixe entre parenthèses en italique 9.5), bullets « • » 10pt noir.
7. **FORMATION** : tableau 2 colonnes (label ~120pt), **toutes cellules `F1F4F7`**, séparateurs horizontaux **1pt `BEBEBE`**, texte 9pt (label bold `1F4E79`).

## Validation

Rendre la première page en image (LibreOffice → PDF → PyMuPDF PNG) et vérifier visuellement : 1 page, rien de coupé. Ne pas se fier à pdfinfo. Si débordement : couper dans les bullets les moins alignés avec l'offre, jamais dans les métriques.
