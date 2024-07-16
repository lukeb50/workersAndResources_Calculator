/* global parseInt */
/*global firebase, EditPending, Notification, Settings, initClientDatabase, clientDb, email_pattern, getLvlInfo, send_http_request, Levels, Days, Months*/
var currentimgfile;
var documents = [];
var images = [];
var reader = new FileReader();
var currentSheet = -1;
var UserData;
var currentTime;
var Timeblocks = {};
var Facilities = {};
var People = [];
var currentPerson;
var emailParameters;
var isNotificationsEnabled = false;
const VAPID_Key = "BDLPhy1BSDkVzOYCg5oBvKom41KKMy-WvKN_HFd-9myayMPTqhfQxfquCs4rW7RDmn2wpxQgzK_nvu-vcH-3ypU";

const timeselect = document.getElementById("timeselector");
const storage = firebase.app().storage("gs://report-cards-6290-uploads");
const barlist = document.getElementById("barlist");
const upload_button_div = document.getElementById("uploaderdiv");
const maintable = document.getElementById("maintable");
const sheetinfo = document.getElementById("sheetinfo");
const add_row_btn = document.getElementById("add_row_btn");
const new_sheet_manual = document.getElementById("new_sheet_manual");
const topbar_controls = document.getElementById("topbar-controls");
const overflowbtn = document.getElementById("overflowbtn");
const loadblocker = document.getElementById("loadblocker");
const blocker = document.getElementById("blocker");
const blocker_mark = document.getElementById("blocker_mark");
const blocker_change = document.getElementById("change_marking_div");
const blocker_mustsee = document.getElementById("blocker_mustsees");
const blocker_lvl = document.getElementById("blocker_changelvl");
const schedule_frame = document.getElementById("scheduleFrame");
const printsheet = document.getElementById("print-sheet-btn");
const printsheetdiv = document.getElementById("print-sheet-div");
const printtime = document.getElementById("print-time-btn");
const printpersondiv = document.getElementById("print-person-div");
const printsheetlbl = document.getElementById("print-sheet-label");
const printexecutebtn = document.getElementById("print-menu-execute");
const email_maindiv = document.getElementById("email-maindiv");
const timebtn = document.getElementById("timebtn");
const savebtn = document.getElementById("savebtn");
const prevlookupbtn = document.getElementById("prevlookupbtn");
const approvebtn = document.getElementById("approvebtn");
const printbtn = document.getElementById("printbtn");
const instmodebtn = document.getElementById("toinstbtn");
const emailbtn = document.getElementById("emailbtn");
const searchspan = document.getElementById("searchspan");
const topbtns = [searchspan, timebtn, prevlookupbtn, savebtn, printbtn, approvebtn, instmodebtn, emailbtn]; //buttons in topbar that may need to overflow
const topbtnlens = [];
for (var i = 0; i < topbtns.length; i++) {//compute used space for each element
    topbtnlens[i] = parseInt(topbtns[i].getBoundingClientRect().width);//elwidth;
}

const searchbar = document.getElementById("searchinput");
const searchbtn = document.getElementById("searchbtn");

const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");

const loadspinner = document.getElementById("loadspinner");
const overflowmenu = document.getElementById("topbar-overflow-holder");
const overflower = document.getElementById("topbar-overflow");
const timemenu = document.getElementById("time-menu");
const timemselect = document.getElementById("timemenu-select");
const addable_list = document.getElementById("addable-container");
const currenttlist = document.getElementById("current-time-list");
const printmenu = document.getElementById("print-menu");
const emailmenu = document.getElementById("email-menu");
const usermenu = document.getElementById("user-menu");
const notifmenu = document.getElementById("notification-menu");
const instlistparent = document.getElementById("personlist");
const instlistcollapse = document.getElementById("collapse-personlist");
const instlist = document.getElementById("personlist-holder");
const commentmenu = document.getElementById("comment-menu");
const notemenu = document.getElementById("note-menu");
const prevlookupmenu = document.getElementById("previouslookup-menu");
const schedulemenu = document.getElementById("schedule-menu");
const evalmenu = document.getElementById("evaluation-menu");

const loaditms = [loadspinner, overflower, timemenu, printmenu, emailmenu, usermenu, notifmenu, commentmenu, notemenu, prevlookupmenu, schedulemenu, evalmenu]; //items that should be hidden when showing main blocker

const screenquery = window.matchMedia("(max-width: 700px)");

async function registerServiceWorker(makeRequest) {
    if ((makeRequest === true && Notification.permission !== "granted") || Notification.permission === "granted") {
        try {
            await navigator.serviceWorker.register("../serviceworker.js");
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_Key
            });
            return subscription;
        } catch (e) {
            throw new Error(e);
        }
    } else {
        throw new Error("No Request");
    }
}

async function PerformServiceWorkerInit(makeRequest) {
    //if makeRequest is true, can prompt user if not chosen.
    //if makeRequest is false, update db if granted, fail otherwise
    return new Promise((resolve, reject) => {
        if (('Notification' in window)) {
            registerServiceWorker(makeRequest).then((e) => {
                isNotificationsEnabled = true;
                var Details = {};
                Details["Endpoint"] = e.endpoint;
                Details["P256"] = e.toJSON().keys.p256dh;
                Details["Auth"] = e.toJSON().keys.auth;
                clientDb.ref("FCM-Token/" + firebase.auth().currentUser.uid).set(Details);
                resolve(true);
            }).catch((f) => {
                console.warn(f);
                isNotificationsEnabled = false;
                reject("No permission");
            });
        } else {
            console.warn("Notification service not present");
            isNotificationEnabled = false;//No support in browser
            reject("No service");
        }
    });
}

close_mainmenu.onclick = function () {
    resetloader(false, null, null, false);
};

var printExclusions = [];
function bindPrintPersonCheck(check) {
    check.onchange = function () {
        if (check.checked === true) {//readded, remove from list
            printExclusions.splice(printExclusions.indexOf(check.getAttribute("data-sheet") + ":" + check.getAttribute("data-i")), 1);
        } else {
            printExclusions.push(check.getAttribute("data-sheet") + ":" + check.getAttribute("data-i"));
        }
    };
}

printexecutebtn.onclick = function () {
    let cardsToPrint = [];
    if (printtime.classList.contains("print-selected")) {//print time
        for (var x = 0; x < printsheetdiv.childNodes.length; x++) {
            let el = printsheetdiv.childNodes[x].getElementsByTagName("INPUT")[0];
            let currentSheetNum = el.getAttribute("data-sheet");
            if (el.checked === true) {
                var currentSheetInfo = {Level: documents[currentPerson][currentSheetNum].Level, Data: []};
                for (var y = 0; y < documents[currentPerson][currentSheetNum].Names.length; y++) {
                    if (printExclusions.indexOf(currentSheetNum + ":" + y) === -1) {
                        currentSheetInfo.Data.push({Sheet: currentSheetNum, Student: y});
                    }
                }
                cardsToPrint.push(currentSheetInfo);
            }
        }
    } else {//print worksheet
        var currentSheetInfo = {Level: documents[currentPerson][currentSheet].Level, Data: []};
        for (var x = 0; x < printpersondiv.childNodes.length; x++) {
            let el = printpersondiv.childNodes[x].getElementsByTagName("INPUT")[0];
            if (el.checked === true) {
                currentSheetInfo.Data.push({Sheet: currentSheet, Student: parseInt(el.getAttribute("data-i"))});
            }
        }
        cardsToPrint.push(currentSheetInfo);
    }
    run_card_generation(documents[currentPerson], cardsToPrint, People[currentTime][currentPerson].Name);
};

