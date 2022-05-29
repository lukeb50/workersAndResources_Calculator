/* global firebase, add_row_btn, documents, currentTime, printbtn, maintable, blocker, blocker_change, blocker_lvl, blocker_mark, blocker_mustsee, screenquery, sheetinfo, overflowbtn, topbar_controls, overflowmenu, barlist, loadblocker, btnback, btnnext, savebtn, currentPerson, People, UserData, commentmenu, manual_sel, manual_div, metadatamenu, getMetadataFromID, clientDb, upload_button_div */
var staticPath = "../../static";
const marking_change_btns = [document.getElementById("blocker_btn1"), document.getElementById("blocker_btn2")];
var markingOptions = new Map();
markingOptions.set(true, "Complete");
markingOptions.set(false, "Weak");
markingOptions.set(null, "No Marking");

var EditPending = false;
var LevelGroupings;
let dsMode = false;
let programmerMode = "";
let allowCorrection = false;
let isAccess = false;
var Levels = {};
var Settings = {};
var Metadata = [];
async function InitRenderer(ds, allowCorrections) {
    if (ds) {
        dsMode = ds;
    }
    if (allowCorrections) {
        allowCorrection = allowCorrections;
    }
    DataPull();
    await getSettings();
    initSelectorScreen(document.getElementById("manual_selector"));
    return;
}

function setAccess() {
    isAccess = true;
}

function setProgrammer(timeblockString) {
    programmerMode = timeblockString ? timeblockString : "";
}

function changeEditPending(value) {
    if (dsMode === true && value === true && allowCorrection === true) {
        document.getElementById("emailbtn").className = "dsbtn unsaved";
        People[currentTime][currentPerson].Corrections = People[currentTime][currentPerson].Corrections + 1;
        if (document.getElementById("correction-input-" + currentPerson)) {
            document.getElementById("correction-input-" + currentPerson).value = People[currentTime][currentPerson].Corrections;
        }
    }
    if (EditPending === value) {
        return;
    }//remove redundant calls to change value
    if (value === true) {//New unsaved
        savebtn.className = "unsaved";
    } else {//Saved
        savebtn.className = "";
        if (dsMode === true) {
            document.getElementById("emailbtn").className = "dsbtn";
        }//Clear ds btn status
    }
    EditPending = value;
}
//RENDER TABLE

add_row_btn.onclick = addRow;

function addRow() {
    var id = currentSheet;
    if (documents[dsMode === false ? currentTime : currentPerson].length > 0 && id > -1) {
        documents[dsMode === false ? currentTime : currentPerson][id].Names.push("");
        documents[dsMode === false ? currentTime : currentPerson][id].NextLevel.push(getNextLevel(id));
        documents[dsMode === false ? currentTime : currentPerson][id].Marks.push(new Array(Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Skills.length));
        attendanceArray = [];
        for (var i = 0; i < 10; i++) {
            attendanceArray.push(true);
        }
        documents[dsMode === false ? currentTime : currentPerson][id].Attendance.push(attendanceArray);
        if (documents[dsMode === false ? currentTime : currentPerson][id].Comments) {
            documents[dsMode === false ? currentTime : currentPerson][id].Comments.push("");
        }
        for (var i = 0; i < documents[dsMode === false ? currentTime : currentPerson][id].Marks[documents[dsMode === false ? currentTime : currentPerson][id].Marks.length - 1].length; i++) {
            documents[dsMode === false ? currentTime : currentPerson][id].Marks[documents[dsMode === false ? currentTime : currentPerson][id].Marks.length - 1][i] = true;
        }
        var skillArray = Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Skills;
        var skillCount = skillArray ? skillArray.length : 0;
        documents[dsMode === false ? currentTime : currentPerson][id].MustSees.push(Array.from(Array(skillCount), () => new Array(0)));
        changeEditPending(true);
        renderTable(id);
    }
}

