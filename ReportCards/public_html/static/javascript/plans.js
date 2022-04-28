/* global firebase, linfo */

var UserData;
var dragObject = null;
var isDragMoving = false;//true = moving an exisiting element, false new insert
var insertBefore = 0;
var currentWeek = 0;
var currentSheet = 0;
var EditPending = false;
var selectedIndexes = [];
var filterCount = 0;
var SheetData = [];
var SharedData = [];
var isSharedMode = false;
var lvlinfo = {};
var games = {};
const dayMappings = {mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday"};

// /<list>\[(.*?)\]/g regex to match lists. Will return comma-seperated values, no padding
//  /<number>\[([0-9]+)\]/g regex to match numbers. Will return #, no padding

const topbar = document.getElementById("topbar");
const bottombar = document.getElementById("bottombar");

const skillBar = document.getElementById("right");
function generateSkills(Levels) {
    while (skillBar.firstChild) {
        skillBar.removeChild(skillBar.firstChild);
    }
    Levels.forEach(function (Level) {
        createElement(Level, false, null);
        for (var i = 1; i < lvlinfo[Level].length - 1; i++) {
            createElement(lvlinfo[Level][i].Name, true, handleMouseDown, Level, i);
        }
        createElement("Games", true, handleMouseDown, Level, lvlinfo[Level].length + 1);
    });

    function createElement(text, canclick, eventhandler, level, position) {
        var div = document.createElement("div");
        var txt = document.createElement("label");
        txt.textContent = text;
        div.appendChild(txt);
        skillBar.appendChild(div);
        if (canclick) {
            div.setAttribute("data-level", level);
            div.setAttribute("data-position", position);
            div.className = "hover";
        }
        if (canclick && eventhandler) {
            eventhandler(div);
        }
    }
    function handleMouseDown(element) {
        element.onmousedown = function () {
            var newel = element.cloneNode(true);
            document.body.appendChild(newel);
            setDrag(newel, false);
            BindSnapSystem();
        };
    }
}

function BindSnapSystem() {
    insertBefore = 0;
    for (var i = 0; i < mainDrawer.children.length; i++) {
        if (mainDrawer.children[i] !== snap) {
            handleMove(mainDrawer.children[i], i);
        }
    }
    ActivateBarHover();
    function handleMove(item, i) {
        var rect = item.getBoundingClientRect();
        item.onmousemove = function (event) {
            var isInfront = true;
            if (event.clientY >= rect.top + (rect.height / 2)) {
                isInfront = false;
            }
            if (isInfront === true) {
                insertBefore = i;
                mainDrawer.insertBefore(snap, item);
            } else {
                insertBefore = mainDrawer.children.length < i ? i - 1 : null;
                mainDrawer.insertBefore(snap, null);
            }
        };
    }
}

function UnBindSnapSystem() {
    DisactivateBarHover();
    for (var i = 0; i < mainDrawer.children.length; i++) {
        if (mainDrawer.children[i] !== snap) {
            mainDrawer.children[i].onmousemove = null;
        }
    }
}

function ActivateBarHover() {
    /*var timer = -1;
     topbar.onmouseenter = function () {
     console.log("Enter");
     timer = setInterval(function () {
     console.log("run");
     mainDrawer.scrollTop = mainDrawer.scrollTop + 5;
     }, 1000);
     };
     topbar.onmouseout = function () {
     //alert("Clear"); Instant clear, fix later
     // TODO: fix
     clearInterval(timer);
     };
     bottombar.onmouseenter = function () {
     timer = setInterval(function () {
     mainDrawer.scrollTop = mainDrawer.scrollTop + 5;
     }, 1000);
     };
     bottombar.onmouseout = function () {
     //clearInterval(timer);
     };*/
}

function DisactivateBarHover() {
    topbar.onmouseenter = null;
    bottombar.onmouseenter = null;
    topbar.onmouseout = null;
    bottombar.onmouseout = null;
}

var snap;
function setDrag(element, isMovingExisting) {
    isDragMoving = isMovingExisting;
    if (isMovingExisting === true) {
        //skillBar.className = "delete";
    }
    snap = document.getElementById("snap-point");
    dragObject = element;
    element.style.position = "absolute";
    document.onmousemove = function (event) {
        element.style.left = event.clientX + "px";
        element.style.top = event.clientY + "px";
    };
    document.onmouseup = unsetDrag;
    snap.style.display = "block";
}

function unsetDrag(event) {
    UnBindSnapSystem();
    if (isInElement(event.clientX, event.clientY) && isDragMoving === false) {
        addItem(dragObject.getAttribute("data-level"), dragObject.getAttribute("data-position"));
    } else if (isInElement(event.clientX, event.clientY)) {
        moveItem();
    }
    setEditPending(true);
    //skillBar.className = "";
    dragObject.remove();
    dragObject = null;
    document.onmousemove = null;
    document.onmouseup = null;
    snap.style.display = "none";
}

function isInElement(x, y) {
    var Area = snap.getBoundingClientRect();
    return (x >= Area.left && x <= Area.left + Area.width) && (y >= Area.top && y <= Area.top + Area.height);
}

function addItem(Level, Position) {
    SheetData[currentSheet].Data[currentWeek].splice((insertBefore !== null ? insertBefore - 1 : SheetData[currentSheet].Data[currentWeek].length), 0, {Level: Level, Position: Position, Comment: "", Progressions: []});
    RenderPlan(currentWeek);
}

function moveItem() {
    SheetData[currentSheet].Data[currentWeek].move(dragObject.getAttribute("data-i"), (insertBefore !== null ? insertBefore - 1 : SheetData[currentSheet].Data[currentWeek].length));
    RenderPlan(currentWeek);
}

const mainDrawer = document.getElementById("left");
const progressionMenu = document.getElementById("add-progression-menu");

const menu = document.getElementById("menu");
function resetMenu(toShow) {
    Array.from(document.getElementById("menu-holder").children).forEach((child) => {
        if (child !== document.getElementById("menu-btn-holder")) {
            child.style.display = "none";
        }
    });
    if (toShow === null) {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
        toShow.style.display = "block";
    }
}
const week_lbl = document.getElementById("week-label");
const next_week_btn = document.getElementById("next-week-btn");
const last_week_btn = document.getElementById("last-week-btn");
function RenderPlan(Week) {
    iSource = (isSharedMode ? SharedData : SheetData);
    //View Screen
    plan_overview.style.display = "none";
    document.getElementById("to-core-btn").disabled = false;
    document.getElementById("single-plan").style.display = "flex";
    ///Update UI topbar & internal counters
    currentWeek = Week;
    week_lbl.textContent = "Week " + (currentWeek + 1);
    next_week_btn.disabled = currentWeek === iSource[currentSheet].Data.length - 1;
    last_week_btn.disabled = currentWeek === 0;
    if (isSharedMode === false) {
        if (iSource[currentSheet].Levels.length > 0) {
            generateSkills(iSource[currentSheet].Levels);
        } else {
            generateSkills([]);
        }
    } else {
        while (skillBar.firstChild) {
            skillBar.removeChild(skillBar.firstChild);
        }
        var txt = document.createElement("label");
        txt.textContent = "Cannot edit shared plan";
        txt.style.fontWeight = "bold";
        txt.style.margin = "3px";
        skillBar.appendChild(txt);
    }
    //Clear existing data
    while (mainDrawer.firstChild) {
        mainDrawer.removeChild(mainDrawer.firstChild);
    }
    snap = document.createElement("div");
    snap.id = "snap-point";
    //add snap and populate list
    mainDrawer.appendChild(snap);
    for (var i = 0; i < iSource[currentSheet].Data[currentWeek].length; i++) {
        createListElement(iSource[currentSheet].Data[currentWeek][i].Level, iSource[currentSheet].Data[currentWeek][i].Position, iSource[currentSheet].Data[currentWeek][i].Comment, iSource[currentSheet].Data[currentWeek][i].Progressions, i);
    }
    function createListElement(Level, Item, Comment, Progressions, i) {
        var div = document.createElement("div");
        div.setAttribute("data-i", i);
        var lbltitle = document.createElement("label");
        lbltitle.textContent = Level;
        lbltitle.className = "bold";
        div.appendChild(lbltitle);
        var controls = document.createElement("div");
        controls.className = "itemcontrolbar";
        var moveico = document.createElement("span");
        moveico.title = "Reorder";
        moveico.className = "controlico moveico";
        handleMoveDown(moveico, div);
        controls.appendChild(moveico);
        var deleteico = document.createElement("span");
        handleDeleteDown(deleteico, i);
        deleteico.textContent = "X";
        deleteico.title = "Remove Skill";
        deleteico.className = "controlico deleteico";
        controls.appendChild(deleteico);
        if (isSharedMode === false) {
            div.appendChild(controls);
        }
        var skilltitle = document.createElement("p");
        if (parseInt(Item) !== lvlinfo[Level].length + 1) {
            skilltitle.textContent = lvlinfo[Level][Item].Name;
        } else {
            skilltitle.textContent = "Games";
        }
        div.appendChild(skilltitle);
        for (var p = 0; p < Progressions.length; p++) {
            var pdiv = document.createElement("div");
            pdiv.className = "progression";
            var editedString = Progressions[p];
            var numberresults = getNumberResults(editedString);
            for (var r = 0; r < numberresults.length; r++) {
                //i = SheetData[currentSheet].Data[currentWeek] pos, p = postition in progressions, r = position in lists
                editedString = editedString.replace(numberresults[r][0], '<input' + (isSharedMode === true ? " disabled " : "") + ' type=number value = ' + parseInt(numberresults[r][1]) + ' id=number:' + i + ":" + p + ":" + r + ' onchange=handleNumberChange("' + i + ":" + p + ":" + r + '")></input>');
            }
            var listresults = getListResults(editedString);
            for (var r = 0; r < listresults.length; r++) {
                //i = SheetData[currentSheet].Data[currentWeek] pos, p = postition in progressions, r = position in lists
                editedString = editedString.replace(listresults[r][0], '<select' + (isSharedMode === true ? " disabled " : "") + ' id=list:' + i + ":" + p + ":" + r + ' onchange=handleListChange("' + i + ":" + p + ":" + r + '")>' + createOptions(listresults[r][2]) + "</select>");
            }
            pdiv.innerHTML = editedString;
            var selects = pdiv.getElementsByTagName("select");
            for (var s = 0; s < selects.length; s++) {
                selects[s].selectedIndex = listresults[s][1];
            }
            var pcontrols = document.createElement("div");
            pcontrols.className = "pcontrols";
            var deletebtn = document.createElement("button");
            deletebtn.textContent = "X";
            pcontrols.appendChild(deletebtn);
            handleProgressionDelete(deletebtn, i, p);
            if (isSharedMode === false) {
                pdiv.appendChild(pcontrols);
            }
            div.appendChild(pdiv);
        }
        if (lvlinfo[Level][Item].Progressions) {
            if (lvlinfo[Level][Item].Progressions.length > 0 && isSharedMode === false) {
                var plusdiv = document.createElement("div");
                var addbtn = document.createElement("button");
                addbtn.textContent = "+";
                addbtn.className = "addbtn";
                plusdiv.appendChild(addbtn);
                bindAddButton(addbtn, Level, Item, i);
                div.appendChild(plusdiv);
            }
        } else {//Games

        }
        var commentsect = document.createElement("textarea");
        commentsect.textContent = Comment;
        if (isSharedMode === true) {
            commentsect.disabled = true;
        }
        handleCommentChange(commentsect, i);
        div.appendChild(commentsect);
        mainDrawer.appendChild(div);
    }

    function handleCommentChange(commentel, i) {
        commentel.oninput = function () {
            setEditPending(true);
            SheetData[currentSheet].Data[currentWeek][i].Comment = commentel.value;
        };
    }

    function createOptions(list) {
        return list.replace(/([\w\s]+[^,])/g, "<option>$1</option>");
    }

    function bindAddButton(button, Level, Item, i) {
        button.onclick = function () {
            resetMenu(progressionMenu);
            while (progressionMenu.firstChild) {
                progressionMenu.removeChild(progressionMenu.firstChild);
            }
            for (var x = 0; x < lvlinfo[Level][Item].Progressions.length; x++) {
                var enclosingDiv = document.createElement("div");
                var txt = lvlinfo[Level][Item].Progressions[x].replace(/<number\[([0-9]+)\]>/g, '<label>$1</label>').replace(/<list\(([0-9]+)\)+\[(.*?)\]>/g, "<label>Option List</label>");
                enclosingDiv.innerHTML = txt;
                progressionMenu.appendChild(enclosingDiv, Level, Item, i, x);
                bindOnClick(enclosingDiv, Level, Item, i, x);
            }
        };

        function bindOnClick(div, Level, Item, SheetI, ProgX) {
            div.onclick = function () {
                setEditPending(true);
                document.getElementById('menu').style.display = 'none';
                SheetData[currentSheet].Data[currentWeek][SheetI].Progressions.push(lvlinfo[Level][Item].Progressions[ProgX]);
                RenderPlan(currentWeek);
            };
        }
    }

    function handleProgressionDelete(element, i, p) {
        element.onclick = function () {
            if (confirm("Delete progression?")) {
                setEditPending(true);
                SheetData[currentSheet].Data[currentWeek][i].Progressions.splice(p, 1);
                RenderPlan(currentWeek);
            }
        };
    }

    function handleDeleteDown(element, i) {
        element.onclick = function () {
            if (confirm("Remove this skill?")) {
                setEditPending(true);
                SheetData[currentSheet].Data[currentWeek].splice(i, 1);
                RenderPlan(currentWeek);
            }
        };
    }

    function handleMoveDown(element, div) {
        element.onmousedown = function () {
            setDrag(div, true);
            BindSnapSystem();
        };
    }
}

function handleListChange(data) {
    var split = data.split(":");//sheetdata,progression, rpos
    var results = getListResults(SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])]);
    var index = document.getElementById("list:" + data).selectedIndex;
    SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])] = SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])].replace(results[parseInt(split[2])][0], results[parseInt(split[2])][0].replace(/\([0-9]+\)/, "(" + index + ")"));
    setEditPending(true);
}