function printShowStudentList(sheet) {
    while (printpersondiv.firstChild) {
        printpersondiv.removeChild(printpersondiv.firstChild);
    }
    if (sheet >= 0) {
        printpersondiv.style.display = "block";
        printsheetlbl.textContent = Levels[documents[currentPerson][sheet].Level].Name + " #" + documents[currentPerson][sheet].Barcode;
        for (var i = 0; i < documents[currentPerson][sheet].Names.length; i++) {
            let container = document.createElement("div");
            let check = document.createElement("input");
            check.type = "checkbox";
            check.checked = printExclusions.indexOf(sheet + ":" + i) === -1;
            check.setAttribute("data-i", i);
            check.setAttribute("data-sheet", sheet);
            check.id = "person-check-" + i;
            if (printtime.classList.contains("print-selected")) {//attach handler for check
                bindPrintPersonCheck(check);
            }
            container.appendChild(check);
            let lbl = document.createElement("label");
            lbl.setAttribute("for", "person-check-" + i);
            lbl.textContent = documents[currentPerson][sheet].Names[i];
            container.appendChild(lbl);
            printpersondiv.appendChild(container);
        }
    } else {//clear
        printsheetlbl.textContent = "";
        printpersondiv.style.display = "none";
    }
}

function handleprintExpand(btn, i) {
    btn.onclick = function () {
        printShowStudentList(i);
    };
}
;
function printShowTimeList() {
    while (printsheetdiv.firstChild) {
        printsheetdiv.removeChild(printsheetdiv.firstChild);
    }
    for (var i = 0; i < documents[currentPerson].length; i++) {
        let container = document.createElement("div");
        let check = document.createElement("input");
        check.type = "checkbox";
        check.checked = true;
        check.setAttribute("data-sheet", i);
        check.id = "sheet-check-" + i;
        container.appendChild(check);
        let lbl = document.createElement("label");
        lbl.setAttribute("for", "sheet-check-" + i);
        lbl.textContent = Levels[documents[currentPerson][i].Level].Name + " #" + documents[currentPerson][i].Barcode;
        let btn = document.createElement("button");
        btn.textContent = "Expand";
        handleprintExpand(btn, i);
        container.appendChild(lbl);
        container.appendChild(btn);
        printsheetdiv.appendChild(container);
    }
}

printsheet.onclick = function () {//print only current sheet
    printsheet.classList.add("print-selected");
    printtime.classList.remove("print-selected");
    printsheetdiv.style.display = "none";
    printShowStudentList(currentSheet);
};
printtime.onclick = function () {//print current time
    printsheet.classList.remove("print-selected");
    printtime.classList.add("print-selected");
    printsheetdiv.style.display = "block";
    printShowStudentList(-1);
    printShowTimeList();
};

timebtn.onclick = function () {
    if (EditPending === false) {
        timemselect.value = UserData.Home ? UserData.Home : Facilities[Object.keys(Facilities)[0]].UniqueID;
        resetloader(false, timemenu, "flex", false);
        showAvailableTimes();
        showCurrentTimes();
    } else {
        alert("Please save before viewing this menu");
    }
};
function bindAvailableT(btn) {
    btn.onclick = function () {
        async function sendUpdate() {
            return send_http_request("0/add/time", "", [["facility", btn.getAttribute("data-facility")], ["timeblock", btn.getAttribute("data-time")]]);
        }
        resetloader(true, null, null, false);
        sendUpdate().then(function () {
            resetloader(false, null, null, false);
            var timeblockName = btn.getAttribute("data-facility") + "---" + btn.getAttribute("data-time");
            UserData.Timeblocks.push(timeblockName);
            documents[btn.getAttribute("data-time")] = [];
            currentTime = btn.getAttribute("data-time");
            updateTimeSelector(); //success, update UI
            showCurrentTimes();
            showAvailableTimes();
            new_sheet_manual.style.display = "block";
            //selectfile.style.display = "block";
        }).catch((f) => {
            console.log(f);
            resetloader(false, null, null, false);
            alert("An error occured. Please check your connection and try again");
        });
    };
}

function loadFacilitySelect() {
    clearChildren(timemselect);
    var fKeys = Object.keys(Facilities);
    for (var f = 0; f < fKeys.length; f++) {
        var opt = document.createElement("option");
        opt.textContent = Facilities[fKeys[f]].Shortform;
        opt.value = Facilities[fKeys[f]].UniqueID;
        timemselect.appendChild(opt);
    }
}

function showAvailableTimes() {
    clearChildren(addable_list);
    if (!UserData.Timeblocks) {
        UserData.Timeblocks = [];
    }
    var tKeys = Object.keys(Timeblocks);
    for (var i = 0; i < tKeys.length; i++) {
        if (!UserData.Timeblocks.includes(timemselect.value + "---" + tKeys[i])) {
            var outdiv = document.createElement("div");
            var ttext = document.createElement("a");
            ttext.textContent = Timeblocks[tKeys[i]].Name + " (" + Facilities[timemselect.value].Shortform + ")";
            var abtn = document.createElement("button");
            abtn.className = "listdot roundaction";
            abtn.textContent = "+";
            abtn.setAttribute("data-time", tKeys[i]);
            abtn.setAttribute("data-facility", timemselect.value);
            abtn.addEventListener("click", bindAvailableT(abtn));
            outdiv.appendChild(ttext);
            outdiv.appendChild(abtn);
            addable_list.appendChild(outdiv);
        }
    }
}
timemselect.addEventListener("change", showAvailableTimes);

function bindCurrentRemove(btn) {
    btn.onclick = function () {
        async function sendUpdate() {
            return send_http_request("0/delreset/sheets", "", [["facility", btn.getAttribute("data-facility")], ["timeblock", btn.getAttribute("data-time")], ["reset", false]]);
        }
        resetloader(true, null, null, false);
        sendUpdate().then(function () {
            resetloader(false, null, null, false);
            documents = [];
            var timeblockName = btn.getAttribute("data-facility") + "---" + btn.getAttribute("data-time");
            while (instlist.firstChild) {
                instlist.removeChild(instlist.firstChild);
            }
            if (UserData.Timeblocks.length === 1) {
                new_sheet_manual.style.display = "none";
                //selectfile.style.display = "none";
            }
            for (var i = 0; i < UserData.Timeblocks.length; i++) {
                if (UserData.Timeblocks[i] === timeblockName) {
                    UserData.Timeblocks.splice(i, 1);
                    break;
                }
            }
            if (UserData.Timeblocks.length >= 1) {
                currentTime = UserData.Timeblocks[0];
                HandleLoad();
            } else {
                currentTime = null;
            }
            showCurrentTimes();
            updateTimeSelector();
            showAvailableTimes();
            renderTable(-1);
            populatebar(0);
        }).catch((f) => {
            resetloader(false, null, null, false);
            alert("An error occured. Please check your connection and try again");
        });
    };
}

