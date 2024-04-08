/* global firebase, Levels,GroupingData, UserData, getArchiveSheetTimeblockData, clientDb, staticPath, getSheetModifier, Archive */
var session = "";
var imageQuality = 0.7;
var includeGraphics = true;
var isDsMode = false;
var Facilities = {};
var Timeblocks = [];
function startCardGenerator(isDs, Faci, Time) {
    isDsMode = isDs ? isDs !== undefined : false;
    Facilities = Faci;
    Timeblocks = Time;
    let sessionObj = clientDb.ref('Settings/Data/Session');
    sessionObj.on('value', (snapshot) => {
        session = snapshot.val();
    });
}

function setImageQuality(quality) {
    imageQuality = quality;
}

function setIncludeGrahpics(include) {
    includeGraphics = include;
}

async function run_card_generation(SheetData, PrintOptions, Instructor) {
    //Arrange for half pages at front
    var currentIndex = 0; //Each item is visited once, but seperate
    //index must be kept to avoid infinite loop
    for (var x = 0; x < PrintOptions.length; x++) {
        if (Levels[PrintOptions[currentIndex].Level].PrintSettings.isHalf === false || Levels[PrintOptions[currentIndex].Level].PrintSettings.isHalf === undefined) {
            PrintOptions.move(currentIndex, PrintOptions.length - 1);
            currentIndex--;
        }
        currentIndex++;
    }
    //Open Window and begin generation
    var windowName = "Print Worksheets";
    var printWindow = window.open(staticPath + "/inline-html/card-print.html", windowName, 'left=0,top=0,width=1248,height=3280');
    printWindow.onload = async function () {
        var doc = printWindow.document;
        var isHalf = true;
        var Tags = [];
        generateTags(Tags, doc, isHalf);
        for (var x = 0; x < PrintOptions.length; x++) {
            var printSettings = Levels[PrintOptions[x].Level].PrintSettings;
            if (!((printSettings.Image === undefined || printSettings.Image === "") && (printSettings.BackImage === undefined || printSettings.BackImage === ""))) {
                //Only bother with levels that have at least 1 image set
                if ((printSettings.isHalf === false || printSettings.isHalf === undefined) && isHalf === true) {
                    //Switching from half to full. Make needed changes
                    finishHalfTags(Tags);
                    isHalf = false;
                    generateTags(Tags, doc, isHalf);
                }
                for (var s = 0; s < PrintOptions[x].Data.length; s++) {
                    var currentStudent = PrintOptions[x].Data[s];
                    if (Tags.length === 0) {
                        generateTags(Tags, doc, isHalf);
                    }
                    handleImageTag(printSettings.Image, prepTag(printSettings.isHalf, Tags, true), "report-card", 0, PrintOptions.Level, Levels[PrintOptions.Level], currentStudent, Instructor, SheetData);
                    handleImageTag(printSettings.BackImage, prepTag(printSettings.isHalf, Tags, false), "report-card", 1, PrintOptions.Level, Levels[PrintOptions.Level], currentStudent, Instructor, SheetData);
                }
                if (isHalf === true && (PrintOptions.length - 1) === x) {
                    finishHalfTags(Tags);
                    //finish tags if at end and still halfs
                }
            }
        }
        for (var x = 0; x < Tags.length; x++) {//Delete extra tags
            Tags[x].remove();
        }
    };
}

