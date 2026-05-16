# Dinamikus kikerdezo skeleton

Ez egy tiszta, statikus HTML/CSS/JS alap egy temafuggetlen kikerdezohoz. A cel az, hogy a kerdesmotor ne legyen egy adott tantargyhoz kotve: uj temakhoz eleg egy uj adatcsomagot betolteni.

## Szerkezet

- `index.html`: a felulet vazszerkezete es script betoltesek
- `styles.css`: reszponziv, tema-valtozokra epulo megjelenes
- `app.js`: kerdesmotor, szures, ellenorzes, haladasmentes
- `data/sample-topic.js`: pelda adatcsomag a vart semaval

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

## Kovetkezo fejlesztesi pontok

- tobb adatcsomag kozotti valtas
- importalo Markdownbol vagy JSON-bol
- spaced repetition finomabb algoritmussal
- temakoronkenti eredmeny dashboard
- hibas kerdesekbol automatikus mini ZH