const notifsubscribebtn = document.getElementById("notification-sub-btn");
function showCurrentTimes() {
    clearChildren(currenttlist);
    for (var i = 0; i < UserData.Timeblocks.length; i++) {//generate current time list
        var maindiv = document.createElement("div");
        var lbl = document.createElement("a");
        lbl.textContent = convertTimeblockString(UserData.Timeblocks[i]);
        maindiv.appendChild(lbl);
        var btndiv = document.createElement("div");
        var removebtn = document.createElement("button");
        removebtn.setAttribute("data-time", UserData.Timeblocks[i].split("---")[1]);
        removebtn.setAttribute("data-facility", UserData.Timeblocks[i].split("---")[0]);
        removebtn.textContent = "-";
        removebtn.className = "listdot roundaction";
        bindCurrentRemove(removebtn);
        btndiv.appendChild(removebtn);
        //Check for notification support, show btn if in browser
        if (('Notification' in window)) {
            var notifbtn = document.createElement("button");
            notifbtn.textContent = "notifications";
            notifbtn.title = "Notification settings";
            notifbtn.className = "listdot roundaction material-symbols-outlined";
            bindCurrentNotif(notifbtn, i);
            btndiv.appendChild(notifbtn);
        }
        maindiv.appendChild(btndiv);
        currenttlist.appendChild(maindiv);
    }
    if (UserData.Timeblocks.length === 0) {
        var msg = document.createElement("b");
        msg.textContent = "No Times";
        currenttlist.appendChild(msg);
    }
    function bindCurrentNotif(btn, timeIndex) {
        //User.Timeblocks[timeIndex] // Base name of timeblock
        btn.onclick = async function handleBtn() {
            notifmenu.setAttribute("timei", timeIndex);
            if (isNotificationsEnabled === true) {
                resetloader(true, null, null, false);
                var timeSplit = UserData.Timeblocks[timeIndex].split("---");
                clientDb.ref("FCM/" + timeSplit[0] + "/" + timeSplit[1] + "/" + firebase.auth().currentUser.uid).once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        //Already subscribed.
                        notifsubscribebtn.textContent = "Unsubscribe";
                        notifsubscribebtn.className = "mainround red";
                        resetloader(false, notifmenu, "block", false);
                    } else {
                        //Not subscribed.
                        notifsubscribebtn.textContent = "Subscribe";
                        notifsubscribebtn.className = "mainround";
                        resetloader(false, notifmenu, "block", false);
                    }
                });
                //get current timeblocks
            } else {
                PerformServiceWorkerInit(true).then((res) => {
                    handleBtn();
                }).catch((e) => {
                    alert("Notification service unavailable or permission denied. Please check your browser settings and allow notifications.");
                });
            }
        };
    }
}

notifsubscribebtn.onclick = function () {
    if (isNotificationsEnabled === false) {//attempt to get permission if not granted
        alert("Please turn on notifications in your browser settings.");
        resetloader(false, null, null, false);
        return;
    }
    //Permission must exist at this point
    var timeSplit = UserData.Timeblocks[parseInt(notifmenu.getAttribute("timei"))].split("---");
    var fbref = clientDb.ref("FCM/" + timeSplit[0] + "/" + timeSplit[1] + "/" + firebase.auth().currentUser.uid);
    if (notifsubscribebtn.textContent === "Subscribe") {
        //sub
        fbref.set([firebase.auth().currentUser.uid]);
        resetloader(false, null, null, false);
    } else {
        //unsub
        fbref.remove();
        resetloader(false, null, null, false);
    }
};

function updateTimeSelector() {
    clearChildren(timeselect);
    for (var Time of UserData.Timeblocks) {
        var opt = document.createElement("option");
        opt.value = Time;
        opt.textContent = convertTimeblockString(Time);
        timeselect.appendChild(opt);
    }
}

async function getUser() {
    resetloader(true, null, null, false);
    UserData = JSON.parse(await send_http_request("-1/get/user", ""));
    if (UserData !== null) {
        while (timeselect.firstChild) {
            timeselect.removeChild(timeselect.firstChild);
        }
        if (!screenquery.matches) {
            document.getElementById("logout-btn").innerHTML = "Log Out [" + firebase.auth().currentUser.displayName + "]";
        }
        if (UserData.Timeblocks && UserData.Timeblocks.length > 0) {
            new_sheet_manual.style.display = "block";
            //selectfile.style.display = "block";
            updateTimeSelector();
            currentTime = UserData.Timeblocks[0];
            HandleLoad();
        } else {
            resetloader(false, null, null, false);
        }
    } else {
        new_sheet_manual.style.display = "none";
        //selectfile.style.display = "none";
        alert("Unexpected error fetching your data - please try again later");
        resetloader(false, null, null, false);
    }
}

function runtopbarbtns(available) {
    var overflow = [];
    var top = [];
    for (var i = 0; i < topbtns.length; i++) {
        var elwidth = topbtnlens[i];
        if (elwidth < available) {
            available -= elwidth;
            top.push(topbtns[i]);
        } else {
            overflow.push(topbtns[i]);
        }
    }
    return [top, overflow];
}

function handleresize() {
    //handle bar list
    //hide if all are on screen ||
    if (documents[currentPerson]) {
        if (documents[currentPerson].length * 150 >= barlist.offsetWidth || (barlist.offsetWidth / 150) <= 50) {
            populatebar(0);
        }
    }
    //handle top buttons into overflow
    overflowbtn.style.display = "block";
    var res = runtopbarbtns(topbar_controls.offsetWidth);
    var top = res[0];
    var overflow = res[1];
    if (overflow.length > 0) {//there is overflow with the button, render it
        for (var i = 0; i < top.length; i++) {
            topbar_controls.appendChild(top[i]);
        }
        for (var i = 0; i < overflow.length; i++) {
            overflowmenu.appendChild(overflow[i]);
        }
    } else {//no overflow exists
        overflowbtn.style.display = "none";
        for (var i = 0; i < top.length; i++) {
            topbar_controls.appendChild(top[i]);
        }
    }
}

async function saveCurrentSheets(approved) {//Save for 1 time
    let result = [];
    if (currentTime !== null && currentPerson !== -1) {
        for (var i = 0; i < People[currentTime].length; i++) {
            result[i] = [];
            if (documents[i] !== undefined) {
                result[i] = JSON.parse(await send_http_request("1/save/sheets", JSON.stringify(documents[i]), [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]], ["uid", People[currentTime][i].Uid], ["approve", JSON.stringify(approved)]]));
            }
        }
        let CorrectionCount = {}; //Save corrections
        for (var i = 0; i < People[currentTime].length; i++) {
            if (documents[i] !== undefined) {
                CorrectionCount[People[currentTime][i].Uid] = People[currentTime][i].UserInformation;
            }
        }
        await send_http_request("1/set/userinformation", JSON.stringify(CorrectionCount), [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]]]);
    }
    return result;
}