var default_worksheet_markup = JSON.parse('{"Autosort":true,"Color":"#a9c8ff","Name":"Swimmer","Regex":{},"Text":[{"BottomRight":{"x":939,"y":257},"Font":70,"Side":0,"TopLeft":{"x":100,"y":181},"Type":"level_and_modifier","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1003,"y":-1884},"Font":40,"Side":0,"TopLeft":{"x":305,"y":-1927},"Type":"instructor","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1002,"y":387},"Font":40,"Side":0,"TopLeft":{"x":270,"y":344},"Type":"session","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1001,"y":315},"Font":40,"Side":0,"TopLeft":{"x":303,"y":272},"Type":"instructor","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1004,"y":458},"Font":40,"Side":0,"TopLeft":{"x":212,"y":415},"Type":"day","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1006,"y":530},"Font":40,"Side":0,"TopLeft":{"x":214,"y":487},"Type":"time_start_12","isMultiline":false,"isVariable":false},{"BottomRight":{"x":1611,"y":2036},"Font":30,"Lines":[587,617,647,677,707,737,767,797,827,857,887,917,947,977,1007,1037,1067,1097,1127,1157,1187],"Side":0,"TopLeft":{"x":98,"y":557},"Type":"student_list","isMultiline":true,"isVariable":false}],"Visible":true}');
async function run_worksheet_generation(SheetData, InstructorData, PrintOptions, timeblockName) {
    //Open Window and begin generation
    var windowName = "Print Worksheets";
    var printWindow = window.open(staticPath + "/inline-html/card-print.html", windowName, 'left=0,top=0,width=1248,height=3280');
    printWindow.onload = async function () {
        var doc = printWindow.document;
        var Tags = [];
        generateTags(Tags, doc, false);
        for (var x = 0; x < PrintOptions.Sheets.length; x++) {
            var currentOptionSheet = PrintOptions.Sheets[x];
            var sheet = SheetData[currentOptionSheet.Instructor][currentOptionSheet.Sheet];
            var sheetLevel = Levels[sheet.Level];
            var sheetGroup = null;
            //Get the group (if a numberic level is 
            if (sheetLevel) {
                sheetGroup = GroupingData.filter((group) => (group.Regex.test(Levels[sheet.Level].Name) === true));
                if (sheetGroup.length === 1) {
                    sheetGroup = sheetGroup[0];
                } else {
                    sheetGroup = null;
                }
            }
            //Handle creation
            if (Tags.length === 0) {
                generateTags(Tags, doc, false);
            }
            var timeblockSplit = timeblockName.split("---");
            sheet.Facility = timeblockSplit[0];
            sheet.Timeblock = timeblockSplit[1];
            if (sheetGroup && sheetLevel.WorksheetSettings && sheetLevel.WorksheetSettings.FrontImage && sheetLevel.WorksheetSettings.FrontImage !== "" && sheetLevel.WorksheetSettings.BackImage && sheetLevel.WorksheetSettings.BackImage !== "") {
                await handleImageTag(sheetLevel.WorksheetSettings.FrontImage, prepTag(false, Tags, true), "worksheet", 0, sheet.Level, sheetGroup, currentOptionSheet, InstructorData[currentOptionSheet.Instructor].Name, SheetData);
                await handleImageTag(sheetLevel.WorksheetSettings.BackImage, prepTag(false, Tags, false), "worksheet", 1, sheet.Level, sheetGroup, currentOptionSheet, InstructorData[currentOptionSheet.Instructor].Name, SheetData);
            } else {
                await handleImageTag("", prepTag(false, Tags, true), "worksheet", 0, sheet.Level, default_worksheet_markup, currentOptionSheet, InstructorData[currentOptionSheet.Instructor].Name, SheetData);
                await handleImageTag("", prepTag(false, Tags, false), "worksheet", 1, sheet.Level, default_worksheet_markup, currentOptionSheet, InstructorData[currentOptionSheet.Instructor].Name, SheetData);
                //Default
            }
            delete sheet.Facility;
            delete sheet.Timeblock;
        }
        for (var x = 0; x < Tags.length; x++) {//Delete extra tags
            Tags[x].remove();
        }
    };
}

async function handleImageTag(ImgName, ImgTag, imgMode, Side, Level, markupLocation, StudentData, Instructor, SheetData) {
    return new Promise(async(resolve) => {
        if (ImgName !== "") {
            loadImage(ImgName, imgMode, false, ImgTag).then((ImgObjResult) => {
                ImgTag.src = generateGraphic(Side, ImgObjResult.width, ImgObjResult.height, Level, markupLocation, StudentData, SheetData, Instructor, ImgObjResult, imgMode);
                resolve();
            }).catch((err) => {
                throw new Error(err);
            });
        } else {
            switch (imgMode) {
                case "report-card":
                    ImgTag.src = generateBlankGraphic();
                    resolve();
                case "worksheet":
                    if (Side === 0) {
                        loadImage("classlist.jpg", "worksheet", true, ImgTag).then((ImgObjResult) => {
                            ImgTag.src = generateGraphic(Side, ImgObjResult.width, ImgObjResult.height, Level, markupLocation, StudentData, SheetData, Instructor, ImgObjResult, imgMode);
                            resolve();
                        }).catch((err) => {
                            throw new Error(err);
                        });
                    } else {
                        ImgTag.src = generateBlankGraphic();
                        resolve();
                    }
            }
        }
    });
}