function renderTable(id) {
    currentSheet = id;
    if (id >= 0) {
        var isDisabled = (dsMode === false && Settings.approveLockout === true && documents[dsMode === false ? currentTime : currentPerson][id].VerifiedBy !== "") ? true : false;
        getLvlInfo(documents[dsMode === false ? currentTime : currentPerson][id].Level).then(async function () {
            if (documents[dsMode === false ? currentTime : currentPerson][id].VerifiedBy === "" && dsMode === false) {
                printbtn.style.display = "none";
            } else {
                printbtn.style.display = "inline-block";
            }
            add_row_btn.style.display = "block";
            add_row_btn.disabled = isDisabled;
            if (documents[dsMode === false ? currentTime : currentPerson][id].Names.length <= 25) {
                add_row_btn.style.display = "block";
            } else {
                add_row_btn.style.display = "none";
            }
            while (maintable.firstChild) {//delete existing table
                maintable.removeChild(maintable.firstChild);
            }
            var row = document.createElement("tr");
            row.id = "inforow";
            var Nameheader = document.createElement("th");
            Nameheader.textContent = "Name";
            Nameheader.className = "namehead";
            row.appendChild(Nameheader);
            for (var i = 0; i < Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Skills.length; i++) {//add in skills for Level
                var header = document.createElement("th");
                header.textContent = Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Skills[i].Name;
                row.appendChild(header);
            }
            var header = document.createElement("th");
            header.textContent = "Complete";
            row.appendChild(header);
            if (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Settings.CommentEnabled && documents[dsMode === false ? currentTime : currentPerson][id].Comments) {
                var header = document.createElement("th");
                header.textContent = "Comment";
                row.appendChild(header);
            }
            header = document.createElement("th");
            header.textContent = "Next Level";
            row.appendChild(header);
            maintable.appendChild(row);
            for (var i = 0; i < documents[dsMode === false ? currentTime : currentPerson][id].Names.length; i++) {//add names
                //create name
                var row = document.createElement("tr");
                var nameth = document.createElement("th");
                var nameinput = document.createElement("input");
                nameinput.value = documents[dsMode === false ? currentTime : currentPerson][id].Names[i];
                nameinput.disabled = isDisabled;
                nameinput.onchange = attachNameUpdate(nameinput, id, i);
                var removerow = document.createElement("button");
                removerow.textContent = "-";
                removerow.className = "roundaction";
                removerow.disabled = isDisabled;
                attachRemoveButton(removerow, id, i);
                var nameInfoHolder = document.createElement("span");
                //
                nameInfoHolder.appendChild(nameinput);

                nameth.appendChild(nameInfoHolder);
                nameth.appendChild(removerow);
                row.appendChild(nameth);
                if (Settings.useAttendance === true) {
                    nameinput.className = "attendance";//change display of input
                    var attendanceDiv = document.createElement("div");
                    attendanceDiv.className = "attendance";
                    nameInfoHolder.appendChild(attendanceDiv);
                    generateAttendanceBox(attendanceDiv, id, i, isDisabled);
                }
                //.Marks parallel array with marking
                var comp = true;
                for (var x = 0; x < documents[dsMode === false ? currentTime : currentPerson][id].Marks[i].length; x++) {//add marking and connect listeners
                    if (comp === true && documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][x] === false) {//overall status
                        comp = false;
                    }
                    if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][x] === null) {
                        comp = null;
                    }
                    var box = document.createElement("th");
                    var btn = document.createElement("button");
                    btn.id = "row" + i + "child" + x;
                    btn.disabled = isDisabled;
                    attachMarkOptions(btn, id, i, x);
                    if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][x] === false) {
                        //determine what kind of weak icon to show.
                        if (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[x] !== undefined) {//There are must sees
                            //Must sees exist
                            if (documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][x].length > 0 && isOverMarked(id, i, x) === false) {//must sees have been selected
                                btn.className = "weakbtn";
                                btn.title = "Selected Must Sees: " + documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][x].length;
                            } else if (documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][x].length > 0 && isOverMarked(id, i, x) === true) {
                                //Overmarked
                                btn.className = "weakalertbtn";
                                btn.title = "Selected Must Sees: " + documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][x].length;
                            } else {//no must sees selected, alert user
                                btn.className = "weakunmarkedbtn";
                                btn.title = "Selected Must Sees: 0";
                            }
                        } else {
                            //No must sees exist
                            btn.className = "weakbtn";
                        }
                    } else if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][x] === true) {//can be null for no marking
                        //Complete/Unmarked
                        btn.className = "completebtn";
                    } else {
                        btn.className = "unmarkedbtn";
                    }
                    box.appendChild(btn);
                    row.appendChild(box);
                }
                //add complete,comment and next level
                var comindicator = document.createElement("th");
                var combtn = document.createElement("button");
                combtn.textContent = comp === true ? "C" : comp === false ? "IC" : "";
                combtn.className = "comindicator";
                if (comp === false)
                    combtn.style.color = "var(--color-red)";
                combtn.disabled = true;
                comindicator.appendChild(combtn);
                row.appendChild(comindicator);
                if (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].Settings.CommentEnabled && documents[dsMode === false ? currentTime : currentPerson][id].Comments) {
                    comindicator = document.createElement("th");
                    combtn = document.createElement("button");
                    combtn.textContent = "Edit";
                    combtn.className = "comindicator";
                    combtn.title = documents[dsMode === false ? currentTime : currentPerson][id].Comments[i];
                    combtn.style.color = documents[dsMode === false ? currentTime : currentPerson][id].Comments[i] !== "" ? "#6d9ef2" : "#d44f31";
                    combtn.disabled = isDisabled;
                    AttachCommentClick(combtn, id, i);
                    comindicator.appendChild(combtn);
                    row.appendChild(comindicator);
                }
                comindicator = document.createElement("th");
                combtn = document.createElement("button");
                var nxtLvl = documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i];
                if (comp !== null) {
                    await getLvlInfo(nxtLvl);
                    combtn.textContent = Levels[nxtLvl].Shortform.toUpperCase();
                }
                var isOverride = documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i];
                combtn.className = (isOverride === getNextLevel(id)) || (isOverride === documents[dsMode === false ? currentTime : currentPerson][id].Level) ? "lvlbtn" : "lvlbtn override";
                combtn.disabled = isDisabled;
                AttachLvlClick(combtn, id, i, comp);
                comindicator.appendChild(combtn);
                row.appendChild(comindicator);
                maintable.appendChild(row);
            }
            if (documents[dsMode === false ? currentTime : currentPerson][id].Barcode) {
                changeSheetInfo(documents[dsMode === false ? currentTime : currentPerson][id].Level, documents[dsMode === false ? currentTime : currentPerson][id].Barcode);
            } else {
                changeSheetInfo(documents[dsMode === false ? currentTime : currentPerson][id].Level, 0);
            }
        });
    } else {//no table to render, delete existing
        add_row_btn.style.display = "none";
        printbtn.style.display = "none";
        changeSheetInfo("", 0);
        while (maintable.firstChild) {//delete existing table
            maintable.removeChild(maintable.firstChild);
        }
    }

    async function doLevelLoad(lvlID) {
        return await getLvlInfo(lvlID);
    }
}

