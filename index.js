const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const config = require(`${__dirname}/config/config.json`);
const apiKey = config.my_yandex_service_account_api_key;
const folderId = config.my_yandex_folder_id;
const yandexCloudRelativePath = config.yandex_cloud_api_project_relative_path;

const { Client, Message } = require('node-osc');

const {Writable} = require('stream');
const recorder = require('node-record-lpcm16');
const requestPromise = require('request-promise');

// Задать настройки распознавания.
const request = {
    config: {
        specification: {
            languageCode: 'auto',
            profanityFilter: false,
            model: 'general', //'general:rc',
            partialResults: true,
            rawResults: false,
            audioEncoding: 'LINEAR16_PCM',
            sampleRateHertz: '48000',
            sampleRate: 48000,
            audioChannelCount: 1
        },
        folderId: folderId
    }
};

const packageDefinition = protoLoader.loadSync(`${yandexCloudRelativePath}/yandex/cloud/ai/stt/v2/stt_service.proto`, {
    includeDirs: ['node_modules/google-proto-files', `${yandexCloudRelativePath}/`]
});

const oscClient = new Client('127.0.0.1', 9999);

async function translateInYandex(texts, format = 'PLAIN_TEXT', fromLang = 'ru', toLang = 'en') {
    const request = {
        uri: 'https://translate.api.cloud.yandex.net/translate/v2/translate',
        requestCert: true,
        rejectUnauthorized: false,
        method: 'POST',
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Api-Key ' + apiKey
        }
    };

    request.body = {
        sourceLanguageCode: fromLang,
        targetLanguageCode: toLang,
        format: format,
        texts: texts
    };

    const response = await requestPromise(request);
    // console.log(response);
    if (response && response.translations && Array.isArray(response.translations)) {
        return response.translations.map(t => t.text);
    }
    return [];
}

async function main () {
    try {
        const serviceMetadata = new grpc.Metadata();
        serviceMetadata.add('Authorization', `Api-Key ${apiKey}`);
        const packageObject = grpc.loadPackageDefinition(packageDefinition);
        const serviceConstructor = packageObject.yandex.cloud.ai.stt.v2.SttService;
        const grpcCredentials = grpc.credentials.createSsl(fs.readFileSync('./roots.pem'));
        const service = new serviceConstructor('stt.api.cloud.yandex.net:443', grpcCredentials);
        const call = service['StreamingRecognize'](serviceMetadata);
        //
        // // Отправить сообщение с настройками распознавания.
       call.write(request);

        recorder
            .record({
                sampleRateHertz: '48000',
                threshold: 0, // Silence threshold
                silence: 1000,
                keepSilence: true,
                sampleRate: 48000,
                recordProgram: 'rec', // Try also "arecord" or "sox"
            })
            .stream()
            .on('error', err => {
                console.error('Audio recording error ' + err);
            })
        .pipe(new Writable({
            write(chunk, encoding, next) {
                call.write({audioContent: chunk});
                next();
            },

            final() {
                if (call) {
                    call.end();
                }
            },
        }));
        let text = '';
        call.on('data', async (response) => {
            //console.log('Start chunk: ');
            const isFinal = Boolean(response.chunks[0].final);
            const isUtteranceEnd = Boolean(response.chunks[0].endOfUtterance);
            for (const alternative of response.chunks[0].alternatives) {

                let tempText = alternative.text;

                if (isFinal) {
                    text = `${text} ${tempText}`.trim();
                    // process.stdout.clearLine();
                    // process.stdout.cursorTo(0);
                    //process.stdout.write(`F ${tempText}`);

                    translateInYandex(tempText).then(res=>{
                        //console.log(res[0]);
                        // process.stdout.clearLine();
                        // process.stdout.cursorTo(0);
                        // process.stdout.write(`F ${res[0]}`)
                    });
                } else {
                   // process.stdout.clearLine();
                   // process.stdout.cursorTo(0);
                   // process.stdout.write(`${tempText}`);
                    translateInYandex(tempText).then(res=>{
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        process.stdout.write(`${res[0]}`);
                        //console.log(res[0]);
                    });
                }
                const message = new Message('/isadora/1000');
                message.append(isFinal + '');
                message.append(tempText);

                oscClient.send(message, (err) => {
                    // process.stdout.clearLine();
                    // process.stdout.cursorTo(0);
                    // process.stdout.write(`OSC ${JSON.stringify(message)}`);
                    if (err) {
                        console.error(new Error(err));
                    }
                });
            }
        });

        call.on('error', (response) => {
            // Обрабатываем ошибки
            console.log(`Error response ${response}`);
            if (response.code === 11 || response.code === 3) {
                console.log('RESTART');
                main();
            }
        });
    } catch (e) {
        console.error(e);
    }
}
main();
