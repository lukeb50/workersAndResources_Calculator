/* global firebase, clientDb, Organization */

const storage = firebase.app().storage("gs://report-cards-6290-uploads");

const BAR_HEIGHT = 30;
const BAR_PADDING = 5;
const BAR_VERTICAL = BAR_HEIGHT + (BAR_PADDING * 2);
var LvlInfo = window.allLvlInfo;
window.allLvlInfo = null;
var i = window.Id;
window.I = null;

var currentElement = null;
var currentHashCode = -1;
var currentData = null;

const new_card_img_upload = document.getElementById("new-card-img-upload");
const new_card_img_select = document.getElementById("image-select-card");
const new_card_img_set = document.getElementById("image-select-card-set-btn");
const new_card_back_img_select = document.getElementById("image-select-card-back");
const new_card_back_img_set = document.getElementById("image-select-card-set-back-btn");
const front_img = document.getElementById("editor-image-front");
const back_img = document.getElementById("editor-image-back");
const half_toggle = document.getElementById("ishalf-check");
const markup = document.getElementById("markup-holder");
var visualEditorI = -1;

var frontRect = {top: 30, right: 0, bottom: 30, left: 0};
var backRect = {top: 30, right: 0, bottom: 30, left: 0};

const SkillChannel = new BroadcastChannel("Skill");
const MustSeeChannel = new BroadcastChannel("MustSee");

var currentSkill = null;
var currentMustSee = null;

const addcheckbtn = document.getElementById("insert-weak-check");
const addskillbtn = document.getElementById("insert-skill-highlight");
const addmustseebtn = document.getElementById("insert-mustsee-highlight");

const hashCodeFunctions = {
    Text: {"*": function (Data) {
            return Data.TopLeft.x + ":" + Data.TopLeft.y + ":" +
                    Data.BottomRight.x + ":" + Data.BottomRight.y + ":" +
                    Data.Type + ":" + Data.Side;
        }, "Multiline": function (Data) {
            return "";
        }}, "Skills": {
        "CheckLetter": function (Data) {
            return Data.Side + ":" + Data.TopLeft.x + ":" +
                    Data.TopLeft.y + ":" + Data.BottomRight.x
                    + ":" + Data.BottomRight.y + ":" + Data.Skill;
        }, "Highlighting": function (Data) {
            return Data.Side + ":" + Data.TopLeft.x + ":" +
                    Data.TopLeft.y + ":" + Data.BottomRight.x
                    + ":" + Data.BottomRight.y + ":" + Data.Skill;
        }
    }, "MustSees": {
        "Highlighting": function (Data) {
            return Data.Side + ":" + Data.TopLeft.x + ":" +
                    Data.TopLeft.y + ":" + Data.BottomRight.x
                    + ":" + Data.BottomRight.y + ":" + Data.Skill + ":" +
                    Data.MustSee;
        }
    }};

var drawFunctions = {Text: {
        "*": drawTextElement, "Multiline": drawMultilineLine
    }, Skills: {
        "CheckLetter": drawCheckLetter, "Highlighting": drawSkillHighlight

    }, MustSees: {
        "Highlighting": drawMustSeeHighlight
    }
};

function getData(HashCode, Type, SubType) {
    switch (Type) {
        case "Text":
        {
            return LvlInfo[visualEditorI][Type][HashCode] ? LvlInfo[visualEditorI][Type][HashCode] : LvlInfo[visualEditorI][Type];
        }
        case "Skills":
        {
            switch (SubType) {
                case "CheckLetter":
                {
                    return LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Indicator[HashCode] ?
                            LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Indicator[HashCode] : LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Indicator;
                }
                case "Highlighting":
                {
                    return LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Highlighting[HashCode] ?
                            LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Highlighting[HashCode] : LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))].Highlighting;
                }
            }
        }
        case "MustSees":
        {
            switch (SubType) {
                case "Highlighting":
                {
                    return LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))][parseInt(currentElement.getAttribute("data-mustsee"))].Highlighting[HashCode] ?
                            LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))][parseInt(currentElement.getAttribute("data-mustsee"))].Highlighting[HashCode] : LvlInfo[visualEditorI][Type][parseInt(currentElement.getAttribute("data-skill"))][parseInt(currentElement.getAttribute("data-mustsee"))].Highlighting;
                }
            }
        }
    }
}

SkillChannel.onmessage = function (e) {
    setSkill(parseInt(e.data));
};

MustSeeChannel.onmessage = function (e) {
    setMustSee(parseInt(e.data.Skill), parseInt(e.data.MustSee));
};

function setSkill(skill) {
    currentSkill = skill;
    addcheckbtn.disabled = false;
    addskillbtn.disabled = false;
    addmustseebtn.disabled = true;
}

function setMustSee(skill, mustsee) {
    currentSkill = skill;
    currentMustSee = mustsee;
    addcheckbtn.disabled = true;
    addskillbtn.disabled = true;
    addmustseebtn.disabled = false;
}