function generateAttendanceBox(appendTo, id, i, isDisabled) {
    for (var day = 0; day < 10; day++) {
        var img = document.createElement("button");
        appendTo.appendChild(img);
        isPresent = documents[dsMode === false ? currentTime : currentPerson][id].Attendance[i][day];
        if (isPresent === false) {
            img.className = "missing";
        }
        if (isDisabled === true) {
            img.disabled = true;
        } else {
            bindButtonClick(img, id, i, day);
        }
    }

    function bindButtonClick(btn, id, i, day) {
        btn.onclick = function () {
            documents[dsMode === false ? currentTime : currentPerson][id].Attendance[i][day] = !documents[dsMode === false ? currentTime : currentPerson][id].Attendance[i][day];
            btn.className = btn.className === "missing" ? "" : "missing";
            changeEditPending(true);
        };
    }
}

function attachNameUpdate(object, i, n) {
    object.addEventListener('change', function () {
        documents[dsMode === false ? currentTime : currentPerson][i].Names[n] = object.value.escapeJSON();
        changeEditPending(true);
    });
}

function attachRemoveButton(object, id, i) {
    object.onclick = function () {
        var allowed = confirm("Do you want to remove " + (documents[dsMode === false ? currentTime : currentPerson][id].Names[i] === "" ? "this row" : documents[dsMode === false ? currentTime : currentPerson][id].Names[i]) + "?");
        if (allowed === true) {
            documents[dsMode === false ? currentTime : currentPerson][id].Names.splice(i, 1);
            documents[dsMode === false ? currentTime : currentPerson][id].Marks.splice(i, 1);
            documents[dsMode === false ? currentTime : currentPerson][id].MustSees.splice(i, 1);
            if (documents[dsMode === false ? currentTime : currentPerson][id].Comments) {
                documents[dsMode === false ? currentTime : currentPerson][id].Comments.splice(i, 1);
            }
            changeEditPending(true);
            renderTable(id);
        }
    };
}

function isOverMarked(id, i, p) {
    if (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees === undefined) {
        return false;
    }
    if (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p] === undefined) {
        return false;
    }
    ;
    var total = Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p].length;
    if (total <= 3) {
        return false;
    } else {
        var pcount = documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length;
        if (pcount / total > .5) {
            return true;
        }
    }
    return false;
}

