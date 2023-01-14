/* global firebase, Levels, UserData, getArchiveSheetTimeblockData, clientDb, staticPath, getSheetModifier */
var session = "";
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
                    handleImageTag(printSettings.Image, prepTag(printSettings.isHalf, Tags, true), 0, PrintOptions[x], currentStudent, Instructor);
                    handleImageTag(printSettings.BackImage, prepTag(printSettings.isHalf, Tags, false), 1, PrintOptions[x], currentStudent, Instructor);
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
    async function handleImageTag(ImgName, ImgTag, Side, PrintSetting, StudentData, Instructor) {
        var ImageObject = new Image();
        ImageObject.crossOrigin = "Anonymous";
        ImageObject.src = ImgName !== "" ? await getURL(ImgName) : "";
        if (ImgName !== "") {
            ImageObject.onload = function () {
                //TODO: revisit how worksheet data is passed into function
                ImgTag.src = generateGraphic(Side, ImageObject.width, ImageObject.height, PrintSetting.Level, StudentData, SheetData, Instructor, ImageObject);
            };
        } else {
            ImgTag.src = generateBlankGraphic();
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
}

function generateBlankGraphic() {
    var cvc = document.createElement("canvas");
    var ctx = cvc.getContext("2d");
    cvc.width = 100;
    cvc.height = 100;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 100, 100);
    return cvc.toDataURL("image/png");
}

function generateGraphic(side, width, height, level, studentData, SheetData, Instructor, ImageObject) {
    var LevelMarkup = Levels[level];
    var currentSheet = SheetData[studentData.Sheet];
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
    generateSkillsGraphics(ctx, LevelMarkup, currentSheet, studentData.Student, side, level);
    return cvc.toDataURL("image/png");
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
                            console.log(Data);
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
                renderMultiline(ctx, getText(currentTxt, sheet, student, inst), currentTxt, variableData === null ? 0 : variableData.Vertical);
            } else {//Single Line
                ctx.fillText(getText(currentTxt, sheet, student, inst), currentTxt.TopLeft.x, currentTxt.TopLeft.y + (variableData === null ? 0 : variableData.Vertical));
            }
        }
    }
    function renderMultiline(ctx, Text, TextData, verticalOffset) {
        var linePos = generateLinePos(TextData);
        var width = TextData.BottomRight.x - TextData.TopLeft.x;
        var wordArray = Text.split(" ");
        var currentTxt = "";
        var tempTxt = "";
        while (wordArray.length > 0 && linePos.length > 0) {
            tempTxt = currentTxt.concat(" ", wordArray[0]);
            if (ctx.measureText(tempTxt).width >= width) {//overflow
//discard tempTxt, write currentTxt
                ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0] + verticalOffset);
                linePos.splice(0, 1); //remove line;
                currentTxt = ""; //clear used text
            } else {//Still space, move on
                wordArray.splice(0, 1); //remove current word
                currentTxt = tempTxt; //assign to carry on
            }
        }
//Draw leftover text
        if (linePos.length > 0 && currentTxt !== "") {
            ctx.fillText(currentTxt, TextData.TopLeft.x, linePos[0] + verticalOffset);
        }
    }

    function getText(currentTxt, sheet, student, inst) {
        switch (currentTxt.Type) {
            case "level":
                return Levels[sheet.Level].Name;
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
                    return getInstructorName(sheet.Instructor);
                } else {
                    return getInstructorName(inst);
                }
            case "student":
                return sheet.Names[student];
            case "barcode":
                return sheet.Barcode;
            case "custom":
                return currentTxt.Content;
            case "comment":
                if (sheet.Comments) {
                    return sheet.Comments[student];
                }
            case "facility_short":
                return getArchiveSheetTimeblockData(Facilities, "Facilities", sheet.Facility).Shortform;
            case "facility":
                return getArchiveSheetTimeblockData(Facilities, "Facilities", sheet.Facility).Name;
            case "time_modifier":
                let mod = getSheetModifier(sheet);
                if (mod !== null) {//If modifier exists
                    return mod.Name;
                } else {//No modifier
                    return "";
                }
            case "time_start_12":
                return convertTimeReadable(sheet.TimeStart, true);
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