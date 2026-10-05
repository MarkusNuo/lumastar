# Lingora – Gheg-Sprachrichtlinie

**Status:** Entwurf 0.2 (M1: Toleranzregeln in Abschnitt 11 überarbeitet). Jeder Punkt mit **(zu prüfen)** muss vom Autor bestätigt oder korrigiert werden. Alle Inhalte stehen auf `reviewed: false`, bis der Autor sie geprüft hat.

Diese Richtlinie ist verbindlich für:

- **Content-Erstellung** (`content/units/*.json`, `content/placement.json`),
- **Antwortprüfung** im Backend und in der Vorprüfung des Frontends (Toleranzregeln, Abschnitt 11),
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
| ll | dunkles l (wie englisch „well“) | *vlla* (Bruder) |
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
- Formen ohne End-ë (*mir, shum*) stehen nicht in `solutions`. Ein ganz weggelassenes ë ist kein fehlendes Sonderzeichen, sondern ein fehlender Buchstabe: In getippten Antworten wertet der Evaluator es über die Tippfehler-Toleranz, ab 6 Buchstaben der Lösung „fast richtig“, bei kürzeren Wörtern falsch (Abschnitt 11; zu prüfen, Abschnitt 13).

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

- Apostroph immer als gerades Zeichen `'` schreiben: *s'ka, ç'kemi*. Der Evaluator entfernt beim Normalisieren jeden Apostroph (`'` `’` `‘` `ʼ`), *s'ka* und *ska* gelten also als gleich (Abschnitt 11).
- Umgangssprachliche Verkürzungen von Pronomen und Präpositionen (*m'fal, t'lutem, n'shpi*) stehen nicht in `solutions[0]`. Sie dürfen als weitere Lösung aufgenommen werden (zu prüfen).

### 4.4 Gross- und Kleinschreibung, Satzzeichen

- Sätze beginnen gross und enden mit Satzzeichen: *Mirë, po ti?*
- Items (Wörter und Wendungen) werden klein geschrieben, ausser Eigennamen: *mirëdita, si je?, Prishtinë*.
- Der Evaluator ignoriert Gross-/Kleinschreibung. Apostrophe entfernt er, alle anderen Satzzeichen und Symbole liest er als Leerzeichen: *Jo,faleminderit* gilt wie *Jo, faleminderit* (Abschnitt 11).

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
| vlla, vllau | vëlla, vëllai | Bruder, der Bruder | Kosovo-Form; *vëlla* (wie Standard) vorerst als weitere Schreibung akzeptiert, wo es nicht stört; *vëllau* mischt Standard-Stamm und Gheg-Endung und wird nicht verwendet (zu prüfen) |
| vllazën | vëllezër | Brüder | (zu prüfen) |
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
| qumësht | qumësht | Milch | gleich wie Standard; *tamël* ist Nordwest-Gheg (regional) und steht nicht in Lösungen (zu prüfen) |
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

**kam + Partizip**: *Kam punue.* – „Ich habe gearbeitet.“ *Kam pa.* – „Ich habe gesehen.“ *Kam kânë në Prizren.* – „Ich bin in Prizren gewesen.“ Auch „sein“ bildet das Perfekt mit *kam* (anders als im Deutschen). **jam + Partizip** steht nur bei reflexiven und passiven Verben: *Jam lodhë.* – „Ich bin müde geworden.“, *Shpija âsht ndërtue.* – „Das Haus ist gebaut worden.“ (zu prüfen)

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
| m | vlla | vllau | vllaun | der Bruder (zu prüfen) |
| f | motër | motra | motrën | die Schwester |
| f | nânë | nâna | nânën | die Mutter |
| f | familje | familja | familjen | die Familie |
| f | gjyshe | gjyshja | gjyshen | die Grossmutter |
| f | shpi | shpija | shpinë | das Haus (zu prüfen: Akkusativ) |

- **Nach „nji“** steht die unbestimmte Form: *nji motër, nji vlla*.
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

Verbindlich ist `docs/CONTENT_FORMAT.md`, Abschnitt „Answer normalisation and tokenisation“ (Punkte 1–8, DECISIONS.md #43–45). Umgesetzt werden die Regeln im Backend (`AnswerEvaluator`, PRD F5) und gleich in der Vorprüfung des Frontends. Beide prüfen sich gegen dieselben Testfälle: `content/fixtures/evaluator-cases.json`.

**Grundsatz:** Toleranz (fehlende Sonderzeichen, Tippfehler, Standard-Formen) gibt es nur bei **getippten** Antworten: `translate_free` und `fill_gap` ohne `choices`. Antworten aus Bausteinen oder einer Auswahl (`translate_wordbank`, `word_order`, `multiple_choice`, `fill_gap` mit `choices`, `match_pairs`) sind **exakt**: richtig oder falsch.

### 11.1 Normalisieren (alle Übungstypen)

Unicode NFC, Kleinschreibung. **Apostrophe** (`'` `’` `‘` `ʼ`) werden entfernt: *S'ka përse!* → *ska përse*. **Jedes andere Zeichen**, das kein Buchstabe, keine Ziffer und kein Leerraum ist, wird zu einem **Leerzeichen**: *Jo,faleminderit* → *jo faleminderit*, *Mirë – po ti?* → *mirë po ti*. Danach werden Leerräume getrimmt und zu einfachen Leerzeichen zusammengefasst. Sonderzeichen (ë, ç, â …) bleiben erhalten.

### 11.2 Getippte Antworten

Die erste zutreffende Regel entscheidet:

1. **Exakt gleich** einer Lösung aus `solutions` → **richtig**.
2. **Standard-Form** → **„richtig, aber Standard“**, Tag `variant.standard_form`, kein Punktabzug; der Hinweis zeigt die Gheg-Lösung. Als Standard-Form gilt:
   - eine Form aus `standardForms`, oder
   - bei Antworten auf Albanisch: jedes Wort, das von der Lösung abweicht, ist laut `gheg_blocklist.json` die Standard-Form des Lösungsworts (*është* für *âsht*, *punuar* für *punue*, *shtëpia* für *shpija*; DECISIONS.md #32, zu prüfen).
3. **Nur fehlende Sonderzeichen** → **fast richtig**. Jedes Zeichen, in dem die Antwort von der Lösung abweicht, muss der Grundbuchstabe des Lösungszeichens sein (`ë→e`, `ç→c`, `â→a`, `ê→e`, `î→i`, `ô→o`, `û→u`):
   - nur der Zirkumflex fehlt (*asht* statt *âsht*) → `spelling.nasal_vowel`,
   - ë oder ç fehlt (*shume* statt *shumë*, *cka* statt *çka*) → `spelling.diacritics`,
   - Zirkumflex **und** ë/ç fehlen (*asht shume*) → `spelling.diacritics` (DECISIONS.md #30, zu prüfen).

   **Nicht** darunter fallen hinzugefügte oder falsche Sonderzeichen (*jâm* statt *jam*, *mirêdita* statt *mirëdita*) und ganz weggelassene Buchstaben (*mirdita* statt *mirëdita*: das ë fehlt als Buchstabe). Sie zählen höchstens als Tippfehler (Regel 7).
4. **Standard-Form mit fehlenden Sonderzeichen** (*eshte* statt *është*, *Cfare po ben*, auch *Çfarë po ban*) → trotzdem **„richtig, aber Standard“** wie in 2.
5. **Bekannter Fehler:** Trifft ein Muster aus `errorHints` (regulärer Ausdruck, ohne Beachtung der Gross-/Kleinschreibung, auf die normalisierte Antwort mit Sonderzeichen) → **falsch** mit Fehlerkategorie und Hinweis des Musters.
6. **Wortstellung:** dieselben Wörter wie eine Lösung (Sonderzeichen nicht beachtet), aber in anderer Reihenfolge → **falsch**, Tag `grammar.word_order`.
7. **Tippfehler:** Die Damerau-Levenshtein-Distanz zwischen normalisierter Antwort und Lösung (Einfügen, Löschen, Ersetzen eines Zeichens oder Vertauschen zweier Nachbarzeichen kostet je 1, Leerzeichen zählen mit; ein **fehlendes** Sonderzeichen kostet 0, ein hinzugefügtes oder falsches 1) ist
   - **≤ 1** bei Lösungen mit **mindestens 6 Buchstaben**,
   - **≤ 2** bei Lösungen mit **mindestens 16 Buchstaben**

   (gezählt werden Buchstaben und Ziffern der Lösung ohne Leerzeichen) → **fast richtig**, Tag `spelling.other`. Lösungen mit weniger als 6 Buchstaben haben keine Tippfehler-Toleranz: *mir* statt *mirë* (als ganze Antwort) ist falsch, *mirdita* statt *mirëdita* fast richtig, *Asht mrie* statt *Âsht mirë* auch (ein Vertauschen; die fehlenden Sonderzeichen kosten nichts).
8. **Sonst falsch.** Die Fehlerkategorie kommt aus den `skillTags` (11.4), sonst `vocab.unknown`.

Wichtig für Content-Autoren: Weil 5 und 6 **vor** 7 geprüft werden, zählt ein vorhersehbarer Grammatikfehler nie als Tippfehler – *nâna im* statt *nâna ime* ist mit passendem `errorHint` falsch (`grammar.gender`), ohne Hint aber „fast richtig“ (Distanz 1). Ebenso *Shpi âsht e madhe* statt *Shpija âsht e madhe*: zwei Zeichen bei 16 Buchstaben wären ein Tippfehler, mit Hint ist es `grammar.definite_article`. Vorhersehbare Fehler, die nur ein oder zwei Buchstaben ausmachen, brauchen deshalb einen `errorHint` (DECISIONS.md #31). Umgekehrt greift ein Muster nie bei einer Antwort, der nur Sonderzeichen fehlen (Regel 3 kommt vorher).

### 11.3 Bausteine, Auswahl und Paare (exakt)

- **`translate_wordbank`, `word_order`:** Die gelegten Bausteine werden mit den Tokens jeder Lösung verglichen (Satzzeichen am Rand weg, Gross-/Kleinschreibung egal). Gleich → **richtig**. Sonst **falsch**: Kategorie aus `errorHints` (auf die normalisierte, aus den Bausteinen zusammengesetzte Antwort), sonst dieselben Bausteine in anderer Reihenfolge → `grammar.word_order`, sonst aus den `skillTags`, sonst `vocab.unknown`. Ein falscher Baustein ist falsch, auch wenn er sich nur um einen Buchstaben unterscheidet (*mein* statt *meine*).
- **`multiple_choice`, `fill_gap` mit `choices`:** Nur die gewählte Option zählt. Sonst **falsch**, Kategorie aus `errorHints`, den `skillTags` oder `vocab.confused`. Eine Option ohne Sonderzeichen (*asht*, *c*) ist falsch, nicht fast richtig.
- **`match_pairs`:** Die App meldet die falschen Zuordnungen (`[{ left, right }]`). Keine falsche Zuordnung → **richtig**, sonst **falsch** (`vocab.confused`); das Backend leitet daraus die Zahl der Fehler und die verwechselten Wörter ab.

### 11.4 Fehlerkategorie aus den Skill-Tags

Trifft kein Muster, nimmt der Evaluator den ersten Skill-Tag der Aufgabe (in ihrer Reihenfolge), der zu einer Kategorie passt: `grammar.definite_article…` → `grammar.definite_article`, `grammar.linking_article…` → `grammar.linking_article`, `grammar.case…` → `grammar.case`, `grammar.clitics…` → `grammar.clitics`, `grammar.adjective_agreement…` → `grammar.gender`, `grammar.infinitive…` und `grammar.verbs.infinitive…` → `grammar.infinitive`, `grammar.participle…` und `grammar.verbs.participle…` → `grammar.participle`, Zeitformen unter `grammar.verbs.` (`past_simple`, `perfect`, `imperfect`, `future`, `subjunctive`, `conditional`, `admirative`, `optative`) → `grammar.verb_tense`, übrige `grammar.verbs…` → `grammar.verb_conjugation`. `vocab.*`, `phrase.*`, `spelling.*`, `reading.*` und z. B. `grammar.possessive` ergeben keine Kategorie.

„Fast richtig“ zählt als richtig, aber mit Hinweis (FSRS-Bewertung *Hard*, PRD F8). Mehrere Gheg-Schreibweisen können als Lösung hinterlegt sein.

**errorHints schreiben:**

- `\b` funktioniert in JavaScript nicht zuverlässig neben ë, ç oder â. Stattdessen `(^|\s)` und `(\s|$)` verwenden.
- Muster laufen auf die normalisierte Antwort **mit** Sonderzeichen: ohne Apostrophe und mit Leerzeichen statt aller anderen Satzzeichen. Also `^ska p[eë]rse` statt `^s'ka përse`; `^jo ` trifft auch „Jo,faleminderit“. Ein Muster mit Apostroph, Anführungszeichen oder anderen Satzzeichen als Literal kann nie treffen; `npm run validate` meldet das. Weil Lernende Sonderzeichen oft weglassen, trotzdem beide Varianten abdecken, z. B. `n[aâ]n[eë]`.
- Ein Muster darf keine Lösung aus `solutions` treffen (sonst ist es zu breit); `npm run validate` prüft das. Es sollte auch keine blossen Tippfehler der Lösung treffen, sonst wird aus „fast richtig“ ein Fehler.
- Bei Bausteinen und Auswahl gibt es keine Toleranz; Muster liefern dort nur Kategorie und Hinweis. Ablenker, die einen typischen Fehler zeigen (*nânë* statt *nâna*, *asht* statt *âsht*), sollten ein Muster haben.
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
- **Weitere `solutions`:** andere Gheg-Schreibweisen (*faleminderit / falemnderit*), Synonyme (*Si je? / Qysh je?*) und andere natürliche Wortstellungen (*Mirë jam / Jam mirë*). **Nicht** aufnehmen: Varianten, die sich nur durch fehlende Sonderzeichen unterscheiden (das erledigt der Evaluator bei getippten Antworten) und Standard-Formen.
- **`standardForms`** (bei `translate_free` und `fill_gap`): die wahrscheinlichen Standard-Varianten, vollständig wie eine Lösung geschrieben (*Një kafe, ju lutem.*).
- **Item-`alternatives`:** weitere akzeptierte Schreibweisen desselben Wortes (*vëlla* zu *vlla*), keine Synonyme.

**Übungstypen**

- **`prompt`**: bei `translate_*` und `word_order` der zu übersetzende Satz; bei `fill_gap` die deutsche Bedeutung des ganzen Satzes, bei Bedarf mit Hinweis in Klammern; bei `multiple_choice` die Frage; bei `match_pairs` eine kurze Anweisung.
- **`multiple_choice`**: 4 Antworten, genau eine richtig, plausible Ablenker. Auswahl ist exakt: ein Ablenker ohne Sonderzeichen (*asht*) ist falsch, nicht „fast richtig“.
- **`translate_wordbank`**: Wortbank = Wörter von `solutions[0]` ohne Satzzeichen, in der Schreibung des Satzes, plus 2–4 plausible **Gheg**-Ablenker (möglichst gleiche Wortart). Nie Standard-Formen als Ablenker. Bausteine sind exakt: ein Ablenker, der sich nur um einen Buchstaben unterscheidet (*mein* / *meine*), ist ein echter Fehler.
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
4. Formen der Familien-Einheit: *vlla, vllau, vllazën* als Kosovo-Formen (Standard *vëlla, vëllai, vëllezër*) und ob *vëlla* als weitere Schreibung akzeptiert bleibt oder als Standard-Form gilt, *gruja* (Standard *gruaja*), *axhë/axha* (Standard *xhaxhai*), *babai* oder *baba* als bestimmte Form, *jem/jeme* als Alternative zu *im/ime*, *dhe / edhe / e* für „und“, *çikë* neben *vajzë*.
5. Verben: *du* oder *due* (wollen), *muj* (können), *hangra* (ich ass), *çohem* (aufstehen), *folë* oder *fol* (gesprochen), *pi* und *ditë* als Partizipien, *tue/tu/tuj* als Gerundium.
6. Plural „sein/haben“ im Kosovo-Alltag: *jemi/jena*, *kemi/kena*.
7. Funktionswörter: *po* als „aber“, *prej* für „von/aus“, *kah*, *veç*, *gja/gjâ*.
8. Ob *të* + Konjunktiv (*du të punoj*) und *do të* + Konjunktiv (Zukunft) als Gheg-Lösung oder als Standard-Form gelten.
9. Ausnahmen der Blockliste: *gëzuar* (Prost) und *duar* (Hände); Muster *-ënë*.
10. Evaluator: Bewertung von Formen ohne End-ë (*mir*) und von lautnahen Schreibungen (*osht, nona*), die in getippten Antworten je nach Länge falsch oder Tippfehler sind; Schwellen der Tippfehler-Toleranz (6 und 16 Buchstaben); Tag `spelling.diacritics`, wenn Zirkumflex und ë/ç zugleich fehlen (DECISIONS.md #30); automatische Erkennung von Standard-Formen über die Blockliste (DECISIONS.md #32); `match_pairs` mit einer falschen Zuordnung ist falsch statt „fast richtig“ (DECISIONS.md #43).
11. Kurzformen mit Apostroph (*m'fal, t'lutem*) als zusätzliche Lösungen zulassen?
12. Formen aus der Einstufungsbank (`placement.json`, vor allem B2–C2): Konditional *kisha me* + Partizip (*kisha me ardhë*), Bedingung mit *me pasë / me e pasë ditë*, Partizipien *ra* (von *bie*), *ble*, *vozitë*, *mbrojtë*, *ndezë*, *hedhë*, *gjetë*, *mërzitë*, *rritë*, *vendosë*, *qëndrue*, Passiv mit *prej* als Agens, *i lumtun*, *pare* (Geld), *veturë*, *me bâ muhabet*, Klitikon-Stellung in *për me të pa*, ironisches *Punë e madhe!*, Sprichwort *Gjuha kockë s'ka, po kockë thyen*. Die betroffenen Aufgaben haben eine `note`.
13. Regionale Formen: *qumësht* (Milch) als Kosovo-Form; *tamël* ist Nordwest-Gheg und wird nicht verwendet.
