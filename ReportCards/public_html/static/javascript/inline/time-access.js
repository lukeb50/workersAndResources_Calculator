/* global firebase, initClientDatabase, Settings, loadspinner, printsheetdiv, printtime, printsheet, printbtn, Levels */

var documents = [];
var currentSheet = -1;
var UserData;
var currentTime;
var Facilities = {};
var Timeblocks = {};

const storage = firebase.app().storage("gs://report-cards-6290-uploads");
const barlist = document.getElementById("barlist");
const new_sheet_manual = document.getElementById("new_sheet_manual");
const loadblocker = document.getElementById("loadblocker");
const blocker = document.getElementById("blocker");
const blocker_mark = document.getElementById("blocker_mark");
const blocker_change = document.getElementById("change_marking_div");
const blocker_mustsee = document.getElementById("blocker_mustsees");
const blocker_lvl = document.getElementById("blocker_changelvl");

const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");

const upload_button_div = document.getElementById("uploaderdiv");
const sheetinfo = document.getElementById("sheetinfo");

const printmenu = document.getElementById("print-menu");
const commentmenu = document.getElementById("comment-menu");
const visualmenu = document.getElementById("visualmarkingdiv");
const metadatamenu = document.getElementById("metadata-menu");
const overflower = document.getElementById("topbar-overflow");

const printexecutebtn = document.getElementById("print-menu-execute");
const printsheet = document.getElementById("print-sheet-btn");
const printtime = document.getElementById("print-time-btn");
const printsheetdiv = document.getElementById("print-sheet-div");
const printpersondiv = document.getElementById("print-person-div");
const printsheetlbl = document.getElementById("print-sheet-label");

const savebtn = document.getElementById("savebtn");

const screenquery = window.matchMedia("(max-width: 700px)");

const loaditms = [loadspinner,overflower, printmenu, visualmenu, commentmenu, metadatamenu];//items that should be hidden when showing main blocker

window.onload = function () {
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

    close_mainmenu.onclick = function () {
        resetloader(false, null, null);
    };
};

blocker.onclick = function (target) {
    if (target.target === blocker) {
        blocker.style.display = "none";
        renderTable(blocker_mark.getAttribute("data-id"));
    }
};

async function saveCurrentSheets() {
    return JSON.parse(await send_http_request("0/access/save/sheets", JSON.stringify(documents[currentTime]), [["accessid", currentTime]]));
}

function SaveSheets() {//Should be set to save all timeblocks
    resetloader(true, null, null);
    saveCurrentSheets().then((IdArray) => {
        if (IdArray) {
            for (var i = 0; i < IdArray.length; i++) {
                documents[currentTime][i].UniqueID = IdArray[i];
            }
            delbtns = document.getElementsByClassName("bardeletebtn");
            for (var d = 0; d < delbtns.length; d++) {
                delbtns[d].remove();
            }
        }
        changeEditPending(false);
        resetloader(false, null, null);
    }).catch((f) => {
        alert("An error occured. Please check your connection and try again");
        resetloader(false, null, null);
    });
}

savebtn.onclick = function () {
    SaveSheets();
};