approvebtn.onclick = function () {
    let sheets = [];
    for (var i = 0; i < documents[currentPerson].length; i++) {
        currentDoc = documents[currentPerson][i];
        if (currentDoc.UniqueID) {
            sheets.push(currentDoc.UniqueID);
        }
    }
    saveSheets(sheets);
};
savebtn.onclick = function () {
    saveSheets([]);
};
function saveSheets(approved) {//TODO: only saves current Time, Seems fixed
    resetloader(true, null, null, false);
    saveCurrentSheets(approved).then((f) => {
        if (f) {
            for (var p = 0; p < People[currentTime].length; p++) {
                if (documents[p]) {
                    for (var sheet = 0; sheet < documents[p].length; sheet++) {
                        if (approved.indexOf(documents[p][sheet].UniqueID) !== -1) {
                            documents[p][sheet].VerifiedBy = firebase.auth().currentUser.uid + ":::" + firebase.auth().currentUser.displayName;
                        }
                    }
                }
            }
            populatebar(0);
            var Ids = f;
            for (var u = 0; u < Ids.length; u++) {//TODO: Keep eye on, may be fixed
                //Problem existed with getting Id results for all user
                for (var id = 0; id < Ids[u].length; id++) {
                    documents[u][id].UniqueID = Ids[u][id];
                }
            }
        }
        changeEditPending(false);
        resetloader(false, null, null, false);
    }).catch((f) => {
        console.log(f);
        alert("An error occured. Please check your connection and try again");
        resetloader(false, null, null, false);
    });
}

function bindPersonListClick(div) {
    div.onclick = function () {
        changeDisplayedInstructor(div.getAttribute("data-i"));
    };
}

/**
 * Changes the instructor being displayed, then calls renderTable
 * if called on the current instructor, only renderTable will execute
 * @param {type} newCurrent The new instructor to show
 * @param {type} sheetFunction A function that must return the index of the sheet
 * to display (i.e. the value to call renderTable(?) with). Can return a constant value
 * or calculate. This function is GUARANTEED to be called AFTER the new user sheets are
 * inserted into the documents array.
 * @returns {Promise} async promise due to possible network calls
 */
function changeDisplayedInstructor(newCurrent, sheetFunction) {
    return new Promise((resolve, reject) => {
        let oldcurrent = currentPerson;
        currentPerson = newCurrent;
        if (oldcurrent !== currentPerson) {
            if (documents[currentPerson].length === 0) {
                resetloader(true, null, null, false);
                getCurrentSheets().then((f) => {
                    resetloader(false, null, null, false);
                    if (f) {
                        documents[currentPerson] = JSON.parse(f);
                    } else {
                        documents[currentPerson] = [];
                    }
                    populatebar(0);
                    if (documents[currentPerson].length > 0) {
                        //sheet id if present, 0 otherwise
                        renderTable(sheetFunction !== undefined ? sheetFunction() : 0);
                        resolve();
                    } else {
                        renderTable(-1);
                        resolve();
                    }
                }).catch((f) => {
                    resetloader(false, null, null, false);
                    alert("Error getting sheets, please try again later");
                    currentPerson = oldcurrent;
                    renderTable(-1);
                    populatebar(0);
                    reject();
                });
            } else {//sheets for that person already loaded, display
                populatebar(0);
                if (documents[currentPerson].length > 0) {
                    renderTable(sheetFunction !== undefined ? sheetFunction() : 0);
                    resolve();
                } else {
                    renderTable(-1);
                    reject();
                }
            }
        } else {
            renderTable(sheetFunction !== undefined ? sheetFunction() : -1);
            resolve();
        }
    });
}

function generateInstList() {
    while (instlist.firstChild) {
        instlist.removeChild(instlist.firstChild);
    }
    for (var i = 0; i < People[currentTime].length; i++) {
        let div = document.createElement("div");
        let p = document.createElement("p");
        p.textContent = People[currentTime][i].Name ? People[currentTime][i].Name : People[currentTime][i].Email;
        div.appendChild(p);
        let lbl = document.createElement("label");
        lbl.textContent = "Corrections:";
        div.appendChild(lbl);
        let input = document.createElement("input");
        input.type = "number";
        input.id = "correction-input-" + i;
        input.value = People[currentTime][i].UserInformation.Corrections;
        input.disabled = false;
        handleCorrectionInput(input, i);
        div.appendChild(input);
        div.setAttribute("data-i", i);
        let a = document.createElement("a");
        a.href = "mailto:" + People[currentTime][i].Email + "?subject=" + Timeblocks[parseInt(currentTime.split("---")[1])].Name + " Report Cards";
        a.target = "_blank";
        a.rel = "noreferrer noopener";
        a.textContent = "Email Instructor";
        div.appendChild(a);
        let accessbtn = document.createElement("button");
        accessbtn.textContent = "Manage Access";
        handleAccessButton(accessbtn, i);
        div.appendChild(accessbtn);
        //eval button
        if (Settings.useInstructorEvals === true) {
            let evalbtn = document.createElement("button");
            evalbtn.textContent = "Evaluations";
            div.appendChild(evalbtn);
            handleEvalButton(evalbtn, i);
        }
        bindPersonListClick(div);
        instlist.appendChild(div);
    }
    let schedulebtn = document.createElement("button");
    schedulebtn.textContent = "View Schedule";
    schedulebtn.id = "viewschedulebtn";
    schedulebtn.className = "mainround";
    instlist.appendChild(schedulebtn);
    schedulebtn.onclick = function () {
        schedule_frame.contentWindow.document.getElementById("configMenuBtn").style.display = "none";
        schedule_frame.contentWindow.setEditMode(false);
        schedule_frame.contentWindow.loadAndDisplayScheduleData(People[currentTime], documents, currentTime);
        resetloader(false, schedulemenu, "block", true);
    };
    let addbtn = document.createElement("button");
    addbtn.textContent = "Add Instructor";
    addbtn.id = "addinst";
    addbtn.className = "mainround";
    addbtn.onclick = function () {
        if (EditPending === false) {
            resetloader(true, null, null, false);
            getUserList().then((list) => {
                list = JSON.parse(list);
                clearChildren(usermenu);
                //Create a list of hidden UIDs
                let hiddenUids = [];
                for (var i = 0; i < People[currentTime].length; i++) {
                    hiddenUids.push(People[currentTime][i].Uid);
                }
                //create header labels
                let title = document.createElement("h1");
                title.textContent = "Add Instructor";
                usermenu.appendChild(title);
                let subtitle = document.createElement("h2");
                subtitle.textContent = "Add an instructor to the current time";
                usermenu.appendChild(subtitle);
                for (var i = 0; i < list.length; i++) {
                    if (hiddenUids.indexOf(list[i].Uid) === -1 && list[i].Uid !== firebase.auth().currentUser.uid) {//Don't show logged in user
                        var ulistitm = document.createElement("div");
                        var ulistlbl = document.createElement("label");
                        ulistlbl.textContent = list[i].Name ? list[i].Name : list[i].Email;
                        ulistitm.appendChild(ulistlbl);
                        var ulistbtn = document.createElement("button");
                        ulistbtn.textContent = "+";
                        ulistbtn.className = "roundaction";
                        addUserToTime(ulistbtn, list[i].Uid);
                        ulistitm.appendChild(ulistbtn);
                        usermenu.appendChild(ulistitm);
                    }
                }
                resetloader(false, usermenu, "block", false);
            }).catch((r) => {
                console.log(r);
                resetloader(false, null, null, false);
            });
        } else {
            alert("Cannot add instructor with edits pending");
        }
    };
    instlist.appendChild(addbtn);
    function addUserToTime(Btn, Uid) {
        //send request to server, call handleload to refresh data & integrate new user
        Btn.onclick = function () {
            resetloader(true, null, null, false);
            addUserTime(Uid).then((res) => {
                //finished adding, refresh
                HandleLoad();
            }).catch((err) => {
                resetloader(false, null, null, false);
                console.log(err);
                alert("Error adding user to this timeblock. Please try again later.");
            });
        };
    }

    async function addUserTime(Uid) {
        return await send_http_request("1/add/user", Uid, [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]]]);
    }
}

