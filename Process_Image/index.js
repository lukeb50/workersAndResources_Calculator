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
        if (err){return reject(err);}
        if(files[0]){
            console.log(files[0].name);
            res.status(201).end();
            //run into vision
        }else{
            res.status(500).end();
        }
    });
};