async function updateCardDrawScreen(i) {
    visualEditorI = i;
    if (i === -1) {
        return;
    }
    half_toggle.checked = getPrintSetting("isHalf", LvlInfo[i], false);
    new_card_img_select.value = getPrintSetting("Image", LvlInfo[i], "");
    front_img.src = await getURL(LvlInfo[i].PrintSettings.Image);
    front_img.onload = function () {
        var frontRectBox = front_img.getBoundingClientRect();
        frontRect = {top: front_img.offsetTop + 30, right: front_img.offsetLeft + frontRectBox.width, bottom: front_img.offsetTop + frontRectBox.height, left: front_img.offsetLeft};
    };
    document.getElementById("commentoption").disabled = !LvlInfo[i].Settings.CommentEnabled;
    new_card_back_img_select.value = getPrintSetting("BackImage", LvlInfo[i], "");
    var backUrl = await getURL(LvlInfo[i].PrintSettings.BackImage);
    back_img.src = backUrl;
    if (backUrl !== "") {
        back_img.onload = function () {
            var backRectBox = back_img.getBoundingClientRect();
            backRect = {top: back_img.offsetTop + 30, right: back_img.offsetLeft + backRectBox.width, bottom: back_img.offsetTop + backRectBox.height, left: back_img.offsetLeft};
            DrawExistingText();
            DrawSkills();
            DrawMustSees();
        };
    } else {
        var backRectBox = back_img.getBoundingClientRect();
        backRect = {top: back_img.offsetTop + 30, right: back_img.offsetLeft + backRectBox.width, bottom: back_img.offsetTop + backRectBox.height, left: back_img.offsetLeft};
        DrawExistingText();
        DrawSkills();
        DrawMustSees();
    }
    var isWeakLetterHighlighted = LvlInfo[i].Settings.HighlightWeakLetter ? LvlInfo[i].Settings.HighlightWeakLetter : false;
    if (isWeakLetterHighlighted === true) {
        markup.classList.add("highlightweak");
        groupingHolder.classList.add("highlightweak");
    }
}

window.onload = async function () {
    firebase.auth().onAuthStateChanged(async function (user) {
        if (user) {
            await initClientDatabase();
            updateNewCardSelector();
        }
    });
};

function DrawMustSees() {
    if (LvlInfo[i].MustSees) {
        for (var t = 0; t < Object.keys(LvlInfo[i].MustSees).length; t++) {
            var cSkill = Object.keys(LvlInfo[i].MustSees)[t];
            for (var x = 0; x < LvlInfo[i].MustSees[cSkill].length; x++) {
                if (LvlInfo[i].MustSees[cSkill][x].Highlighting) {
                    for (var h = 0; h < LvlInfo[i].MustSees[cSkill][x].Highlighting.length; h++) {
                        draw("MustSees", "Highlighting", LvlInfo[i].MustSees[cSkill][x].Highlighting[h]);
                    }
                }
            }
        }
    }
}

function DrawSkills() {
    if (LvlInfo[i].Skills) {
        for (var t = 0; t < LvlInfo[i].Skills.length; t++) {
            if (LvlInfo[i].Skills[t].Indicator) {
                for (var x = 0; x < LvlInfo[i].Skills[t].Indicator.length; x++) {
                    draw("Skills", "CheckLetter", LvlInfo[i].Skills[t].Indicator[x]);
                }
                showMarkGrouping();
            }
            if (LvlInfo[i].Skills[t].Highlighting) {
                for (var x = 0; x < LvlInfo[i].Skills[t].Highlighting.length; x++) {
                    draw("Skills", "Highlighting", LvlInfo[i].Skills[t].Highlighting[x]);
                }
            }
        }
    }
}

function DrawExistingText() {
    if (LvlInfo[i].Text) {
        for (let t = 0; t < LvlInfo[i].Text.length; t++) {
            var Data = LvlInfo[i].Text[t];
            draw("Text", "*", Data);
            if (Data.isMultiline && Data.Lines) {
                for (var n = 0; n < Data.Lines.length; n++) {
                    draw("Text", "Multiline", Data, Data.Lines[n]);
                }
            }
        }
    }
}

half_toggle.onchange = function () {
    if (visualEditorI === -1) {
        return;
    }
    LvlInfo[visualEditorI].PrintSettings.isHalf = half_toggle.checked;
};

new_card_img_set.onclick = async function () {
    if (visualEditorI === -1) {
        return;
    }
    front_img.src = await getURL(new_card_img_select.value);
    LvlInfo[visualEditorI].PrintSettings.Image = new_card_img_select.value;
};

new_card_back_img_set.onclick = async function () {
    if (visualEditorI === -1) {
        return;
    }
    back_img.src = await getURL(new_card_back_img_select.value);
    LvlInfo[visualEditorI].PrintSettings.BackImage = new_card_back_img_select.value;
};

async function updateNewCardSelector() {
    clearChildren(new_card_img_select);
    clearChildren(new_card_back_img_select);
    var listedImages = null;
    await storage.ref(Organization + "/").listAll().then((res) => {
        listedImages = res;
        return;
    });
    for (var x = 0; x < listedImages.items.length; x++) {
        var opt = document.createElement("option");
        var path = listedImages.items[x].fullPath.split("/")[1];
        opt.value = path;
        opt.textContent = path;
        new_card_img_select.appendChild(opt);
        var optback = document.createElement("option");
        optback.value = path;
        optback.textContent = path;
        new_card_back_img_select.appendChild(optback);
    }
    var noOpt = document.createElement("option");
    noOpt.textContent = "No Image";
    noOpt.value = "";
    new_card_img_select.appendChild(noOpt);
    noOpt = document.createElement("option");
    noOpt.textContent = "No Image";
    noOpt.value = "";
    new_card_back_img_select.appendChild(noOpt);
    new_card_img_select.value = "";
    new_card_back_img_select.value = "";
    updateCardDrawScreen(i);
}

new_card_img_upload.addEventListener('change', function () {
    var fileReader = new FileReader();
    fileReader.onload = function () {
        sendImage(fileReader.result.split(",")[1], new_card_img_upload.files[0].name, new_card_img_upload.files[0].type).then(function (r) {
            var selectOption = document.createElement("option");
            var imgName = new_card_img_upload.files[0].name;
            selectOption.textContent = imgName;
            selectOption.value = imgName;
            new_card_img_select.appendChild(selectOption);
            var backSelectOption = document.createElement("option");
            backSelectOption.value = imgName;
            backSelectOption.textContent = imgName;
            new_card_back_img_select.appendChild(backSelectOption);
        }).catch(function (err) {
            console.log(err);
        });
    };
    fileReader.readAsDataURL(new_card_img_upload.files[0]);

    async function sendImage(imgData, filename, type) {
        return send_http_request("2/add/image", imgData, [["name", filename], ["type", type]]);
    }
});