function handleNumberChange(data) {
    var split = data.split(":");//sheetdata,progression, rpos
    var results = getNumberResults(SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])]);
    var index = document.getElementById("number:" + data).value;
    SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])] = SheetData[currentSheet].Data[currentWeek][parseInt(split[0])].Progressions[parseInt(split[1])].replace(results[parseInt(split[2])][0], results[parseInt(split[2])][0].replace(/\[[0-9]+\]/, "[" + index + "]"));
    setEditPending(true);
}

function getListResults(StringToMatch) {
    var match;
    var listreg = /<list\(([0-9]+)\)+\[(.*?)\]>/g;
    var results = [];
    do {
        match = listreg.exec(StringToMatch);
        if (match) {
            results.push(match);
        }
    } while (match);
    return results;
}

function getNumberResults(StringToMatch) {
    var match;
    var listreg = /<number\[([0-9]+)\]>/g;
    var results = [];
    do {
        match = listreg.exec(StringToMatch);
        if (match) {
            results.push(match);
        }
    } while (match);
    return results;
}

document.getElementById("to-core-btn").onclick = function () {
    document.getElementById("single-plan").style.display = "none";
    plan_overview.style.display = "flex";
    renderCorePlan((isSharedMode ? SharedData : SheetData)[currentSheet].Levels.length === 0 ? undefined : (isSharedMode ? SharedData : SheetData)[currentSheet].Levels[0]);
};