function showMarkOptions(object, id, i, p) {
    var boundBox = object.getBoundingClientRect();
    blocker.style.display = "block";
    blocker_change.style.display = "inline-block";
    blocker_lvl.style.display = "none";
    blocker_mark.style.display = "block";
    if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] === true) {
        blocker_mark.src = staticPath + "/images/complete.png";
    } else if (isOverMarked(id, i, p) === true && documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] === false && (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p] !== undefined && documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length > 0)) {
        blocker_mark.src = staticPath + "/images/weak_alert.png";
    } else if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] === false && (Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p] === undefined || documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length > 0)) {
        blocker_mark.src = staticPath + "/images/weak.png";
    } else if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] === false) {
        blocker_mark.src = staticPath + "/images/weak_unmarked.png";
    } else {
        blocker_mark.src = staticPath + "/images/unmarked.png";
    }
    blocker_mark.setAttribute("data-id", id);
    blocker_mark.setAttribute("data-i", i);
    blocker_mark.setAttribute("data-p", p);
    //set mark position
    blocker_mark.style.top = (boundBox.top - window.scrollY) + "px";
    blocker_mark.style.left = (boundBox.left - window.scrollX) + "px";
    //calculate prefered side
    var topDistance = boundBox.top - (10 * 2);
    var bottomDistance = window.innerHeight - (10 * 2) - boundBox.bottom;
    //set mark change div positon
    var leftPos = boundBox.left + (boundBox.width / 2) - (blocker_change.offsetWidth / 2) - window.scrollX;
    blocker_change.style.left = Math.min(Math.max(leftPos, 10), window.innerWidth - 10 - blocker_change.getBoundingClientRect().width) + "px";
    var isChangeTop = topDistance < bottomDistance;// && topDistance >= blocker_change.offsetHeight;
    var isChangeTopOverriden = false;
    if (isChangeTop && boundBox.top - 10 - blocker_change.offsetHeight < 10) {
        isChangeTop = false;
        isChangeTopOverriden = true;
    }
    blocker_change.style.top = (isChangeTop ? boundBox.top - 10 - blocker_change.offsetHeight : boundBox.bottom + 10) + "px";
    //set must sees(if required)
    if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] === false && Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p] !== undefined) {//set must sees position
        //set list of must sees with checks
        blocker_mustsee.style.maxHeight = "";
        while (blocker_mustsee.firstChild) {
            blocker_mustsee.removeChild(blocker_mustsee.firstChild);
        }
        var nametag = document.createElement("a");
        nametag.className = "top";
        nametag.textContent = "Weak Must Sees:";
        blocker_mustsee.appendChild(nametag);
        var infotag = document.createElement("label");
        infotag.textContent = "Check if weak";
        infotag.className = "info";
        blocker_mustsee.appendChild(infotag);
        for (var t = 0; t < Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p].length; t++) {
            //div->checkbox,label
            var container = document.createElement("div");
            var check = document.createElement("input");
            check.type = "checkbox";
            check.id = "check" + t;
            for (var u = 0; u < documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length; u++) {
                if (documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p][u] === t) {
                    check.checked = true;
                    break;
                }
            }
            attachCheckUpdate(check, id, i, p, t);
            container.appendChild(check);
            var lbl = document.createElement("label");
            lbl.textContent = Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].MustSees[p][t].Name;
            lbl.setAttribute("for", "check" + t);
            container.appendChild(lbl);
            blocker_mustsee.appendChild(container);
        }
        nametag = document.createElement("a");
        nametag.className = "name";
        nametag.innerHTML = "Student: <b>" + documents[dsMode === false ? currentTime : currentPerson][id].Names[i] + "</b>";
        blocker_mustsee.appendChild(nametag);
        //Position must see div
        blocker_mustsee.style.display = "block";
        var isTop = calculateSpaceAboveBelowElement(object)[0] < calculateSpaceAboveBelowElement(blocker_change)[0];
        var topPos = Math.max(10, boundBox.top - 10 - blocker_mustsee.offsetHeight - window.scrollY);
        if (isTop && !isChangeTopOverriden) {//Top without override
            blocker_mustsee.style.top = topPos + "px";
            blocker_mustsee.style.maxHeight = (boundBox.top - 30) + "px";
        } else if (!isTop) {//bottom
            blocker_mustsee.style.top = (boundBox.bottom + 10) + "px";
            blocker_mustsee.style.maxHeight = (window.innerHeight - boundBox.bottom - 30) + "px";
        } else if (isTop && isChangeTopOverriden) {//top with override (below change selector)
            blocker_mustsee.style.top = (blocker_change.getBoundingClientRect().bottom + 10) + "px";
            blocker_mustsee.style.maxHeight = (window.innerHeight - blocker_change.getBoundingClientRect().bottom - 30) + "px";
        }
        var leftPos = boundBox.left + (boundBox.width / 2) - (blocker_mustsee.offsetWidth / 2);
        blocker_mustsee.style.left = Math.min(Math.max(leftPos, 10), window.innerWidth - 10 - blocker_mustsee.getBoundingClientRect().width) + "px";
    } else {
        blocker_mustsee.style.display = "none";
    }
    //set text on both buttons.
    setMarkingButtonTexts(id, i, p);
}

function setMarkingButtonTexts(id, i, p) {
    var index = 0;
    markingOptions.forEach((value, key) => {
        if (key !== documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p]) {
            marking_change_btns[index].textContent = value;
            marking_change_btns[index].setAttribute("data-value", key);
            index++;
        }
    });
}

function calculateSpaceAboveBelowElement(el) {
    var box = el.getBoundingClientRect();
    return [box.top, window.innerHeight - box.bottom];
}

function attachMarkOptions(object, id, i, p) {
    object.addEventListener("click", function () {
        showMarkOptions(object, id, i, p);
    });
}

//TODO: Reevaluate when level changes are done, consider
//how overrides interact with a change in pass/fail status
function recalcComplete(id, i) {
    var comp = true;
    for (var f = 0; f < documents[dsMode === false ? currentTime : currentPerson][id].Marks[i].length; f++) {
        if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][f] === false) {
            comp = false;
            break;
        }
    }
    var waspassing = Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].PASS.indexOf(documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i]) !== -1; //0 indicates they were failing at last calc, 1 they were passing
    if (comp === false && waspassing === true) {//change in state, they changed to failing
        documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i] = documents[dsMode === false ? currentTime : currentPerson][id].Level;
    } else if (comp === true && waspassing === false) {//change in state, they changed to passing
        documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i] = getNextLevel(id);
    }
    renderTable(id);
}

