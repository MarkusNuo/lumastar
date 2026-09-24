# Lingora – Gheg-Sprachrichtlinie

**Status:** Entwurf 0.1 (M0). Jeder Punkt mit **(zu prüfen)** muss vom Autor bestätigt oder korrigiert werden. Alle Inhalte stehen auf `reviewed: false`, bis der Autor sie geprüft hat.

Diese Richtlinie ist verbindlich für:

- **Content-Erstellung** (`content/units/*.json`, `content/placement.json`),
- **Antwortprüfung** im Backend (Toleranzregeln, Abschnitt 11),
- **KI-Prompts** in Phase 2 (die Richtlinie wird jedem Prompt mitgegeben).

Das technische Format der Dateien steht in `docs/CONTENT_FORMAT.md`. Die maschinenlesbare Blockliste der Standard-Formen ist `content/gheg_blocklist.json` (Abschnitt 10). `npm run validate` in `/content` prüft beides.

---

## 1. Grundsatz

Lingora lehrt **Gheg (Gegisch)**, nicht Standardalbanisch. Standardalbanisch beruht weitgehend auf dem Toskischen. Wer im Kosovo mit Familie und Freunden spricht, hört aber Gheg: *âsht* statt *është*, *nji* statt *një*, *me punue* statt *të punoj*.

- In **Lösungen** (`solutions`), Satzbausteinen, Wortbank, Wortpaaren und Items steht **nur Gheg**.
- Standard-Formen stehen **nur** in `standardForms`. Schreibt ein Lernender sie, gilt die Antwort als **„richtig, aber Standard“** (Fehler-Tag `variant.standard_form`, kein Punktabzug).

## 2. Referenzvarietät: Kosovo-Gheg

- **Varietät:** Kosovo-Gheg, wie es im Alltag gesprochen wird (Familie, Freunde, Einkauf, Arbeit). Siehe `QUESTIONS.md`, Frage 1 (Bestätigung durch den Autor offen).
- **Gemässigte Schreibweise:** Basis ist die Rechtschreibung des Standardalbanischen (Alphabet, Wortgrenzen, End-ë). Wo Gheg im Kosovo-Alltag eine eigene Form hat, schreiben wir die **Gheg-Form**: *âsht, nji, shpi, nânë, bâ, me punue, punue*.
- **Nicht** verwendet werden:
  - rein lautnahe Chat-Schreibungen wie *osht, nona, punu, bon* (so klingt es zwar oft, geschrieben wird aber *âsht, nâna, punue, bân*),
  - Formen, die nur in anderen Gheg-Gebieten üblich sind (Shkodra/Nordwest-Gheg, Nordmazedonien, Montenegro),
  - toskische bzw. Standard-Formen (siehe Abschnitte 5, 6 und 10).
- Wo der Kosovo-Alltag eine Standard-Form übernommen hat (z. B. *emri* statt *emni*), gilt vorerst die Gheg-Form. Diese Fälle sind mit (zu prüfen) markiert.

### Typische Kosovo-Aussprache (zum Verständnis, nicht zum Schreiben)

- Das nasale **â** klingt im Kosovo oft wie ein offenes, nasales *o*: *âsht* ≈ „oscht“, *nâna* ≈ „nona“. Geschrieben wird **â**. (zu prüfen: regional unterschiedlich)
- **End-ë** ist meist stumm: *mirë* ≈ „mir“, *shumë* ≈ „schum“. Geschrieben wird es trotzdem.
- Partizipien auf **-ue** klingen oft wie *-u*: *punue* ≈ „punu“. Geschrieben wird **-ue**.
- **ç/q** und **xh/gj** fallen in vielen Kosovo-Mundarten zusammen. In der Schrift bleiben sie getrennt. (zu prüfen)

## 3. Alphabet und Aussprache

Das albanische Alphabet hat 36 Buchstaben, darunter 9 Doppelbuchstaben (dh, gj, ll, nj, rr, sh, th, xh, zh). Gheg ergänzt die **Nasalvokale** â, ê, î, ô, û; sie gelten nicht als eigene Buchstaben.

