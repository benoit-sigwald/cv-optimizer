# CV Optimizer — Claude Code project

Industrialise la méthodologie de candidature de Benoît Sigwald : analyse d'offre → recherche entreprise → gap analysis → CV tailored + lettre de motivation → scoring ATS avant/après.

## Données (source de vérité : Supabase, projet "Einstein", id `eabuptcfoenqrvjlkmfk`)

Le repo est **public** : aucune donnée personnelle (CV, photo, téléphone, historique de candidatures) ne doit JAMAIS être commitée. Tout vit dans Supabase, tables préfixées `cv_` :

| Table | Contenu |
|---|---|
| `cv_master` | Master CV structuré (JSONB `content`, ligne `is_current = true`) |
| `cv_skills_bank` | Skills avec preuves et métriques quantifiées |
| `cv_applications` | Historique des candidatures (offre, keywords, hard gates, positionnement, scores, lettre) |
| `cv_constraints` | Règles reportées de session en session — **les lire au début de chaque candidature** |
| `cv_assets` | Métadonnées des assets (la photo elle-même est locale : `assets/photo.jpg`, gitignorée) |

Accès : via le MCP Supabase connecté au compte Claude. Toujours lire `cv_constraints` (where `active = true`) avant toute génération.

## Workflow type

**Raccourci : `/apply`** enchaîne les 4 étapes ci-dessous en une commande (seul arrêt volontaire : hard gate bloquant). Les skills individuels servent ensuite à itérer finement.

1. `/analyze-offer` — coller l'offre → keywords ATS, hard gates, langue, analyse entreprise → ligne dans `cv_applications`
2. `/tailor-cv` — gap analysis contre `cv_master` + `cv_skills_bank` → contenu tailored → `npm run generate` → DOCX
3. `/cover-letter` — lettre dans la langue de l'offre, accroche provocante
4. `/ats-score` — score avant/après avec mapping mot-clé → section

## Règles non négociables (miroir de `cv_constraints`)

- **Format exact du Master CV** (voir `data/format-spec.md`) : header #1F3864 avec photo, grille skills 3 colonnes #EAF1FA, Calibri, marges ~680 DXA
- **UN SEUL A4**, quelle que soit la densité — valider par rendu image de la première page (LibreOffice peut produire une 2e page blanche parasite : se fier à l'image, pas à pdfinfo)
- **Langue de l'offre** = langue du CV et de la lettre
- **Jamais** de "passion pour l'IA" ni de formules convenues en lettre de motivation
- Positionnement adaptatif : IA en accélérateur pour cabinets généralistes, IA en avant pour rôles techniques
- Métriques quantifiées partout ; mapping keywords explicite à chaque réécriture
- Section Liberty Global : ne pas étendre

## Génération DOCX

```
npm run generate -- --data data/tailored.local.json --photo assets/photo.jpg --out "output/<YYYY.MM> Benoit SIGWALD <Company> CV.docx"
```

Le JSON d'entrée suit le schéma de `cv_master.content` (voir `data/example.cv.json`). Conversion PDF locale : `& "C:\Program Files\LibreOffice\program\soffice.exe" --headless --convert-to pdf --outdir output <docx>`. Validation 1 page : rendu image via PyMuPDF (`fitz`), jamais pdfinfo.

## Rangement des livrables — un dossier par entreprise

Tous les livrables d'une candidature (CV DOCX + PDF, lettre) vont dans `<racine de sortie>/<Entreprise>/`. La racine de sortie est définie par le CLAUDE.md du poste de travail (chez Benoît : `G:\My Drive\CV`, synchronisé Google Drive — ouvrable dans Google Docs).

Règle stricte : **avant toute création, lister les dossiers existants** et chercher une correspondance (insensible à la casse, aux espaces, aux variantes — « Capgemini » ↔ « Cap Gemini »). S'il existe, le réutiliser ; ne JAMAIS créer de doublon.

## Setup nouvelle machine

1. Cloner sur un **disque local** (ex. `C:\Users\<user>\dev\cv-optimizer`) — jamais sur le lecteur Google Drive (G:), npm ne peut pas y écrire `node_modules` (EBADF)
2. `npm install`
3. Copier la photo dans `assets/photo.jpg` (extraite du Master CV PDF : PyMuPDF, xref 10)
4. LibreOffice requis pour la conversion PDF (`winget install TheDocumentFoundation.LibreOffice`)
5. Vérifier que le MCP Supabase est connecté