const new_txt_size = document.getElementById("font-size-input");
const new_txt_line = document.getElementById("multiline-input");
const new_txt_variable = document.getElementById("variablefont-input");
const new_txt_type = document.getElementById("text-type-select");
const new_text_insert = document.getElementById("create-text-btn");

const text_prompts = {level: "Current Level", nextlevel: "Next Level to Register In", session: "Current Session Name", instructor: "Truncated Instructor Name", student: "Student Name", barcode: "Course Code", comment: "Comment Text Content", custom: "Select to edit text", facility: "Facility Name", facility_short: "Facility Shortform"};
document.body.onclick = function (e) {
    if (document.getElementById("controlbar") && e.path.indexOf(document.getElementById("controlbar")) === -1 && e.path.indexOf(markup) === -1) {
        clearBar();
        if (isResizeActive() === false) {
            clearResize(e);
        }
    }

};

function clearResize() {
    var tags = document.getElementsByClassName("resize");
    while (tags.length > 0) {
        tags[0].remove();
    }
}

function isResizeActive() {
    return document.getElementsByClassName("active").length !== 0;
}

function bindItemClick(el) {
    //Load Data
    clearBar();
    var clickedElement = el.target;
    currentElement = clickedElement;
    if (!clickedElement.getAttribute("data-type")) {
        return;
    }
    var Type = clickedElement.getAttribute("data-type").split("/");
    currentHashCode = hashCodeToObject(Type[0], Type[1], clickedElement.getAttribute("data-path"));
    currentData = getData(currentHashCode, Type[0], Type[1]);
    var Details = currentData;
    createTypeControlBar(Type[0], Details, createControlMenu(Details));
}

function createTypeControlBar(Type, Details, ControlBar) {
    createControlButton(ControlBar, null, "X", bindDeleteButton);
    createControlButton(ControlBar, "move", "Move", bindMoveButton);
    createControlButton(ControlBar, null, "Resize", bindResizeButton);
    switch (Type) {
        case "Text":
            if (Details.Type === "custom") {
                createControlButton(ControlBar, "rename", "Change Text", bindCustomTextRename);
            }
            if (Details.isMultiline) {
                createControlButton(ControlBar, "newline", "Add Line", bindAddNewLine);
            }
            createControlInput(ControlBar, "number", currentData.Font, "Font Size", bindTextFontChange);
            if (Details.isVariable) {
                createControlInput(ControlBar, "number", currentData.MaxFont, "Max Font", bindTextVariableFontChange);
            }
            break;
    }
}

function createControlButton(bindTo, Image, Text, EventHandler) {
    var btn = document.createElement(Image === null ? "button" : "input");
    if (Image !== null) {
        btn.type = "image";
        btn.setAttribute("alt", Text);
        btn.setAttribute("title", Text);
        btn.src = "../images/" + Image + ".png";
    } else {
        btn.textContent = Text;
    }
    btn.addEventListener('click', EventHandler);
    bindTo.appendChild(btn);
    return btn;
}

function createControlInput(bindTo, Type, Starting, toolTip, EventHandler) {
    var input = document.createElement("input");
    input.type = Type;
    input.value = Starting;
    input.title = toolTip;
    input.addEventListener("change", EventHandler);
    bindTo.appendChild(input);
}

new_text_insert.onclick = function (event) {
    if (!LvlInfo[visualEditorI].Text) {
        LvlInfo[visualEditorI].Text = [];
    }
    var insertPosition = getInsertPosition(event);
    var addData = {TopLeft: {x: insertPosition.x, y: insertPosition.y}, BottomRight: {x: insertPosition.x + 100, y: insertPosition.y + 100}, Side: insertPosition.Side, Font: parseInt(new_txt_size.value), isMultiline: new_txt_line.checked, isVariable: new_txt_variable.checked, Type: new_txt_type.value};
    if (new_txt_type.value === "custom") {
        addData["Content"] = "";
    }
    if (new_txt_line.checked === true) {
        addData["Lines"] = [];
    }
    if (new_txt_variable.checked === true) {
        addData["MaxFont"] = addData.Font;
    }
    LvlInfo[visualEditorI].Text.push(addData);
    draw("Text", "*", addData);
};

function hashCode(Type, SubType, Data) {
    return hashCodeFunctions[Type][SubType](Data);
}

function hashCodeToObject(Type, SubType, Hash) {
    var loc = getData(null, Type, SubType);
    return loc.findIndex(function (c) {
        return hashCode(Type, SubType, c) === Hash;
    });
}

function clearBar() {
    if (document.getElementById("controlbar")) {
        document.getElementById("controlbar").remove();
    }
}

function updateHashCode() {
    var Type = currentElement.getAttribute("data-type").split("/");
    var newHash = hashCode(Type[0], Type[1], currentData);
    currentElement.setAttribute("data-path", newHash);
    currentData = getData(currentHashCode, Type[0], Type[1]);
}

function bindAddNewLine(e) {
    if (!currentData.Lines) {
        currentData.Lines = [];
    }
    var fontHeight = currentData.Font;
    var nextPosition = currentData.Lines.length === 0 ? currentData.TopLeft.y + fontHeight : currentData.Lines[currentData.Lines.length - 1] + fontHeight;
    currentData.Lines.push(nextPosition);
    draw("Text", "Multiline", currentData, nextPosition);
}

