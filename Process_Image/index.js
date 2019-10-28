//Storage Bucket
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');
//vision API
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function getText(location) {
    const [result] = await client.documentTextDetection("gs://report-cards-6290-uploads/" + location);
    const fullTextAnnotation = result.fullTextAnnotation;
    console.log(fullTextAnnotation.text);
    return fullTextAnnotation.text;
}

exports.Process = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*");
    res.set('Access-Control-Allow-Methods', 'POST');
    if (req.method !== "POST" || req.body.loc === undefined) {
        res.status(400).end;
    }
    data = getText(req.body.loc).then(res => {
        console.log(res.toString());
    }).catch(err => {
        console.log("error:"+err.toString());
    })

    console.log(data);
    res.status(202).end();
};