async function getUserList() {
    return await send_http_request("1/list/users", "", []);
}

const evalList = document.getElementById("eval-list");
const evalPanel = document.getElementById("eval-panel");
const evalLabel = document.getElementById("eval-panel-name");
const evalSigned = document.getElementById("eval-panel-signed");
function handleEvalButton(button, personI) {
    button.onclick = function (e) {
        e.stopPropagation();
        resetloader(true, null, null, false);
        getUserEvals(currentTime, People[currentTime][personI].Uid).then((data) => {
            data = JSON.parse(data);
            resetloader(false, evalmenu, "block", true);
            clearChildren(evalList);
            clearChildren(evalPanel);
            function renderEvalList() {
                clearChildren(evalList);
                evalLabel.textContent = People[currentTime][personI].Name;
                evalSigned.textContent = " ";
                for (var i = 0; i < data.length; i++) {
                    //Render list
                    var holder = document.createElement("div");
                    var name = document.createElement("b");
                    name.textContent = data[i].Name === "" ? "(No Name)" : data[i].Name;
                    holder.appendChild(name);
                    //templatetype
                    var type = document.createElement("label");
                    type.textContent = data[i].TemplateName;
                    holder.appendChild(type);
                    evalList.appendChild(holder);
                    bindShowEvalBtn(holder, i);
                }
                var btnHolder = document.createElement("div");
                var newItem = document.createElement("button");
                newItem.textContent = "Create New Evaluation";
                newItem.className = "mainround";
                btnHolder.appendChild(newItem);
                evalList.appendChild(btnHolder);
                newItem.onclick = function () {
                    clearChildren(evalPanel);
                    evalLabel.textContent = People[currentTime][personI].Name + " - New Evaluation";
                    evalSigned.textContent = " ";
                    clientDb.ref("Settings/Evaluations").once('value').then((snap) => {
                        var templates = snap.val() ? snap.val() : [];
                        for (var i = 0; i < templates.length; i++) {
                            var templateBtn = document.createElement("button");
                            templateBtn.textContent = templates[i].Name;
                            templateBtn.className = "evaltemplate";
                            handleNewEvalBtn(templateBtn, i);
                            evalPanel.appendChild(templateBtn);
                            function handleNewEvalBtn(btn, templateIndex) {
                                btn.onclick = function () {
                                    clearChildren(evalPanel);
                                    var newName = prompt("Enter evaluation name");
                                    if (newName!==null) {
                                        newData = JSON.parse(JSON.stringify(templates[templateIndex]));
                                        newData.Timeblock = currentTime;
                                        newData.TemplateName = newData.Name;
                                        newData.Name = newName;
                                        newData.SignatureDate = -1;
                                        newData.isVisible = false;
                                        newData.UniqueID = -1;
                                        data.push(newData);
                                        renderEvalList();
                                    }
                                };
                            }
                        }
                    });
                };

                function bindShowEvalBtn(btn, evalI) {
                    btn.onclick = function () {
                        clearChildren(evalPanel);
                        let tData = data[evalI];
                        let isDisabled = parseInt(tData.SignatureDate) > -1;
                        evalLabel.textContent = People[currentTime][personI].Name + " - " +
                                (tData.Name !== "" ? tData.Name : "(No Name)");
                        if (isDisabled) {
                            evalSigned.textContent = "Signed on " + timestampToText(tData.SignatureDate);
                        } else {
                            evalSigned.textContent = "Not Signed by Instructor";
                        }
                        for (var i = 0; i < tData.RowData.length; i++) {
                            var row = document.createElement("tr");
                            evalPanel.appendChild(row);
                            //individual elements
                            for (var x = 0; x < tData.RowData[i].length; x++) {
                                var newEl = document.createElement(tData.RowData[i][x].elementType);
                                newEl.type = tData.RowData[i][x].inputType;
                                newEl.name = tData.RowData[i][x].name;
                                newEl.disabled = isDisabled;
                                if (tData.RowData[i][x].isText === true) {
                                    newEl.textContent = tData.RowData[i][x].textValue;
                                }
                                newEl.className = tData.RowData[i][x].className;
                                if (tData.RowData[i][x].value !== undefined) {
                                    if (tData.RowData[i][x].inputType === "checkbox") {
                                        newEl.checked = tData.RowData[i][x].value;
                                    } else {
                                        newEl.value = tData.RowData[i][x].value;
                                    }
                                    if (!isDisabled) {
                                        bindValueChange(newEl, i, x);
                                    } else {
                                        newEl.title = "Evaluation cannot be edited as it has been signed";
                                    }
                                }
                                row.appendChild(newEl);
                            }
                        }
                        function bindValueChange(obj, i, x) {
                            obj.oninput = function () {
                                if (data[evalI].RowData[i][x].inputType === "checkbox") {
                                    data[evalI].RowData[i][x].value = obj.checked;
                                } else {
                                    data[evalI].RowData[i][x].value = obj.value;
                                }
                            };
                        }

                    };
                }
            }
            renderEvalList();
            document.getElementById("eval-save-btn").onclick = function () {
                resetloader(true, null, null, false);
                saveEvals(data, currentTime, People[currentTime][personI].Uid).then(() => {
                    resetloader(false, null, null, false);
                }).catch((err) => {
                    console.log(err);
                    alert("Error saving evaluation. Please try again.");
                    resetloader(false, evalmenu, "block", true);
                });

                async function saveEvals(data, timeblock, userUid) {
                    return await send_http_request("1/save/evaluations", JSON.stringify(data), [["timeblock", timeblock], ["uid", userUid]]);
                }
            };
        }).catch((err) => {
            resetloader(false, null, null, false);
            console.log(err);
            alert("Error: " + err);
        });
    };
    async function getUserEvals(timeblock, userUid) {
        return await send_http_request("1/get/evaluations", "", [["timeblock", timeblock], ["uid", userUid]]);
    }
}