function bindMultilineClick(el) {
    //Load Data
    clearBar();
    var clickedElement = el.target;
    currentHashCode = hashCodeToObject("Text", "*", clickedElement.getAttribute("data-parent"));
    currentElement = document.getElementById(clickedElement.getAttribute("data-parent"));
    currentData = LvlInfo[visualEditorI]["Text"][currentHashCode];
    var Details = currentData;
    var currentLine = parseInt(clickedElement.getAttribute("data-line"));//BR x does not matter
    var bar = createControlMenu({TopLeft: {x: Details.TopLeft.x, y: currentLine}, BottomRight: {x: 0, y: currentLine + Details.Font}, Side: Details.Side});
    var btn = createControlButton(bar, null, "X", bindRemoveLine);
    btn.setAttribute("data-line", currentLine);
    btn = createControlButton(bar, null, "Move", bindMultilineMoveBtn);
    btn.setAttribute("data-line", currentLine);
}

function bindRemoveLine(e) {
    var line = parseInt(e.target.getAttribute("data-line"));
    document.getElementById(currentElement.getAttribute("data-path") + ":" + line).remove();
    currentData.Lines.splice(currentData.Lines.indexOf(line), 1);
    clearBar();
}

function bindMultilineMoveBtn(e) {
    var currentLine = parseInt(e.target.getAttribute("data-line"));
    var el = document.getElementById(hashCode("Text", "*", currentData) + ":" + currentLine);
    clearBar();
    document.body.addEventListener("mousemove", bindMultilineMove);
    document.body.addEventListener("click", bindMultilineRelease);
    e.stopPropagation();
    function bindMultilineMove(e) {
        el.style.top = e.pageY + "px";
    }

    function bindMultilineRelease(e) {
        document.body.removeEventListener("mousemove", bindMultilineMove);
        document.body.removeEventListener("click", bindMultilineRelease);
        var newLineAbsPos = el.style.top.split("px")[0];
        var newLinePos = Math.round(newLineAbsPos - (currentData.Side === 0 ? frontRect : backRect).top);
        el.id = hashCode("Text", "*", currentData) + ":" + newLinePos;
        var oldPos = parseInt(el.getAttribute("data-line"));
        currentData.Lines[currentData.Lines.indexOf(oldPos)] = newLinePos;
        el.setAttribute("data-line", newLinePos);
        clearBar();
    }
}

function bindTextFontChange(e) {
    currentData.Font = parseInt(e.target.value);
    currentElement.style.fontSize = parseInt(e.target.value) + "px";
    var oldHash = currentElement.getAttribute("data-path");
    if (currentData.Lines) {
        for (var h = 0; h < currentData.Lines.length; h++) {
            var line = currentData.Lines[h];
            var el = document.getElementById(oldHash + ":" + line);
            el.style.fontSize = parseInt(e.target.value) + "px";
            el.style.height = parseInt(e.target.value) + "px";
        }
    }
    if (currentData.isVariable && currentData.MaxFont < currentData.Font) {
        currentData.MaxFont = currentData.Font;
        //TODO:Attempt to update max font input
    }
    updateHashCode();
}

function bindTextVariableFontChange(e) {
    let newMax = parseInt(e.target.value);
    if (newMax > currentData.Font) {
        currentData.MaxFont = newMax;
    } else {
        e.target.value = currentData.Font;
        currentData.MaxFont = currentData.Font;
    }
}

function bindCustomTextRename() {
    var newTxt = prompt("Enter new text:").escapeJSON();
    currentData.Content = newTxt;
    currentElement.textContent = newTxt;
    updateHashCode();
}

const RESIZE_SNAP_DISTANCE = 5;
function bindResizeButton() {
    clearResize();
    var resizeRight = document.createElement("span");
    resizeRight.className = "resize east";
    resizeRight.id = "resize east";
    var offset = getSideOffset(currentData.Side, {x: currentData.BottomRight.x - 5, y: (currentData.TopLeft.y + (currentData.BottomRight.y - currentData.TopLeft.y) / 2) - 5});
    resizeRight.style.left = offset.x + "px";
    resizeRight.style.top = offset.y + "px";
    resizeRight.addEventListener("mousedown", onResizeDown);
    document.body.appendChild(resizeRight);
    var resizeBottom = document.createElement("span");
    resizeBottom.className = "resize south";
    resizeBottom.id = "resize south";
    var offset = getSideOffset(currentData.Side, {x: (currentData.TopLeft.x + ((currentData.BottomRight.x - currentData.TopLeft.x) / 2) - 5), y: (currentData.BottomRight.y - 5)});
    resizeBottom.style.left = offset.x + "px";
    resizeBottom.style.top = offset.y + "px";
    resizeBottom.addEventListener("mousedown", onResizeDown);
    document.body.appendChild(resizeBottom);
    clearMultilines();
    var Type = currentElement.getAttribute("data-type").split("/");
    if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
        clearChildren(groupingHolder);
    }
}

var resizeSnapPoints = [];
function getResizeSnaps(Side, Type, Direction) {
    resizeSnapPoints = [];
    //Direction===0?"width":"height"
    var allElements = markup.children;
    for (var e = 0; e < allElements.length; e++) {
        if (allElements[e] !== currentElement && allElements[e].getAttribute("data-type") === Type && getSide({x: parseInt(allElements[e].style.left), y: parseInt(allElements[e].style.top)}) === Side) {
            resizeSnapPoints.push(parseInt(allElements[e].style[Direction === 0 ? "width" : "height"]));
        }
    }
    resizeSnapPoints.sort((a, b) => a - b);
}

