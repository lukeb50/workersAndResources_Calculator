/* global parseInt */
/*global firebase, EditPending, initClientDatabase, Settings, getLvlInfo, Levels, send_http_request*/
var documents = [];
var currentSheet = -1;
var UserData;
var currentTime;
var Facilities = {};
var Timeblocks = {};

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

const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");

const loadblocker = document.getElementById("loadblocker");
const blocker = document.getElementById("blocker");
const blocker_mark = document.getElementById("blocker_mark");
const blocker_change = document.getElementById("change_marking_div");
const blocker_mustsee = document.getElementById("blocker_mustsees");
const blocker_lvl = document.getElementById("blocker_changelvl");

const visualmarkingname = document.getElementById("visualmarkingname");
const visualmarkingprogress = document.getElementById("visualmarkingprogress");
const visualmarkingprev = document.getElementById("visualmarkingprev");
const visualmarkingnext = document.getElementById("visualmarkingnext");

const printsheet = document.getElementById("print-sheet-btn");
const printsheetdiv = document.getElementById("print-sheet-div");
const printtime = document.getElementById("print-time-btn");
const printpersondiv = document.getElementById("print-person-div");
const printsheetlbl = document.getElementById("print-sheet-label");
const printexecutebtn = document.getElementById("print-menu-execute");

const timebtn = document.getElementById("timebtn");
const savebtn = document.getElementById("savebtn");
const printbtn = document.getElementById("printbtn");
const visualbtn = document.getElementById("visualmarkbtn");
const prevlookupbtn = document.getElementById("prevlookupbtn");
const evalbtn = document.getElementById("evalbtn");

const topbtns = [timebtn, savebtn, prevlookupbtn, printbtn, visualbtn, evalbtn];//buttons in topbar that may need to overflow
const topbtnlens = [];
for (var i = 0; i < topbtns.length; i++) {//compute used space for each element
    topbtnlens[i] = parseInt(topbtns[i].getBoundingClientRect().width);//elwidth;
}

const loadspinner = document.getElementById("loadspinner");
const overflowmenu = document.getElementById("topbar-overflow-holder");
const overflower = document.getElementById("topbar-overflow");
const timemenu = document.getElementById("time-menu");
const timemselect = document.getElementById("timemenu-select");
const addable_list = document.getElementById("addable-container");
const currenttlist = document.getElementById("current-time-list");
const accesslist = document.getElementById("access-time-list");

const printmenu = document.getElementById("print-menu");
const commentmenu = document.getElementById("comment-menu");
const visualmenu = document.getElementById("visualmarkingdiv");
const notemenu = document.getElementById("note-menu");
const prevlookupmenu = document.getElementById("previouslookup-menu");
const evalmenu = document.getElementById("eval-menu");

const msvholder = document.getElementById("visualmustseeholder");

const loaditms = [loadspinner, overflower, timemenu, printmenu, visualmenu, commentmenu, notemenu, prevlookupmenu, evalmenu];//items that should be hidden when showing main blocker

