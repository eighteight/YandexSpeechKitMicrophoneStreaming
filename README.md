# YandexSpeechKitMicrophoneSTT

Example of infinite STT (Speech To Text) app, which uses Yandex SpeechKit AI Service found here https://cloud.yandex.com/en-ru/docs/speechkit/stt/streaming

## Getting Started
This readme was created on June 12 2021. Things may have changed ...

### Dependencies
* Clone this repo
* Clone Yandex Cloud API (https://github.com/yandex-cloud/cloudapi) and put it some place convenient
* Download roots.pem file from the https://cloud.yandex.com/en-ru/docs/speechkit/stt/streaming into the root of this project
* Install sox ("brew install sox" on my machine)

### Configuration
* Copy config/config_sample.json to config/config.json and fill in the blanks
This will require a valid Yandex Cloud account
  
### Installation
```
npm install
```
### Executing program 
```
node index.js
```
July 16 2022: now this example includes sending the text transcripts to the yandex translate service in addition to sending it to an OSC bus

## Help

If you are not satisfied with the quality of the STT conversion, upping the sample rates of your recorder and yandex STT request might considerably improve it