function clearMultilines() {
    if (currentData.isMultiline && currentData.Lines) {
        for (var h = 0; h < currentData.Lines.length; h++) {
            let el = document.getElementById(currentElement.getAttribute("data-path") + ":" + currentData.Lines[h]);
            if (el) {
                el.remove();
            }
        }
    }
    if (document.getElementById(hashCode("Skills", "CheckLetter", currentData) + "CheckLetter")) {
        document.getElementById(hashCode("Skills", "CheckLetter", currentData) + "CheckLetter").remove();
    }
}

function onResizeDown(e) {
    e.target.removeEventListener("mousedown", onResizeDown);
    getResizeSnaps(currentData.Side, currentElement.getAttribute("data-type"), e.target.className.includes("south") === false ? 0 : 1);
    document.body.addEventListener("mousemove", e.target.className.includes("south") === false ? onResizeMoveHorizontal : onResizeMoveVertical);
    document.body.addEventListener("mouseup", onResizeUp);
    e.target.classList.add("active");
}

function onResizeMoveHorizontal(e) {
    e.preventDefault();
    var newWidth = calcSnapping(e.pageX - parseInt(currentElement.style.left.split("px")[0]));
    if (newWidth >= 10) {
        document.getElementById("resize east").style.left = (parseInt(currentElement.style.left.split("px")[0]) + newWidth - 5) + "px";
        document.getElementsByClassName("resize south")[0].style.left = (parseInt(currentElement.style.left.split("px")[0]) + (newWidth / 2) - 5) + "px";
        currentData.BottomRight.x = currentData.TopLeft.x + newWidth;
        currentElement.style.width = newWidth + "px";
    }
    var Type = currentElement.getAttribute("data-type").split("/");
    if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
        var genSize = Math.min(currentData.BottomRight.x - currentData.TopLeft.x, currentData.BottomRight.y - currentData.TopLeft.y);
        currentElement.style.setProperty("--size", genSize + "px");
    }
}

function onResizeMoveVertical(e) {
    e.preventDefault();
    var newHeight = calcSnapping(e.pageY - parseInt(currentElement.style.top.split("px")[0]));
    if (newHeight >= 10) {
        document.getElementById("resize south").style.top = (parseInt(currentElement.style.top.split("px")[0]) + newHeight - 5) + "px";
        document.getElementsByClassName("resize east")[0].style.top = (parseInt(currentElement.style.top.split("px")[0]) + (newHeight / 2) - 5) + "px";
        currentData.BottomRight.y = currentData.TopLeft.y + newHeight;
        currentElement.style.height = newHeight + "px";
    }
    var Type = currentElement.getAttribute("data-type").split("/");
    if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
        var genSize = Math.min(currentData.BottomRight.x - currentData.TopLeft.x, currentData.BottomRight.y - currentData.TopLeft.y);
        currentElement.style.setProperty("--size", genSize + "px");
    }
}

function calcSnapping(tempPos) {
    var snapNewSize = tempPos;//handling snapping size
    for (var s = 0; s < resizeSnapPoints.length; s++) {
        if (resizeSnapPoints[s] >= tempPos - RESIZE_SNAP_DISTANCE && resizeSnapPoints[s] <= tempPos + RESIZE_SNAP_DISTANCE) {
            snapNewSize = resizeSnapPoints[s];
            currentElement.classList.add("resizesnap");
        }
    }
    if (tempPos === snapNewSize) {
        currentElement.classList.remove("resizesnap");
    }
    return tempPos === snapNewSize ? tempPos : snapNewSize;
}

function onResizeUp(e) {
    currentElement.classList.remove("resizesnap");
    updateHashCode();
    document.body.removeEventListener("mousemove", onResizeMoveHorizontal);
    document.body.removeEventListener("mousemove", onResizeMoveVertical);
    document.body.removeEventListener("mouseup", onResizeUp);
    if (isResizeActive() === false) {
        if (currentData.isMultiline && currentData.Lines) {
            for (var h = 0; h < currentData.Lines.length; h++) {
                draw("Text", "Multiline", currentData, currentData.Lines[h]);
            }
        }
        var Type = currentElement.getAttribute("data-type").split("/");
        if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
            drawCheckLetterLetter(currentData, currentElement);
            showMarkGrouping();
        }
        clearResize();//Must be done after active check
    } else {
        clearResize();//Must be done after active check
        bindResizeButton();
    }

}

function bindDeleteButton() {
    var Type = currentElement.getAttribute("data-type").split("/");
    getData(null, Type[0], Type[1]).splice(currentHashCode, 1);
    clearMultilines();
    clearResize();
    currentElement.remove();
    currentHashCode = null;
    currentData = null;
    currentElement = null;
    clearBar();
    if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
        showMarkGrouping();
    }
}

var nearElements = [];
var nearCounter = -1;
var xAlignRange = 0;
var yAlignRange = 0;
const nearResetCount = 15;
const snapDistance = 5;
function bindMoveButton() {
    nearElements = [];
    nearCounter = -1;
    xAlignRange = 0;
    yAlignRange = 0;
    document.body.addEventListener("mousemove", mouseMoved);
    clearBar();
    clearResize();
    clearMultilines();
    document.body.addEventListener("mousedown", bindMoveRelease);
    var dataType = currentElement.getAttribute("data-type").split("/");
    if (dataType[0] === "Skills" && dataType[1] === "CheckLetter") {
        clearChildren(groupingHolder);
    }
}

