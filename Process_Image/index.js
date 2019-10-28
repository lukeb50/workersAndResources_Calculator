const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');

exports.Process = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*");
    res.set('Access-Control-Allow-Methods', 'POST');
    if (req.method !== "POST" || req.body.loc === undefined) {
        res.status(400).end;
    }
    bucket.getFiles({prefix: req.body.loc}, (err, files) => {
        if (err)
            return reject(err);
        //resolve(files);
        console.log(files[0].toString());
        res.status(200).end();
    });
};