next_week_btn.onclick = function () {
    RenderPlan(currentWeek + 1);
};

last_week_btn.onclick = function () {
    RenderPlan(currentWeek - 1);
};

const core_plan = document.getElementById("inner-core-plan");
const lvl_switcher = document.getElementById("level-switcher");
const add_lvl_btn = document.getElementById("add-lvl-btn");
const plan_name_input = document.getElementById("plan-name-input");
const plan_day_input = document.getElementById("plan-day-input");
const plan_time_input = document.getElementById("plan-time-input");
const plan_note_input = document.getElementById("plan-note-input");
async function renderCorePlan(Level) {
    //Clear table
    iSource = (isSharedMode ? SharedData : SheetData);
    add_lvl_btn.disabled = isSharedMode === true;
    document.getElementById("share-btn").disabled = isSharedMode === true;
    week_lbl.textContent = "Core Plan";
    document.getElementById("to-core-btn").disabled = true;
    last_week_btn.disabled = true;
    next_week_btn.disabled = false;
    currentWeek = -1;
    while (core_plan.firstChild) {
        core_plan.removeChild(core_plan.firstChild);
    }//Clear Level Selector
    Array.from(lvl_switcher.children).forEach((child) => {
        if (child !== document.getElementById("add-lvl-btn")) {
            child.remove();
        }
    });//Fill Level Selector
    for (var l = 0; l < iSource[currentSheet].Levels.length; l++) {
        var val = iSource[currentSheet].Levels[l];
        var lvld = await getLevelSync(val);
        var lvlbtn = document.createElement("button");
        if (val === Level) {
            lvlbtn.className = "selected";
        }
        lvlbtn.textContent = val;
        btnSwitchLevel(lvlbtn, val);
        lvl_switcher.appendChild(lvlbtn);
    }
    lvl_switcher.appendChild(add_lvl_btn);
    //Update inputs and attach listeners
    plan_name_input.value = iSource[currentSheet].Name;
    plan_name_input.disabled = isSharedMode === true;
    plan_day_input.value = iSource[currentSheet].Day;
    plan_day_input.disabled = isSharedMode === true;
    plan_time_input.value = iSource[currentSheet].Time;
    plan_time_input.disabled = isSharedMode === true;
    plan_note_input.value = iSource[currentSheet].Note;
    plan_note_input.disabled = isSharedMode === true;
    //Start table
    //Create headers
    if (Level !== undefined) {
        var headRow = document.createElement("tr");
        core_plan.appendChild(headRow);
        //create blank box
        var blankBox = document.createElement("th");
        blankBox.textContent = "Name";
        headRow.appendChild(blankBox);
        for (var i = 0; i < lvlinfo[Level].length; i++) {
            var header = document.createElement("th");
            header.textContent = lvlinfo[Level][i].Name;
            headRow.appendChild(header);
        }
        //Create table
        for (var w = 0; w < iSource[currentSheet].Data.length; w++) {
            var row = document.createElement("tr");
            core_plan.appendChild(row);//append row
            var txt_holder = document.createElement("td");//"Week X" text holder
            txt_holder.textContent = "Week " + (w + 1);
            txt_holder.style.fontWeight = "bold";
            row.appendChild(txt_holder);
            //Create skill boxes
            for (var s = 0; s < lvlinfo[Level].length; s++) {
                var skillBox = document.createElement("td");
                var circleSpan = document.createElement("span");
                if (iSource[currentSheet].Data[w].filter((skillItem) => {
                    if (skillItem.Level !== Level) {
                        return false;
                    }
                    return parseInt(skillItem.Position) === s;
                }).length > 0) {
                    circleSpan.className = "selected";
                }
                if (isSharedMode === false) {
                    toggleCorePlanItem(circleSpan, Level, w, s);
                }
                skillBox.appendChild(circleSpan);
                row.appendChild(skillBox);
            }
        }
    }

    function toggleCorePlanItem(Span, Level, Week, Skill) {
        Span.onclick = function () {
            setEditPending(true);
            Span.className = Span.className === "" ? "selected" : "";//Toggle UI
            var existingSkills = SheetData[currentSheet].Data[Week].filter((skillItem, i) => {
                if (skillItem.Level !== Level) {
                    return false;
                }
                return parseInt(skillItem.Position) === Skill;
            });
            if (existingSkills.length === 0) {
                SheetData[currentSheet].Data[Week].push({Level: Level, Position: Skill + "", Comment: "", Progressions: []});
            } else {
                var MarkedItems = [];
                SheetData[currentSheet].Data[Week].forEach((skillItem, index) => {
                    if (skillItem.Level === Level && parseInt(skillItem.Position) === Skill) {
                        MarkedItems.push(index);
                    }
                });
                for (var i = 0; i < MarkedItems.length; i++) {
                    SheetData[currentSheet].Data[Week].splice(MarkedItems[i], 1);
                }
            }
        };
    }

    function btnSwitchLevel(Btn, Level) {
        Btn.onclick = function () {
            renderCorePlan(Level);
        };
    }

    async function getLevelSync(val) {
        return await getLvlInfo(val);
    }
}