//Handle marking buttons (i.e Complete, Weak, No Marking btns)
marking_change_btns.forEach((btn, btnIndex) => {
    btn.onclick = function () {
        var id = blocker_mark.getAttribute("data-id");
        var i = blocker_mark.getAttribute("data-i");
        var p = blocker_mark.getAttribute("data-p");
        var mapIndex = 0;
        markingOptions.forEach((value, key) => {//iterate all options
            if (key !== documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p]) {//is an option that one button will have, check if it's this one next
                if (btnIndex === mapIndex) {//this button should set marking as the current key
                    documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][p] = key;
                    setMarkingButtonTexts(id, i, p);
                    changeEditPending(true);
                    recalcComplete(id, i); //calls renderTable
                    showMarkOptions(document.getElementById("row" + i + "child" + p), id, i, p);
                }
                mapIndex++;//regardless of if it matches this btn, increment for next run
            }
        });
    };
});

var comment_student = document.getElementById("comment-student-name");
var comment_state = document.getElementById("comment-student-state");
var comment_box = document.getElementById("comment-box");
var comment_save_btn = document.getElementById("comment-save-btn");
function AttachCommentClick(commbtn, id, i) {
    commbtn.onclick = function () {
        resetloader(false, commentmenu, "block");
        var currentLevel = documents[dsMode === false ? currentTime : currentPerson][id].Level;
        comment_box.setAttribute("maxlength", Levels[currentLevel].Text ? getCommentSize(Levels[currentLevel].Text) : 2500);
        comment_box.value = documents[dsMode === false ? currentTime : currentPerson][id].Comments[i];
        comment_student.textContent = documents[dsMode === false ? currentTime : currentPerson][id].Names[i];
        comment_state.textContent = "Edit Comment";
        //Delete & replace save button so that events for many clicks do not all fire on a single save
        var newSave = comment_save_btn.cloneNode(true);
        commentmenu.replaceChild(newSave, comment_save_btn);
        comment_save_btn = newSave;
        comment_save_btn.addEventListener("click", onSaveBtn);
    };
    function onSaveBtn() {
        resetloader(false, null, null);
        console.log(i, id);
        if (documents[dsMode === false ? currentTime : currentPerson][id].Comments[i] !== comment_box.value) {
            changeEditPending(true);
            renderTable(id);
        }
        documents[dsMode === false ? currentTime : currentPerson][id].Comments[i] = comment_box.value.escapeJSON();
    }
}

function AttachLvlClick(btn, id, i, comp) {
    if (comp === null)
        return;
    btn.onclick = function () {
        blocker.style.display = "block";
        blocker_change.style.display = "none";
        blocker_mark.style.display = "none";
        blocker_mustsee.style.display = "none";
        blocker_lvl.style.display = "inline-block";
        blocker_mark.setAttribute("data-id", id);
        blocker_lvl.style.left = ((btn.getBoundingClientRect().left) - blocker_lvl.offsetWidth - window.scrollX) + "px";
        blocker_lvl.style.top = ((btn.getBoundingClientRect().top) - window.scrollY) + "px";
        while (blocker_lvl.firstChild) {
            blocker_lvl.removeChild(blocker_lvl.firstChild);
        }
        var name = document.createElement("a");
        name.className = "name";
        name.textContent = documents[dsMode === false ? currentTime : currentPerson][id].Names[i];
        blocker_lvl.appendChild(name);
        var currentLvl = documents[dsMode === false ? currentTime : currentPerson][id].Level;
        var currentNextLvl = documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i];
        //Calculate if passing
        var isPassing = true;
        for (var f = 0; f < documents[dsMode === false ? currentTime : currentPerson][id].Marks[i].length; f++) {
            if (documents[dsMode === false ? currentTime : currentPerson][id].Marks[i][f] === false) {
                isPassing = false;
                break;
            }
        }
        if (Levels[currentLvl].CONSTANT !== undefined || Levels[currentLvl].PASS !== undefined) {
            var btns = 0;
            if (isPassing === true) {
                for (var p = 0; p < Levels[currentLvl].PASS.length; p++) {
                    if (Levels[currentLvl].PASS[p] !== currentNextLvl) {
                        createBtn(Levels[currentLvl].PASS[p]);
                        btns++;
                    }
                }
            } else {//failing
                if (Levels[currentLvl].FAIL === undefined) {
                    if (currentLvl !== currentNextLvl) {
                        createBtn(currentLvl);
                        btns++;
                    }
                }
            }//Always shown
            for (var p = 0; p < Levels[currentLvl].CONSTANT.length; p++) {
                if (Levels[currentLvl].CONSTANT[p] !== currentNextLvl) {
                    createBtn(Levels[currentLvl].CONSTANT[p]);
                    btns++;
                }
            }
            if (btns === 0) {
                blocker_lvl.appendChild(createNullText());
            }
        } else {
            blocker_lvl.appendChild(createNullText());
        }

        async function createBtn(Level) {
            var btnLvlData = await getLvlInfo(Level);
            let b = document.createElement("button");
            b.textContent = btnLvlData.Name;
            blocker_lvl.appendChild(b);
            b.onclick = function () {
                documents[dsMode === false ? currentTime : currentPerson][id].NextLevel[i] = Level;
                changeEditPending(true);
                renderTable(id);
            };
        }
        function createNullText() {
            var lbl = document.createElement("label");
            lbl.textContent = "No Options";
            return lbl;
        }

    };
}

