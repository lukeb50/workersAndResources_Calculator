//Storage Bucket
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');
//vision API
var fulltext;
var detailedtext;
var Info = new Object();

function ExtractBarcode() {
    Info.Barcode = fulltext.match(/[0-9]{5}/g);
    console.log(Info.Barcode);
}

function ExtractLevel() {
    if (fulltext.match(/PRESCHOOL [1-5]/g) !== null) {
        Info.Level = fulltext.match(/PRESCHOOL [1-5]/g);
    } else if (fulltext.match(/SWIMMER [1-6]/g) !== null) {
        Info.Level = fulltext.match(/SWIMMER [1-6]/g);
    } else {
        Info.Level = "Unknown";
    }
    console.log(Info.Level);
}

function getCrossPoint(){
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                var para="";
                WordHolder=[];
                paragraph.words.forEach(word => {
                    const wordText = word.symbols.map(s => s.text).join('');
                    WordHolder.push(word);
                    para=para+" "+wordText;
                });
                console.log(para);
                console.log("Correct:"+para.match(/Previous Level/g));
                if(para.match(/Previous Level/g)!==null){
                    //find word "Previous as it is lower
                    console.log("found previous");
                    for (var i = 0; i < WordHolder.length; i++) {
                        if(WordHolder[i].sybols.map(s=>s.text).join('').toLowerCase()==="previous"){
                            var lowestx=10000;
                            var lowesty=10000;
                            for (var x = 0; x < WordHolder[i].boundingBox.length; i++) {
                                //check each bounding box
                                if(WordHolder[i].boundingBox[x].x<lowestx){lowestx=WordHolder[i].boundingBox[x].x;}
                                if(WordHolder[i].boundingBox[x].y<lowesty){lowesty=WordHolder[i].boundingBox[x].y;}
                            }
                            return [lowestx,lowesty];
                        }
                    }
                }
            });
        });
    });
    return [0,0];
}

function ExtractNames() {
    var point=getCrossPoint();
    console.log(point[0],point[1]);
}

async function getText(location) {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    var [result] = await client.documentTextDetection("gs://report-cards-6290-uploads/" + location);
    var fullTextAnnotation = result.fullTextAnnotation;
    console.log(fullTextAnnotation.text);
    fulltext = fullTextAnnotation.text;
    detailedtext = fullTextAnnotation;
    ExtractBarcode();
    ExtractLevel();
    ExtractNames();
}

exports.Process = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*");
    res.set('Access-Control-Allow-Methods', 'POST');
    if (req.method !== "POST" || req.body.loc === undefined) {
        res.status(400).end();
    }
    getText(req.body.loc).then(re => {
        res.status(201).end();
    }).catch(err => {
        console.log("error:" + err.toString());
        res.status(500).end();
    });
};