const add_lvl_menu = document.getElementById("add-level-menu");
add_lvl_btn.onclick = async function () {
    resetMenu(add_lvl_menu);
    Array.from(add_lvl_menu.children).forEach((child) => {
        child.remove();
    });
    var lvls = await getLevelList();
    for (var i = 0; i < lvls.length; i++) {
        var lvlbtn = document.createElement("button");
        onBtnClick(lvlbtn, lvls[i].Name);
        lvlbtn.textContent = lvls[i].Name;
        if (SheetData[currentSheet].Levels.indexOf(lvls[i].Name) !== -1) {
            lvlbtn.disabled = true;
        }
        add_lvl_menu.appendChild(lvlbtn);
    }

    function onBtnClick(btn, Level) {
        btn.onclick = function () {
            SheetData[currentSheet].Levels.push(Level);
            renderCorePlan(SheetData[currentSheet].Levels[0]);
            btn.disabled = true;
            setEditPending(true);
        };
    }

    async function getLevelList() {
        return await getLevels();
    }
};

plan_name_input.onchange = function () {
    SheetData[currentSheet].Name = plan_name_input.value;
    setEditPending(true);
};

plan_day_input.onchange = function () {
    SheetData[currentSheet].Day = plan_day_input.value;
    setEditPending(true);
};