function bindMoveRelease(e) {
    e.stopPropagation();
    //Handle snap
    if (prevElX) {
        prevElX.classList.remove("snappingpoint");
    }
    //Main handler
    var bound = currentElement.getBoundingClientRect();
    var Type = currentElement.getAttribute("data-type").split("/");
    var loc = getData(currentHashCode, Type[0], Type[1]);
    var oldTop = loc.TopLeft.y;
    var newAbsCoords = {x: parseInt(currentElement.style.left), y: parseInt(currentElement.style.top)};
    loc.Side = getSide({x: newAbsCoords.x, y: newAbsCoords.y});
    loc.TopLeft.x = Math.round(newAbsCoords.x - getRect({x: newAbsCoords.x, y: newAbsCoords.y}).left);
    loc.TopLeft.y = Math.round(newAbsCoords.y - getRect({x: newAbsCoords.x, y: newAbsCoords.y}).top);
    var yOffset = loc.TopLeft.y - oldTop;
    loc.BottomRight.x = Math.round(loc.TopLeft.x + bound.width);
    loc.BottomRight.y = Math.round(loc.TopLeft.y + bound.height);
    document.body.removeEventListener("mousemove", mouseMoved);
    document.body.removeEventListener("mousedown", bindMoveRelease);
    if (currentData.isMultiline && currentData.Lines) {
        for (var h = 0; h < currentData.Lines.length; h++) {
            currentData.Lines[h] = currentData.Lines[h] + yOffset;
            draw("Text", "Multiline", currentData, currentData.Lines[h]);
        }
    }
    if (Type[0] === "Skills" && Type[1] === "CheckLetter") {
        drawCheckLetterLetter(currentData, currentElement);
        showMarkGrouping();
    }
    updateHashCode();
}

var prevElX = null;
function mouseMoved(event) {
    //snapping system
    nearCounter = nearCounter === nearResetCount ? 0 : nearCounter + 1;
    if (nearCounter === 0) {
        nearElements = [];
        var cRect = currentData.Side === 0 ? frontRect : backRect;
        xAlignRange = Math.round((cRect.right - cRect.left) * 0.05);
        yAlignRange = Math.round((cRect.bottom - cRect.top) * 0.05);
        var allElements = markup.children;
        for (var e = 0; e < allElements.length; e++) {
            var elTop = {x: parseInt(allElements[e].style.left), y: parseInt(allElements[e].style.top)};
            var xDiff = Math.abs(event.pageX - elTop.x);
            var yDiff = Math.abs(event.pageY - elTop.y);
            if (xDiff <= xAlignRange && yDiff <= yAlignRange && xDiff !== 0 && yDiff !== 0 && allElements[e] !== currentElement) {
                nearElements.push(allElements[e]);
            }
        }
    }
    //handle snapping
    var tempX = event.pageX;
    var tempY = event.pageY;
    var currentElX = null;
    for (var e = 0; e < nearElements.length; e++) {
        var cElement = nearElements[e];
        var elTop = {x: parseInt(cElement.style.left), y: parseInt(cElement.style.top)};
        if (Math.abs(elTop.x - event.pageX) <= snapDistance) {
            tempX = elTop.x;
            currentElX = cElement;
        }
    }
    if (prevElX !== null) {
        prevElX.classList.remove("snappingpoint");
    }
    if (currentElX !== null) {
        currentElX.classList.add("snappingpoint");
    }
    prevElX = currentElX;
    //Set position
    currentElement.style.left = tempX + "px";
    currentElement.style.top = tempY + "px";
}

addcheckbtn.onclick = function (event) {
    var insertPosition = getInsertPosition(event);
    var AddData = {TopLeft: {x: insertPosition.x, y: insertPosition.y}, BottomRight: {x: insertPosition.x + 50, y: insertPosition.y + 50}, Side: insertPosition.Side, Skill: currentSkill};
    if (!LvlInfo[visualEditorI].Skills[currentSkill]["Indicator"]) {
        LvlInfo[visualEditorI].Skills[currentSkill].Indicator = [];
    }
    LvlInfo[visualEditorI].Skills[currentSkill]["Indicator"].push(AddData);
    draw("Skills", "CheckLetter", AddData);
};

addskillbtn.onclick = function (event) {
    var insertPosition = getInsertPosition(event);
    var AddData = {TopLeft: {x: insertPosition.x, y: insertPosition.y}, BottomRight: {x: insertPosition.x + 50, y: insertPosition.y + 50}, Side: insertPosition.Side, Skill: currentSkill};
    if (!LvlInfo[visualEditorI].Skills[currentSkill]["Highlighting"]) {
        LvlInfo[visualEditorI].Skills[currentSkill].Highlighting = [];
    }
    LvlInfo[visualEditorI].Skills[currentSkill].Highlighting.push(AddData);
    draw("Skills", "Highlighting", AddData);
};

addmustseebtn.onclick = function (event) {
    var insertPosition = getInsertPosition(event);
    var AddData = {TopLeft: {x: insertPosition.x, y: insertPosition.y}, BottomRight: {x: insertPosition.x + 50, y: insertPosition.y + 50}, Side: insertPosition.Side, Skill: currentSkill, MustSee: currentMustSee};
    if (!LvlInfo[visualEditorI].MustSees[currentSkill][currentMustSee]["Highlighting"]) {
        LvlInfo[visualEditorI].MustSees[currentSkill][currentMustSee].Highlighting = [];
    }
    LvlInfo[visualEditorI].MustSees[currentSkill][currentMustSee].Highlighting.push(AddData);
    draw("MustSees", "Highlighting", AddData);
};

