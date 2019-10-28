//Storage Bucket
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');
//vision API
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

exports.Process = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*");
    res.set('Access-Control-Allow-Methods', 'POST');
    if (req.method !== "POST" || req.body.loc === undefined) {
        res.status(400).end;
    }
    client.documentTextDetection("gs://report-cards-6290-uploads/"+req.body.loc).then(response => {
        ([response].labelAnnotations).forEach(label => console.log(label.description));
        res.status(201).end();
    }).catch (err=>{
        console.log("error:"+err.toString());
        res.status(500).end();
    });
};