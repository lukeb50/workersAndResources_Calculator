/* global firebase, loaditms, storage, loadblocker, loadspinner, billing_table, mainmenu, Levels, SheetModifiers, getLvlInfo */
const email_pattern = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
const firebaseConfig = {
    apiKey: "AIzaSyCG2ONqpyLey1OP8B9135Yqk3dfrT9J9ts",
    authDomain: "report-cards-6290.firebaseapp.com",
    projectId: "report-cards-6290",
    storageBucket: "report-cards-6290.appspot.com",
    messagingSenderId: "17282701261",
    appId: "1:17282701261:web:e382114e2f775d20539684",
    databaseURL: "https://report-cards-6290.firebaseio.com/"
};
const fbApp = firebase.initializeApp(firebaseConfig);
var clientDb;
var Organization;
//main app used to establish auth
async function initClientDatabase() {
    return await firebase.auth().currentUser.getIdTokenResult(false).then((result) => {
        clientDb = fbApp.database("https://report-cards-6290-" + result.claims.Organization + ".firebaseio.com");
        Organization = result.claims.Organization;
        return result.claims.Organization;
    });
}

var Archive;

var LevelConfigs = [{Name: "CommentEnabled", Element: document.getElementById("isCommentsEnabled"), Default: false},
    {Name: "WeakLetter", Element: document.getElementById("weakLetterInput"), Default: "w"},
    {Name: "WeakLetterOffset", Element: document.getElementById("weakLetterOffset"), Default: 0},
    {Name: "WeakGrouping", Element: document.getElementById("isWeakGrouping"), Default: 0},
    {Name: "WeakGroupingHighlight", Element: document.getElementById("WeakGroupingHighlight"), Default: false},
    {Name: "PassLetter", Element: document.getElementById("passLetterInput"), Default: ""},
    {Name: "HighlightWeakLetter", Element: document.getElementById("HighlightWeakLetter"), Default: false},
    {Name: "Duration", Element: document.getElementById("ClassDuration"), Default: 30}];
var xhttp;

async function send_http_request(dbpath, body, headers, urlsection) {
    try {
        var token = await getUserToken();
    } catch (e) {
        console.log(e);
    }
    return new Promise((resolve, reject) => {
        if (token !== null) {
            document.cookie = "token=" + token;
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    resolve(xhttp.responseText);
                } else if (this.readyState === 4) {
                    reject(this.status);
                }
            };
            xhttp.open("POST", "https://report-cards-6290.appspot.com/" + (urlsection ? urlsection : "database") + "/" + dbpath, true);
            if (headers) {
                for (var i = 0; i < headers.length; i++) {
                    xhttp.setRequestHeader(headers[i][0], headers[i][1]);
                }
            }
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhttp.setRequestHeader("token", token);
            xhttp.send(body);
            xhttp.onerror = function (f) {
                reject(f);
            };
        } else {
            reject("No token");
        }
    });
}

function getUserToken() {
    return new Promise((resolve, reject) => {
        if (firebase.auth().currentUser) {
            firebase.auth().currentUser.getIdToken(true).then(function (token) {
                resolve(token);
            }).catch(function (error) {
                alert(error);
                reject("Error getting user token");
            });
        } else {
            //alert("no user");
            reject("User does not exist");
        }
    });
}