function handleAccessButton(accessbtn, personI) {
    accessbtn.onclick = function (e) {
        e.stopPropagation();
        resetloader(true, null, null, false);
        getCurrentAccess(People[currentTime][personI].Uid, currentTime).then((result) => {
            let currentAccess = JSON.parse(result);
            getUserList().then((list) => {
                list = JSON.parse(list);
                resetloader(false, usermenu, "block", false);
                clearChildren(usermenu);
                var title = document.createElement("h1");
                title.textContent = "Manage Access";
                var subtitle = document.createElement("h2");
                subtitle.textContent = "Manage instructors who can access these sheets";
                var titleName = document.createElement("p");
                titleName.textContent = People[currentTime][personI].Name;
                usermenu.appendChild(title);
                usermenu.appendChild(subtitle);
                usermenu.appendChild(titleName);
                list.forEach((user) => {
                    if (user.Uid !== firebase.auth().currentUser.uid && user.Uid !== People[currentTime][personI].Uid) {
                        let holder = document.createElement("div");
                        //roundaction
                        let userlabel = document.createElement("label");
                        userlabel.textContent = (user.Name && user.Name !== "") ? user.Name : user.Email;
                        holder.appendChild(userlabel);
                        let actionbtn = document.createElement("button");
                        actionbtn.className = "roundaction";
                        actionbtn.textContent = currentAccess.indexOf(user.Uid) === -1 ? "+" : "-";
                        handleAccessBtnClick(actionbtn, user.Uid, currentAccess.indexOf(user.Uid) === -1, personI);
                        holder.appendChild(actionbtn);
                        usermenu.appendChild(holder);
                    }
                });
            });
        });
    };
    function handleAccessBtnClick(btn, uid, isAdd, personI) {//PersonI is the person who owns the sheets
        //Uid is the person to grant access to
        btn.onclick = function () {
            resetloader(true, null, null, false);
            setAccess(currentTime, uid).then(() => {
                resetloader(false, null, null, false);
            }).catch((e) => {
                alert("Error granting access. Please try again");
                console.log(e);
                resetloader(false, null, null, false);
            });
        };
        async function setAccess(Timeblock, Uid) {
            return await send_http_request("1/access/set/timeblock", JSON.stringify({Uid: Uid, AccessTimeblock: Timeblock + "---" + People[currentTime][personI].Uid, isAdd: isAdd}), []);
        }
    }

    async function getCurrentAccess(Uid, Timeblock) {
        return await send_http_request("1/access/get/timeblock", Timeblock + "---" + Uid, []);
    }
}

function handleCorrectionInput(input, user) {
    input.onblur = function () {
        People[currentTime][user].UserInformation.Corrections = parseInt(input.value);
        changeEditPending(true, true); //bypass incrementing corrections on change
    };
}

async function getCurrentInstructors() {
    if (currentTime) {
        return await send_http_request("1/get/list", "", [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]]]);
    }
    return null;
}

async function getCurrentSheets() {
    if (currentPerson !== null) {
        return await send_http_request("1/get/sheets", "", [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]], ["uid", People[currentTime][currentPerson].Uid]]);
    }
    return null;
}

instlistcollapse.onclick = function (ev) {
    ev.stopPropagation();
    instlistparent.style.flex = "0 1 2em";
    instlistparent.setAttribute("data-collapse", "true");
    setChildrenDisplay(instlistparent, "none");
};
instlistparent.onclick = function () {
    if (instlistparent.getAttribute("data-collapse") === "true") {
        instlistparent.style.flex = "0 0 13rem";
        instlistparent.setAttribute("data-collapse", "false");
        setChildrenDisplay(instlistparent, "block");
    }
};
function setChildrenDisplay(parent, displayVal) {
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
        children[i].style.display = displayVal;
    }
}

function HandleLoad() {
    resetloader(true, null, null, false);
    getCurrentInstructors().then((inst) => {
        if (JSON.parse(inst).length > 0) {
            People[currentTime] = JSON.parse(inst);
            //TODO: generate list
            currentPerson = 0;
            getCurrentSheets().then((f) => {
                for (var i = 0; i < People[currentTime].length; i++) {
                    documents[i] = [];
                }
                generateInstList();
                if (JSON.parse(f).length > 0) {
                    documents[currentPerson] = JSON.parse(f);
                    renderTable(0);
                } else {
                    documents[currentPerson] = [];
                    renderTable(-1);
                }
                populatebar(0);
                resetloader(false, null, null, false);
            }).catch((f) => {
                console.log(f);
                alert("An error occured. Please check your connection and try again");
                resetloader(false, null, null, false);
            });
        } else {//nobody on this time, clear all lists
            People[currentTime] = [];
            resetloader(false, null, null, false);
            populatebar(0);
            renderTable(-1);
            generateInstList();
        }
    }).catch((f) => {
        console.log(f);
        alert("An error occured. Please check your connection and try again");
        resetloader(false, null, null, false);
    });
}

timeselect.onchange = function () {//handle changing time with dropdown
    if (EditPending === false) {
        resetloader(true, null, null, false);
        currentTime = timeselect.value;
        documents = [];
        HandleLoad();
    } else {
        alert("You have unsaved changes for this time");
        timeselect.value = currentTime;
    }
};
printbtn.onclick = function () {
    resetloader(false, printmenu, "flex", false);
    printExclusions = [];
    printShowTimeList();
    printsheet.classList.add("print-selected");
    printtime.classList.remove("print-selected");
    printsheetdiv.style.display = "none";
    printShowStudentList(currentSheet);
};
blocker.onclick = function (target) {
    if (target.target === blocker) {
        blocker.style.display = "none";
        renderTable(blocker_mark.getAttribute("data-id"));
    }
};
overflowbtn.onclick = function () {
    resetloader(false, overflower, "block", false);
};
emailbtn.onclick = function () {
    if (EditPending === false) {
        resetloader(false, emailmenu, "flex", false);
        FillEmailList();
    } else {
        alert("You must save before sending emails");
    }
};
const Email_Field_Count = 2;
function FillEmailList() {
    document.getElementById("email-menu-execute").textContent = "Next Step";
    while (email_maindiv.firstChild) {
        email_maindiv.removeChild(email_maindiv.firstChild);
    }
    for (var i = 0; i < documents[currentPerson].length; i++) {
        var div = document.createElement("div");
        div.setAttribute("data-unique-id", documents[currentPerson][i].UniqueID);
        var title = document.createElement("b");
        title.className = "levelTitle";
        div.className = "levelDiv";
        title.textContent = Levels[documents[currentPerson][i].Level].Name + " " + createModifierText(documents[currentPerson][i]) + " #" + documents[currentPerson][i].Barcode;
        div.appendChild(title);
        email_maindiv.appendChild(div);
        for (var s = 0; s < documents[currentPerson][i].Names.length; s++) {
            var studentholder = document.createElement("div");
            var stitle = document.createElement("b");
            stitle.textContent = documents[currentPerson][i].Names[s] !== "" ? documents[currentPerson][i].Names[s] : "(No Name)";
            studentholder.appendChild(stitle);
            for (var x = 0; x < Email_Field_Count; x++) {
                var emailholder = document.createElement("div");
                var lbl = document.createElement("label");
                lbl.textContent = "Email:";
                emailholder.appendChild(lbl);
                var input = document.createElement("input");
                input.setAttribute("data-unique-id", documents[currentPerson][i].UniqueID);
                input.setAttribute("data-child-num", s);
                input.setAttribute("autocomplete", "off");
                input.id = "sheet:" + i + ":student:" + s + ":input:" + x;
                input.type = "email";
                //input.placeholder = "name@domain.com";
                emailholder.appendChild(input);
                studentholder.appendChild(emailholder);
            }
            div.appendChild(studentholder);
        }
    }
}