function attachCheckUpdate(object, id, i, p, msindex) {
    object.addEventListener('change', function () {
        changeEditPending(true);
        if (object.checked === true) {
            documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].push(msindex);
        } else {
            for (var c = 0; c < documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length; c++) {
                if (documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p][c] === msindex) {
//Check for index, remove via loop
                    documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].splice(c, 1);
                }
            }
        }
        if (documents[dsMode === false ? currentTime : currentPerson][id].MustSees[i][p].length === 0) {
            blocker_mark.src = staticPath + "/images/weak_unmarked.png";
        } else if (isOverMarked(id, i, p) === true) {//Set overmarking
            blocker_mark.src = staticPath + "/images/weak_alert.png";
        } else {
            blocker_mark.src = staticPath + "/images/weak.png";
        }
    });
}

function changeSheetInfo(level, code, resize) {
    if (level !== "") {
        sheetinfo.textContent = Levels[level].Name + (screenquery.matches === true ? "" : " #" + code);
    } else {
        sheetinfo.textContent = "No Selection";
    }
}

//POPULATE BAR
var moveid = 0;
var scrolloc = 0;
const lowdivlength = 153; //150px + 3px border-right
async function populatebar(reset) {
    while (barlist.firstChild) {
        barlist.removeChild(barlist.firstChild); //49,0,69
    }
    var xpos = scrolloc * lowdivlength;
    btnnext.disabled = false;
    btnback.disabled = false;
    if (scrolloc + reset >= 0) {
        btnback.disabled = true;
    }
    if (scrolloc + reset < 0) {
        btnnext.disabled = true;
    } else {
        btnnext.disabled = false;
    }//UserData.Timeblocks.length > 0 && 
    if (documents[dsMode === false ? currentTime : currentPerson] !== undefined) {
        if (documents[dsMode === false ? currentTime : currentPerson].length === 0) {
            btnnext.disabled = true;
            btnback.disabled = true;
        }
    } else {
        btnnext.disabled = true;
        btnback.disabled = true;
        renderTable(-1);
        return;
    }
    clearInterval(moveid);
    let divs = [];
    for (var i = 0; i < documents[dsMode === false ? currentTime : currentPerson].length; i++) {
        var barLvlInfo = await getLvlInfo(documents[dsMode === false ? currentTime : currentPerson][i].Level);
        if (xpos + lowdivlength + (reset * lowdivlength) >= barlist.offsetWidth) {//TODO:stop rendering (not working)
            btnnext.disabled = false;
        }
        var newdiv = document.createElement("div");
        var bcodetxt = document.createElement("input");
        bcodetxt.disabled = (dsMode === false && Settings.approveLockout === true && documents[dsMode === false ? currentTime : currentPerson][i].VerifiedBy !== "") ? true : false;
        bcodetxt.setAttribute("type", "number");
        if (documents[dsMode === false ? currentTime : currentPerson][i].Barcode !== null) {
            bcodetxt.value = documents[dsMode === false ? currentTime : currentPerson][i].Barcode;
        } else {
            bcodetxt.value = "0";
        }
        attachUpdate(bcodetxt, i);
        var lvltxt = document.createElement("label"); //next lines adds # of people beside lvl on bar
        var lvlt = barLvlInfo.Name;
        lvltxt.textContent = lvlt;
        var delbtn;
        if (isAccess === false || !documents[dsMode === false ? currentTime : currentPerson][i].UniqueID) {
            delbtn = document.createElement("button");
            delbtn.textContent = "Delete Sheet";
            delbtn.setAttribute("data-sheet", i);
            delbtn.className = "red bardeletebtn";
            bindDelSheetbtn(delbtn);
        }
        var metabtn;
        if (Metadata.length > 0) {
            metabtn = document.createElement("button");
            metabtn.textContent = "Edit Data";
            metabtn.setAttribute("data-sheet", i);
            bindMetadataBtn(metabtn, i);
        }
        var apptext = document.createElement(dsMode && documents[dsMode === false ? currentTime : currentPerson][i].VerifiedBy === "" ? "button" : "p");
        apptext.className = "approvebtn";
        if (dsMode) {
            bindApproveBtn(apptext, i);
        }
        apptext.textContent = documents[dsMode === false ? currentTime : currentPerson][i].VerifiedBy !== "" ? "Approved" : "Not Approved";
        newdiv.appendChild(lvltxt);
        newdiv.appendChild(bcodetxt);
        if (delbtn)
            newdiv.appendChild(delbtn);
        if (metabtn) {
            newdiv.appendChild(metabtn);
        }
        newdiv.appendChild(apptext);
        newdiv.style.left = xpos + "px";
        newdiv.style.top = 0;

        for (var r = 0; r < LevelGroupings.length; r++) {
            if (LevelGroupings[r].Regex.test(barLvlInfo.Name) === true) {
                newdiv.style.background = "rgba(" + HexToDecimal(LevelGroupings[r].Color, 1) + "," + HexToDecimal(LevelGroupings[r].Color, 2) + "," + HexToDecimal(LevelGroupings[r].Color, 3) + ",0.33)";
                break;
            }
        }
        ;
        barlist.appendChild(newdiv);
        controlSheetChange(newdiv, i);
        divs.push(newdiv);
        //}
        xpos = xpos + lowdivlength;
    }
    if (reset !== 0) {
        //move
        let it = 0;
        moveid = setInterval(function () {
            xpos = ((scrolloc - reset) * lowdivlength);
            for (var i = 0; i < divs.length; i++) {
                divs[i].style.left = (xpos + (i * lowdivlength) + it) + "px";
            }
            it += reset;
            if (Math.abs(it) === lowdivlength + 1) {
                clearInterval(moveid);
            }
        }, 1);
        scrolloc += reset;
    }
}