const screenquery = window.matchMedia("(max-width: 700px)");

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
        run_card_generation(documents[currentTime], cardsToPrint, firebase.auth().currentUser.displayName);
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
    ;

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

    timebtn.onclick = function () {
        timemselect.value = UserData.Home ? UserData.Home : Facilities[Object.keys(Facilities)[0]].UniqueID;
        resetloader(false, timemenu, "flex", false);
        showAvailableTimes();
        showCurrentTimes();
        showAccessTimes();
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
                documents[timeblockName] = [];
                currentTime = timeblockName;
                updateTimeSelector();//success, update UI
                showCurrentTimes();
                showAvailableTimes();
                new_sheet_manual.style.display = "block";
                //selectfile.style.display = "block";
            }).catch((f) => {
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
                var timeblockName = btn.getAttribute("data-facility") + "---" + btn.getAttribute("data-time");
                documents[timeblockName] = null;
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

    function bindCurrentReset(btn) {
        btn.onclick = function () {
            async function sendUpdate() {
                return send_http_request("0/delreset/sheets", "", [["facility", btn.getAttribute("data-facility")], ["timeblock", btn.getAttribute("data-time")], ["reset", true]]);
            }
            resetloader(true, null, null, false);
            sendUpdate().then(function () {
                resetloader(false, null, null, false);
                //Handling any finishing UI
                var timeblockName = btn.getAttribute("data-facility") + "---" + btn.getAttribute("data-time");
                documents[timeblockName] = [];
                renderTable(-1);
                populatebar(0);
            }).catch((f) => {
                resetloader(false, null, null, false);
                alert("An error occured. Please check your connection and try again");
            });
        };
    }

    function showCurrentTimes() {
        clearChildren(currenttlist);
        for (var i = 0; i < UserData.Timeblocks.length; i++) {//generate current time list
            var maindiv = document.createElement("div");
            var lbl = document.createElement("a");
            lbl.textContent = convertTimeblockString(UserData.Timeblocks[i]);
            maindiv.appendChild(lbl);
            var btndiv = document.createElement("div");
            var resetbtn = document.createElement("button");
            resetbtn.textContent = "Reset";
            resetbtn.className = "listreset";
            resetbtn.setAttribute("data-time", UserData.Timeblocks[i].split("---")[1]);
            resetbtn.setAttribute("data-facility", UserData.Timeblocks[i].split("---")[0]);
            bindCurrentReset(resetbtn);
            var removebtn = document.createElement("button");
            removebtn.setAttribute("data-time", UserData.Timeblocks[i].split("---")[1]);
            removebtn.setAttribute("data-facility", UserData.Timeblocks[i].split("---")[0]);
            removebtn.textContent = "-";
            removebtn.className = "listdot roundaction";
            bindCurrentRemove(removebtn);
            btndiv.appendChild(resetbtn);
            btndiv.appendChild(removebtn);
            maindiv.appendChild(btndiv);
            currenttlist.appendChild(maindiv);
        }
        if (UserData.Timeblocks.length === 0) {
            var msg = document.createElement("b");
            msg.textContent = "No Times";
            currenttlist.appendChild(msg);
        }
    }

    function showAccessTimes() {
        clearChildren(accesslist);
        UserData.TimeAccess.forEach((AccessId) => {
            let holder = document.createElement("div");
            let nameLabel = document.createElement("a");
            let AccessParts = AccessId.split("---");
            nameLabel.textContent = "Loading - " + Timeblocks[AccessParts[1]].Name + " (" + Facilities[AccessParts[0]].Shortform + ") ";
            nameLabel.id = "access-lbl-" + AccessParts[2];
            holder.appendChild(nameLabel);
            let btnHolder = document.createElement("div");
            let viewBtn = document.createElement("button");
            viewBtn.textContent = "View";
            viewBtn.className = "listreset";
            handleViewButton(viewBtn, AccessId);
            btnHolder.appendChild(viewBtn);
            let removeBtn = document.createElement("button");
            removeBtn.textContent = "-";
            removeBtn.className = "listdot roundaction";
            //btnHolder.appendChild(removeBtn);
            holder.appendChild(btnHolder);
            accesslist.appendChild(holder);
        });
        if (UserData.TimeAccess.length === 0) {
            var msg = document.createElement("b");
            msg.textContent = "No Times";
            accesslist.appendChild(msg);
        }
        loadUserDisplayNames();

        async function loadUserDisplayNames() {
            let Ids = [];
            UserData.TimeAccess.forEach((AccessId) => {
                let AccessParts = AccessId.split("---");
                Ids.push(AccessParts[2]);
            });
            Data = JSON.parse(await send_http_request("0/get/names", JSON.stringify(Ids)));
            UserData.TimeAccess.forEach((AccessId) => {
                let AccessParts = AccessId.split("---");
                let lbl = document.getElementById("access-lbl-" + AccessParts[2]);
                lbl.textContent = Data[AccessParts[2]] + " - " + Timeblocks[AccessParts[1]].Name + " (" + Facilities[AccessParts[0]].Shortform + ") ";
            });
        }

        function handleViewButton(btn, AccessId) {
            btn.onclick = function () {
                var editWindow = window.open("../../static/inline-html/time-access.html", "Worksheets", 'left=0,top=0,width=' + window.innerWidth + ',height=' + window.innerHeight);
                editWindow.currentTime = AccessId;
            };
        }
    }

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

    window.addEventListener("resize", handleresize);

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
        if (documents[currentTime]) {
            if (documents[currentTime].length * 150 >= barlist.offsetWidth || (barlist.offsetWidth / 150) <= 50) {
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

    handleresize();

    async function saveCurrentSheets() {
        let results = [];
        if (currentTime) {
            for (var i = 0; i < UserData.Timeblocks.length; i++) {
                if (documents[UserData.Timeblocks[i]] !== undefined) {
                    results[i] = JSON.parse(await send_http_request("0/save/sheets", JSON.stringify(documents[UserData.Timeblocks[i]]), [["facility", UserData.Timeblocks[i].split("---")[0]], ["timeblock", UserData.Timeblocks[i].split("---")[1]]]));
                } else {
                    results[i] = null;
                }
            }
        }
        return results;
    }

    function SaveSheets() {//Should be set to save all timeblocks
        resetloader(true, null, null, false);
        saveCurrentSheets().then((IdArray) => {
            if (IdArray) {
                for (var t = 0; t < IdArray.length; t++) {
                    if (IdArray[t] !== null) {
                        let Ids = IdArray[t];
                        for (var i = 0; i < Ids.length; i++) {
                            documents[UserData.Timeblocks[t]][i].UniqueID = Ids[i];
                        }
                    }
                }
            }
            changeEditPending(false);
            resetloader(false, null, null, false);
        }).catch((f) => {
            alert("An error occured. Please check your connection and try again");
            resetloader(false, null, null, false);
        });
    }

    savebtn.onclick = function () {
        SaveSheets();
    };

    async function getCurrentSheets() {
        if (currentTime) {
            return await send_http_request("0/get/sheets", currentTime, [["facility", currentTime.split("---")[0]], ["timeblock", currentTime.split("---")[1]]]);
        }
        return null;
    }

    function HandleLoad() {
        resetloader(true, null, null, false);
        getCurrentSheets().then((f) => {
            if (JSON.parse(f).length > 0) {
                documents[currentTime] = JSON.parse(f);
                renderTable(0);
            } else {
                documents[currentTime] = [];
                renderTable(-1);
            }
            populatebar(0);
            resetloader(false, null, null, false);
        }).catch((f) => {
            console.log(f);
            alert("An error occured. Please check your connection and try again");
            resetloader(false, null, null, false);
        });
    }

    timeselect.onchange = function () {//handle changing time with dropdown
        currentTime = timeselect.value;
        if (documents[currentTime] && documents[currentTime].length > 0) {//already contains data, do not load
            populatebar(0);
            if (documents[currentTime].length > 0) {
                renderTable(0);
            } else {
                renderTable(-1);
            }
        } else {//no data, load
            HandleLoad();
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

    /*visualbtn.onclick = function () {
     for (var i = 0; i < documents[currentTime][currentSheet].Marks.length; i++) {
     if (documents[currentTime][currentSheet].Marks[i].indexOf(false) !== -1) {//person fails
     resetloader(false ,visualmenu ,"block" ,false);
     GenerateVisualMarking(documents[currentTime][currentSheet].Level, i);
     break;
     }
     }
     
     };
     
     document.getElementById("visualmarkingclose").onclick = function () {
     resetloader(false ,null ,null ,false);
     renderTable(currentSheet);
     };*/

    blocker.onclick = function (target) {
        if (target.target === blocker) {
            blocker.style.display = "none";
            renderTable(blocker_mark.getAttribute("data-id"));
        }
    };

    overflowbtn.onclick = function () {
        resetloader(false, overflower, "block", false);
    };

    /*function getWeakPositions() {
     var weaks = [];
     for (var i = 0; i < documents[currentTime][currentSheet].Marks.length; i++) {
     if (documents[currentTime][currentSheet].Marks[i].indexOf(false) !== -1) {
     weaks.push(i);
     }
     }
     return weaks;
     }
     
     function GenerateVisualMarking(lvl, p) {
     visualmarkingnext.setAttribute("data-p", p);
     visualmarkingnext.setAttribute("data-lvl", lvl);
     visualmarkingname.textContent = documents[currentTime][currentSheet].Names[p];
     let weaks = getWeakPositions();
     if (weaks.indexOf(p) === 0) {
     visualmarkingprev.disabled = true;
     } else {
     visualmarkingprev.disabled = false;
     }
     if (weaks.indexOf(p) === weaks.length - 1) {
     visualmarkingnext.disabled = true;
     } else {
     visualmarkingnext.disabled = false;
     }
     visualmarkingprogress.textContent = (weaks.indexOf(p) + 1) + "/" + (weaks.length);
     while (msvholder.firstChild) {
     msvholder.removeChild(msvholder.firstChild);
     }
     document.getElementById("cardimg").src = "../static/images/" + lvl.replace(" ", "") + "BACK.jpg";
     var usedsegments = [];
     for (var i = 0; i < Object.keys(mustseeinfo[lvl].MustSees).length; i++) {//skill
     var ref = mustseeinfo[lvl][Object.keys(mustseeinfo[lvl])[i]];
     if (documents[currentTime][currentSheet].Marks[p][Object.keys(mustseeinfo[lvl])[i]] === false) {
     for (var x = 0; x < ref.length; x++) {//must see:ref[x]
     let seediv = document.createElement("div");
     if (documents[currentTime][currentSheet].MustSees[p][Object.keys(mustseeinfo[lvl])[i]].indexOf(x) !== -1) {
     seediv.className = "selectedmsholder";
     
     } else {
     seediv.className = "unselectedmsholder";
     }
     for (var z = 0; z < ref[x].Blocks.length; z++) {//each block
     if (usedsegments.indexOf(ref[x].Blocks[z][0][0] + ":" + ref[x].Blocks[z][0][1] + ":" + (ref[x].Blocks[z][1][1] - ref[x].Blocks[z][0][1]) + ":" + (Math.abs(ref[x].Blocks[z][1][0] - ref[x].Blocks[z][0][0]))) === -1) {
     let div = document.createElement("div");
     div.style.position = "absolute";
     div.style.left = ref[x].Blocks[z][0][0];
     div.style.top = ref[x].Blocks[z][0][1];
     div.style.height = ref[x].Blocks[z][1][1] - ref[x].Blocks[z][0][1];
     div.style.width = Math.abs(ref[x].Blocks[z][1][0] - ref[x].Blocks[z][0][0]);
     seediv.setAttribute("data-skill", Object.keys(mustseeinfo[lvl])[i]);
     seediv.setAttribute("data-mustsee", x);
     seediv.appendChild(div);
     usedsegments.push(ref[x].Blocks[z][0][0] + ":" + ref[x].Blocks[z][0][1] + ":" + (ref[x].Blocks[z][1][1] - ref[x].Blocks[z][0][1]) + ":" + (Math.abs(ref[x].Blocks[z][1][0] - ref[x].Blocks[z][0][0])));
     }
     }
     seediv.onclick = function () {//handle click and setting mustsee
     if (seediv.className === "unselectedmsholder") {
     documents[currentTime][currentSheet].MustSees[p][seediv.getAttribute("data-skill")].push(parseInt(seediv.getAttribute("data-mustsee")));
     seediv.className = "selectedmsholder";
     } else {
     documents[currentTime][currentSheet].MustSees[p][seediv.getAttribute("data-skill")].splice(documents[currentTime][currentSheet].MustSees[p][seediv.getAttribute("data-skill")].indexOf(parseInt(seediv.getAttribute("data-mustsee"))), 1);
     seediv.className = "unselectedmsholder";
     }
     };
     msvholder.appendChild(seediv);
     }
     }
     }
     }
     
     visualmarkingprev.onclick = function () {
     GenerateVisualMarking(visualmarkingnext.getAttribute("data-lvl"), parseInt(visualmarkingnext.getAttribute("data-p")) - 1);
     };
     
     visualmarkingnext.onclick = function () {
     GenerateVisualMarking(visualmarkingnext.getAttribute("data-lvl"), parseInt(visualmarkingnext.getAttribute("data-p")) + 1);
     };*/

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
        if (currentSheet !== -1 && documents[currentTime][currentSheet].UniqueID) {
            resetloader(true, null, null, false);
            prevlookupResults = null;
            getLookup(documents[currentTime][currentSheet].UniqueID).then((res) => {
                prevlookupResults = JSON.parse(res);
                resetloader(false, prevlookupmenu, "block", false);
                //Display results
                clearChildren(prevlookup_selector);
                for (var n = 0; n < documents[currentTime][currentSheet].Names.length; n++) {
                    var nameopt = document.createElement("option");
                    nameopt.textContent = documents[currentTime][currentSheet].Names[n] ? documents[currentTime][currentSheet].Names[n] : "(No Name)";
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
                    prevlookup_labels["Date"].textContent = data.Session;//timestampToText();
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
            return await send_http_request("0/search/lookup", sheet, []);
        }
    };

    const evalList = document.getElementById("eval-list");
    const evalPanel = document.getElementById("eval-panel");
    const evalLabel = document.getElementById("eval-panel-name");
    const evalSignBtn = document.getElementById("eval-sign-btn");
    const evalSignText = document.getElementById("eval-sign-text");
    evalbtn.onclick = function () {
        resetloader(true, null, null, false);
        getEvals().then((data) => {
            data = JSON.parse(data);
            clearChildren(evalList);
            clearChildren(evalPanel);
            resetloader(false, evalmenu, "block", true);
            function renderEvalList() {
                clearChildren(evalList);
                evalLabel.textContent = "Evaluations";
                evalSignBtn.disabled = true;
                evalSignBtn.onclick = null;
                evalSignText.textContent = "";
                for (var i = 0; i < data.length; i++) {
                    //Render list
                    var holder = document.createElement("div");
                    var name = document.createElement("b");
                    name.textContent = data[i].Name === "" ? "(No Name)" : data[i].Name;
                    holder.appendChild(name);
                    evalList.appendChild(holder);
                    bindShowEvalBtn(holder, i);
                }

                function bindShowEvalBtn(btn, evalI) {
                    btn.onclick = function () {
                        clearChildren(evalPanel);
                        let tData = data[evalI];
                        if(parseInt(tData.SignatureDate)===-1){
                            evalSignBtn.disabled = false;
                            evalSignText.textContent = "Not Signed";
                            evalSignBtn.onclick = function(){
                                resetloader(true,null,null,false);
                                send_http_request("0/sign/evaluation", tData.UniqueID, []).then((t)=>{
                                    data[evalI].SignatureDate = parseInt(t);
                                    evalSignBtn.disabled = true;
                                    evalSignText.textContent = "Signed on " + TimestampToText(tData.SignatureDate);
                                    resetloader(false, evalmenu, "block", true);
                                }).catch((err)=>{
                                    alert("Error signing evaluation");
                                    console.log(err);
                                    resetloader(false, evalmenu, "block", true);
                                });
                            };
                        }else{
                            evalSignText.textContent = "Signed on " + timestampToText(tData.SignatureDate);
                            evalSignBtn.disabled = true;
                        }
                        evalLabel.textContent = (tData.Name !== "" ? tData.Name : "(No Name)");
                        for (var i = 0; i < tData.RowData.length; i++) {
                            var row = document.createElement("tr");
                            evalPanel.appendChild(row);
                            //individual elements
                            for (var x = 0; x < tData.RowData[i].length; x++) {
                                var newEl;
                                if (tData.RowData[i][x].elementType !== "input" || (tData.RowData[i][x].elementType === "input" && tData.RowData[i][x].inputType === "checkbox")) {
                                    newEl = document.createElement(tData.RowData[i][x].elementType);
                                } else {
                                    newEl = document.createElement("b");
                                }
                                newEl.type = tData.RowData[i][x].inputType;
                                newEl.name = tData.RowData[i][x].name;
                                if (tData.RowData[i][x].isText === true) {
                                    newEl.textContent = tData.RowData[i][x].textValue;
                                }
                                newEl.className = tData.RowData[i][x].className;
                                if (tData.RowData[i][x].value !== undefined) {
                                    if (tData.RowData[i][x].inputType === "checkbox") {
                                        newEl.checked = tData.RowData[i][x].value;
                                        newEl.onclick = function(){
                                            return false;
                                        };
                                    } else {
                                        newEl.disabled = true;
                                        newEl.textContent = tData.RowData[i][x].value;
                                    }
                                }
                                row.appendChild(newEl);
                            }
                        }
                    };
                }
            }
            renderEvalList();
        }).catch((err) => {
            console.log(err);
            alert("Error getting evaluations");
            resetloader(false, null, null, false);
        });
        async function getEvals() {
            return await send_http_request("0/get/evaluations", currentTime, []);
        }
    };

    function PrepareScreen() {
        prevlookupbtn.style.display = Settings.allowLookup === true ? "inline-block" : "none";
        evalbtn.style.display = Settings.useInstructorEvals === true ? "inline-block" : "none";
    }

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

    window.onbeforeunload = function () {
        return EditPending === true ? "" : null;
    };

    document.getElementById("settings-btn").onclick = function () {
        window.location.href = "../account";
    };

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            initClientDatabase().then(async() => {
                await initCoreData(false);
                startCardGenerator(false, Facilities, Timeblocks);
                loadFacilitySelect();
                getUser();
                await InitRenderer();
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
};