plan_time_input.onchange = function () {
    SheetData[currentSheet].Time = plan_time_input.value;
    setEditPending(true);
};

plan_note_input.onchange = function () {
    SheetData[currentSheet].Note = plan_note_input.value;
    setEditPending(true);
};

const main_overview = document.getElementById("main-overview");
const plan_overview = document.getElementById("plan-overview");
const select_all = document.getElementById("select-all");
const printbtn = document.getElementById("allprintbtn");
const deletebtn = document.getElementById("alldeletebtn");
const share_back_btn = document.getElementById("share-back-btn");
function renderMainOverview() {
    //Handle UI
    toggleSpinner(false);
    share_back_btn.parentNode.style.display = "none";
    isSharedMode = false;
    //Clear previous renders
    selectedIndexes = [];
    filterCount = 0;
    while (main_overview.firstChild) {
        main_overview.removeChild(main_overview.firstChild);
    }
    //Show all sheets
    SheetData.forEach((sheet, i) => {
        main_overview.appendChild(createMainOverviewCard(sheet, i));
    });
    //Create "add" button
    var box = document.createElement("div");
    main_overview.appendChild(box);
    var titleTxt = document.createElement("label");
    titleTxt.textContent = "New Plan";
    titleTxt.className = "mainName";
    box.appendChild(titleTxt);
    var inCount = document.createElement("input");
    inCount.placeholder = "# of Weeks";
    box.appendChild(inCount);
    var createbtn = document.createElement("button");
    box.appendChild(createbtn);
    createbtn.textContent = "Create";
    createbtn.onclick = function () {
        var weeks = parseInt(inCount.value);
        if (!isNaN(weeks) && weeks > 0 && weeks <= 16) {
            var Data = [];
            for (var w = 0; w < weeks; w++) {
                Data.push([]);
            }
            SheetData.push({Levels: [], Name: "", Note: "", UniqueID: null, Day: "mon", Time: "", Data: Data, Share: []});
            main_overview.style.display = "none";
            document.getElementById("main-overview-topbar").style.display = "none";
            plan_overview.style.display = "flex";
            document.getElementById("single-plan-topbar").style.display = "block";
            currentSheet = SheetData.length - 1;
            setEditPending(true);
            renderCorePlan();
        } else {
            if (isNaN(weeks)) {
                alert("Invalid input");
            } else {
                alert((weeks <= 0 ? "Too few" : "Too many") + " weeks");
            }
        }
    };
    //Show card to view shared
    var box = document.createElement("div");
    main_overview.appendChild(box);
    var titleTxt = document.createElement("label");
    titleTxt.textContent = "Shared";
    titleTxt.className = "mainName";
    box.appendChild(titleTxt);
    var shareBtn = document.createElement("button");
    box.appendChild(shareBtn);
    shareBtn.textContent = "View";
    shareBtn.onclick = function () {
        toggleSpinner(true);
        getShared().then((data) => {
            toggleSpinner(false);
            SharedData = JSON.parse(data);
            renderMainShareOverview();
        }).catch((err) => {
            handleError("Error getting shared sheets");
        });
    };
    updateMainSelect();

    async function getShared() {
        return await send_http_request("0/get/shared/plans", "");
    }
}

function renderMainShareOverview() {
    share_back_btn.parentNode.style.display = "inline-block";
    selectedIndexes = [];
    filterCount = 0;
    isSharedMode = true;
    while (main_overview.firstChild) {
        main_overview.removeChild(main_overview.firstChild);
    }

    SharedData.forEach((sheet, i) => {
        main_overview.appendChild(createMainOverviewCard(sheet, i));
    });
    if (SharedData.length === 0) {
        var lbl = document.createElement("label");
        lbl.textContent = "No results found";
        lbl.style.fontWeight = "bold";
        main_overview.appendChild(lbl);
    }
    updateMainSelect();
    toggleSpinner(false);
}

share_back_btn.onclick = function () {
    isSharedMode = false;
    renderMainOverview();
};

const name_filter = document.getElementById("name-filter");
const day_filter = document.getElementById("day-filter");
const level_filter = document.getElementById("level-filter");
document.getElementById("filter-btn").onclick = function () {
    if (name_filter.value === "" && day_filter.value === "*" && level_filter.value === "*") {
        if (isSharedMode === false) {
            renderMainOverview();
        } else {
            renderMainShareOverview();
        }
        return;//No filters, dont waste computing resources
    }
    selectedIndexes = [];
    var iIndex = [];
    var toShow = (isSharedMode ? SharedData : SheetData).filter((sheet, i) => {
        var passing = true;//Start assuming that sheet is wanted
        //if found not to be, keep value, move on, otherwise:(check if filter is activated by user, if not, keep looking:check for match,return value);
        passing = passing === false ? false : (name_filter.value === "" ? true : sheet.Name.includes(name_filter.value));
        passing = passing === false ? false : (day_filter.value === "*" ? true : sheet.Day === day_filter.value);
        passing = passing === false ? false : (level_filter.value === "*" ? true : sheet.Levels.indexOf(level_filter.value) !== -1);
        if (passing === true) {
            iIndex.push(i);
        }
        return passing;
    });
    while (main_overview.firstChild) {
        main_overview.removeChild(main_overview.firstChild);
    }
    toShow.forEach((sheet, i) => {
        main_overview.appendChild(createMainOverviewCard(sheet, iIndex[i]));
    });
    filterCount = toShow.length;
    updateMainSelect();
    if (toShow.length === 0) {
        //Show no results msg
        var lbl = document.createElement("label");
        lbl.textContent = "No results found";
        lbl.style.fontWeight = "bold";
        main_overview.appendChild(lbl);
    }
};