function controlSheetChange(div, id) {
    div.addEventListener('click', function (event) {
        if (documents[dsMode === false ? currentTime : currentPerson].length && event.target.tagName !== "INPUT") {
            renderTable(id);
        }
    });
    div.getElementsByTagName("input")[0].addEventListener('blur', function () {
        changeSheetInfo(documents[dsMode === false ? currentTime : currentPerson][id].Level, div.getElementsByTagName("input")[0].value);
        renderTable(id);
    });
}

const metadataHolder = document.getElementById("metadata-menu-holder");
function bindMetadataBtn(btn, i) {
    btn.onclick = function () {
        metadatamenu.setAttribute("data-id", i);
        resetloader(false, metadatamenu, "block");
        clearChildren(metadataHolder);
        //Ensure metadata is an array
        if (!documents[dsMode === false ? currentTime : currentPerson][i].Metadata) {
            documents[dsMode === false ? currentTime : currentPerson][i].Metadata = [];
        }//wipe outdated metadata
        for (var m = 0; m < documents[dsMode === false ? currentTime : currentPerson][i].Metadata.length; m++) {
            var currentM = documents[dsMode === false ? currentTime : currentPerson][i].Metadata[m];
            if (Metadata.filter(m => m.UniqueID === currentM.MetaID).length === 0) {
                documents[dsMode === false ? currentTime : currentPerson][i].Metadata.splice(m, 1);
                m--;
            }
        }//Add in any missing metadata
        for (var m = 0; m < Metadata.length; m++) {
            if (documents[dsMode === false ? currentTime : currentPerson][i].Metadata.filter(cm => cm.MetaID === (Metadata[m].UniqueID)).length === 0) {
                documents[dsMode === false ? currentTime : currentPerson][i].Metadata.push({MetaID: Metadata[m].UniqueID, Value: ""});
            }
        }
        for (var x = 0; x < documents[dsMode === false ? currentTime : currentPerson][i].Metadata.length; x++) {
            var divHolder = document.createElement("div");
            var lbl = document.createElement("label");
            lbl.textContent = getMetadataFromID(Metadata, documents[dsMode === false ? currentTime : currentPerson][i].Metadata[x].MetaID).Name;
            divHolder.appendChild(lbl);
            var inputBox = document.createElement("input");
            inputBox.placeholder = "Enter a value";
            bindChange(inputBox, i, x);
            inputBox.value = documents[dsMode === false ? currentTime : currentPerson][i].Metadata[x].Value;
            inputBox.disabled = (dsMode === false && Settings.approveLockout === true && documents[dsMode === false ? currentTime : currentPerson][i].VerifiedBy !== "") ? true : false;
            divHolder.appendChild(inputBox);
            metadataHolder.appendChild(divHolder);
        }
    };
    function bindChange(input, sheetId, metaI) {
        input.onchange = function () {
            changeEditPending(true);
            documents[dsMode === false ? currentTime : currentPerson][sheetId].Metadata[metaI].Value = input.value;
        };
    }
}

async function bindApproveBtn(appbtn, i) {
    appbtn.onclick = function () {
        appbtn.textContent = "Approving...";
        appbtn.disabled = true;
        setApprove().then(function () {
            appbtn.disabled = true;
            appbtn.textContent = "Approved";
            documents[dsMode === false ? currentTime : currentPerson][i].VerifiedBy = firebase.auth().currentUser.uid + ":::" + UserData.PersonalName;
        }).catch((f) => {
            console.log(f);
            appbtn.textContent = "Approve";
            appbtn.disabled = false;
            alert("Error setting approval");
        });
    };
    async function setApprove() {
        return send_http_request("1/set/approve", documents[dsMode === false ? currentTime : currentPerson][i].UniqueID, [["uid", People[currentTime][currentPerson].Uid]]);
    }
}