document.getElementById("email-menu-execute").onclick = function () {
    if (document.getElementById("email-menu-execute").textContent === "Next Step") {//Show entry
        if (EditPending === false) {
            var RequestBody = [];
            for (var i = 0; i < documents[currentPerson].length; i++) {//each sheet for inst
                var Positions = [];
                var Emails = [];
                var Names = [];
                var isPopulated = false;
                for (var s = 0; s < documents[currentPerson][i].Names.length; s++) {//each kid per sheet
                    var PotentialEmails = getEmailsForStudent(i, s);
                    if (PotentialEmails.length > 0) {
                        Names.push(documents[currentPerson][i].Names[s]);
                        Positions.push(s);
                        Emails.push(PotentialEmails);
                        isPopulated = true;
                    }
                }
                if (isPopulated === true) {
                    RequestBody.push({Facility: currentTime.split("---")[0], Timeblock: currentTime.split("---")[1], Barcode: documents[currentPerson][i].Barcode, UniqueID: documents[currentPerson][i].UniqueID, Details: {Positions: Positions, Emails: Emails, Names: Names}});
                }
            }
//Show confirmation screen
            EmailParameters = RequestBody;
            document.getElementById("email-menu-execute").textContent = "Send Emails";
            while (email_maindiv.firstChild) {
                email_maindiv.removeChild(email_maindiv.firstChild);
            }
            var p = document.createElement("b");
            p.className = "info";
            p.textContent = "The following emails will be sent out:";
            email_maindiv.appendChild(p);
            for (var i = 0; i < EmailParameters.length; i++) {
                var obj = documents[currentPerson].filter(sheet => {
                    return sheet.UniqueID === EmailParameters[i].UniqueID;
                });
                obj = obj[0];
                var div = document.createElement("div");
                div.className = "levelDiv";
                for (var x = 0; x < EmailParameters[i].Details.Positions.length; x++) {
                    var title = document.createElement("b");
                    //title.className = "levelTitle";
                    title.textContent = obj.Names[EmailParameters[i].Details.Positions[x]] + " - " + Levels[obj.Level].Name + " " + createModifierText(obj) + " #" + obj.Barcode;
                    div.appendChild(title);
                    for (var e = 0; e < EmailParameters[i].Details.Emails[x].length; e++) {
                        var lbl = document.createElement("label");
                        lbl.style.display = "block";
                        lbl.textContent = EmailParameters[i].Details.Emails[x][e];
                        div.appendChild(lbl);
                    }
                }
                email_maindiv.appendChild(div);
            }
            p = document.createElement("b");
            p.className = "info";
            p.textContent = "This send will be logged, timestamped and attributed to your account. Please allow time for delivery before trying resend.";
            email_maindiv.appendChild(p);
        } else {
            alert("Please save before emailing.");
        }
    } else {//Send Emails
        if (confirm("Please confirm")) {
            resetloader(true, null, null, false);
            async function sendUpdate() {
                for (var x = 0; x < documents[currentPerson].length; x++) {
                    if (!documents[currentPerson][x].Facility || !documents[currentPerson][x].Timeblock) {
                        documents[currentPerson][x].Facility = currentTime.split("---")[0];
                        documents[currentPerson][x].Timeblock = currentTime.split("---")[1];
                    }
                }
                return send_http_request("1/send/emails", JSON.stringify(documents[currentPerson]) + "&&&" + JSON.stringify(EmailParameters), [["instructor", People[currentTime][currentPerson].Uid]]);
            }
            sendUpdate().then(function () {
                resetloader(false, null, null, false);
            }).catch((f) => {
                resetloader(false, null, null, false);
                if (f === "409") {
                    alert("One of the classes has been updated by a different user since you loaded this page. Please save to overwrite those changes or refresh to see them. No emails have been sent.");
                } else {
                    console.log(f);
                    alert("An error occured. Please check your connection and try again");
                }
            });
        }
    }
};
function getEmailsForStudent(sheet, student) {
    emails = [];
    for (var i = 0; i < Email_Field_Count; i++) {
        var email = document.getElementById("sheet:" + sheet + ":student:" + student + ":input:" + i).value;
        if (email_pattern.test(email) === true) {
            emails.push(email);
        }
    }
    return emails;
}

const prevlookup_selector = document.getElementById("prevlookup-select");
const prevlookup_sheetinfo = document.getElementById("prevlookup-info");
const prevlookup_details = document.getElementById("prevlookup-details");
const prevlookup_next = document.getElementById("prevlookup-next");
const prevlookup_previous = document.getElementById("prevlookup-previous");
const prevlookup_labels = {Date: document.getElementById("prevlookup-date"), Level: document.getElementById("prevlookup-level"), Instructor: document.getElementById("prevlookup-instructor"),
    Barcode: document.getElementById("prevlookup-barcode"), Result: document.getElementById("prevlookup-result")};
