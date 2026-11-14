# Brief: hand-writing product entries for the Oldenhof app

You write the "Kort voor de klant" text for products of kookwinkel.nl, one text group at a time, in a
curation file. The result goes to shop employees, who read it while a customer stands in front of them.
**Meli's standing rule: do not assume anything, do not put anything in that is not on the website, do not
make anything up. If something is unclear, flag it instead of guessing.**

Work in `/home/user/pldenhof-app` (a git checkout). Do NOT commit, push, deploy, or edit shared files
(`tools/build_catalog.py`, `data/catalog_seed.json`, `docs/*`, other agents' curation files). You only create
files named `data/curation-pans/<DEPT>-<brand>.json` (DEPT = the prefix your task names, e.g. `knives`,
`electrical`, `bbq`, `pans`). Never run `/tmp/ship.sh`.

## 1. Find what is left

```
python3 -I tools/dept_dump.py DEPT                 # brands + counts of pages not yet claimed
python3 -I tools/dept_dump.py DEPT "BRAND" 1400 500 # the text groups of one brand
```
DEPT is one of `pannen`, `messen`, `klein-elektrisch`, `bbq`. A "group" is a set of pages whose website
text is identical apart from numbers and colour (hash in `[brackets]`). The output lists the page names, the
spec table, the first paragraph (digits shown as `#`) and the rest of the text. Output is long: write it to a
file and read it in chunks (Read with offset/limit), 15-25 groups at a time.

## 2. Write the entries

Use `tools/mk_entries.py` (read it, it is 40 lines). Example (a script of yours, kept outside the repo):

```python
import sys; sys.path.insert(0, 'tools')
from mk_entries import Maker
m = Maker('Wüsthof', 'wusthof')                            # brand = exactly as on the website; brandID = your slug
m.add(['ab12cd34', 'ef56ab78'],                            # hashes of the groups this text is valid for
      ['keukenmessen'],                                    # typeIDs (list in section 4)
      'Voor ...',                                           # suitedFor: one sentence from the page, or None
      ['bullet 1', 'bullet 2', ...],                       # tellTheCustomer
      requires=['gesmeed'],                                # phrases every page of the entry must contain
      colours=['zwart', 'rood'],                           # colour words at the END of the page name (variants)
      mismatches=[...],                                    # see section 3
      brandName='Wüsthof')                                 # only needed for a brand that is not known yet
m.save('data/curation-pans/knives-wusthof.json')
```
(Known brand IDs: see below. For a new brand give `brandName=` in the first `add`; the brandID is a lowercase slug without spaces; ask nothing, just choose one, and reuse it in all your files.)

Existing brandIDs: turk=Turk, debuyer=De Buyer, vaello=Vaello, inoxibar=Inoxibar, demeyere=Demeyere, fissler=Fissler, spring=Spring, cristel=Cristel, lecreuset=Le Creuset, victoria=Victoria, chasseur=Chasseur, lodge=Lodge, thebastard=The Bastard, gastrolux=Gastrolux, greenpan=GreenPan, jura=Jura, nivona=Nivona, smeg=SMEG, ecm=ECM, isomac=Isomac, lapavoni=La Pavoni, profitec=Profitec, sage=Sage.

Look at existing files for the finished style: `data/curation-pans/bk.json`, `1821.json`, `alessi.json`,
`demeyere-2.json`. The coffee entries in `data/curation-coffee/` show the original format.

Rules for the text:
* Every sentence must be supported by the website text or spec table of EVERY page in that entry. Copy the
  website's own words wherever you can; shorten, do not embellish. No knowledge from outside the page, no
  general claims about the brand or material, no "ideal for" unless the page says so.
* 3 to 8 short bullets, plain Dutch, most useful for a customer conversation first (what it is, size/capacity,
  material, what it is for, heat sources / care / warranty only if the page states them). No marketing fluff,
  no superlatives you cannot attribute, no prices.
* Sizes, capacities, wattage, colours differ per page: either keep the bullet free of that number, or split
  the group into separate entries. Never write a number that holds for only some pages. A hash is made with
  digits replaced by `#`, so pages of different sizes share a hash: check the SPECS of the pages in the
  group, and use `requires` for words that must be on every page.
* Use `suitedFor` only if the page states what it is for; otherwise `None`.
* Colour variants: if names end in a colour (or other variant word) list it in `colours` so the pages
  become variants of one product. Leave out anything that is not a pure colour/finish word.
* Different products with identical text (e.g. two sizes) may share an entry; products whose text differs
  need their own entry (or their own hash in the same entry only if the text you write is true for all).
* Non-Dutch or empty/very short website text: write only what the spec table says, and say so in the report.

## 3. Website errors and doubts: flag, never fix

When the page contradicts itself (name says 20 cm, specs say 24 cm; "4-delig" but lists 7 parts; text names
another product/series; a spec says induction-suitable but the text says not), do not choose. Keep the
bullets neutral and add a mismatch: `{'topic': 'Naam: ...', 'websiteSays': 'what the page says, exact', 'note':
'what to check', 'only': optional exact product name}`. Missing EANs and 5-digit "code" specs are flagged
automatically by the builder.

## 4. Types (typeIDs) you may use

You cannot add types. If you need a type that is missing, still write the entries with the nearest sensible
type from this list and tell me in the report which pages would need a new one; if nothing fits, put the pages
on the skip list (section 6) instead of guessing.

* pannen: `plaatstaal`, `roestvrijstaal`, `gietijzer`, `aluminium-antiaanbak` (decide only from the Materiaal /
  Coating spec and the text; a pan may have two), `koper` (spec Materiaal says koper).
* messen: `keukenmessen` (kitchen knives incl. sets and block sets), `japanse-messen` (only when the page text
  or specs say Japans / Japanese), `tafel-en-zakmessen` (table, steak, pocket knives, Laguiole, Opinel),
  `snijplanken`, `mandolines` (mandolines and slicers/graters sold as such), `messen-onderhoud` (sharpeners,
  honing steels, stones, knife blocks and magnetic strips).
* klein-elektrisch: `tosti-wafel-grill`, `snijmachines`, `broodroosters`, `foodprocessors`, `waterkokers`,
  `broodbakmachines`, `mixers` (hand, stand, stick), `slow-multicookers`, `droogapparaten`, `blenders-juicers`,
  `ijsmachines`, `sous-vide-vacumeren`, `overig-klein-elektrisch` (electrical, none of the above, e.g.
  kitchen machine attachments are NOT electrical: skip them or use the type of the machine they belong to
  only if the page names it; coffee machines and grinders are handled elsewhere: skip).
* bbq: `kamado` (Big Green Egg, Kamado Joe, The Bastard kamado units), `overige-bbq` (other barbecues),
  `bbq-accessoires` (accessories for any barbecue).

Products that do not belong in your department (cookbooks, tableware, plain cutlery, scales, glassware,
textiles, ...) are NOT written by you: list them on the skip list.

## 5. Validate (mandatory, before you report)

```
CURATION_GLOB='data/curation-pans/knives-*.json' CATALOG_OUT=/tmp/knives.json python3 -I tools/build_catalog.py
```
(use your own prefix and output name). It must finish without an error. It exits when a page's text hash is
not in `keys`, a `requires` phrase is missing from a page, a page is matched twice, an entry matches no page,
or a typeID/brandID is unknown. Fix and rerun until clean. Then re-read 10 random products from
`/tmp/<yours>.json` next to their `originalDescription` and check that each bullet is true for the page. Fix
what is not.

## 6. Report

Your final message (short, no recap of the process) must contain:
1. The files you wrote, number of products and pages covered per brand, and the pages not covered.
2. A skip list written to `/mnt/project-files/oldenhof-app/agents/<DEPT>-<yourname>-skipped.md`: each page name,
   the reason (not in this department / no matching type / no text / unclear), and any needed new type.
3. Every website inconsistency you flagged (one line each) and every doubt you had about a sentence.
4. The validation command you ran and its last output line.