printbtn.onclick = function () {
    resetloader(false, printmenu, "flex");
    printExclusions = [];
    printShowTimeList();
    printsheet.classList.add("print-selected");
        printtime.classList.remove("print-selected");
    printsheetdiv.style.display = "none";
    printShowStudentList(currentSheet);
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

printexecutebtn.onclick = async function () {
    let cardsToPrint = [];
    if (printtime.classList.contains("print-selected")) {//print time
        for (var x = 0; x < printsheetdiv.childNodes.length; x++) {
            let el = printsheetdiv.childNodes[x].getElementsByTagName("INPUT")[0];
            let currentSheetNum = el.getAttribute("data-sheet");
            if (el.checked === true && documents[currentTime][currentSheetNum].VerifiedBy !== "") {
                var currentSheetInfo = {Level: documents[currentTime][currentSheetNum].Level, Data: []};
                for (var y = 0; y < documents[currentTime][currentSheetNum].Names.length; y++) {
                    if (printExclusions.indexOf(currentSheetNum + ":" + y) === -1) {
                        currentSheetInfo.Data.push({Sheet: currentSheetNum, Student: y});
                    }
                }
                cardsToPrint.push(currentSheetInfo);
            }
        }
    } else {//print worksheet
        var currentSheetInfo = {Level: documents[currentTime][currentSheet].Level, Data: []};
        for (var x = 0; x < printpersondiv.childNodes.length; x++) {
            let el = printpersondiv.childNodes[x].getElementsByTagName("INPUT")[0];
            if (el.checked === true && documents[currentTime][currentSheet].VerifiedBy !== "") {
                currentSheetInfo.Data.push({Sheet: currentSheet, Student: x});
            }
        }
        cardsToPrint.push(currentSheetInfo);
    }
    let PersonName = JSON.parse(await send_http_request("0/get/names", JSON.stringify([currentTime.split("---")[2]])))[currentTime.split("---")[2]];
    run_card_generation(documents[currentTime], cardsToPrint, PersonName);
};

function printShowStudentList(sheet) {
    while (printpersondiv.firstChild) {
        printpersondiv.removeChild(printpersondiv.firstChild);
    }
    if (sheet >= 0) {
        printpersondiv.style.display = "block";
        printsheetlbl.textContent = Levels[documents[currentTime][sheet].Level].Name + " #" + documents[currentTime][sheet].Barcode;
        for (var i = 0; i < documents[currentTime][sheet].Names.length; i++) {
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
            lbl.textContent = documents[currentTime][sheet].Names[i];
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

function printShowTimeList() {
    while (printsheetdiv.firstChild) {
        printsheetdiv.removeChild(printsheetdiv.firstChild);
    }
    for (var i = 0; i < documents[currentTime].length; i++) {
        if (documents[currentTime][i].VerifiedBy !== "") {
            let container = document.createElement("div");
            let check = document.createElement("input");
            check.type = "checkbox";
            check.checked = true;
            check.setAttribute("data-sheet", i);
            check.id = "sheet-check-" + i;
            container.appendChild(check);
            let lbl = document.createElement("label");
            lbl.setAttribute("for", "sheet-check-" + i);
            lbl.textContent = Levels[documents[currentTime][i].Level].Name + " #" + documents[currentTime][i].Barcode;
            let btn = document.createElement("button");
            btn.textContent = "Expand";
            handleprintExpand(btn, i);
            container.appendChild(lbl);
            container.appendChild(btn);
            printsheetdiv.appendChild(container);
        }
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

function PrepareScreen() {

}

function HandleLoad() {
    resetloader(true, null, null);
    getCurrentSheets().then((f) => {
        if (JSON.parse(f).length > 0) {
            documents[currentTime] = JSON.parse(f);
            renderTable(0);
        } else {
            documents[currentTime] = [];
            renderTable(-1);
        }
        populatebar(0);
        resetloader(false, null, null);
    }).catch((f) => {
        console.log(f);
        alert("An error occured. Please check your connection and try again");
        resetloader(false, null, null);
    });

    async function getCurrentSheets() {
        console.log(currentTime);
        if (currentTime) {
            return await send_http_request("0/access/get/sheets", currentTime, []);
        }
        return null;
    }
}

async function getUser() {
    resetloader(true, null, null);
    UserData = JSON.parse(await send_http_request("-1/get/user", ""));
    if (UserData !== null) {
        new_sheet_manual.style.display = "block";
        HandleLoad();
    } else {
        new_sheet_manual.style.display = "none";
        //selectfile.style.display = "none";
        alert("Unexpected error fetching your data - please try again later");
        resetloader(false, null, null);
    }
}

function handleresize() {//Dummy function. Topbar will not resize

}

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        initClientDatabase().then(async() => {
            await initCoreData(false);
            startCardGenerator(false, Facilities, Timeblocks);
            getUser();
            await InitRenderer();
            setAccess();
            staticPath = "..";
            PrepareScreen();
        }).catch((f) => {
            alert("Error logging in - please try again later");
            console.log(f);
        });
    } else {
        document.cookie = "token=";
        location.reload(true);
    }
}, function (error) {
    alert('Unexpected error logging in: please check your connection or try later' + error); //TODO:redirect
});