| Buchstabe | Aussprache für Deutschsprachige | Beispiel |
|---|---|---|
| a | wie in „Vater“ | *baba* (Vater) |
| b | wie im Deutschen | *burrë* (Mann) |
| c | wie „z“ in „Zeit“ | *copë* (Stück) |
| ç | wie „tsch“ | *çka* (was) |
| d | wie im Deutschen | *dy* (zwei) |
| dh | wie englisch „th“ in „this“ | *dhe* (und) |
| e | wie in „Bett“ | *je* (du bist) |
| ë | Murmellaut wie in „bitte“; am Wortende meist stumm | *nesër* (morgen) |
| f | wie im Deutschen | *fëmijë* (Kind) |
| g | wie in „gut“ | *grua* (Frau) |
| gj | weiches „dj“ | *gjyshe* (Grossmutter) |
| h | wie in „Haus“ | *hallë* (Tante) |
| i | wie in „Igel“ | *im* (mein) |
| j | wie in „ja“ | *jam* (ich bin) |
| k | wie im Deutschen | *kam* (ich habe) |
| l | helles l | *lutem* (ich bitte) |
| ll | dunkles l (wie englisch „well“) | *vëlla* (Bruder) |
| m | wie im Deutschen | *motër* (Schwester) |
| n | wie im Deutschen | *nesër* (morgen) |
| nj | wie „gn“ in „Champagner“ | *nji* (ein, eine) |
| o | wie in „Ofen“ | *po* (ja) |
| p | wie im Deutschen, ohne Hauch | *pi* (trinken) |
| q | weiches „tj“ | *quhet* (heisst) |
| r | kurz gerollt | *mirë* (gut) |
| rr | kräftig gerollt | *burrë* (Mann) |
| s | stimmlos wie in „Haus“ | *si* (wie) |
| sh | wie „sch“ | *shpi* (Haus) |
| t | wie im Deutschen, ohne Hauch | *tezë* (Tante) |
| th | wie englisch „th“ in „think“ | *thânë* (gesagt) |
| u | wie in „gut“ | *ku* (wo) |
| v | wie „w“ | *vena* (Wein) |
| x | wie „ds“ | *nxehtë* (heiss) |
| xh | wie „dsch“ | *axha* (Onkel) |
| y | wie „ü“ | *dy* (zwei) |
| z | stimmhaft wie in „Rose“ | *zemër* (Herz) |
| zh | wie „j“ in „Journal“ | *zhurmë* (Lärm) |

## 4. Rechtschreibung

### 4.1 ë und ç

- **ë** und **ç** werden immer geschrieben, auch wenn das End-ë stumm ist: *mirë, nânë, shumë, motër*.
- Formen ohne End-ë (*mir, shum*) stehen nicht in `solutions`. Wie der Evaluator sie bewertet, ist offen (Abschnitt 13).

### 4.2 Nasalvokale (Zirkumflex)

Der Zirkumflex markiert einen Nasalvokal. **Faustregel:** Wo Standardalbanisch ein **ë vor m/n** (oder in einigen Wörtern ein ë, das auf einen alten Nasal zurückgeht) hat, hat Gheg oft ein nasales **â**: *nënë → nânë*, *këngë → kângë*, *është → âsht*. Die Faustregel hat Ausnahmen – verbindlich ist die folgende Liste.

**Wörter mit â in Lingora:**

| Gheg | Standard | Deutsch |
|---|---|---|
| âsht | është | ist |
| nânë, nâna | nënë, nëna | Mutter, die Mutter |
| bâj, bân | bëj, bën | ich mache, du machst / er macht |
| bâ | bërë | gemacht |
| kânë | qenë | gewesen |
| dhânë | dhënë | gegeben |
| thânë | thënë | gesagt |
| ngrânë | ngrënë | gegessen |
| zânë | zënë | gefangen, besetzt |
| lânë | lënë | gelassen (zu prüfen) |
| kâmbë, kâmba | këmbë, këmba | Fuss/Bein |
| dhâmb, dhâmbi | dhëmb, dhëmbi | Zahn |
| hânë, e hânë | hënë, e hënë | Mond, Montag |
| kângë, kânga | këngë, kënga | Lied |
| i/e âmbël | i/e ëmbël | süss |
| zâ | zë | Stimme |
| mbrâmje, mirëmbrâma | mbrëmje, mirëmbrëma | Abend, guten Abend (zu prüfen) |

- **ê, î, ô, û** sind im Kosovo-Gheg selten. In A0–A2 kommen sie nicht vor; vor einer Verwendung mit dem Autor klären (zu prüfen). Die Sonderzeichen-Leiste der App bietet sie trotzdem an.
- **Kein** Zirkumflex bei *jam, kam, kemi, ne, me, nji, shpi, emën, vena* und allen Wörtern, die nicht in der Liste stehen. Im Zweifel: ohne Zirkumflex schreiben und eine `note` mit (zu prüfen) setzen.
- Am Satzanfang wird der Zirkumflex mitgeschrieben: *Âsht mirë.*

### 4.3 Apostroph und Kurzformen

