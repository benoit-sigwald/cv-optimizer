# Format spec — Master CV template (OBLIGATOIRE)

Toute génération de CV reproduit exactement ce layout. Ne jamais utiliser un autre layout sans validation explicite.

## Page

- A4 portrait, **une seule page** (non négociable)
- Marges ~**680 DXA** (≈1,2 cm) sur les 4 côtés
- Police **Calibri** partout

## Structure (de haut en bas)

1. **Header** pleine largeur, fond **#1F3864**, texte blanc — tableau 3 colonnes :
   - Gauche : nom (gras, ~20pt), titre (~10pt, majuscules), ligne contact (ville • téléphone • email)
   - Milieu-droite : `LANGUAGES` + langues, `Availability`, `Age`
   - Droite : **photo** (portrait, ~2,6 cm de large)
2. **Accroche résumé** : paragraphe unique sous le header, ~9pt
3. **KEY SKILLS** : titre de section (gras, #1F3864, majuscules) puis **grille 3 colonnes × 2 rangées** ; chaque cellule = titre gras + contenu ; fond **#EAF1FA** en alternance
4. **RECENT AI PROJECTS** : lignes `**Company** — description` (company en gras)
5. **PROFESSIONAL CAREER** : tableau **2 colonnes** sans bordures :
   - Gauche (~22%) : company (gras), dates, ville
   - Droite : rôle (gras) + bullets
6. **FORMATION & CERTIFICATIONS** : tableau **4 lignes** (Academic / Certifs / Data & tech / Personal), label en gras à gauche, fond #EAF1FA alternant

## Couleurs

| Usage | Hex |
|---|---|
| Header, titres de section | `1F3864` |
| Fonds alternés (skills, formation) | `EAF1FA` |

## Validation

Rendre la première page en image (LibreOffice `soffice --headless --convert-to pdf` puis rendu PNG) et vérifier visuellement : 1 page, rien de coupé. Ne pas se fier à `pdfinfo` (LibreOffice génère parfois une 2e page blanche parasite).
