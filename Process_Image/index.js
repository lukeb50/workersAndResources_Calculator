//Storage Bucket
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('report-cards-6290-uploads');
//vision API
var fulltext;
var detailedtext;
var Info = new Object();
var LevelDetails = {"PRESCHOOL 1": 12, "PRESCHOOL 2": 13, "PRESCHOOL 3": 16, "PRESCHOOL 4": 15, "PRESCHOOL 5": 12, "SWIMMER 1": 21, "SWIMMER 2": 17, "SWIMMER 3": 17, "SWIMMER 4": 15, "SWIMMER 5": 19, "SWIMMER 6": 18};
var internalPositions = [];

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

function condenseLine(pos, namelist) {
    var lowesty = 10000;
    for (var a = 0; a < pos.length; a++) {
        if (pos[a][2] < lowesty) {
            lowesty = pos[a][2];
        }
    }
    //found current lowest point;
    var onrow = [];
    var onrowcopy = [];
    for (var i = 0; i < pos.length; i++) {
        if (lowesty - 25 < pos[i][2] && lowesty + 25 > pos[i][2]) {
            onrow.push(pos[i]);
            onrowcopy.push(pos[i]);
        }
        ;
    }
    //got all words on the row with , sort by X
    var line = "";
    for (var o = 0; o < onrowcopy.length; o++) {
        var lowestx = 10000;
        var lowestindex = -1;
        for (var t = 0; t < onrow.length; t++) {
            if (onrow[t][1] < lowestx) {
                lowestx = onrow[t][1];
                lowestindex = t;
            }
        }
        //found first word, add it.      
        line = [line, onrow[lowestindex][0].symbols.map(s => s.text).join('')].join(" ");
        onrow.splice(lowestindex, 1);
    }
    if (line.match(/Location/gi) === null && line.match(/Previous/gi) === null && line.toUpperCase() !== line) {
        namelist.push((line.replace(/,/g, "")));
        internalPositions.push([(line.replace(/,/g, "")), lowesty]);
    }
    return [pos, namelist, onrowcopy];
}

function Condense(pos) {
    var namelist = [];
    var len = pos.length;
    for (var i = 0; i < len; i++) {
        var x = condenseLine(pos, namelist);
        pos = x[0];
        namelist = x[1];
        for (var c = 0; c < x[2].length; c++) {
            for (var z = 0; z < pos.length; z++) {
                if (pos[z] === x[2][c]) {
                    pos.splice(z, 1);
                }
            }
        }
        if (pos.length === 0) {
            break;
        }
        ;
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
    // Break into rows and return each valid row.
    Names = Condense(Positions);
    Info.Names = Names;
}

function getYOffset() {
    var point = getCrossPoint();
    var points = [];
    points.push(point[0]);
    var counter = 1;
    point[1] = point[1] + 75;
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                if (Math.min(paragraph.boundingBox.vertices[0].x, paragraph.boundingBox.vertices[1].x, paragraph.boundingBox.vertices[2].x, paragraph.boundingBox.vertices[3].x) > point[0] && Math.max(paragraph.boundingBox.vertices[0].y, paragraph.boundingBox.vertices[1].y, paragraph.boundingBox.vertices[2].y, paragraph.boundingBox.vertices[3].y) - 75 < point[1] && counter <= LevelDetails[Info.Level] - 1) {
                    points.push(Math.min(paragraph.boundingBox.vertices[0].x, paragraph.boundingBox.vertices[1].x, paragraph.boundingBox.vertices[2].x, paragraph.boundingBox.vertices[3].x));
                    counter += 1;
                }
            });
        });
    });
    return points;
}

function ExtractMarks() {
    var Positions = [];
    var point = getCrossPoint();
    //for each absolute length to each line,find closest
    //match to closest skill,read in and store in position
    detailedtext.pages.forEach(page => {
        page.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
                paragraph.words.forEach(word => {
                    const wordText = word.symbols.map(s => s.text).join('');
                    if (word.boundingBox.vertices[0].x > point[0] && word.boundingBox.vertices[0].y > point[1] + 50) {
                        word.symbols.forEach(symbol => {
                            var txt = symbol.text;
                            if ((txt.toUpperCase() === "W" || txt.toUpperCase() === "N") && (wordText.toUpperCase().match(/SW/gi) === null)) {
                                Positions.push([Math.min(symbol.boundingBox.vertices[0].x, symbol.boundingBox.vertices[1].x, symbol.boundingBox.vertices[2].x, symbol.boundingBox.vertices[3].x), Math.min(symbol.boundingBox.vertices[0].y, symbol.boundingBox.vertices[1].y, symbol.boundingBox.vertices[2].y, symbol.boundingBox.vertices[3].y)]);
                            }
                        });
                    }
                });
            });
        });
    });
    //generate grid for storing
    var Marks = new Array(Info.Names.length);
    for (var i = 0; i < Marks.length; i++) {
        Marks[i] = new Array(LevelDetails[Info.Level]);
        for (var v = 0; v < Marks[i].length; v++) {
            Marks[i][v] = true;
        }
    }
    var offset = getYOffset();
    console.log(offset.length);
    //internalPositions[i][1] has Y for name, offset[i] has X for skill, Positions contains x & y of weaks
    for (var i = 0; i < Positions.length; i++) {
        //for each Weak, find lowest difference in Y values with names.
        var lowestdiff = 10000;
        var lowestiderator = -1;
        for (var x = 0; x < internalPositions.length; x++) {
            var diff = Math.abs(Positions[i][1] - internalPositions[x][1]);
            if (diff < lowestdiff) {
                lowestdiff = diff;
                lowestiderator = x;
            }
        }
        //internalPositions[lowestiderator][0] has name of person, lowestiderator is pos of person
        lowestdiff = 10000;
        var lowestiderator2 = -1;
        for (var x = 0; x < offset.length - 1; x++) {
            var diff = Math.abs(offset[x] - Positions[i][0]);
            if (diff < lowestdiff) {
                lowestdiff = diff;
                lowestiderator2 = x;
            }
        }
        //set mark position to false
        if (lowestiderator !== -1 && lowestiderator2 !== -1) {
            Marks[lowestiderator][lowestiderator2 + 1] = false;
        }
    }
    //print off all marks.
    for (var i = 0; i < Marks.length; i++) {
        var txt = "";
        Marks[i][Marks.length] = true;
        for (var b = 0; b < Marks[i].length; b++) {
            txt = txt + Marks[i][b].toString() + "   ";
        }
        console.log(txt);
    }
    Info.Marks = Marks;
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
    ExtractMarks();
}

exports.Process = (req, res) => {
    res.set('Access-Control-Allow-Origin', "*");
    res.set('Access-Control-Allow-Methods', 'POST');
    if (req.method !== "POST" || req.body.loc === undefined) {
        res.status(400).end();
    }
    getText(req.body.loc).then(re => {
        res.status(200).send(Info);
    });//.catch(err => {
    //console.log("error:" + err.toString());
    //res.status(500).end();
    //});
};
