# Reflextréner – tananyagformátum (v2)

Ez a dokumentum csak a technikai formátumot rögzíti. A nyelvi és pedagógiai tartalmat a külön angoltanulós csevegésben dolgozzuk ki.

## Leckelista

`data/index.json`:

```json
{
  "schemaVersion": 1,
  "lessons": [
    {"id": "everyday-01", "title": "Öt mondat a mindennapokra", "file": "lesson-01.json"}
  ]
}
```

Új lecke: új `data/lesson-02.json` fájl, majd egy sor a leckelistában. A fájlnév kisbetűket, számokat és kötőjeleket tartalmazzon.

## Lecke

Mezők: `id` (tartós egyedi azonosító), `title`, `schemaVersion: 2`, `stages`, `patterns`, `cards`.

### Tanulási szakasz (`stages[]`)

```json
{
  "id": "negatives",
  "type": "teach",
  "title": "Tagadó mondatok",
  "requires": ["statements"],
  "intro": "Rövid magyar nyelvű bevezetés.",
  "cardIds": ["tired-no", "time-no"]
}
```

- `teach`: új mondatok tanítása; a felsorolt kártyák megismerése után teljesül.
- `practice`: vegyes gyakorlás; teljesített kör után teljesül.
- `review`: késleltetett ismétlés.
- `requires`: korábbi, teljesítendő szakaszok azonosítói.
- `cardIds`: a szakaszhoz tartozó mondatok.
- `scope: "learned"`: minden már megismert mondatot használ a leckéből, `cardIds` helyett.

### Mondatcsalád (`patterns[]`)

Az eddigi `id`, `group`, `title`, `base`, `meaning`, `explanation`, `examples` mezőket megtartjuk. A `group` jelenleg technikai ellenőrzőcímke (`be` vagy `do`), nem pedagógiai általánosítás. A múlt idő ellenőrzőjét később külön bővítjük.

### Mondatkártya (`cards[]`)

```json
{
  "id": "time-no",
  "pattern": "have-time",
  "form": "negative",
  "hu": "Nincs időm.",
  "situation": "Most sietsz, és ezt szeretnéd röviden jelezni.",
  "transformFrom": "I have time.",
  "answer": "I don't have time.",
  "accepted": ["I do not have time."]
}
```

- `id`: tartós, az egész alkalmazásban egyedi azonosító; már használt értéket nem nevezünk át.
- `pattern`: egy meglévő mondatcsalád azonosítója.
- `form`: `statement`, `negative`, `question`.
- `hu`: magyar előhívási inger.
- `situation`: rövid és egyértelmű magyar élethelyzet.
- `transformFrom`: csak korábban megtanított angol kiinduló mondat lehet; opcionális.
- `answer`: az egyetlen rögzítendő célmondat.
- `accepted`: egyéb helyes változatok, amelyek nem új célmondatok.

## Kompatibilitás és tartalmi szabályok

A meglévő tanulási rekordok a `reflex-trener-progress-v1` böngészőtárhely-kulcson maradnak. A korábbi `cards[].id` értékek változatlanok. Az új `completedStages` és `activeLessonId` mezők opcionálisak, így régi mentés is betölthető.

Minden új szerkezethez legyen előzetes tanítás. Mondatátalakítás csak már tanult kiinduló alakból indulhat. A magyar „cselekvés vagy állapot” nem általános `be`/`do` döntési szabály. A `have got` elfogadható válasz lehet, de önálló tanítás nélkül nem célmondat. Egyetlen helyes válasz nem jelent tartós tudást.