function loadImage(ImgName, imgMode, isCommon, imgTag) {
    return new Promise(async(resolve, reject) => {
        var ImageObject = new Image();
        ImageObject.crossOrigin = "Anonymous";
        if (isCommon === false) {
            ImageObject.src = ImgName !== "" ? await getURL(ImgName, imgMode) : "";
        } else {
            ImageObject.src = await getCommonURL(ImgName, imgMode);
        }
        if (ImgName !== "") {
            ImageObject.onload = function () {
                //TODO: revisit how worksheet data is passed into function
                determineRotation(ImageObject, imgTag);//Adds the 'portrait' tag if upright full page
                if (includeGraphics === true) {
                    resolve(ImageObject);
                } else {
                    //Generate a white background
                    var blankImage = new Image(ImageObject.width, ImageObject.height);
                    blankImage.src = generateSizedBlankGraphic(ImageObject.width, ImageObject.height);
                    resolve(blankImage);
                }
            };
            ImageObject.onerror = function () {
                reject();
            };
        } else {
            reject();
        }
    });
}

function determineRotation(ImageObj, imgElement) {
    if (ImageObj.height > ImageObj.width) {
        imgElement.classList.add("portrait");
    }
}

function finishHalfTags(Tags) {
    if (Tags.length !== 4) {
        for (var t = 0; t < Tags.length; t++) {
            Tags[t].parentElement.className = "halfSpacer";
            Tags[t].className = "halfSpacer";
            Tags[t].src = generateBlankGraphic();
        }
        while (Tags.length > 0) {
            Tags.pop();
        }
    } else {
        for (var t = 0; t < Tags.length; t++) {
            Tags[t].remove();
        }
    }
}

function prepTag(isHalf, Arr, isFront) {
    var tag = Arr[0];
    tag.classList.add(isHalf ? "half" : "full");
    tag.parentElement.classList.add(isHalf ? "half" : "full");
    if (!isHalf && !isFront) {
        tag.classList.add("fullback");
        tag.parentElement.classList.add("fullback");
    }
    Arr.splice(0, 1);
    return tag;
}

function generateTags(arr, doc, isHalf) {
    var tmp = [];
    for (var i = 0; i < 4; i++) {
        var holder = doc.createElement("div");
        holder.className = "cardImg";
        var img = doc.createElement("img");
        img.className = "cardImg";
        holder.appendChild(img);
        doc.body.appendChild(holder);
        if (isHalf === false) {
            arr[i] = img;
        } else {
            tmp.push(img);
        }
    }
    if (isHalf === true) {
        arr[0] = tmp[0];
        arr[1] = tmp[3];
        arr[2] = tmp[1];
        arr[3] = tmp[2];
    }
}
function generateSizedBlankGraphic(width, height) {
    var cvc = document.createElement("canvas");
    var ctx = cvc.getContext("2d");
    cvc.width = width;
    cvc.height = height;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    return cvc.toDataURL("image/jpeg", imageQuality);
}

function generateBlankGraphic() {
    return generateSizedBlankGraphic(100, 100);
}

function generateGraphic(side, width, height, level, markupLocation, studentData, SheetData, Instructor, ImageObject, imgMode) {
    var LevelMarkup = markupLocation;//Refactor rename when can be bothered to
    var currentSheet;
    if (imgMode === "report-card") {
        currentSheet = SheetData[studentData.Sheet];
    } else if (imgMode === "worksheet") {
        currentSheet = SheetData[studentData.Instructor][studentData.Sheet];
    }
    var cvc = document.createElement("canvas");
    cvc.width = width;
    cvc.height = height;
    var ctx = cvc.getContext("2d");
    ctx.drawImage(ImageObject, 0, 0);
    ctx.textBaseline = "top";
    //Start Drawing
    if (LevelMarkup.Text) {
        generateTextGraphics(ctx, LevelMarkup, currentSheet, studentData.Student, side, Instructor);
    }
    if (LevelMarkup.Skills) {
        generateSkillsGraphics(ctx, LevelMarkup, currentSheet, studentData.Student, side, level);
    }
    return cvc.toDataURL("image/jpeg", imageQuality);
}