- Apostroph immer als gerades Zeichen `'` schreiben: *s'ka, ç'kemi*. Der Evaluator behandelt ’ und ' gleich.
- Umgangssprachliche Verkürzungen von Pronomen und Präpositionen (*m'fal, t'lutem, n'shpi*) stehen nicht in `solutions[0]`. Sie dürfen als weitere Lösung aufgenommen werden (zu prüfen).

### 4.4 Gross- und Kleinschreibung, Satzzeichen

- Sätze beginnen gross und enden mit Satzzeichen: *Mirë, po ti?*
- Items (Wörter und Wendungen) werden klein geschrieben, ausser Eigennamen: *mirëdita, si je?, Prishtinë*.
- Der Evaluator ignoriert Gross-/Kleinschreibung und Satzzeichen (Abschnitt 11).

## 5. Gheg und Standard im Vergleich

Die wichtigsten Unterschiede im Alltagswortschatz. Die Gheg-Spalte ist verbindlich für Lösungen, die Standard-Spalte gehört in `standardForms`. Formen, die auch in `gheg_blocklist.json` stehen, prüft der Validator automatisch.

### 5.1 Verben und Verbformen

| Gheg (Lingora) | Standard (Tosk-Basis) | Deutsch | Hinweis |
|---|---|---|---|
| âsht | është | ist | |
| jemi, jeni, janë | jemi, jeni, janë | wir sind, ihr seid, sie sind | im Kosovo-Alltag auch *jena* (zu prüfen) |
| kemi | kemi | wir haben | im Kosovo-Alltag auch *kena* (zu prüfen) |
| bâj, bân, bâjnë | bëj, bën, bëjnë | machen | |
| me punue | të punoj / për të punuar | arbeiten (Infinitiv) | Abschnitt 7.2 |
| punue | punuar | gearbeitet | alle Partizipien auf -uar → -ue |
| shkue | shkuar | gegangen | |
| mësue | mësuar | gelernt | |
| kânë / kjenë | qenë | gewesen | *kânë* als Hauptform, *kjenë* als Alternative (zu prüfen) |
| bâ | bërë | gemacht | |
| pa | parë | gesehen | |
| dhânë | dhënë | gegeben | |
| thânë | thënë | gesagt | |
| ngrânë | ngrënë | gegessen | |
| ardhë | ardhur | gekommen | |
| fjetë | fjetur | geschlafen | |
| pasë | pasur | gehabt | |
| folë | folur | gesprochen | Kosovo auch *fol* (zu prüfen) |
| kam me shkue | do të shkoj | ich werde gehen | Abschnitt 7.5 |
| tue punue | duke punuar | beim Arbeiten, arbeitend | Kosovo *tu/tuj* (zu prüfen) |
| du / due | dua | ich will, ich liebe | Schreibung zu prüfen |
| muj | mund, mundem | ich kann | Kosovo (zu prüfen) |
| hangra | hëngra | ich ass | (zu prüfen) |
| çohem | ngrihem | ich stehe auf | Kosovo-Wortschatz (zu prüfen) |
| të bâftë mirë | të bëftë mirë | en Guete, guten Appetit | (zu prüfen) |

### 5.2 Funktionswörter

| Gheg (Lingora) | Standard | Deutsch | Hinweis |
|---|---|---|---|
| nji | një | ein, eine, eins | |
| asnji, ndonji | asnjë, ndonjë | kein, irgendein | |
| çka | çfarë | was | |
| qysh | si | wie | *si* ist auch im Gheg üblich und richtig |
| tash, tashti | tani | jetzt | |
| ma | më | mehr (*ma i madh* = grösser) | das Pronomen *më* (mir/mich) bleibt *më* |
| po | por | aber (*Mirë, po ti?*) | *po* heisst auch „ja“ und steht vor Verlaufsformen (zu prüfen) |
| prej | nga | von, aus (*Prej ku je?*) | *nga* ist auch im Kosovo verbreitet (zu prüfen) |
| kah | nga (Richtung) | wohin, woher | (zu prüfen) |
| veç | vetëm | nur | (zu prüfen) |
| gja | gjë | Sache, etwas | Schreibung *gja* oder *gjâ* zu prüfen |

### 5.3 Nomen und Adjektive

| Gheg (Lingora) | Standard | Deutsch | Hinweis |
|---|---|---|---|
| shpi, shpija | shtëpi, shtëpia | Haus, das Haus | |
| nânë, nâna | nënë, nëna | Mutter, die Mutter | |
| vëllau | vëllai | der Bruder | Kurzform *vlla/vllau* (zu prüfen) |
| vëllazën | vëllezër | Brüder | (zu prüfen) |
| gruja | gruaja | die Frau, die Ehefrau | (zu prüfen) |
| axha | xhaxhai | der Onkel (Bruder des Vaters) | Kosovo (zu prüfen) |
| çika | vajza | das Mädchen, die Tochter | *vajza* ist im Kosovo auch üblich (zu prüfen) |
| vena | vera | der Wein | **Achtung:** *vera* heisst auch im Gheg „der Sommer“ |
| emën, emni | emër, emri | Name, der Name | Kosovo oft *emri* (zu prüfen) |
| dimën, dimni | dimër, dimri | Winter, der Winter | |
| Shqipni, Shqipnia | Shqipëri, Shqipëria | Albanien | |
| kâmba | këmba | der Fuss, das Bein | |
| dhâmbi | dhëmbi | der Zahn | |
| kânga | kënga | das Lied | |
| e hânë | e hënë | Montag | |
| mbrâmja | mbrëmja | der Abend | (zu prüfen) |
| zâ | zë | Stimme | |
| i/e âmbël | i/e ëmbël | süss | |
| i martuem | i martuar | verheiratet | (zu prüfen) |
| i lodhun | i lodhur | müde | (zu prüfen) |
| tamël | qumësht | Milch | *qumësht* ist im Kosovo auch üblich (zu prüfen) |
| duer | duar | Hände | (zu prüfen) |

### 5.4 Grüsse

| Gheg (Lingora) | Standard | Deutsch | Hinweis |
|---|---|---|---|
| mirëdita, mirëmëngjes | gleich | guten Tag, guten Morgen | |
| mirëmbrâma | mirëmbrëma | guten Abend | (zu prüfen) |
| qysh je? / si je? | si je? | wie geht es dir? | |
| ç'kemi? | ç'kemi? | was gibt's? (locker) | im Kosovo sehr üblich |
| çka po bân? | çfarë po bën? | was machst du gerade? | |
| faleminderit / falemnderit | faleminderit | danke | beide Schreibungen akzeptiert |
| rrofsh | rrofsh | danke (locker) | (zu prüfen) |

## 6. Rhotazismus: -n- und -r-

Im Toskischen (und damit im Standard) wurde ein altes **-n- zwischen Vokalen zu -r-** („Rhotazismus“). Gheg bewahrt das **-n-**:

| Gheg | Standard | Deutsch |
|---|---|---|
| vena | vera | der Wein |
| emni | emri | der Name |
| dimni | dimri | der Winter |
| Shqipnia | Shqipëria | Albanien |
| grunë | grurë | Weizen |
| i/e lodhun | i/e lodhur | müde (zu prüfen) |

**Vorsicht:**

- **vera** heisst auch im Gheg „der Sommer“ (*verë* = Sommer). Der Wein ist im Gheg **vena**. Weil *vera* und *verë* im Gheg richtig sein können, stehen sie **nicht** auf der Blockliste – solche Stellen immer von Hand prüfen.
- Nicht jedes r ist Rhotazismus: *mirë, burrë, motër, nesër* behalten ihr r. Die Gheg-Form mit -n- nur verwenden, wenn sie in dieser Richtlinie steht oder vom Autor bestätigt ist.

## 7. Verben

### 7.1 Präsens

Die Präsensformen regelmässiger Verben sind weitgehend wie im Standard: *punoj, punon, punon, punojmë, punoni, punojnë*. Gheg-Besonderheiten zeigen sich vor allem bei häufigen unregelmässigen Verben: *bâj/bân* (machen), *du* (wollen, zu prüfen), *muj* (können, zu prüfen).

- **Verlaufsform** mit *po*: *Po punoj.* – „Ich arbeite gerade.“ *Çka po bân?* – „Was machst du gerade?“
- **Ja/Nein-Fragen** mit *a*: *A je mirë? A ke fëmijë?*
- **Verneinung** mit *nuk* oder *s'*: *Nuk e di. S'kam kohë.*

### 7.2 Infinitiv: me + Partizip

Gheg hat einen echten Infinitiv: **me + Partizip**. Standardalbanisch hat keinen und verwendet stattdessen *të* + Konjunktiv.

| Gheg | Standard | Deutsch |
|---|---|---|
| Du me punue. | Dua të punoj. | Ich will arbeiten. |
| Duhet me shkue. | Duhet të shkoj. | Ich muss gehen. |
| S'kam kohë me folë. | S'kam kohë të flas. | Ich habe keine Zeit zu reden. |
| Âsht mirë me mësue shqip. | Është mirë të mësosh shqip. | Es ist gut, Albanisch zu lernen. |
| pa punue | pa punuar | ohne zu arbeiten |

- Lingora lehrt **me + Partizip**. Konstruktionen mit *të* + Konjunktiv kommen in `standardForms` (Fehler-Tag `variant.standard_form`). Sie sind im Kosovo ebenfalls zu hören (zu prüfen, ob sie als Gheg-Lösung zählen sollen).
- Fehler beim Bilden (z. B. *me punoj*, *me punuar*) haben die Kategorie `grammar.infinitive`.

### 7.3 Kurze Gheg-Partizipien

Gheg-Partizipien sind kürzer als die Standard-Partizipien. Regeln:

- Verben auf **-oj**: Partizip auf **-ue** statt *-uar*: *punoj → punue, mësoj → mësue, shkoj → shkue*.
- Standard-Partizipien auf **-ur** verlieren die Endung: *ardhur → ardhë, fjetur → fjetë, pasur → pasë*.
- Standard-Partizipien auf **-ënë** werden zu **-ânë**: *dhënë → dhânë, thënë → thânë, ngrënë → ngrânë*.

| Verb | Gheg-Partizip | Standard | Deutsch |
|---|---|---|---|
| jam (sein) | kânë / kjenë | qenë | gewesen |
| kam (haben) | pasë | pasur | gehabt |
| bâj (machen) | bâ | bërë | gemacht |
| shoh (sehen) | pa | parë | gesehen |
| jap (geben) | dhânë | dhënë | gegeben |
| them (sagen) | thânë | thënë | gesagt |
| ha (essen) | ngrânë | ngrënë | gegessen |
| vij (kommen) | ardhë | ardhur | gekommen |
| fle (schlafen) | fjetë | fjetur | geschlafen |
| flas (sprechen) | folë | folur | gesprochen (zu prüfen) |
| punoj (arbeiten) | punue | punuar | gearbeitet |
| shkoj (gehen) | shkue | shkuar | gegangen |
| marr (nehmen) | marrë | marrë | genommen |
| dal (hinausgehen) | dalë | dalë | hinausgegangen |
| pi (trinken) | pi | pirë | getrunken (zu prüfen) |
| di (wissen) | ditë | ditur | gewusst (zu prüfen) |

- **Adjektivische Partizipien** enden im Gheg auf **-uem** bzw. **-un**: *i martuem* (Standard *i martuar*), *i lodhun* (Standard *i lodhur*) (zu prüfen).
- Fehler am Partizip haben die Kategorie `grammar.participle`.

### 7.4 Perfekt

**kam/jam + Partizip**: *Kam punue.* – „Ich habe gearbeitet.“ *Kam pa.* – „Ich habe gesehen.“ *Jam kânë në Prizren.* – „Ich bin in Prizren gewesen.“

### 7.5 Zukunft

Typisch für Kosovo-Gheg ist **kam me + Partizip**: *Kam me shkue nesër.* – „Ich werde morgen gehen.“ Die Standard-Zukunft *do të shkoj* ist im Kosovo auch verbreitet; in Lingora steht sie in `standardForms` (zu prüfen).

### 7.6 Gerundium

**tue + Partizip** (Standard: *duke* + Partizip): *tue punue* – „beim Arbeiten“. Im Kosovo oft *tu/tuj* gesprochen (Schreibung zu prüfen). Wird erst ab B2 unterrichtet.

## 8. Nomen und Artikel

### 8.1 Bestimmter Artikel als Endung

Der bestimmte Artikel wird **ans Nomen angehängt**. Fehlt er, lautet die Fehlerkategorie `grammar.definite_article`.

| Genus | unbestimmt | bestimmt (Nominativ) | bestimmt (Akkusativ) | Deutsch |
|---|---|---|---|---|
| m | djalë | djali | djalin | der Sohn |
| m | mik | miku | mikun | der Freund (nach k, g, h: -u) |
| m | baba | babai | babain | der Vater |
| m | vëlla | vëllau | vëllaun | der Bruder (zu prüfen) |
| f | motër | motra | motrën | die Schwester |
| f | nânë | nâna | nânën | die Mutter |
| f | familje | familja | familjen | die Familie |
| f | gjyshe | gjyshja | gjyshen | die Grossmutter |
| f | shpi | shpija | shpinë | das Haus (zu prüfen: Akkusativ) |

- **Nach „nji“** steht die unbestimmte Form: *nji motër, nji vëlla*.
- **Mit Possessivpronomen** steht das Nomen bestimmt, das Pronomen folgt: *babai im* (mein Vater), *nâna ime* (meine Mutter). Im Kosovo hört man auch *jem/jeme* (zu prüfen).
- **Plural bestimmt** meist auf *-t/-të*: *motrat* (die Schwestern), *djemtë* (die Söhne).
- Auch **Wünsche** stehen im Akkusativ: *Natën e mirë!* (Fehlerkategorie `grammar.case`).

### 8.2 Verbindungsartikel (i, e, të, së)

Vor Adjektiven und Genitiven steht ein **Verbindungsartikel**, der sich nach dem Bezugswort richtet. Fehler haben die Kategorie `grammar.linking_article`.

| Fall | Beispiel | Deutsch |
|---|---|---|
| maskulin Singular (Nominativ) | *djali **i** madh* | der grosse Sohn |
| feminin Singular (Nominativ) | *vajza **e** madhe* | die grosse Tochter |
| nach unbestimmtem Nomen | *nji djalë **i** mirë*, *nji vajzë **e** mirë* | ein guter Junge, ein gutes Mädchen |
| Genitiv maskulin | *shpija **e** babait* | das Haus des Vaters |
| Genitiv feminin | *emni **i** nânës* | der Name der Mutter |
| Plural | *fëmijët **e** mirë* | die guten Kinder |

*të* und *së* folgen nach Kasus und Bestimmtheit (z. B. *të* im Akkusativ nach unbestimmtem Nomen, *së* im Genitiv/Dativ feminin nach bestimmtem Nomen). Die genauen Gheg-Regeln werden in den Einheiten *Farben & Adjektive* und *Dativ, Genitiv & Ablativ* ausgearbeitet (zu prüfen).

## 9. Pronomen und Klitika

### 9.1 Personalpronomen

*unë* (ich), *ti* (du), *ai* (er), *ajo* (sie), *ne* (wir; im Kosovo-Alltag auch *na*, zu prüfen), *ju* (ihr, Sie), *ata* (sie, m.), *ato* (sie, f.).

- **Du oder Sie:** *ti* ist die Normalform in Lingora. *ju* nur, wenn Höflichkeit das Thema ist: *Si jeni? Ju lutem. Më falni.*
- **Demonstrativ:** *ky* (dieser, m.), *kjo* (diese, f.); Plural *këta, këto*.

### 9.2 Klitika (Kurzformen der Objektpronomen)

| Klitikon | Bedeutung | Beispiel |
|---|---|---|
| më | mir, mich | *Më fal!* – Verzeih mir! |
| të | dir, dich | *Të du.* – Ich liebe dich. (zu prüfen: *du*) |
| e | ihn, sie, es (Akkusativ) | *E di.* – Ich weiss es. |
| i | ihm, ihr (Dativ); sie (Akkusativ Plural) | *I shkrova.* – Ich schrieb ihm/ihr. |
| na | uns | *Na ndihmo!* – Hilf uns! |
| ju | euch, Sie | *Ju pres.* – Ich warte auf euch. |
| u | ihnen (Dativ) | *U shkrova.* – Ich schrieb ihnen. |

- **Verbindungen:** *ma* (më + e), *ta* (të + e), *ia* (i + e), *jua* (ju + e): *Ma jep!* – „Gib es mir!“ Achtung: *ma* heisst im Gheg auch „mehr“ (*ma i madh*); der Kontext entscheidet.
- **Verdopplung:** Ein bestimmtes Objekt wird oft zusätzlich mit dem Klitikon genannt: *E njoh Artën.* – „Ich kenne Arta.“
- Fehler haben die Kategorie `grammar.clitics`.

## 10. Blockliste der Standard-Formen

`content/gheg_blocklist.json` listet Standard-Formen, die **nie** in Gheg-Texten stehen dürfen, jeweils mit Gheg-Ersatz und Begründung:

- **`words`**: ganze Wörter (klein geschrieben), z. B. *është, një, nëna, qenë, bërë, çfarë, tani, emri*.
- **`patterns`**: Wortmuster als regulärer Ausdruck auf ein einzelnes Wort, mit **Ausnahmeliste**, z. B. Partizipien auf *-uar* (Ausnahmen: *duar*, *gëzuar*), Partizipien auf *-ënë*, alle Formen von *shtëpi-*.

**Wo geprüft wird** (`npm run validate`): alle `solutions` (bei `answerLang: "sq"` und immer bei `multiple_choice`), `tokens`, `wordBank`, Lückentext und `choices` bei `fill_gap`, `prompt.text` mit `lang: "sq"`, die linke Seite von `pairs` sowie `gheg`, `definite`, `plural` und `alternatives` der Items.

**Nicht geprüft:** `standardForms`, Erklärungen, Grammatik-Notizen und `errorHints` – dort dürfen Standard-Formen bewusst stehen.

**Mehrdeutige Wörter** stehen nicht auf der Liste, weil sie im Gheg auch richtig sein können: *vera/verë* (Sommer), *më* (mir/mich), *si* (wie), *po* (ja). Solche Stellen von Hand prüfen.

**Erweitern:** neuen Eintrag mit `reason` (und bei Unsicherheit `note`) ergänzen. Ein Muster braucht `examples` (müssen passen) und `exceptions` (müssen ebenfalls passen, sonst sind sie überflüssig); der Validator prüft beides. In Phase 2 wird auch jede KI-Ausgabe gegen diese Liste geprüft.

## 11. Toleranzregeln der Antwortprüfung

Diese Regeln gelten für Freitext (`translate_free`, `fill_gap` ohne Auswahl) und sinngemäss für die anderen Typen. Umgesetzt werden sie im Backend (`AnswerEvaluator`, PRD F5). Reihenfolge:

1. **Normalisieren:** Gross-/Kleinschreibung, Satzzeichen (`. , ! ? ; : „ “ " …`) und mehrfache Leerzeichen werden ignoriert; ’ gilt als '.
2. **Exakt gleich** einer Lösung aus `solutions` → **richtig**.
3. **Nur Zirkumflex fehlt** (*asht* statt *âsht*) → **fast richtig**, Tag `spelling.nasal_vowel`.
4. **ë oder ç fehlt** (*shume* statt *shumë*, *cka* statt *çka*) → **fast richtig**, Tag `spelling.diacritics`. Fehlen beide Arten, gilt `spelling.diacritics` (zu prüfen: beide Tags vergeben?).
5. **Gleich einer Form aus `standardForms`** → **„richtig, aber Standard“**, Tag `variant.standard_form`, kein Punktabzug; der Hinweis zeigt die Gheg-Lösung. Fehlende Sonderzeichen werden dabei wie in 3 und 4 toleriert.
   - Vorschlag für den Evaluator (zu prüfen): Standard-Wörter zusätzlich über `gheg_blocklist.json` erkennen (z. B. *është* → *âsht* ersetzen und erneut vergleichen).
6. **Sonst falsch.** Die `errorHints` der Aufgabe (regulärer Ausdruck, ohne Beachtung der Gross-/Kleinschreibung, auf die normalisierte Antwort) bestimmen Fehlerkategorie und Hinweis. Ohne Treffer legt der Evaluator die Kategorie fest (z. B. `vocab.unknown`).

„Fast richtig“ zählt als richtig, aber mit Hinweis (FSRS-Bewertung *Hard*, PRD F8). Mehrere Gheg-Schreibweisen können als Lösung hinterlegt sein.

**errorHints schreiben:**

- `\b` funktioniert in JavaScript nicht zuverlässig neben ë, ç oder â. Stattdessen `(^|\s)` und `(\s|$)` verwenden.
- Varianten mit und ohne Sonderzeichen abdecken, z. B. `n[aâ]n[eë]`, weil offen ist, ob der Evaluator die Antwort vor dem Vergleich von Sonderzeichen befreit.
- Nur Syntax verwenden, die in JavaScript und Java gleich funktioniert (Zeichenklassen, Gruppen, `^`, `$`, `(?!…)`).
- Standard-Formen gehören nicht in `errorHints`, sondern in `standardForms` (sie sind kein Fehler).

## 12. Stilregeln für Content-Autoren

**Sprache und Inhalt**

- Kurze, natürliche **Alltagssätze aus dem Kosovo**: Familie, Freunde, Einkauf, Kaffee, Arbeit. Auf A1 höchstens etwa 8 Wörter, eine Aussage pro Satz.
- **Keine Mischformen:** kein Gheg und Standard im selben Satz (nicht *Çka po bën?*), keine Formen anderer Gheg-Gebiete.
- **Du-Form** als Normalfall; Sie-Form nur, wenn Höflichkeit das Thema ist.
- **Namen und Orte:** fiktive Personen mit geläufigen Vornamen (*Arta, Drita, Besa, Arben, Blerim, Driton*), Orte im Kosovo (*Prishtinë, Prizren, Pejë, Gjakovë, Ferizaj*). Keine realen Personen, keine persönlichen Daten.
- **Deutsch:** Schweizer Rechtschreibung (ss statt ß: *heisst, gross, Grüsse*), Anführungszeichen „…“, Lernende werden geduzt.

**Lösungen und Varianten**

- **`solutions[0]`** ist die kanonische, natürlichste Gheg-Form. Sie wird als Lösung angezeigt; aus ihr entstehen Wortbank und Satzbausteine.
- **Weitere `solutions`:** andere Gheg-Schreibweisen (*faleminderit / falemnderit*), Synonyme (*Si je? / Qysh je?*) und andere natürliche Wortstellungen (*Mirë jam / Jam mirë*). **Nicht** aufnehmen: Varianten, die sich nur durch fehlende Sonderzeichen unterscheiden (das erledigt der Evaluator) und Standard-Formen.
- **`standardForms`** (bei `translate_free` und `fill_gap`): die wahrscheinlichen Standard-Varianten, vollständig wie eine Lösung geschrieben (*Një kafe, ju lutem.*).
- **Item-`alternatives`:** weitere akzeptierte Gheg-Schreibweisen desselben Wortes (*vlla* zu *vëlla*), keine Synonyme.

**Übungstypen**

- **`prompt`**: bei `translate_*` und `word_order` der zu übersetzende Satz; bei `fill_gap` die deutsche Bedeutung des ganzen Satzes, bei Bedarf mit Hinweis in Klammern; bei `multiple_choice` die Frage; bei `match_pairs` eine kurze Anweisung.
- **`multiple_choice`**: 4 Antworten, genau eine richtig, plausible Ablenker.
- **`translate_wordbank`**: Wortbank = Wörter von `solutions[0]` ohne Satzzeichen, in der Schreibung des Satzes, plus 2–4 plausible **Gheg**-Ablenker (möglichst gleiche Wortart). Nie Standard-Formen als Ablenker.
- **`word_order`**: `tokens` = Wörter von `solutions[0]` in richtiger Reihenfolge; alle weiteren Lösungen verwenden genau dieselben Wörter.
- **`fill_gap`**: genau eine Lücke `___`; `choices` enthalten `solutions[0]` und plausible Gheg-Ablenker. Eine Standard-Form ist nie ein Ablenker (sie wäre „richtig, aber Standard“).
- **`match_pairs`**: genau 5 Paare, links Gheg, rechts Deutsch, beide Seiten eindeutig.
- **`explanation`**: 1–2 kurze, freundliche, konkrete Sätze auf Deutsch. Wo es passt, den Gheg-Standard-Unterschied nennen.
- **`errorHints`** für vorhersehbare Fehler: fehlender bestimmter Artikel (*nânë ime* → `grammar.definite_article`), falsches Genus (*nâna im* → `grammar.gender`), falsche Person (`grammar.verb_conjugation`), Wortstellung (`grammar.word_order`).

**Metadaten**

- `reviewed: false` und `source: "manual"` bei allen erstellten Inhalten; nur der Autor setzt `reviewed: true`.
- Unsicherheit **immer** offenlegen: `note` am Item oder an der Übung mit (zu prüfen).
- Ids: `ex_<unitId>_<nnn>` (z. B. `ex_a1_u04_family_007`), `item_<wort>` in ASCII (ë → e, ç → c, â → a, Leerzeichen → `_`, z. B. `item_ska_perse`).
- Übungsniveau = Niveau der Einheit; Schwierigkeit 1–3 gemischt.

## 13. Offene Punkte (zu prüfen)

Sammlung aller Punkte, die der Autor entscheiden oder bestätigen muss:

1. Referenzvarietät Kosovo-Gheg und Zirkumflex-Schreibung bestätigen (`QUESTIONS.md` 1 und 2).
2. Schreibungen mit â: *mbrâmje, mirëmbrâma, lânë*; Verwendung von ê, î, ô, û.
3. Rhotazismus-Formen, die im Kosovo oft durch Standard-Formen ersetzt werden: *emni/emri, emnin/emrin*.
4. Formen der Familien-Einheit: *vëllau* (Standard *vëllai*), *vëllazën* (Standard *vëllezër*), *gruja* (Standard *gruaja*), *axhë/axha* (Standard *xhaxhai*), *babai* oder *baba* als bestimmte Form, *jem/jeme* als Alternative zu *im/ime*, *dhe / edhe / e* für „und“, *çikë* neben *vajzë*.
5. Verben: *du* oder *due* (wollen), *muj* (können), *hangra* (ich ass), *çohem* (aufstehen), *folë* oder *fol* (gesprochen), *pi* und *ditë* als Partizipien, *tue/tu/tuj* als Gerundium.
6. Plural „sein/haben“ im Kosovo-Alltag: *jemi/jena*, *kemi/kena*.
7. Funktionswörter: *po* als „aber“, *prej* für „von/aus“, *kah*, *veç*, *gja/gjâ*.
8. Ob *të* + Konjunktiv (*du të punoj*) und *do të* + Konjunktiv (Zukunft) als Gheg-Lösung oder als Standard-Form gelten.
9. Ausnahmen der Blockliste: *gëzuar* (Prost) und *duar* (Hände); Muster *-ënë*.
10. Evaluator: Bewertung von Formen ohne End-ë (*mir*) und von lautnahen Schreibungen (*osht, nona*); Tags, wenn Zirkumflex und ë/ç zugleich fehlen; automatische Erkennung von Standard-Formen über die Blockliste.
11. Kurzformen mit Apostroph (*m'fal, t'lutem*) als zusätzliche Lösungen zulassen?