function createControlMenu(Data) {
    clearResize();
    var bar = document.createElement("div");
    var Rect = Data.Side === 0 ? frontRect : backRect;
    if (Data.TopLeft.y < BAR_VERTICAL + 30) {
        bar.className = "bottom";
        bar.style.top = 4 + Rect.top + Data.BottomRight.y + "px";
    } else {
        bar.style.top = Data.TopLeft.y + Rect.top - 4 - BAR_VERTICAL + "px";
        bar.className = "top";

    }
    bar.style.setProperty("--height", BAR_HEIGHT + "px");
    bar.style.setProperty("--padding", BAR_PADDING + "px");
    bar.id = "controlbar";
    bar.style.left = Data.TopLeft.x + getRect(Data.TopLeft).left + "px";
    document.body.appendChild(bar);
    return bar;
}

const groupingHolder = document.getElementById("grouping-holder");

function showMarkGrouping() {
    clearChildren(groupingHolder);
    if (!LvlInfo[visualEditorI].Skills)
        return;
    showMarkGrouping_Internal(0);
    showMarkGrouping_Internal(1);
}
function showMarkGrouping_Internal(Side) {
    var indicatorHolder = [];
    for (var s = 0; s < LvlInfo[visualEditorI].Skills.length; s++) {
        var skill = LvlInfo[visualEditorI].Skills[s];
        if (skill.Indicator) {
            for (var i = 0; i < skill.Indicator.length; i++) {
                if (skill.Indicator[i].Side === Side) {
                    var indicatorBox = Math.min(skill.Indicator[i].BottomRight.x - skill.Indicator[i].TopLeft.x, skill.Indicator[i].BottomRight.y - skill.Indicator[i].TopLeft.y);
                    indicatorHolder.push({Skill: s, boxSize: indicatorBox, TopLeft: skill.Indicator[i].TopLeft});
                }
            }
        }
    }
    indicatorHolder.sort(function (a, b) {
        return a.TopLeft.y - b.TopLeft.y;
    });

    //Takes all indicators and recursively splits them into distinct groupings or discards them if not groupable
    function processArray(fullArr, indicatorHolder) {
        var allowedDistance = LvlInfo[visualEditorI].Settings.WeakGrouping ? parseInt(LvlInfo[visualEditorI].Settings.WeakGrouping) : 0;
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
                i--;//decrement to account for splice
            } else if (currentIndicator.TopLeft.y > baseline.y + allowedDistance) {
                break;//Once checked element is out of Y range, sorted array means all
                //subsequent elements will never work.
            }
        }
        if (newArr.length > 1) {
            fullArr.push(newArr);
        }
        if (indicatorHolder.length > 0) {
            return processArray(fullArr, indicatorHolder);
        } else {
            return fullArr;
        }
    }
    //Run recursive and display lines
    var splitArray = indicatorHolder.length > 0 ? processArray([], indicatorHolder) : [];
    var allowedDistance = LvlInfo[visualEditorI].Settings.WeakGrouping ? parseInt(LvlInfo[visualEditorI].Settings.WeakGrouping) : 0;
    for (var s = 0; s < splitArray.length; s++) {
        //Bar
        var isOverlapped = checkGroupingOverlap(splitArray[s], allowedDistance);
        var groupDiv = document.createElement("div");
        groupDiv.className = isOverlapped ? "overlap" : "";
        groupDiv.title = isOverlapped ? "Grouping range is too big and will cause issues." : "";
        var offsetPositions = getSideOffset(Side, splitArray[s][0].TopLeft);
        groupDiv.style.top = (offsetPositions.y - 5) + "px";
        groupDiv.style.left = (offsetPositions.x - 5) + "px";
        var lastElement = splitArray[s][splitArray[s].length - 1];
        groupDiv.style.height = (lastElement.TopLeft.y + lastElement.boxSize + 5 - splitArray[s][0].TopLeft.y) + "px";
        groupingHolder.appendChild(groupDiv);
        //Letter
        var groupLetter = document.createElement("label");
        groupLetter.textContent = LvlInfo[visualEditorI].Settings.WeakLetter ? LvlInfo[visualEditorI].Settings.WeakLetter : "W";
        groupDiv.appendChild(groupLetter);
    }
}

//Overlapping occurs if within a group, an Weak, Complete, Weak grouping
//A Bar can group over the Complete and join the two weaks.
function checkGroupingOverlap(group, allowedDistance) {
    for (var n = 0; n < group.length - 2; n++) {
        for (var c = n + 2; c < group.length; c++) {
            var currentIndicator = group[n];
            var compareIndicator = group[c];
            return(compareIndicator.TopLeft.y < currentIndicator.TopLeft.y + allowedDistance);
        }
    }
}

function getSide(TopLeft) {
    return checkSide(frontRect) === true ? 0 : (checkSide(backRect) === true ? 1 : null);
    function checkSide(rect) {
        return TopLeft.x >= rect.left && TopLeft.x <= rect.right &&
                TopLeft.y >= rect.top && TopLeft.y <= rect.bottom;
    }
}

function getRect(TopLeft) {
    return getSide(TopLeft) === 0 ? frontRect : backRect;
}

function getSideOffset(Side, Position) {
    var rect = (Side === 0 ? frontRect : backRect);
    return {x: Position.x + rect.left, y: Position.y + rect.top};
}

function getInsertPosition(event) {
    var insertPosition = {};
    var Abs = {x: event.pageX, y: event.pageY};
    insertPosition.Side = getSide(Abs);
    insertPosition.x = Math.round(Abs.x - getRect(Abs).left);
    insertPosition.y = Math.round(Abs.y - getRect(Abs).top) + 40;
    return insertPosition;
}

function draw(Type, SubType, Data, Modifier1, Modifier2, Modifier3) {
    drawFunctions[Type][SubType](Data, Modifier1, Modifier2, Modifier3);
}