function generateSkillsGraphics(ctx, LevelMarkup, sheet, student, side, level) {
    var Skills = LevelMarkup.Skills;
    var groupedSkills = drawWeakGrouping(ctx, side, level, sheet, student);
    var isHighlightingRemoved = LevelMarkup.Settings.WeakGroupingHighlight ? LevelMarkup.Settings.WeakGroupingHighlight : false;
    for (var t = 0; t < Skills.length; t++) {
        if (LevelMarkup.MustSees && LevelMarkup.MustSees[t]) {//Must sees exists for level & skill
            for (var m = 0; m < LevelMarkup.MustSees[t].length; m++) {
                var MustSee = LevelMarkup.MustSees[t][m];
                if (MustSee.Highlighting) {
                    for (var h = 0; h < MustSee.Highlighting.length; h++) {
                        let Data = MustSee.Highlighting[h];
                        if (Data.Side === side && sheet.Marks[student][t] === false && sheet.MustSees[student][t].indexOf(m) !== -1) {
                            ctx.globalAlpha = 0.5;
                            ctx.fillStyle = "yellow";
                            ctx.beginPath();
                            ctx.fillRect(Data.TopLeft.x, Data.TopLeft.y, Data.BottomRight.x - Data.TopLeft.x, Data.BottomRight.y - Data.TopLeft.y);
                            ctx.stroke();
                            ctx.closePath();
                            ctx.globalAlpha = 1;
                        }
                    }
                }
            }
        }
        if (Skills[t].Highlighting && (isHighlightingRemoved === false || groupedSkills.indexOf(t) === -1)) {//Highlighting exists
            for (var s = 0; s < Skills[t].Highlighting.length; s++) {
                let Data = Skills[t].Highlighting[s];
                if (Data.Side === side && sheet.Marks[student][Data.Skill] === false) {
                    highlightWeakSkill(ctx, Data);
                }
            }
        }
        if (Skills[t].Indicator) {//Indicator exists, render
            for (var s = 0; s < Skills[t].Indicator.length; s++) {
                let Data = Skills[t].Indicator[s];
                if (Data.Side === side) {
                    var dimentions = {width: Data.BottomRight.x - Data.TopLeft.x, height: Data.BottomRight.y - Data.TopLeft.y};
                    var boxSize = Math.min(dimentions.width, dimentions.height);
                    if (sheet.Marks[student][Data.Skill] === true) {
                        ctx.lineWidth = Math.min(boxSize * 0.2);
                        ctx.globalAlpha = 1;
                        ctx.font = boxSize + "px Roboto";
                        ctx.fillStyle = "black";
                        if (LevelMarkup.Settings.PassLetter && LevelMarkup.Settings.PassLetter !== "") {
                            var letter = LevelMarkup.Settings.PassLetter;
                            ctx.fillText(letter, Data.TopLeft.x, Data.TopLeft.y);
                        } else {
                            ctx.beginPath();
                            ctx.moveTo(Data.TopLeft.x, Data.TopLeft.y + boxSize * 0.45);
                            ctx.lineTo(Data.TopLeft.x + boxSize * 0.35, Data.TopLeft.y + boxSize);
                            ctx.lineTo(Data.TopLeft.x + boxSize, Data.TopLeft.y);
                            ctx.stroke();
                            ctx.closePath();
                        }
                    }
                }
            }
        }
    }
}

