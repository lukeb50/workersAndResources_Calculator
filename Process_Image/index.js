//Storage Bucket
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');
//vision API
var fulltext;
var detailedtext;
var Info = new Object();

function ExtractBarcode() {
    Info.Barcode = fulltext.match(new RegExp("[0-9]{" + process.env.Barcode_Length + "}", "g"));
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

function getCrossPoint() {
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                var para = "";
                paragraph.words.forEach(word => {
                    const wordText = word.symbols.map(s => s.text).join('');
                    para = para + " " + wordText;
                });
                if (para.match(/Previous Level/g) !== null) {
                    //find word "Previous" as it is lower
                    paragraph.words.forEach(word => {
                        const wordText = word.symbols.map(s => s.text).join('');
                        if (wordText.match(/Previous/g) !== null) {
                            var lowestx = 10000;
                            var lowesty = 0;
                            for (var x = 0; x < word.boundingBox.vertices.length; x++) {
                                //check each bounding box
                                if (word.boundingBox.vertices[x].x < lowestx) {
                                    lowestx = word.boundingBox.vertices[x].x;
                                }
                                if (word.boundingBox.vertices[x].y > lowesty) {
                                    lowesty = word.boundingBox.vertices[x].y;
                                }
                            }
                            console.log(lowestx + ":COORDINATES:" + lowesty);
                            return [lowestx, lowesty];
                        }
                    });
                }
            });
        });
    });
    return [1000, 1000];
}

function ExtractNames() {
    var point = getCrossPoint(); //Point where -x and -y will only contain names
    //check if each word is within box. If yes and not single Letter, add to array based on Y
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                paragraph.words.forEach(word => {
                    const wordText = word.symbols.map(s => s.text).join('');
                    if(word.boundingBox.vertices[0].x<point[0] && word.boundingBox.vertices[0].y>point[1]){
                        //is within name area.
                        console.log("Word:"+wordText);
                    }
                });
            });
        });
    });
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
