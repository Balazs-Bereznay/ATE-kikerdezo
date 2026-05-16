# ATE-kikerdezo

Az **ATE-kikerdezo** egy statikus (HTML/CSS/JS) tanulokartya es feleletvalasztos gyakorlo app. A jelenlegi alapcsomag a fertotlenitoszer-spektrum tablazat (Table 6.1) alapjan generalt kerdeseket tartalmazza, de a kerdesmotor ugy van kialakitva, hogy uj temak egyszeruen betolthetok legyenek uj adatcsomagokkal.

## Szerkezet

- `index.html`: a felulet vazszerkezete es script betoltesek
- `styles.css`: reszponziv, tema-valtozokra epulo megjelenes
- `app.js`: kerdesmotor, szures, ellenorzes, haladasmentes
- `data/disinfectant-table-topic.js`: aktualis kerdesbank csomag
- `tools/*.py`: importalo es kerdesgeneralo segedszkriptek

## Adatcsomag minta

Az adatfajl a `window.QUIZ_PACKS` tombbe tol egy csomagot:

```js
window.QUIZ_PACKS.push({
  id: "tema-azonosito",
  title: "Tema neve",
  course: "Tantargy vagy modul",
  version: "0.1.0",
  topics: [{ id: "all", label: "Minden temakor" }],
  questions: []
});
```

Egy kerdes minimum mezoi:

```js
{
  id: "q001",
  topic: "fogalmak",
  prompt: "Kerdes szovege",
  type: "single",
  difficulty: "easy",
  answers: [1],
  options: [{ id: 1, text: "Helyes valasz" }],
  tags: ["alap"],
  explanation: "Rovid magyarazat",
  reference: { title: "Forras", excerpt: "Idezet vagy jegyzet", url: "#" }
}
```

Tamogatott tipusok jelenleg: `single`, `multi`, `text`.

Uj, onellenorzos tipus:

```js
{
  type: "self-list",
  answerLabel: "Sajat felsorolas",
  answerItems: [
    "Elso hivatalos pont",
    "Masodik hivatalos pont"
  ]
}
```

Itt a tanulo elobb sajat szavaival valaszol, majd a pontokat egyesevel (`Kov. valasz felfedese`) vagy egyszerre (`Osszes felfedese`) fedi fel, es vegul `Tudom` / `Nem tudom` gombbal ertekel.

Kepes kerdesekhez opcionalis media mezok:

```js
media: {
  src: "assets/network-stack.svg",
  alt: "Rovid kep leiras",
  caption: "Megjeleno keparat"
}
```

## Hasznalat

1. Nyisd meg az `index.html` fajlt bongeszoben.
2. Valassz tananyag csomagot es temakort.
3. Oldd meg a kerdeseket, majd ellenorizd.
4. Hasznald a szuroket (`Uj`, `Jelolt`, `Rontott`, `Gyakorlando`) az ismetleshez.

## Kovetkezo fejlesztesi pontok

- importalo Markdownbol vagy JSON-bol
- spaced repetition finomabb algoritmussal
- temakoronkenti eredmeny dashboard
- hibas kerdesekbol automatikus mini ZH