function drawWeakGrouping(ctx, Side, level, sheet, student) {
    var indicatorHolder = [];
    var groupedSkills = [];
    var weakLetter = Levels[level].Settings.WeakLetter ? Levels[level].Settings.WeakLetter : "W";
    var isWeakLetterHighlighted = Levels[level].Settings.HighlightWeakLetter ? Levels[level].Settings.HighlightWeakLetter : false;
    for (var s = 0; s < Levels[level].Skills.length; s++) {
        var skill = Levels[level].Skills[s];
        if (skill.Indicator) {
            for (var i = 0; i < skill.Indicator.length; i++) {
                if (skill.Indicator[i].Side === Side && sheet.Marks[student][s] === false) {
                    var indicatorBox = Math.min(skill.Indicator[i].BottomRight.x - skill.Indicator[i].TopLeft.x, skill.Indicator[i].BottomRight.y - skill.Indicator[i].TopLeft.y);
                    indicatorHolder.push({Skill: s, boxSize: indicatorBox, TopLeft: skill.Indicator[i].TopLeft});
                }
            }
        }
    }
    indicatorHolder.sort(function (a, b) {
        return a.TopLeft.y - b.TopLeft.y;
    });
    function processArray(fullArr, indicatorHolder) {
        var allowedDistance = Levels[level].Settings.WeakGrouping ? parseInt(Levels[level].Settings.WeakGrouping) : 0;
        var newArr = [];
        var baseline = indicatorHolder[0].TopLeft;
        newArr.push(indicatorHolder[0]);
        indicatorHolder.splice(0, 1);
        for (var i = 0; i < indicatorHolder.length; i++) {
            var currentIndicator = indicatorHolder[i];
            if (currentIndicator.TopLeft.x === baseline.x && currentIndicator.TopLeft.y <= baseline.y + allowedDistance) {
                newArr.push(currentIndicator);
                baseline = currentIndicator.TopLeft;
                indicatorHolder.splice(i, 1);
                i--; //decrement to account for splice
            } else if (currentIndicator.TopLeft.y > baseline.y + allowedDistance) {
                break; //Once checked element is out of Y range, sorted array means all
                //subsequent elements will never work.
            }
        }
        if (newArr.length > 1) {
            newArr.forEach((currentIndicator) => {
                if (groupedSkills.indexOf(currentIndicator.Skill) === -1) {
                    groupedSkills.push(currentIndicator.Skill);
                }
            });
            fullArr.push(newArr);
        } else {
            drawWeakLetter(ctx, newArr[0].TopLeft, newArr[0].boxSize, level);
        }
        if (indicatorHolder.length > 0) {
            return processArray(fullArr, indicatorHolder);
        } else {
            return fullArr;
        }
    }
//Run recursive and display lines
    var splitArray = indicatorHolder.length > 0 ? processArray([], indicatorHolder) : [];
    ctx.fillStyle = "black";
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    splitArray.forEach((arr) => {
        ctx.font = arr[0].boxSize + "px Roboto";
        ctx.beginPath();
        ctx.moveTo(arr[0].TopLeft.x + 15, arr[0].TopLeft.y - 5);
        ctx.lineTo(arr[0].TopLeft.x - 5, arr[0].TopLeft.y - 5);
        ctx.lineTo(arr[0].TopLeft.x - 5, arr[arr.length - 1].TopLeft.y + arr[arr.length - 1].boxSize + 5);
        ctx.lineTo(arr[arr.length - 1].TopLeft.x + 15, arr[arr.length - 1].TopLeft.y + arr[arr.length - 1].boxSize + 5);
        ctx.stroke();
        ctx.closePath();
        var letterX = arr[0].TopLeft.x - arr[0].boxSize - arr[0].boxSize * 0.2; //TODO: Change in server
        var letterY = arr[0].TopLeft.y - 5 + ((arr[arr.length - 1].TopLeft.y + arr[arr.length - 1].boxSize) - arr[0].TopLeft.y - 5) / 2;
        if (isWeakLetterHighlighted === true) {
            ctx.fillStyle = "yellow";
            ctx.globalAlpha = 0.5;
            ctx.fillRect(letterX - 5, letterY - 5, arr[0].boxSize + 5, arr[0].boxSize + 5);
            ctx.fillStyle = "black";
            ctx.globalAlpha = 1;
        }
        ctx.fillText(weakLetter, letterX, letterY);
    });
    return groupedSkills;
}

function drawWeakLetter(ctx, TopLeft, boxSize, level) {
    ctx.font = boxSize + "px Roboto";
    ctx.fillStyle = "black";
    ctx.globalAlpha = 1;
    var offset = Levels[level].Settings.WeakLetterOffset ? Levels[level].Settings.WeakLetterOffset : 0;
    var letter = Levels[level].Settings.WeakLetter ? Levels[level].Settings.WeakLetter : "W";
    var isWeakLetterHighlighted = Levels[level].Settings.HighlightWeakLetter ? Levels[level].Settings.HighlightWeakLetter : false;
    if (isWeakLetterHighlighted === true) {
        ctx.fillStyle = "yellow";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(TopLeft.x + (boxSize * offset) - 5, TopLeft.y - 5, boxSize + 5, boxSize + 5);
        ctx.fillStyle = "black";
        ctx.globalAlpha = 1;
    }
    ctx.fillText(letter, TopLeft.x + (boxSize * offset), TopLeft.y);
}