function createMainOverviewCard(sheet, i) {
    var box = document.createElement("div");
    box.setAttribute("data-i", i);
    //Add selection box
    var controlholder = document.createElement("div");
    controlholder.className = "select-mainHolder";
    box.appendChild(controlholder);
    var controlbox = document.createElement("span");
    controlbox.className = "select-container";
    controlbox.title = "Select/Unselect";
    var innercontrol = document.createElement("span");
    innercontrol.className = "select";
    innercontrol.setAttribute("data-i", i);
    onCardSelect(innercontrol);
    controlbox.appendChild(innercontrol);
    controlholder.appendChild(controlbox);
    //Create details
    var nameTxt = document.createElement("label");
    nameTxt.textContent = sheet.Name === "" ? "No Title" : sheet.Name;
    if (sheet.Name === "") {
        nameTxt.style.fontWeight = "initial";
    }
    nameTxt.className = "mainName";
    box.appendChild(nameTxt);
    var dayTxt = document.createElement("label");
    if (sheet.Time !== "" || sheet.Day !== "") {
        dayTxt.textContent = dayMappings[sheet.Day] + " " + sheet.Time;
    } else {
        dayTxt.textContent = "No set time";
    }
    box.appendChild(dayTxt);
    var weekTxt = document.createElement("label");
    box.appendChild(weekTxt);
    weekTxt.textContent = sheet.Data.length + " Weeks";
    weekTxt.style.fontWeight = "bold";
    var list = document.createElement("span");
    box.appendChild(list);
    sheet.Levels.forEach((lvl) => {
        var listItem = document.createElement("p");
        listItem.textContent = lvl;
        list.appendChild(listItem);
    });
    var noteTxt = document.createElement("label");
    box.appendChild(noteTxt);
    noteTxt.textContent = sheet.Note;
    var goBtn = document.createElement("button");
    box.appendChild(goBtn);
    goBtn.textContent = "View";
    onViewSheetClick(goBtn, i);
    return box;
}

function onCardSelect(control) {
    control.onclick = function () {
        if (control.className === "select") {
            control.className = "select activated";
            selectedIndexes.push(parseInt(control.getAttribute("data-i")));
        } else {
            control.className = "select";
            selectedIndexes.splice(selectedIndexes.indexOf(parseInt(control.getAttribute("data-i"))), 1);
        }
        updateMainSelect();
    };
}

function onViewSheetClick(btn, i) {
    btn.onclick = function () {
        main_overview.style.display = "none";
        document.getElementById("main-overview-topbar").style.display = "none";
        plan_overview.style.display = "flex";
        document.getElementById("single-plan-topbar").style.display = "block";
        currentSheet = i;
        renderCorePlan((isSharedMode ? SharedData : SheetData)[currentSheet].Levels.length === 0 ? undefined : (isSharedMode ? SharedData : SheetData)[currentSheet].Levels[0]);
    };
}

function updateMainSelect() {
    if ((filterCount === 0 && (isSharedMode ? SharedData : SheetData).length > 0 && selectedIndexes.length === (isSharedMode ? SharedData : SheetData).length) || (filterCount > 0 && selectedIndexes.length === filterCount)) {
        //Full select
        select_all.className = "activated";
        select_all.textContent = "";
        printbtn.disabled = false;
        deletebtn.disabled = false;
    } else if (selectedIndexes.length > 0) {
        //partial select
        select_all.className = "activated";
        select_all.textContent = "-";
        printbtn.disabled = false;
        deletebtn.disabled = false;
    } else {
        select_all.className = "";
        select_all.textContent = "";
        printbtn.disabled = true;
        deletebtn.disabled = true;
        //No select
    }
    if (isSharedMode === true) {
        deletebtn.disabled = true;
    }
}

deletebtn.onclick = function () {//selectedIndexes
    selectedIndexes.sort((a, b) => a - b);
    if (confirm("Delete all selected plans? This cannot be undone.")) {
        Ids = [];
        for (var i = 0; i < selectedIndexes.length; i++) {
            Ids.push(SheetData[selectedIndexes[i]].UniqueID);
        }
        Delete(Ids).then(() => {
            for (var i = selectedIndexes.length - 1; i >= 0; i--) {
                SheetData.splice(selectedIndexes[i], 1);
            }
            renderMainOverview();
        }).catch((err) => {
            handleError("Error Deleting. No Delete operation has occured");
            renderMainOverview();
        });
    }
    async function Delete(Ids) {
        return await send_http_request("0/delete/plans", JSON.stringify(Ids));
    }
};

