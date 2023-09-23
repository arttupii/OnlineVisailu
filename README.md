# Online-visailupeli
Tämä projekti on yksinkertainen online-visailupeli, joka on toteutettu Node.js:n ja Socket.io:n avulla.

## Sisällysluettelo
  - [Käytetyt teknologiat ja riippuvuudet](#käytetyt-teknologiat-ja-riippuvuudet)
  - [Projektin rakenne](#projektin-rakenne)
  - [Projektin tiedostot ja niiden kuvaus](#projektin-tiedostot-ja-niiden-kuvaus)
  - [Aloitaminen](#aloitaminen)
  - [Keskeiset toiminnot](#keskeiset-toiminnot)
  - [Pelinkulku](#pelinkulku)
  - [Tulevat parannukset ja laajennukset](#tulevat-parannukset-ja-laajennukset)
  - [Lisäresurssit ja linkit](#lisäresurssit-ja-linkit)

## Käytetyt teknologiat ja riippuvuudet
  - **Node.js** - Palvelimen runko.
  - **Socket.io** - Reaaliaikainen viestintä palvelimen ja asiakkaiden välillä.
  - **Express.js** - Verkkopalvelimen puitteet.
  - **Bootstrap** - Ulkoasun ja käyttöliittymän suunnittelu.

## Projektin rakenne
  - `server.js` - Palvelimen pääkoodi.
  - `public/` - Kansio, joka sisältää kaikki staattiset tiedostot.
    - `index.html` - Pääsivu pelaajille.
    - `player.html` - Pelaajan näkymä pelin aikana.
    - `admin.html` - Admin-näkymä pelin hallintaan.
  - `questions.json` - Tiedosto, joka sisältää kaikki kysymykset ja vastaukset.

## Projektin tiedostot ja niiden kuvaus
  ### 1. `server.js`
      Tämä on projektin pääpalvelintiedosto. Se käsittelee:
    
    #### a. Palvelimen käynnistys
      Käynnistää Express.js-palvelimen ja määrittää sen kuuntelemaan tiettyä porttia.
    
    #### b. `io.on('connection', (socket) => {...})`
      Pääfunktio Socket.io-tapahtumien käsittelyyn. Keskeiset alifunktiot:
      - **`socket.on('createGame', (data, callback) => {...})`**: Luo uuden pelin ja palauttaa pelikoodin.
      - **`socket.on('joinGame', (data, callback) => {...})`**: Käsittelee pelaajan liittymisen peliin.
      - **`socket.on('startGame', (data, callback) => {...})`**: Aloittaa pelin lähettämällä ensimmäisen kysymyksen pelaajille.
      - **`socket.on('answer', (data, callback) => {...})`**: Käsittelee pelaajan vastauksen ja päivittää pisteet.
    
  ### 2. `public/player.html`
    Pelaajan näkymä pelin aikana. Keskeiset funktiot:
    
    #### a. `socket.emit('joinGame', {...})`
      Lähettää pyynnön liittyä peliin palvelimelle.
    
    #### b. `socket.on('newQuestion', (question) => {...})`
      Kun uusi kysymys saapuu palvelimelta, näyttää kysymyksen ja vastausvaihtoehdot käyttäjälle.
    
    #### c. `answerQuestion(selectedOption, btnElement, correctAnswer)`
      Käsittelee pelaajan vastauksen ja lähettää sen palvelimelle.
    
  ### 3. `public/admin.html`
    Admin-paneeli pelin luojalle. Keskeiset funktiot:
  
    #### a. `createNewGame()`
      Kutsuu palvelinta luomaan uuden pelin.
    
    #### b. `startSelectedSeries()`
      Aloittaa valitun kysymyssarjan palvelimella.

## Aloitaminen
  1. **Asennus** - Aja `npm install` asentaaksesi kaikki tarvittavat riippuvuudet.
  2. **Käynnistys** - Aja `node server.js` käynnistääksesi palvelimen.

## Keskeiset toiminnot
  - **Pelinkäynnistys**: Admin voi luoda pelin ja saada liittymiskoodin pelaajille.
  - **Liittyminen peliin**: Pelaajat voivat liittyä peliin käyttämällä liittymiskoodia.
  - **Pelin aloitus**: Kun riittävä määrä pelaajia on liittynyt, admin voi aloittaa pelin.
  - **Kysymysten esittäminen**: Kysymykset esitetään reaaliaikaisesti kaikille pelaajille.
  - **Pisteiden laskeminen**: Oikeista vastauksista saa pisteitä. Väärästä vastauksesta ei saa pisteitä.

## Pelinkulku
  1. Pelaajat liittyvät peliin käyttämällä liittymiskoodia.
  2. Admin valitsee kysymyssarjan ja aloittaa pelin.
  3. Kysymyksiä esitetään pelaajille yksi kerrallaan määrätyssä ajassa.
  4. Pelaajat valitsevat vastauksensa.
  5. Kun kaikki kysymykset on käyty läpi, peli päättyy ja pisteet näytetään.

## Tulevat parannukset ja laajennukset
  - **Monivalintakysymykset**: Mahdollisuus lisätä kysymyksiä, joissa on useita oikeita vastauksia.
  - **Reaaliaikainen pistetaulu**: Näyttää pelaajien pisteet reaaliajassa.
  - **Mobiiliyhteensopivuus**: Parannukset mobiililaitteille.
  - **Autentikointi**: Lisää turvallisuutta admin-näkymälle.
  - **Kuvien lisääminen kysymyksiin**: Mahdollisuus lisätä kuvia kysymyksiin tehdäkseen niistä elävämpiä ja visuaalisesti houkuttelevampia.
  - **Kysymysten luontityökalu**: Adminille suunnattu työkalu uusien kysymysten lisäämiseen, muokkaamiseen ja poistamiseen helposti käyttöliittymän kautta.
  - **Pelaajien seuranta**: Mahdollisuus nähdä, ketkä pelaajat ovat liittyneet peliin ja heidän tilansa reaaliajassa.
  - **Pelin asetukset**: Adminille mahdollisuus määritellä pelin asetuksia, kuten kysymysten kesto, pisteytysjärjestelmä ja muut.
  - **Vastausvaihtoehtojen satunnaisuus**: Mahdollisuus näyttää vastaustoehdot satunnaisessa järjestyksessä jokaiselle pelaajalle.
  - **Pelaajien lukumäärä**: Näytä pelaajien lukumäärä admin-sivulla.
  - **Pelaajien lukumäärä**: Näytä pelaajien lukumäärä admin-sivulla.
  - **Musiikin lisääminen**: Soita pelinaikana musiikkia.
  - **Kirjoita vastaus tehtävätyyppi**: Pyydetään pelaajaa kirjoittamaan tehtävän vastaus.
  - **Realiaikainen tulosten näyttäminen**: Näytä kolme parasta pelaaja realiaikaisesti admin-sivulla.
  - **Multikäyttäjätuki** Useita Admin käyttäjiä, joilla omat kysymyssarjat.
  - **Kysymyssarjapankki** Kysymyssarjojen jakomahdollisuus.
  - **Admin-käyttäjä** Kuvaavampi nimi käyttäjälle.
       
## Lisäresurssit ja linkit  
  - [Socket.io dokumentaatio](https://socket.io/docs/v4)
  - [Express.js dokumentaatio](https://expressjs.com/)
  - [Bootstrap dokumentaatio](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