function bindDelSheetbtn(btn) {
    btn.onclick = function () {
        if (confirm("Do you want to delete this " + (Levels[documents[dsMode === false ? currentTime : currentPerson][btn.getAttribute("data-sheet")].Level].Name) + " worksheet?")) {
            if (documents[dsMode === false ? currentTime : currentPerson][btn.getAttribute("data-sheet")].UniqueID !== "") {
                async function sendUpdate() {
                    let senddata = dsMode === false ? [["sheet", documents[currentTime][btn.getAttribute("data-sheet")].UniqueID]] : [["sheet", documents[currentPerson][btn.getAttribute("data-sheet")].UniqueID], ["uid", People[currentTime][currentPerson].Uid]];
                    return send_http_request((dsMode === false ? "0" : "1") + "/delete/sheet", "", senddata);
                }
                sendUpdate().then(function () {
                    documents[dsMode === false ? currentTime : currentPerson].splice([btn.getAttribute("data-sheet")], 1);
                    renderTable(-1);
                    populatebar(0);
                }).catch((f) => {
                    console.log(f);
                    alert("An error occured. Please check your connection and try again");
                    loadblocker.style.display = "none";
                });
            } else {
                documents[dsMode === false ? currentTime : currentPerson].splice([btn.getAttribute("data-sheet")], 1);
                renderTable(-1);
                populatebar(0);
            }
        }
        ;
    };
}

function getNextLevel(id) {
    return Levels[documents[dsMode === false ? currentTime : currentPerson][id].Level].PASS[0];
}

function attachUpdate(object, i) {
    object.addEventListener('change', function () {
        documents[dsMode === false ? currentTime : currentPerson][i].Barcode = object.value;
        changeEditPending(true);
        if (!screenquery.matches) {
            changeSheetInfo(documents[dsMode === false ? currentTime : currentPerson][i].Level, object.value);
            handleresize();
        }
        renderTable(i);
    });
}

async function getSettings() {
    return new Promise((resolve, reject) => {
        clientDb.ref("Settings").once('value').then((snap) => {
            Settings = snap.val().Data;
            Metadata = snap.val()["Sheet-Metadata"] ? snap.val()["Sheet-Metadata"] : [];
            var settingEvent = new Event("SettingUpdate");
            window.dispatchEvent(settingEvent);
            resolve(snap.val());
        }).catch(() => {
            resolve({});
        });
    });
}

async function getLevelGroupings() {
    return new Promise((resolve, reject) => {
        clientDb.ref("Level-Grouping").once('value').then((snap) => {
            if (snap !== null) {
                resolve(snap.val());
            } else {
                resolve([]);
            }
        }).catch((e) => {
            resolve([]);
        });
    });
}

async function DataPull() {
    //Handle Groupings
    LevelGroupings = await getLevelGroupings();
    LevelGroupings = LevelGroupings ? LevelGroupings : [];
    LevelGroupings.forEach((Group) => {
        Group.Regex = new RegExp(Group.Regex);
    });
}

async function getLvlInfo(Level) {
    return new Promise((resolve, reject) => {
        if (Levels[Level] === undefined) {
            clientDb.ref("Levels/" + Level).once('value').then((lvlSnap) => {
                Levels[Level] = processLoadedLevel(lvlSnap.val());
                resolve(Levels[Level]);
            }).catch((err) => {
                reject(err);
            });
        } else {
            resolve(Levels[Level]);
        }
    });
}

document.getElementById("manual_create_btn").onclick = function () {
    var lvl = manual_sel.value;
    if (lvl !== "") {
        var toAdd = {"Names": [], "Barcode": "0", "Level": parseInt(lvl), "Marks": [], "MustSees": [], "VerifiedBy": "", "UniqueID": "", "NextLevel": [], "Attendance": [], "Timeblock": programmerMode.split("---")[1], "Facility": programmerMode.split("---")[0], "TimeStart": 0};
        getLvlInfo(lvl).then(function () {
            if (Levels[lvl].Settings.CommentEnabled) {
                toAdd["Comments"] = [];
            }
        });
        documents[dsMode === false ? currentTime : currentPerson].push(toAdd);
        populatebar(0);
        changeEditPending(true);
        renderTable(documents[dsMode === false ? currentTime : currentPerson].length - 1);
        upload_button_div.style.display = "flex";
        manual_div.style.display = "none";
    }
};
function getCommentSize(TextBoxes) {
    var currentCount = 0;
    for (var i = 0; i < TextBoxes.length; i++) {
        if (TextBoxes[i].Type === "comment") {
            //10 subtracted at end to account for Java
            currentCount = Math.max(currentCount, getCharacterWidth(TextBoxes[i].Font, TextBoxes[i].BottomRight.x - TextBoxes[i].TopLeft.x, TextBoxes[i].isMultiline ? TextBoxes[i].Lines.length + 1 : 1) - 10);
        }
    }
    return currentCount;
}

//function is used to determine aprox how many characters can
//fit onto a comment line
function getCharacterWidth(fontSize, lineWidth, Lines) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = fontSize + "px Roboto";
    //"v" is used as an average of characters
    var charWidth = ctx.measureText("v").width;
    canvas.remove();
    var perLine = Math.floor(lineWidth / charWidth);
    return perLine * Lines;
}