select_all.onclick = function () {
    if ((filterCount === 0 && selectedIndexes.length === (isSharedMode ? SharedData : SheetData).length) || (filterCount > 0 && selectedIndexes.length === filterCount)) {
        //All are selected
        selectedIndexes = [];
        select_all.className = "";
        for (let span of main_overview.getElementsByTagName("span")) {
            if (span.getAttribute("data-i") !== null) {
                span.className = "select";
            }
        }
    } else {
        //Partial select or empty select
        select_all.textContent = "";
        select_all.className = "activated";
        selectedIndexes = [];
        for (let span of main_overview.getElementsByTagName("span")) {
            if (span.getAttribute("data-i") !== null) {
                span.className = "select activated";
                selectedIndexes.push(parseInt(span.getAttribute("data-i")));
            }
        }
    }
    updateMainSelect();
};

document.getElementById("topbar-back-btn").onclick = function () {
    main_overview.style.display = "block";
    document.getElementById("main-overview-topbar").style.display = "block";
    plan_overview.style.display = "none";
    document.getElementById("single-plan").style.display = "none";
    document.getElementById("single-plan-topbar").style.display = "none";
    if (isSharedMode === false) {
        renderMainOverview();
    } else {
        renderMainShareOverview();
    }
};

function savePlans(quiet) {
    if (quiet === false) {
        toggleSpinner(true);
    }
    save().then(function (data) {
        data = JSON.parse(data);
        for (var i = 0; i < SheetData.length; i++) {
            SheetData[i].UniqueID = data[i];
        }
        setEditPending(false);
        toggleSpinner(false);
    }).catch(function (e) {
        handleError("Error saving plans");
    });
    async function save() {
        return await send_http_request("0/save/plans", JSON.stringify(SheetData));
    }
}
document.getElementById("save-btn").onclick = function () {
    savePlans(false);
};

function getPlans() {
    get().then(function (data) {
        SheetData = JSON.parse(data);
        renderMainOverview();
    }).catch(function (e) {
        handleError("Error loading plans. Please try again later.");
    });

    async function get() {
        return await send_http_request("0/get/plans", "");
    }
}

const share_search = document.getElementById("share-search");
const share_list = document.getElementById("inner-share");
function activateShareSearch() {
    var UsersList;
    toggleSpinner(true);
    getUsers().then(function (data) {
        UsersList = JSON.parse(data);
        populateList();
        toggleSpinner(false);
    }).catch(function () {
        resetMenu(null);
        handleError("Error getting user list.");
        return null;
    });

    function populateList() {
        share_search.value = "";
        while (share_list.firstChild) {
            share_list.removeChild(share_list.firstChild);
        }
        for (var i = 0; i < UsersList.length; i++) {
            if (UsersList[i].Uid !== firebase.auth().currentUser.uid) {
                share_list.appendChild(createEntry(UsersList[i]));
            }
        }
    }

    function createEntry(Entry) {
        var entry = document.createElement("div");
        var label = document.createElement("label");
        label.textContent = Entry.Email;
        entry.appendChild(label);
        var btn = document.createElement("button");
        var Filtered = SheetData[currentSheet].Share.filter((s) => {
            return (s === Entry.Uid);
        });
        btn.textContent = Filtered.length === 0 ? "+" : "-";
        btnClick(btn, Entry, Filtered.length === 0);
        entry.appendChild(btn);
        return entry;
    }

    function btnClick(btn, Entry, isAdd) {
        btn.onclick = function () {
            if (isAdd === true) {//Share
                SheetData[currentSheet].Share.push(Entry.Uid);
                btn.textContent = "-";
                btnClick(btn, Entry, !isAdd);
            } else {//Unshare
                for (var i = 0; i < SheetData[currentSheet].Share.length; i++) {
                    if (SheetData[currentSheet].Share[i] === Entry.Uid) {
                        SheetData[currentSheet].Share.splice(i, 1);
                        break;
                    }
                }
                btn.textContent = "+";
                btnClick(btn, Entry, !isAdd);
            }
            savePlans(false);
        };
    }

    share_search.onchange = function () {
        var toShow = UsersList.filter(function (Item) {
            return (Item.Email.includes(share_search.value) && Item.Uid !== firebase.auth().currentUser.uid);
        });
        while (share_list.firstChild) {
            share_list.removeChild(share_list.firstChild);
        }
        for (var i = 0; i < toShow.length; i++) {
            share_list.appendChild(createEntry(toShow[i]));
        }
    };

    async function getUsers() {
        return await send_http_request("0/list/users", "");
    }
}

document.getElementById("share-btn").onclick = function () {
    resetMenu(document.getElementById("share-menu"));
    activateShareSearch();
};

document.getElementById("settings-btn").onclick = function () {
    window.location.href = "../account";
};

document.getElementById("logout-btn").onclick = function () {
    if (EditPending === false) {
        firebase.auth().signOut();
        location.reload(true);
    } else {
        let r = confirm("You have unsaved work. Log out?");
        if (r === true) {
            firebase.auth().signOut();
            location.reload(true);
        }
    }
};

function getUser() {
    //Show any animations
    get().then((e) => {
        UserData = JSON.parse(e);
        if (UserData !== null) {
            if (!screenquery.matches) {
                document.getElementById("logout-btn").innerHTML = "Log Out [" + UserData.PersonalName + "]";
            }
            getPlans();
            //Run any code
        } else {
            alert("Unexpected error fetching your data - please try again later");
        }
    }).catch(() => {
        alert("Unexpected error fetching your data - please try again later");
    });
    //Hide any animations
    async function get() {
        return await send_http_request("-1/get/user", "");
    }
}

