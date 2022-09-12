const fs = require('fs');
const { Voice } = require('@vonage/voice');
const path = require('path');
const Koa = require('koa');
const router = require('@koa/router')();
const koaBody = require('koa-body');
const websockify = require('koa-websocket');
const Twig = require('twig');
const twig = Twig.twig;
const views = require('koa-views');
const sdk = require('@symblai/symbl-js').sdk;
const uuid = require('uuid').v4;

require('dotenv').config();

const config = fs.readFileSync(path.join(__dirname, process.env.VONAGE_CONFIG_FILE));
const appUrl = process.env.TUNNEL_DOMAIN;

const vonage = new Voice({
    applicationId: config.application_id,
    privateKey: config.private_key,
});

async function answer(ctx) {
    console.log(ctx.request.body);
    ctx.status = 200;
    ctx.body = [
        {
            action: "talk",
            text: "Please wait while we connect you to an agent",
        },
        {
            action: "connect",
            eventUrl: ["https://" + appUrl + "/webhooks/events"],
            from: process.env.VONAGE_FROM,
            endpoint: [
                {
                    type: "phone",
                    number: process.env.VONAGE_TO,
                }
            ]
        },
        {
            action: "connect",
            eventUrl: ["https://" + appUrl + "/webhooks/events"],
            from: process.env.VONAGE_FROM,
            endpoint: [
                {
                    type: "websocket",
                    uri: "ws://" + appUrl + "/",
                    "content-type": "audio/l16;rate=16000",
                }
            ]
        }
    ];
}

async function events(ctx) {
    console.log(ctx.request.body);
    ctx.status = 204;
    ctx.body = null;
}

async function handleWebsocket(ctx) {
    ctx.websocket.on('message', (message) => {
        try {
            const event = JSON.parse(message);
            console.log(event);
        } catch (err) {
            if (Buffer.isBuffer(message)) {
                // Send the audio buffer to Symbl
            }
        }
    });
}

const app = websockify(new Koa());
router
    .get('/webhooks/answer', answer)
    .post('/webhooks/answer', answer)
    .post('/webhooks/events', events);

app.use(koaBody());
app.use(router.routes());
app.ws.use(handleWebsocket);

app.listen(process.env.HTTP_PORT);