var prevlookupResults = null;
var prevlookupsheet = -1;
prevlookupbtn.onclick = function () {
    prevlookupResults = null;
    if (currentSheet !== -1 && documents[currentPerson][currentSheet].UniqueID) {
        resetloader(true, null, null, false);
        getLookup(documents[currentPerson][currentSheet].UniqueID).then((res) => {
            prevlookupResults = JSON.parse(res);
            resetloader(false, prevlookupmenu, "block", false);
            //Display results
            clearChildren(prevlookup_selector);
            for (var n = 0; n < documents[currentPerson][currentSheet].Names.length; n++) {
                var nameopt = document.createElement("option");
                nameopt.textContent = documents[currentPerson][currentSheet].Names[n] ? documents[currentPerson][currentSheet].Names[n] : "(No Name)";
                nameopt.value = n;
                prevlookup_selector.appendChild(nameopt);
            }
            displayStudent(0);
        });
    }

    function displayStudent(student) {
        displayStudentSheet(student, 0);
        function displayStudentSheet(student, sheet) {
            if (prevlookupResults[student] && prevlookupResults[student][sheet]) {
                let data = prevlookupResults[student][sheet];
                prevlookupsheet = sheet;
                prevlookup_next.disabled = sheet >= prevlookupResults[student].length - 1;
                prevlookup_previous.disabled = sheet === 0;
                prevlookup_sheetinfo.textContent = (sheet + 1) + " / " + prevlookupResults[student].length;
                prevlookup_labels["Date"].textContent = data.Session; //timestampToText();
                prevlookup_labels["Level"].textContent = data.LevelName;
                prevlookup_labels["Instructor"].textContent = data.Instructor;
                prevlookup_labels["Barcode"].textContent = "#" + data.Barcode;
                prevlookup_labels["Result"].textContent = data.NextLevelName;
                clearChildren(prevlookup_details);
                getLvlInfo(data.Level).then(() => {
                    let list = document.createElement("ul");
                    for (var s = 0; s < Levels[data.Level].Skills.length; s++) {
                        let listItem = document.createElement("li");
                        listItem.textContent = Levels[data.Level].Skills[s].Name;
                        if (data.Marks[s] === false) {
                            listItem.className = "weak";
                        }
                        list.appendChild(listItem);
                        if (Levels[data.Level].MustSees && Levels[data.Level].MustSees[s] !== undefined) {
                            let mslist = document.createElement("ul");
                            for (var m = 0; m < Levels[data.Level].MustSees[s].length; m++) {
                                let ms = document.createElement("li");
                                ms.textContent = Levels[data.Level].MustSees[s][m].Name;
                                mslist.appendChild(ms);
                                if (data.Marks[s] === false && data.MustSees[s].indexOf(m) !== -1) {
                                    ms.className = "weak";
                                }
                            }
                            list.appendChild(mslist);
                        }
                    }
                    prevlookup_details.appendChild(list);
                    if (data.Comment) {
                        let commentxt = document.createElement("b");
                        commentxt.textContent = "Comment";
                        prevlookup_details.appendChild(commentxt);
                        let comment = document.createElement("p");
                        comment.textContent = data.Comment;
                        prevlookup_details.appendChild(comment);
                    }
                });
            } else {
                prevlookup_sheetinfo.textContent = "No Results";
                prevlookupsheet = -1;
                Object.keys(prevlookup_labels).forEach((key) => {
                    prevlookup_labels[key].textContent = "";
                });
                clearChildren(prevlookup_details);
                prevlookup_next.disabled = true;
                prevlookup_previous.disabled = true;
            }
        }

        prevlookup_selector.onchange = function () {
            displayStudent(parseInt(prevlookup_selector.value));
        };
        prevlookup_previous.onclick = function () {
            displayStudentSheet(student, prevlookupsheet - 1);
        };
        prevlookup_next.onclick = function () {
            displayStudentSheet(student, prevlookupsheet + 1);
        };
    }

    async function getLookup(sheet) {
        return await send_http_request("1/search/lookup", sheet, [["instructor", People[currentTime][currentPerson].Uid]]);
    }
};
searchbtn.onclick = async function () {
    var searchData = JSON.parse(searchbtn.getAttribute("data-search"));
    if (searchbtn.getAttribute("data-search") !== "{}") {//Not empty, search term exists
        let pos = People[currentTime].findIndex(function (obj) {
            return obj.Uid === searchData.Instructor;
        });
        await changeDisplayedInstructor(pos);
        let sheetindex = documents[currentPerson].findIndex(function (sheet) {
            return parseInt(sheet.UniqueID) === parseInt(searchData.UniqueID);
        });
        renderTable(sheetindex);
        resetloader(false, null, null, false);
        searchbar.value = "";
        searchbtn.setAttribute("data-search", "{}");
    }
};
const MAX_SEARCH_RESULTS = 10;
searchbar.addEventListener("focus", bindSearchBar);
function bindSearchBar() {
    send_http_request("1/search/students", currentTime, []).then((students) => {
        students = JSON.parse(students);
        updateSearchWithEdits(students);
        console.log(students);
        if (document.getElementById("searchBackground")) {
            document.getElementById("searchBackground").remove();
        }
        let searchDiv = document.createElement("div");
        searchDiv.id = "searchBackground";
        document.body.appendChild(searchDiv);
        let searchBound = searchbar.getBoundingClientRect();
        searchDiv.style.top = searchBound.bottom + "px";
        searchDiv.style.left = searchBound.left + "px";
        searchDiv.style.width = (searchBound.width - 2) + "px";
        searchbar.className = "expand";
        searchbar.addEventListener("keyup", executeSearch);
        function executeSearch() {
            let searchVal = searchbar.value;
            var res = students.filter(function (student) {
                return student.Name.toLowerCase().substring(0, searchVal.length) === searchVal.toLowerCase();
            });
            if (res.length > 0 && searchVal !== "") {
                searchbtn.setAttribute("data-search", JSON.stringify(res[0]));
            } else {
                searchbtn.setAttribute("data-search", "{}");
            }
            clearChildren(searchDiv);
            for (var s = 0; s < res.length && s < MAX_SEARCH_RESULTS; s++) {
                var studentBtn = document.createElement("div");
                searchDiv.appendChild(studentBtn);
                studentBtn.textContent = res[s].Name;
                bindClick(studentBtn, res[s]);
                let instructorIndex = People[currentTime].findIndex(function (obj) {
                    return obj.Uid === res[s].Instructor;
                });
                var instText = document.createElement("i");
                instText.textContent = People[currentTime][instructorIndex].Name;
                studentBtn.appendChild(instText);
                function bindClick(btn, stuData) {
                    btn.onmousedown = async function () {
                        let pos = People[currentTime].findIndex(function (obj) {
                            return obj.Uid === stuData.Instructor;
                        });
                        await changeDisplayedInstructor(pos, () => {
                            if (stuData.UniqueID !== undefined) {
                                return documents[currentPerson].findIndex(function (sheet) {
                                    return parseInt(sheet.UniqueID) === parseInt(stuData.UniqueID);
                                });
                            } else {
                                return stuData.SheetIndex;
                            }
                        });
                        searchbar.value = "";
                        searchbtn.setAttribute("data-search", "{}");
                    };
                }
            }
        }
    });
    function updateSearchWithEdits(students) {
        for (var i = 0; i < documents.length; i++) {
            for (var x = 0; x < documents[i].length; x++) {
                var currentDocStudents = documents[i][x].Names;
                for (var s = 0; s < currentDocStudents.length; s++) {
                    //For each student in EVERY class, check if in index array from server
                    var existPos = students.findIndex(function (student) {
                        return student.Name === currentDocStudents[s];
                    });
                    if (existPos === -1) {//Not in index array, add
                        students.push({SheetIndex: x.UniqueID, Instructor: People[currentTime][i].Uid, Name: documents[i][x].Names[s]});
                    }
                }
            }
        }
    }
}

window.onload = function () {

    handleresize();
    window.addEventListener("resize", handleresize);
    window.onbeforeunload = function () {
        return EditPending === true ? "" : null;
    };
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            initClientDatabase().then(async() => {
                await initCoreData(false);
                startCardGenerator(true, Facilities, Timeblocks);
                loadFacilitySelect();
                getUser().catch((err) => {
                    alert("Error loading user, please try again later");
                    console.log(err);
                });
                InitRenderer(true, true);
                PerformServiceWorkerInit(false);
            }).catch((f) => {
                console.log(f);
                alert("Error logging in - please try again later");
            });
        } else {
            document.cookie = "token=";
            location.reload(true);
        }
    }, function (error) {
        alert('Unexpected error logging in: please check your connection or try later' + error); //TODO:redirect
    });
    window.addEventListener("SettingUpdate", function () {
        if (Settings.supervisorEmail === false) {
            emailbtn.style.display = "none";
            emailbtn.disabled = true;
            emailbtn.title = "Settings do not permit you to send emails";
        }
    });
    screenquery.addListener(function () {
        //screen size went above or below 700px
        if (sheetinfo.textContent !== "No Selection" && screenquery.matches) {
            sheetinfo.textContent = sheetinfo.textContent.split("#")[0];
        }
        handleresize();
        if (screenquery.matches) {//small screen
        } else {//large screen
        }
    });
    searchbar.onblur = function () {
        let searchBackground = document.getElementById("searchBackground");
        searchbar.className = "";
        if (searchBackground) {
            searchBackground.remove();
        }
    };
    instmodebtn.onclick = function () {
        window.location.href = "/?ds=false";
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
};
//Handle schedule requesting view of sheet
async function handleScheduleViewSheet(instructor, sheet) {
    resetloader(false, null, null, false);
    var sheetPos = documents[instructor].indexOf(sheet);
    await changeDisplayedInstructor(instructor, (() => {
        return sheetPos;
    }));
}