function highlightWeakSkill(ctx, Data) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.fillRect(Data.TopLeft.x, Data.TopLeft.y, Data.BottomRight.x - Data.TopLeft.x, Data.BottomRight.y - Data.TopLeft.y);
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
}


function generateTextGraphics(ctx, LevelMarkup, sheet, student, side, inst) {
    for (var t = 0; t < LevelMarkup.Text.length; t++) {
        var currentTxt = LevelMarkup.Text[t];
        if (currentTxt.Side === side) {
            var variableData = null;
            if (currentTxt.isVariable) {
                variableData = calculateVariableFont(ctx, getText(currentTxt, sheet, student, inst), currentTxt);
                ctx.font = variableData.Width + "px Roboto";
            } else {
                ctx.font = currentTxt.Font + "px Roboto";
            }//TOCHANGE
            if (currentTxt.isMultiline === true && currentTxt.Lines) {
                //Can be changed to array lookup if expanded
                var isGeneratedMultiline = currentTxt.Type === "student_list";
                renderMultiline(ctx, getText(currentTxt, sheet, student, inst), currentTxt, variableData === null ? 0 : variableData.Vertical, isGeneratedMultiline);
            } else {//Single Line
                ctx.fillText(getText(currentTxt, sheet, student, inst), currentTxt.TopLeft.x, currentTxt.TopLeft.y + (variableData === null ? 0 : variableData.Vertical));
            }
        }
    }
    function renderMultiline(ctx, Text, TextData, verticalOffset, isGenerated) {
        var linePos = generateLinePos(TextData);
        var width = TextData.BottomRight.x - TextData.TopLeft.x;
        //Generated works by changing the split to be per generated line (',' is the delimiter)
        //and forcing a break after each element draw in the array
        var wordArray = Text.split(isGenerated ? "," : " ");
        var currentTxt = "";
        var tempTxt = "";
        //Each run, add a word to tempTxt. See if it fits.
        //If it does not, ignore that word (currentTxt is the last run) and write.
        ////Otherwise assign tmp to current in order to finalize that word fitting.
        while (wordArray.length > 0 && linePos.length > 0) {
            tempTxt = currentTxt.concat(" ", wordArray[0]);
            if ((!(isGenerated === true && TextData.isVariable) && ctx.measureText(tempTxt).width >= width) || (isGenerated === true && currentTxt.length > 0)) {//overflow || 1 generated-word (a generated line) has been written last cycle and should now be drawn
                //discard tempTxt, write currentTxt
                //If statement handles predetermined variable text lines, where each line must scale independantly
                if (isGenerated === true && TextData.isVariable === true) {
                    //Calculate the font size
                    var variableTextData = {isMultiline: false, Font: TextData.Font, MaxFont: TextData.MaxFont, TopLeft: TextData.TopLeft, BottomRight: TextData.BottomRight};
                    var variableData = calculateVariableFont(ctx, currentTxt, variableTextData);
                    ctx.font = variableData.Width + "px Roboto";
                    ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0]);
                } else {
                    //Use the predetermined font size
                    ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0] + verticalOffset);
                }
                linePos.splice(0, 1); //remove line;
                currentTxt = ""; //clear used text
            } else {//Still space, move on
                wordArray.splice(0, 1); //remove current word
                currentTxt = tempTxt; //assign to carry on
            }
        }
        //Draw leftover text
        if (linePos.length > 0 && currentTxt !== "") {
            //If statement handles predetermined variable text lines, where each line must scale independantly
            if (isGenerated === true && TextData.isVariable === true) {
                //Calculate the font size
                var variableTextData = {isMultiline: false, Font: TextData.Font, MaxFont: TextData.MaxFont, TopLeft: TextData.TopLeft, BottomRight: TextData.BottomRight};
                var variableData = calculateVariableFont(ctx, currentTxt, variableTextData);
                ctx.font = variableData.Width + "px Roboto";
                ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0]);
            } else {
                //Use the predetermined font size
                ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0] + verticalOffset);
            }
        }
    }

    function getText(currentTxt, sheet, student, inst) {
        switch (currentTxt.Type) {
            case "level":
                if (Levels[sheet.Level]) {
                    return Levels[sheet.Level].Name;
                } else {
                    return sheet.Level;
                }
            case "level_and_modifier":
                if (Levels[sheet.Level]) {
                    return Levels[sheet.Level].Name + " " + createModifierText(sheet);
                } else {
                    return sheet.Level + " " + createModifierText(sheet);
                }
            case "nextlevel":
                //Check if all marking is done or not, return blank if skill is unmarked
                if (sheet.Marks[student].reduce((acc, current) => {
                    return acc + (current !== null ? 1 : 0);
                }, 0) === sheet.Marks[student].length) {
                    return Levels[sheet.NextLevel[student]].Name;
                } else {
                    return "";
                }
            case "session":
                if (sheet.Session) {
                    return sheet.Session;
                } else {
                    return session;
                }
            case "instructor":
                if (sheet.Instructor) {
                    //getInstructorName is a truncation function
                    return getInstructorName(sheet.Instructor);
                } else {
                    return getInstructorName(inst);
                }
            case "student":
                return sheet.Names[student];
            case "student_list":
                return sheet.Names.join(",");
            case "barcode":
                return sheet.Barcode;
            case "custom":
                return currentTxt.Content;
            case "comment":
                if (sheet.Comments) {
                    return sheet.Comments[student];
                }
            case "facility_short":
                if (Archive) {
                    return getArchiveSheetTimeblockData(Facilities, "Facilities", sheet.Facility).Shortform;
                } else {
                    return Facilities[sheet.Facility].Shortform;
                }
            case "facility":
                if (Archive) {
                    return getArchiveSheetTimeblockData(Facilities, "Facilities", sheet.Facility).Name;
                } else {
                    return Facilities[sheet.Facility].Name;
                }
            case "time_modifier":
                let mod = getSheetModifier(sheet);
                if (mod !== null) {//If modifier exists
                    return mod.Name;
                } else {//No modifier
                    return "";
                }
            case "time_start_12":
                return convertTimeReadable(sheet.TimeStart, true);
            case "day":
                if (Archive) {
                    return getArchiveSheetTimeblockData(Timeblocks, "Timeblocks", sheet.Timeblock).Name;
                } else {
                    return Timeblocks[sheet.Timeblock].Name;
                }
            case "day_and_time":
                return getText({Type: "day"}, sheet, student, inst) + " " + getText({Type: "time_start_12"}, sheet, student, inst);
            default:
                return "Error, Please contact system maintainers";
        }
    }
}
function calculateVariableFont(ctx, Text, TextData) {
    if (TextData.isMultiline === true && TextData.Lines) {
        var max = TextData.Font;
        for (var f = TextData.Font; f <= TextData.MaxFont; f += 3) {
            ctx.font = f + "px Roboto";
            var linePos = generateLinePos(TextData);
            var width = TextData.BottomRight.x - TextData.TopLeft.x;
            var wordArray = Text.split(" ");
            var currentTxt = "";
            var tempTxt = "";
            while (wordArray.length > 0 && linePos.length > 0) {
                tempTxt = currentTxt.concat(" ", wordArray[0]);
                if (ctx.measureText(tempTxt).width >= width) {//overflow
//discard tempTxt, write currentTxt
                    linePos.splice(0, 1); //remove line;
                    currentTxt = ""; //clear used text
                } else {//Still space, move on
                    wordArray.splice(0, 1); //remove current word
                    currentTxt = tempTxt; //assign to carry on
                }
            }
//Draw leftover text
            if (linePos.length > 0 && currentTxt !== "") {
                //ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0]);
                max = f;
            } else {
                break;
            }
        }
        return {Width: max, Vertical: -(Math.abs(max - TextData.Font) * 0.8)};
    } else {//Single Line
        var width = TextData.BottomRight.x - TextData.TopLeft.x;
        var max = TextData.Font;
        for (var f = TextData.Font; f <= TextData.MaxFont; f += 3) {
            ctx.font = f + "px Roboto";
            if (ctx.measureText(Text).width < width) {
                max = f;
            } else {
                break;
            }
        }
        return {Width: max, Vertical: -(Math.abs(max - TextData.Font) * 0.8)};
    }
}

function generateLinePos(TextData) {
    var linePos = [TextData.TopLeft.y];
    for (var n = 0; n < TextData.Lines.length; n++) {
        linePos.push(TextData.Lines[n]);
    }
    linePos = linePos.sort(function (a, b) {
        return a - b;
    });
    return linePos;
}