async function showPrint(wk) {
    for (var i = 0; i < (isSharedMode ? SharedData : SheetData).length; i++) {
        if (selectedIndexes.indexOf(i) !== -1 && (isSharedMode ? SharedData : SheetData)[i].Data.length >= wk + 1) {
            for (var t = 0; t < (isSharedMode ? SharedData : SheetData)[i].Levels.length; t++) {
                await getLevelSyncPrint((isSharedMode ? SharedData : SheetData)[i].Levels[t]);
            }
        }
    }
    var printWindow = window.open("../static/inline-html/plan-print.html", "", 'left=0,top=0,width=1248,height=3280');
    printWindow.onload = function () {
        let doc = printWindow.document;
        //TODO:take into account selected/not selected
        for (var i = 0; i < (isSharedMode ? SharedData : SheetData).length; i++) {
            if (selectedIndexes.indexOf(i) !== -1 && (isSharedMode ? SharedData : SheetData)[i].Data.length >= wk + 1) {
                //Generate sheet
                var sheetInfo = (isSharedMode ? SharedData : SheetData)[i];
                var maind = doc.createElement("div");
                doc.body.appendChild(maind);
                var infodiv = doc.createElement("div");
                infodiv.className = "infodiv";
                maind.appendChild(infodiv);
                var lbl = doc.createElement("p");
                lbl.textContent = UserData.PersonalName.split(" ")[0] + " " + UserData.PersonalName.split(" ")[1].charAt(0) + " - " + dayMappings[sheetInfo.Day] + " @ " + sheetInfo.Time + " (Week " + (wk + 1) + ")";
                infodiv.appendChild(lbl);
                var lbl2 = doc.createElement("p");
                lbl2.className = "right";
                var lv = [];
                sheetInfo.Levels.forEach((v) => {
                    lv.push(v);
                });
                lbl2.textContent = lv.join(", ");
                infodiv.appendChild(lbl2);
                //{Level: Level, Position: Skill + "", Comment: "", Progressions: []}
                for (var x = 0; x < (isSharedMode ? SharedData : SheetData)[i].Data[wk].length; x++) {
                    var data = (isSharedMode ? SharedData : SheetData)[i].Data[wk][x];
                    var itemdiv = doc.createElement("div");
                    itemdiv.className = "itemdiv";
                    maind.appendChild(itemdiv);
                    var firstline = doc.createElement("div");
                    itemdiv.appendChild(firstline);
                    var lvltxt = doc.createElement("b");
                    lvltxt.textContent = data.Level;
                    firstline.appendChild(lvltxt);
                    var itmtxt = doc.createElement("p");
                    itmtxt.textContent = " " + lvlinfo[data.Level][data.Position].Name.replace(/^[0-9]+. /, "");
                    itmtxt.className = "padleft";
                    firstline.appendChild(itmtxt);
                    //Each progression
                    data.Progressions.forEach((prog, iter) => {
                        var progtxt = doc.createElement("p");
                        itemdiv.appendChild(progtxt);
                        var ptxt = prog.replace(/<number\[([0-9]+)\]>/g, "$1");
                        ptxt = ptxt.replace(/<list\(([0-9]+)\)+\[(.*?)\]>/g, function (str, pos, arr) {
                            return JSON.parse("[\"" + arr.replaceAll(/,/g, "\",\"") + "\"]")[parseInt(pos)];
                        });
                        progtxt.textContent = ptxt;
                        progtxt.className = "prog";
                    });
                    //Comments
                    var comment = doc.createElement("i");
                    comment.textContent = data.Comment;
                    itemdiv.appendChild(comment);
                }
            }
        }
    };
    async function getLevelSyncPrint(val) {
        return await getLvlInfo(val);
    }
}


var print_week = document.getElementById("print-week");
var print_details = document.getElementById("print-details");
document.getElementById("allprintbtn").onclick = function () {
    print_week.value = 1;
    print_details.checked = false;
    resetMenu(document.getElementById("print-menu"));
};

document.getElementById("print-btn").onclick = function () {
    showPrint(print_week.value - 1);
    resetMenu(null);
};

//--------------------------------------------------
//--------------------------------------------------
//--------------------------------------------------
//-----------SMALL MISC SUPPORT FUNCTIONS-----------
//---------------------------------------------------
//---------------------------------------------------
//---------------------------------------------------
const screenquery = window.matchMedia("(max-width: 700px)");

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        getUser();
    } else {
        location.reload(true);
    }
});
window.onload = function () {
    initSelectorScreen(level_filter);
    window.onbeforeunload = function () {
        return EditPending === true ? "" : null;
    };
};

function toggleSpinner(show) {
    document.getElementById("loader").style.display = show === true ? "block" : "none";
}

function handleError(msg) {
    alert(msg);
    toggleSpinner(false);
}

function setEditPending(val) {
    EditPending = val;
    document.getElementById("save-btn").className = val === true ? "unsaved" : "";
}

async function getLvlInfo(Level) {
    return new Promise((resolve, reject) => {
        if (lvlinfo[Level] === undefined) {
            firebase.database().ref("Plan-Data/" + Level).once('value').then((snap) => {
                lvlinfo[Level] = snap.val();
                resolve(snap.val());
            }).catch((err) => {
                reject(err);
            });
        } else {
            resolve(lvlinfo[Level]);
        }
    });
}