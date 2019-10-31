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
                            return [lowestx, lowesty];
                        }
                    });
                }
            });
        });
    });
    return [1000, 1000];
}

function condenseLine(pos,namelist) {
    var lowesty = 10000;
    for (var a = 0; a < pos.length; a++) {
        if (pos[a][2] < lowesty) {
            lowesty = pos[a][2];
        }
    }
    console.log("Low Y:" + lowesty);
    //found current lowest point;
    var onrow = [];
    var onrowcopy = [];
    for (var i = 0; i < pos.length; i++) {
        if (lowesty - 25 < pos[i][2] && lowesty + 25 > pos[i][2]) {
            console.log("Adding " + pos[i][0].symbols.map(s => s.text).join('') + " to onrow");
            onrow.push(pos[i]);
            onrowcopy.push(pos[i]);
        }
        ;
    }
    //got all words on the row with , sort by X
    var line = "";
    var iter = 0;
    for(var o=0;o<onrowcopy.length;o++){
        var lowestx = 10000;
        var lowestindex = -1;
        for (var t = 0; t < onrowcopy.length; t++) {
            if (onrow[t][1] < lowestx) {
                lowestx = onrow[t][1];
                lowestindex = t;
            }
        }
        //found first word, add it.      
        line =[line,onrow[lowestindex][0].symbols.map(s => s.text).join('')].join(" ");
        onrow.splice(lowestindex,1);
        console.log("Building line:"+line);
        iter++;
    }
    namelist.push(line);
    console.log("Line:" + line);
    console.log("Remaining Items:" + pos.length);
    return [pos,namelist,onrowcopy];
}

function Condense(pos){
    var namelist=[];
    for (var i = 0; i < pos.length; i++) {
        var x=condenseLine(pos,namelist);
        pos=x[0];
        namelist=x[1];
        for (var c = 0; c < x[2].length; c++) {
            for (var z = 0; z < pos.length; z++) {
                if(pos[z]===x[2][c]){
                    pos.splice(z,1);
                }
            }
        }
        if(pos.length===0){break;};
    }
    return namelist;
}

function ExtractNames() {
    var Names = [];
    var Positions = [];
    var point = getCrossPoint(); //Point where -x and -y will only contain names
    //check if each word is within box. If yes and not single Letter, add to array based on Y
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                paragraph.words.forEach(word => {
                    const wordText = word.symbols.map(s => s.text).join('');
                    if (word.boundingBox.vertices[0].x < point[0] && word.boundingBox.vertices[0].y > point[1]) {
                        //is within name area.
                        //get top-left position and load it into array
                        var x = 10000;
                        var y = 10000;
                        for (var i = 0; i < word.boundingBox.vertices.length; i++) {
                            if (word.boundingBox.vertices[i].x < x) {
                                x = word.boundingBox.vertices[i].x;
                            }
                            if (word.boundingBox.vertices[i].y < y) {
                                y = word.boundingBox.vertices[i].y;
                            }
                        }
                        var wordText2 = wordText.replace(/\d+/g, "");
                        if (wordText2 !== "") {
                            Positions.push([word, x, y]);
                        }
                    }
                });
            });
        });
    });
    // into seperated rows and return everything in that row
    console.log(Positions.length);
    Names=Condense(Positions);
    return Names;
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
    var names=ExtractNames();
    console.log("Names:");
    for (var i = 0; i < names.length; i++) {
        console.log(names[i]);
    }
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