async function initSelectorScreen(AppendTo) {//.Regex, .Name .Autosort
    await getCompleteLevels().then((lvls) => {
        clientDb.ref("Level-Grouping").once('value').then((snap) => {
            var rawGrouping = snap.val() ? snap.val() : [];
            var groupingData = [];
            for (var i = 0; i < rawGrouping.length; i++) {
                if (rawGrouping[i].Visible === true) {
                    groupingData.push(rawGrouping[i]);
                }
            }
            for (var g = 0; g < groupingData.length; g++) {
                groupingData[g].Levels = [];
                groupingData[g].Ids = [];
                for (const [id, lvlinfo] of Object.entries(lvls)) {
                    if (new RegExp(groupingData[g].Regex).test(lvlinfo.Name) === true) {
                        groupingData[g].Levels.push(lvlinfo.Name);
                        groupingData[g].Ids.push(id);
                    }
                }
                if (groupingData[g].Autosort && groupingData[g].Autosort === true) {
                    groupingData[g].Levels.sort();
                }
            }
            groupingData.forEach((Group) => {
                var group = document.createElement("optgroup");
                AppendTo.appendChild(group);
                group.label = Group.Name;
                Group.Levels.forEach((LevelName, index) => {
                    var opt = document.createElement("option");
                    opt.value = Group.Ids[index];
                    opt.textContent = LevelName;
                    group.appendChild(opt);
                });
            });
        });
    });
}

async function getCompleteLevels() {
    return new Promise((resolve, reject) => {
        clientDb.ref("Levels").once('value').then((snap) => {
            var allLvlRaw = snap.val();
            for (const [id, lvlRaw] of Object.entries(allLvlRaw)) {
                Levels[id] = processLoadedLevel(lvlRaw);
            }
            resolve(Levels);
        }).catch((e) => {
            console.log(e);
            reject(null);
        });
    });
}


//Takes in a level loaded from DB and pads out possible null fields for
//easier usage (Avoid constant null checks)
function processLoadedLevel(LvlData) {
    LvlData.Skills = LvlData.Skills ? LvlData.Skills : [];
    LvlData.MustSees = LvlData.MustSees ? LvlData.MustSees : {};
    LvlData.PrintSettings = LvlData.PrintSettings ? LvlData.PrintSettings : {};
    LvlData.Settings = LvlData.Settings ? LvlData.Settings : {};
    return LvlData;
}

