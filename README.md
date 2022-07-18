# Project-frsco

![example workflow](https://github.com/Zeplicious/Pho2Song/actions/workflows/node.js.yml/badge.svg)
![example workflow](https://github.com/Zeplicious/Pho2Song/actions/workflows/dockerAPI.yml/badge.svg)
![example workflow](https://github.com/Zeplicious/Pho2Song/actions/workflows/dockerDB.yml/badge.svg)
[![CodeFactor](https://www.codefactor.io/repository/github/zeplicious/pho2song/badge/main)](https://www.codefactor.io/repository/github/zeplicious/pho2song/overview/main)


## Scopo del progetto

__Project-frsco__ è una web application che gira in un cluster Kubernetes mediante implementazione di microservizi, che si occupa di __associare ad un determinato evento le sue previsioni meteo__. Attraverso la funzionalità principale, __Project-frsco__ si collega al google calendar dell'utente attraverso l'uso di protocollo oAuth e elabora gli eventi della successiva settimana analizzandone la posizione (mediante uso di API __OpenStreetMap__) al fine di valutarne le condizioni meteo (mediante uso di API __VisualCrossing__ nella sua diramazione weather). L'interfaccia grafica, implementata mediante view .pug, mostra dunque all'utente una versione semplificata del proprio __google calendar__ stilizzando le caratteristiche meteo mediante l'uso di icone di facile interpretazione e provvedendo un sunto dell'evento. Inoltre le singole attività  (provviste di una __locazione valida__) possono essere arricchite di dettaglio attraverso un semplice click sulla interfaccia di evento fornita all'utente (o anche tramite URL). Ovviamente suddetto comportamento non sussiste in presenza di locazioni non identificabili per mezzo delle __API pubbliche di terzi utilizzate__.

Inoltre il servizio fornisce una serie di __API Pubbliche__ sempre in ottica realizzazione di una app a valore aggiunto, mediante l'utilizzo delle seguenti __API__:
 
 1. __La sopra citata OpenStreetMap__: al fine di ricavare data una posizione, le sue coordinate;
 2. __PredictHQ__: al fine di ricavare data una serie di coordinate, un insieme di eventi raggruppati nelle vicinanze della posizione richiesta(per maggiori dettagli usufruire delle API fornite);
 3. __La sopra citata VisualCrossing__; al fine di ricavare le previsioni meteo al dettaglio, fornite le coordinate.
 
---

## Architettura di riferimento

![alt text](./architettura_di_riferimento.svg)

---

## Requisti soddisfatti 

1. __Il servizio REST che implementate (lo chiameremo SERV) deve offrire a terze parti delle API documentate.__ (requisito 1)
    - La nostra webapp offre [API](), in particolare è possibile:
        1. ottenere da una locazione ed una data una serie di eventi arricchiti di informazioni sul meteo caratteristico dei precedenti.
        2. arrichire il punto 1 di una possibile maxtemp e/o mintemp da soddisfare.
        3. selezionare una determinata categoria di eventi a scelta tra sport/concerts/community.

2. __SERV si deve interfacciare con almeno due servizi REST di terze parti (e.g. google maps).__ (requisiti 2, 3, 4)
    - La nostra webapp utilizza le seguenti API esterne:
        1. Google Calendar: OAuth;
        2. OpenStreetMap;
        3. VisualCrossing;
        4. PredictHQ;

![alt text](./funzionalità_principale.svg)


3. __Il progetto deve prevedere l'uso di Docker e l'automazione del processo di lancio, configurazione e test.__ (requisito 6)
    - La nostra webapp utilizza Docker:
        - Ogni immagine dei pod costituenti i services di kubernetes viene costruita tramite l'utilizzo di un Dockerfile e successivamente pushata su DockerHub
        - La creazione dei pod/deployment/services/virtualservices/gateway  automatizzati tramite utilizzo di file yaml di kubernetes nello specifico: underdefresco.yaml .

4. __Deve essere implementata una forma di CI/CD per esempio con le Github Actions__ (requisito 8)
    - La nostra webapp implenta Github Actions per:
        - Creazione e push su repository docker hub delle immagini relative;
        - Successivo pull su macchina google su self-hosted runner.
6. __Requisiti minimi di sicurezza devono essere considerati e documentati. Self-signed certificate sono più che sufficienti per gli scopi del progetto.__ (requisito 9)
    - La nostra webapp accetta solo richieste https autorizzate tramite l'utilizzo di Self-signed certificate.

---

## Installazione

- Sono necessari:
    - VM (Ubuntu)
    - docker;
    - k3s;
    - istio;
    

- Eseguire un `git clone` del repository:

```
git clone https://github.com/gianbus/rc-project
```

e posizionarsi nella root directory del git.


- Creare una applicazione su [Google Cloud Platformm](https://console.cloud.google.com), inserire tra i callback uri `http://<host>:<port>/`  ed inserire tra i servizi abilitati Google Calendar API.
- Creare un account su [Visual Crossing](https://www.visualcrossing.com/weather-api) per ottenere la key che dà accesso alle API.
- Creare un account su [PredictHQ](https://www.predicthq.com/apis) per ottenere la key che dà accesso alle API.



### Configurare l'ambiente kubernetes/istio
```
sudo apt update

#installazione docker
sudo apt install docker.io

#installazione k3s
curl -sfL https://get.k3s.io | sh -s - --no-deploy=traefik --write-kubeconfig-mode 644

#installazione istio
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.14.1 TARGET_ARCH=x86_64 sh -
cd istio-1.14.1
export PATH=$PWD/bin:$PATH
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
istioctl install --set profile=demo -y

sleep 10

kubectl label namespace default istio-injection=enabled

#apply bookinfo
#kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
sleep 15
```


### Api/App stand alone

- Creare un file `.env` da inserire nella directory `/app` strutturato come segue:

```


Struttura "api_keys.env":

VISUAL_WEATHER_KEY=XXXXXXXXXXXXXXXXXXXXXXXX

CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXX

CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX

REDIRECT_URIS=XXXXXXXXXXXXXXXXXXXXXXXX

```

- Spostarsi nella directory di interesse ed installare le dipendenze necessarie per il funzionamento inserendo in console:

```
cd /app
npm install
```

- Per avviare il server è sufficente scrivere in console:

```
npm start
```
- Per utilizzare l'app visitare `http://localhost:8080/`

**_NOTA:_** Per api il processo è analogo. (visitare l'endpoint `http://localhost:8080/api-docs`)

### CouchDB

**_NOTA:_** Se si ha installato CouchDB è possibile saltare questa sezione. E' importante inserire le credenziali del proprio database nel file `.env` nei campi `DB_USER` e `DB_PASSWORD` e mettere il database in ascolto sulla porta 5984 in localhost.


- Completare il file /docker/couchdb/test.Dockerfile inserendo le credenziali del database inserite nel file `.env`.
```
ENV COUCHDB_USER=<DB_USER>
ENV COUCHDB_PASSWORD=<DB_PASSWORD>
```

- Successivamente è sufficente inserire in console i seguenti comandi:

```
docker build -t pho2song:couchdb /docker/couchdb/test.Dockerfile
docker run -p 5984:5984 pho2song:couchdb
```

### Docker environment

- Gestire il file `.env` come spiegato nella sezione [api/app](#### Api/App stand alone).
- Completare il file `/docker/couchdb/test.Dockerfile` come spiegato nella sezione [couchdb](#### CouchDB).
- Generare un certificato SSL.
- Inserire in /docker/nginx/ssl `cert.pem` e `cert-key.pem`.
- Per testare environment docker è sufficente inserire in console:

```
docker-compose up
```
- Per utilizzare l'app visitare `https://localhost:8080/`
- 
#### Docker environment (developers)

- Per testare environment docker è sufficente inserire in console:

```
docker-compose -f "development.docker-compose.yml" up
```
- Per utilizzare l'app visitare `https://localhost:8080/`

---

## Istruzioni per il test

### Applicazione

Per testare l'applicazione:

partendo dalla directory root `Pho2Song` spostarsi nella cartella `app`

```
cd app
```

e digitare in console il comando:

```
npm test
```

Viene utilizzato il modulo `jest` per eseguire i test che hanno un tempo di esecuzione variabile. Lasciar andare il programma finchè non sono visibili i risultati dei test

### API

Per testare le chiamate API:

partendo dalla directory root `Pho2Song` spostarsi nella cartella `api`

```
cd api
```

e digitare in console il comando:

```
npm start
```

Anche in questo caso viene utilizzato il modulo `jest` per eseguire i test che hanno un tempo di esecuzione variabile. Lasciar andare il programma finchè non sono visibili i risultati dei test