function drawMustSeeHighlight(Data) {
    var div = document.createElement("div");
    div.className = "highlighting";
    var offset = getSideOffset(Data.Side, Data.TopLeft);
    div.style.left = offset.x + "px";
    div.style.top = offset.y + "px";
    div.style.height = (Data.BottomRight.y - Data.TopLeft.y) + "px";
    div.style.width = (Data.BottomRight.x - Data.TopLeft.x) + "px";
    div.addEventListener('click', bindItemClick);
    div.setAttribute("data-skill", Data.Skill);
    div.setAttribute("data-mustsee", Data.MustSee);
    div.setAttribute("data-type", "MustSees/Highlighting");
    div.setAttribute("data-path", hashCode("MustSees", "Highlighting", Data));
    div.title = LvlInfo[visualEditorI].MustSees[Data.Skill][Data.MustSee].Name;
    markup.appendChild(div);
}

function drawSkillHighlight(Data) {
    var div = document.createElement("div");
    div.className = "highlighting";
    var offset = getSideOffset(Data.Side, Data.TopLeft);
    div.style.left = offset.x + "px";
    div.style.top = offset.y + "px";
    div.style.height = (Data.BottomRight.y - Data.TopLeft.y) + "px";
    div.style.width = (Data.BottomRight.x - Data.TopLeft.x) + "px";
    div.addEventListener('click', bindItemClick);
    div.setAttribute("data-skill", Data.Skill);
    div.setAttribute("data-type", "Skills/Highlighting");
    div.setAttribute("data-path", hashCode("Skills", "Highlighting", Data));
    div.title = LvlInfo[visualEditorI].Skills[Data.Skill].Name;
    markup.appendChild(div);
}

function drawCheckLetter(Data) {
    //Checkmark
    var genSize = Math.min(Data.BottomRight.x - Data.TopLeft.x, Data.BottomRight.y - Data.TopLeft.y);
    var div = document.createElement("div");
    if (LvlInfo[visualEditorI].Settings.PassLetter && LvlInfo[visualEditorI].Settings.PassLetter !== "") {
        div.className = "check letter";
        div.textContent = LvlInfo[visualEditorI].Settings.PassLetter;
    } else {
        div.className = "check";
    }
    var offset = getSideOffset(Data.Side, Data.TopLeft);
    div.style.left = offset.x + "px";
    div.style.top = offset.y + "px";
    div.style.width = (Data.BottomRight.x - Data.TopLeft.x) + "px";
    div.style.height = (Data.BottomRight.y - Data.TopLeft.y) + "px";
    div.style.setProperty("--size", genSize + "px");
    div.title = LvlInfo[visualEditorI].Skills[Data.Skill].Name;
    div.addEventListener('click', bindItemClick);
    div.setAttribute("data-type", "Skills/CheckLetter");
    div.setAttribute("data-path", hashCode("Skills", "CheckLetter", Data));
    div.setAttribute("data-skill", Data.Skill);
    div.id = hashCode("Skills", "CheckLetter", Data);
    markup.appendChild(div);
    //text
    drawCheckLetterLetter(Data, div);
}

function drawCheckLetterLetter(Data, div) {
    var txt = document.createElement("label");
    txt.id = hashCode("Skills", "CheckLetter", Data) + "CheckLetter";
    txt.style.setProperty("--offset", (LvlInfo[visualEditorI].Settings.WeakLetterOffset ? LvlInfo[visualEditorI].Settings.WeakLetterOffset : 0));
    txt.textContent = LvlInfo[visualEditorI].Settings.WeakLetter ? LvlInfo[visualEditorI].Settings.WeakLetter : "W";
    div.appendChild(txt);
}

function drawMultilineLine(StarData, Line) {
    var p = document.createElement("p");
    p.textContent = "Line Text";
    markup.appendChild(p);
    p.style.fontSize = StarData.Font + "px";
    p.style.left = getSideOffset(StarData.Side, StarData.TopLeft).x + "px";
    p.style.top = getSideOffset(StarData.Side, {x: 0, y: Line}).y + "px";
    p.style.width = StarData.BottomRight.x - StarData.TopLeft.x + "px";
    p.style.height = StarData.Font + "px";
    var starHash = hashCode("Text", "*", StarData);
    p.id = starHash + ":" + Line;
    p.setAttribute("data-parent", starHash);
    p.setAttribute("data-line", Line);
    p.className = "multiline";
    p.addEventListener('click', bindMultilineClick);
}

function drawTextElement(Data) {
    var rect = Data.Side === 0 ? frontRect : backRect;
    var txtholder = document.createElement("p");
    txtholder.setAttribute("data-type", "Text/*");
    txtholder.setAttribute("data-path", hashCode("Text", "*", Data));
    txtholder.id = hashCode("Text", "*", Data);
    txtholder.textContent = getPrompt(Data);
    txtholder.style.top = rect.top + Data.TopLeft.y + "px";
    txtholder.style.left = rect.left + Data.TopLeft.x + "px";
    txtholder.style.height = Data.BottomRight.y - Data.TopLeft.y + "px";
    txtholder.style.width = Data.BottomRight.x - Data.TopLeft.x + "px";
    txtholder.style.fontSize = Data.Font + "px";
    txtholder.addEventListener('click', bindItemClick);
    markup.appendChild(txtholder);

    function getPrompt(Data) {
        if (Data.Type === "custom") {
            return Data.Content ? Data.Content : text_prompts[Data.Type];
        } else {
            return text_prompts[Data.Type];
        }
    }
}

function getPrintSetting(Name, LvlInfoRef, Def) {
    if (!LvlInfoRef.PrintSettings) {
        LvlInfoRef.PrintSettings = {};
    }
    if (!LvlInfoRef.PrintSettings[Name]) {
        LvlInfoRef.PrintSettings[Name] = Def;
        return Def;
    } else {
        return LvlInfoRef.PrintSettings[Name];
    }
}