function clearChildren(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

function resetloader(isLoad, itemToShow, displayType, isLarge) {
    //Hide all menu elements
    if (typeof loaditms !== 'undefined') {
        for (var i = 0; i < loaditms.length; i++) {
            loaditms[i].style.display = itemToShow === loaditms[i] ? displayType : "none";
        }
    }
    //show load spinner or menu
    if (isLoad === true) {
        if (typeof mainmenu !== 'undefined') {
            mainmenu.style.display = "none";
        } else {
            return;
        }
        loadblocker.style.display = "block";
        loadspinner.style.display = "block";
    } else if (isLoad === false && itemToShow !== null) {
        if (typeof mainmenu !== 'undefined') {//show
            mainmenu.style.display = "flex";
        }
        loadblocker.style.display = "block";
        loadspinner.style.display = "none";
    } else if (isLoad === false && itemToShow === null) {
        if (typeof mainmenu !== 'undefined') {
            mainmenu.style.display = "none";
        }
        loadblocker.style.display = "none";
        loadspinner.style.display = "none";
    }
    //Handle size
    if (typeof mainmenu !== 'undefined') {
        mainmenu.className = isLarge === true ? "large" : "";
    }
}

const isOverflown = ({clientHeight, scrollHeight}) => scrollHeight > clientHeight;

function sizeTextToContainer( {element, minSize = 1, maxSize = 1000, step = 1}){
    let s = minSize;
    let overflow = false;
    let parentNode = element.parentNode;
    while (!overflow && s < maxSize) {
        element.style.fontSize = s + "px";
        overflow = isOverflown(element);
        if (!overflow) {
            s += step;
        }
    }
    element.style.fontSize = (s - step) + "px";
}

function HexToDecimal(HexString, Position) {
    HexString = HexString.substring(1);
    Position--;
    return parseInt(HexString.substring((2 * Position), 2 + (2 * Position)), 16);
}

Array.prototype.move = function (from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

async function getURL(imgName) {
    return new Promise((resolve, reject) => {
        if (imgName === "") {
            resolve("");
            return;
        }
        ;
        storage.ref(Organization + "/" + imgName).getDownloadURL().then((returnurl) => {
            resolve(returnurl);
        }).catch((err) => {
            reject(err);
        });
    });
}

String.prototype.escapeJSON = function () {
    return this.replace(/"/g, "'");
};

async function getTimeblocks() {
    return await clientDb.ref("Settings/Timeblocks").once('value').then((snap) => {
        var internalTimeblocks = snap.val() ? snap.val() : [];
        Timeblocks = {};
        for (var t = 0; t < internalTimeblocks.length; t++) {
            Timeblocks[internalTimeblocks[t].UniqueID] = internalTimeblocks[t];
        }
        return Timeblocks;
    });
}

async function getFacilities() {
    return await clientDb.ref("Settings/Facilities").once('value').then((snap) => {
        var internalFacilities = snap.val() ? snap.val() : [];
        Facilities = {};
        for (var f = 0; f < internalFacilities.length; f++) {
            Facilities[internalFacilities[f].UniqueID] = internalFacilities[f];
        }
        return Facilities;
    });
}

async function getArchive() {
    return await clientDb.ref("Archive").once('value').then((snap) => {
        Archive = snap.val();
        return Archive;
    });
}

async function initCoreData(isProg) {
    await getTimeblocks();
    await getFacilities();
    if (isProg === true) {
        await getArchive();
    }
    return;
}

function calculateUniqueID(Name, existingArray) {
    while (true) {
        var Id = attemptID(Name);
        if (existingArray.reduce(function (acc, current) {
            return acc + (current.UniqueID === Id ? 1 : 0);
        }, 0) === 0) {
            return Id;
        }
    }
    function attemptID(Name) {
        return (new Date().getTime() + (Name.charCodeAt(0) - 97)) + Math.floor((Math.random() * 10) + 1);
    }
}

function calculateUniqueObjectID(Name, existingObject) {
    while (true) {
        var Id = attemptID(Name);
        var keys = Object.keys(existingObject);
        if (keys.reduce(function (acc, current) {
            return acc + (current.toString() === Id.toString() ? 1 : 0);
        }, 0) === 0) {
            return Id;
        }
    }
    function attemptID(Name) {
        return (new Date().getTime() + (Name.charCodeAt(0) - 97)) + Math.floor((Math.random() * 10) + 1);
    }
}

function convertTimeblockString(Timeblock) {
    var dataCodes = Timeblock.split("---");
    return Timeblocks[parseInt(dataCodes[1])].Name + " (" + Facilities[parseInt(dataCodes[0])].Shortform + ")";
}

function getArchiveSheetTimeblockData(ContainerArray, Type, FacilityTimeCode) {
    if (ContainerArray[FacilityTimeCode] !== undefined && ContainerArray[FacilityTimeCode] !== null) {
        return ContainerArray[FacilityTimeCode];
    } else {
        var UniqueID = FacilityTimeCode;
        if (ContainerArray[UniqueID] !== undefined && ContainerArray[UniqueID] !== null) {
            return ContainerArray[UniqueID]; //still exists
        } else {
            return Archive[Type][UniqueID];
        }
    }
}

var Days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var Months = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function timestampToText(time) {
    var date = new Date(time * 1000);
    return Days[date.getDay()] + ", " + Months[date.getMonth()] + " " + date.getDate() + getDatePostfix(date.getDate()) + " " + date.getFullYear() + " at " + (date.getHours() > 12 ? getZeroString(date.getHours() - 12) : getZeroString(date.getHours())) + ":" + getZeroString(date.getMinutes()) + (date.getHours() > 12 ? "pm" : "am");
}

function getZeroString(time) {//prefixes single digit numbers with a 0
    //5 -> "05", 15 -> "15", 0-> "00"
    if (time < 10) {
        return "0" + time;
    } else {
        return time.toString();
    }
}

function getDatePostfix(date){
    if(date % 10 === 1){
        return "st";
    }else if(date % 10 === 2){
        return "and";
    }else if(date % 10 === 3){
        return "rd";
    }else{
        return "th";
    }
}

//Converts a minutes-since-midnight value to human readable time (12:44am)
function convertTimeReadable(t, useTwelveHour) {
    if (useTwelveHour === false) {//24 hour clock
        return getZeroString(Math.floor(t / 60)) + ":" + getZeroString(t % 60);
    } else {// 12 hour clock (am pm)
        var hour = Math.floor(t / 60);
        return (hour <= 12 ? hour : hour - 12) + ":" + getZeroString(t % 60) + " " + (hour < 12 ? "am" : "pm");
    }
}

function getTimeFromInput(input) {
    var inputVal = input.value;
    if (inputVal && inputVal !== "") {//value exists, check if valid
        var split = inputVal.split(":");
        var hours = parseInt(split[0]);
        var minutes = parseInt(split[1]);
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return startMark = hours * 60 + minutes;
        }
    }
    return null;
}

const General_Settings = [{Element: document.getElementById("general-session-input"), Name: "Session", Type: "text"},
    {Element: document.getElementById("general-lockout-checkbox"), Name: "approveLockout", Type: "checkbox"},
    {Element: document.getElementById("general-email-checkbox"), Name: "supervisorEmail", Type: "checkbox"},
    {Element: document.getElementById("general-attendance-checkbox"), Name: "useAttendance", Type: "checkbox"},
    {Element: document.getElementById("general-lookup-checkbox"), Name: "allowLookup", Type: "checkbox"},
    {Element: document.getElementById("general-plan-checkbox"), Name: "useLessonPlans", Type: "checkbox"},
    {Element: document.getElementById("general-eval-checkbox"), Name: "useInstructorEvals", Type: "checkbox"}
];
function showSettings() {
    for (var i = 0; i < General_Settings.length; i++) {
        General_Settings[i].Element[General_Settings[i].Type === "checkbox" ? "checked" : "value"] = "";
        getItemValue(i);
    }

    function getItemValue(i) {
        clientDb.ref("Settings/Data/" + General_Settings[i].Name).on('value', (snapshot) => {
            General_Settings[i].Element[General_Settings[i].Type === "checkbox" ? "checked" : "value"] = snapshot.val();
        });
    }
}

var Settings = {};

async function getSettings() {
    return new Promise((resolve, reject) => {
        clientDb.ref("Settings").once('value').then((snap) => {
            Settings = snap.val().Data ? snap.val().Data : {};
            SheetModifiers = snap.val()["Sheet-Modifiers"] ? snap.val()["Sheet-Modifiers"] : [];
            var settingEvent = new Event("SettingUpdate");
            window.dispatchEvent(settingEvent);
            resolve(snap.val());
        }).catch(() => {
            resolve({});
        });
    });
}

const Billing_Columns = ["Item Name", "Quantity Used", "Rate", "Total"];
const Billing_Rows = [{Name: "Students Used", Rate: "RatePerStudent", Used: "StudentsUsed"}];
const Billing_StartYear = 2021;//Months
function showBilling() {
    const billing_month = document.getElementById("billing-month-select");
    const billing_year = document.getElementById("billing-year-select");
    send_http_request("get/currentmonth", "", [], "billing").then((bData) => {
        var BillingData = JSON.parse(bData);
        clearChildren(billing_month);
        Months.forEach((month, i) => {
            let m = document.createElement("option");
            m.value = i + 1;
            m.textContent = month;
            billing_month.appendChild(m);
        });
        clearChildren(billing_year);
        var cYear = new Date().getFullYear();
        for (var i = Billing_StartYear; i <= cYear; i++) {
            let y = document.createElement("option");
            y.value = i;
            y.textContent = i;
            billing_year.appendChild(y);
        }
        var BillingTotal = 0;
        clearChildren(billing_table);
        var tableHead = document.createElement("tr");
        billing_table.appendChild(tableHead);
        for (var c = 0; c < 4; c++) {
            var header = document.createElement("th");
            header.textContent = Billing_Columns[c];
            tableHead.appendChild(header);
        }
        Billing_Rows.forEach((rowData) => {
            let row = document.createElement("tr");
            billing_table.appendChild(row);
            let nameText = document.createElement("td");
            nameText.textContent = rowData.Name;
            row.appendChild(nameText);
            let quantityText = document.createElement("td");
            quantityText.textContent = BillingData[rowData.Used];
            row.appendChild(quantityText);
            let priceText = document.createElement("td");
            priceText.textContent = BillingData[rowData.Rate] + "$";
            row.appendChild(priceText);
            let totalText = document.createElement("td");
            var rowNumCost = (parseFloat(BillingData[rowData.Used]) * parseFloat(BillingData[rowData.Rate])).toFixed(2);
            totalText.textContent = rowNumCost + "$";
            BillingTotal = BillingTotal + rowNumCost;
            row.appendChild(totalText);
        });
        let totalRow = document.createElement("tr");
        billing_table.appendChild(totalRow);
        for (var b = 0; b < 2; b++) {
            var blank = document.createElement("td");
            totalRow.appendChild(blank);
        }
        let totalText = document.createElement("th");
        totalText.textContent = "Subtotal";
        totalRow.appendChild(totalText);
        let totalAmmount = document.createElement("td");
        totalAmmount.textContent = parseFloat(BillingTotal) + "$";
        totalRow.appendChild(totalAmmount);
    }).catch((err) => {
        console.log(err);
        alert("Error getting current billing month");
    });
}

if (document.getElementById("general-save-btn")) {
    document.getElementById("general-save-btn").onclick = function () {
        var toSend = {};
        for (var i = 0; i < General_Settings.length; i++) {
            toSend[General_Settings[i].Name] = General_Settings[i].Element[General_Settings[i].Type === "checkbox" ? "checked" : "value"];
        }
        resetloader(true, null, null, false);
        setValue(toSend).then(() => {
            resetloader(false, null, null, false);
        }).catch((err) => {
            resetloader(false, null, null, false);
            alert("Error changing settings. Please refresh and try again");
            console.log(err);
        });
        async function setValue(Object) {
            return await send_http_request("2/set/value", JSON.stringify(Object), []);
        }
    };
}

function getSheetModifier(sheet) {
    if (sheet.TimeModifier && parseInt(sheet.TimeModifier) !== -1) {
        let  mods = SheetModifiers.filter((m) => m.UniqueID === parseInt(sheet.TimeModifier));
        if (mods.length === 1) {
            return mods[0];
        } else {
            return {UniqueID: 0, Name: "Error", Duration: parseInt(Levels[sheet.Level].Settings.Duration)};
        }
    }
    return null;
}

function createModifierText(sheet) {
    var txt = "";
    var mod = getSheetModifier(sheet);
    if (mod !== null) {
        txt = "(" + mod.Name + ")";
    }
    return txt;
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

//functions to handle notes
const noteIndicators = [{Id: 0, Name: "Info", Image: ""}, {Id: 1, Name: "Alert", Image: ""}];
function showNoteSection(sheet, dsMode,div) {
    const note_section = div;
    clearChildren(note_section);
    let noteTitle = document.createElement("h1");
    noteTitle.textContent = "Notes";
    note_section.appendChild(noteTitle);
    //make sure notes exist, otherwise make blank arrays
    sheet.SheetInformation.Instructor.Notes = sheet.SheetInformation.Instructor.Notes ? sheet.SheetInformation.Instructor.Notes : [];
    if (dsMode) {//ds notes if applicable
        sheet.SheetInformation.Lead.Notes = sheet.SheetInformation.Lead.Notes ? sheet.SheetInformation.Lead.Notes : [];
    }
    //Btn holder must be added first due to appending before
    let noteBtnHolder = document.createElement("span");
    note_section.appendChild(noteBtnHolder);
    //show existing notes
    sheet.SheetInformation.Instructor.Notes.forEach((note) => {
        showNote(note, false);
    });
    if (dsMode) {
        sheet.SheetInformation.Lead.Notes.forEach((note) => {
            showNote(note, true);
        });
    }
    newNoteBtn("New Note", noteBtnHolder, false);
    if (dsMode) {
        newNoteBtn("New Supervisor Note", noteBtnHolder, true);
    }
    function showNote(note, isDs) {
        //create div
        let noteContainer = document.createElement("div");
        //title input
        let titleInput = document.createElement("input");
        titleInput.value = note.Title;
        titleInput.onchange = function () {
            note.Title = titleInput.value.escapeJSON();
            attemptEditPending();
        };
        noteContainer.appendChild(titleInput);
        //main text input
        let txtArea = document.createElement("textarea");
        txtArea.value = note.Content;
        txtArea.onchange = function () {
            note.Content = txtArea.value.escapeJSON();
            attemptEditPending();
        };
        //container for control buttons
        noteContainer.appendChild(txtArea);
        let controlHolder = document.createElement("span");
        noteContainer.appendChild(controlHolder);
        //control elements
        //indicator
        let indicatorLbl = document.createElement("label");
        indicatorLbl.textContent = "Symbol: ";
        //commented out until indicator is implemented
        //controlHolder.appendChild(indicatorLbl);
        let indicatorSel = document.createElement("select");
        indicatorLbl.appendChild(indicatorSel);
        let noIndicator = document.createElement("option");
        noIndicator.textContent = "None";
        noIndicator.value = -1;
        indicatorSel.appendChild(noIndicator);
        noteIndicators.forEach((indicator) => {
            let opt = document.createElement("option");
            opt.textContent = indicator.Name;
            opt.value = indicator.Id;
            indicatorSel.appendChild(opt);
        });
        indicatorSel.value = note.Indicator;
        indicatorSel.onchange = function () {
            attemptEditPending();
            note.Indicator = indicatorSel.value;
        };
        //delete button
        let deletebtn = document.createElement("button");
        deletebtn.textContent = "Delete";
        deletebtn.className = "delete";
        deletebtn.onclick = function () {
            let noteLoc = sheet.SheetInformation[isDs ? "Lead" : "Instructor"].Notes;
            sheet.SheetInformation[isDs ? "Lead" : "Instructor"].Notes = noteLoc.filter(lNote => lNote.UniqueID !== note.UniqueID);
            noteContainer.remove();
            attemptEditPending();
        };
        controlHolder.appendChild(deletebtn);
        //ds notice
        if (isDs) {
            let dsNotice = document.createElement("p");
            dsNotice.textContent = "Supervisor Note";
            controlHolder.appendChild(dsNotice);
        }
        note_section.insertBefore(noteContainer, noteBtnHolder);
    }

    function newNoteBtn(text, appendTo, isDs) {
        var newBtn = document.createElement("button");
        newBtn.className = "mainround newnotebtn";
        newBtn.textContent = text;
        appendTo.appendChild(newBtn);
        newBtn.onclick = function () {
            createNewNote(isDs);
        };
    }

    function createNewNote(isDs) {
        //Name is not supplied, always use the same. Will not significantly affect randomness
        let id = calculateUniqueObjectID("Note", sheet.SheetInformation[isDs ? "Lead" : "Instructor"].Notes);
        let newNote = {Title: "", Content: "", Indicator: -1, UniqueID: id};
        sheet.SheetInformation[isDs ? "Lead" : "Instructor"].Notes.push(newNote);
        attemptEditPending();
        showNote(newNote, isDs);
    }

    function attemptEditPending() {
        var editPendingAvailable = !typeof (changeEditPending) === "undefined";
        if(editPendingAvailable === true){
            changeEditPending(true,true);
        }
        try {
            window.parent.changeEditPending(true, true);
        } catch (e) {
            //Not iframed, do nothing
        }
    }
}

/**
 * Converts a full name to truncated name
 * @param {type} Name The full name i.e John Doe
 * @returns {String} Truncated name John D.
 */
function getInstructorName(Name) {
    if (!Name || Name === "") {
        return "";
    }
    return Name.split(" ")[0] + " " + (Name.split(" ")[1] !== undefined ? Name.split(" ")[1].charAt(0) + "." : "");
}