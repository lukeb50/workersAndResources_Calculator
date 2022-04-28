/* global parseInt */
/*global firebase, EditPending, LevelConfigs, initClientDatabase, clientDb, email_pattern, send_http_request, Intl, Levels*/
var currentimgfile;
var documents = [];
var images = [];
var reader = new FileReader();
var currentSheet = -1;
var UserData;
var currentTime = 0;
var People = [];
var currentPerson = 0;
var emailParameters;
var UsersInfo = null;

var Facilities = {};
var Timeblocks = {};

//Level Info
const lvlmappings = {0: "Instructor", 1: "Lead Instructor", 2: "Programmer"};

const selectfile = document.getElementById("selectfile");
const imgselect = document.getElementById("imgselector");
const storage = firebase.app().storage("gs://report-cards-6290-uploads");
const uploadbar = document.getElementById("uploadbar");
const uploadprogress = document.getElementById("uploadprogress");
const uploadinfinite = document.getElementById("scanbar");
const barlist = document.getElementById("barlist");
const btnnext = document.getElementById("lowbar_next");//not inverted to allow click in same dir
const btnback = document.getElementById("lowbar_back");//as scrolling
const upload_button_div = document.getElementById("uploaderdiv");
const maintable = document.getElementById("maintable");
const sheetinfo = document.getElementById("sheetinfo");
const add_row_btn = document.getElementById("add_row_btn");
const new_sheet_manual = document.getElementById("new_sheet_manual");
const manual_div = document.getElementById("manual_lvl_div");
const manual_sel = document.getElementById("manual_selector");
const topbar_controls = document.getElementById("topbar-controls");
const overflowbtn = document.getElementById("overflowbtn");
const lowbar = document.getElementById("lowbar_container");

const loadblocker = document.getElementById("loadblocker");
const blocker = document.getElementById("blocker");
const blocker_mark = document.getElementById("blocker_mark");
const blocker_change = document.getElementById("change_marking_div");
const blocker_mustsee = document.getElementById("blocker_mustsees");
const blocker_lvl = document.getElementById("blocker_changelvl");

const mainmenu = document.getElementById("main-menu");
const close_mainmenu = document.getElementById("main-menu-close-btn");

const printsheet = document.getElementById("print-sheet-btn");
const printsheetdiv = document.getElementById("print-sheet-div");
const printtime = document.getElementById("print-time-btn");
const printpersondiv = document.getElementById("print-person-div");
const printsheetlbl = document.getElementById("print-sheet-label");
const printexecutebtn = document.getElementById("print-menu-execute");

const email_maindiv = document.getElementById("email-maindiv");

const billing_table = document.getElementById("billing-table");

const report_table = document.getElementById("report-table");
const report_target_select = document.getElementById("report-target-select");
const report_run = document.getElementById("report-run");

const savebtn = document.getElementById("savebtn");
const printbtn = document.getElementById("printbtn");
const emailbtn = document.getElementById("emailbtn");

const userbtn = document.getElementById("userbtn");
const lookupbtn = document.getElementById("lookupbtn");
const recordbtn = document.getElementById("recordbtn");
const reportbtn = document.getElementById("reportbtn");
const generalbtn = document.getElementById("generalbtn");
const todsbtn = document.getElementById("todsbtn");

const usermenu = document.getElementById("user-menu-holder");
const lookupmenu = document.getElementById("lookup-menu-holder");
const generalmenu = document.getElementById("general-menu-holder");
const sheetmenu = document.getElementById("table-menu-holder");
const recordmenu = document.getElementById("record-menu-holder");
const reportmenu = document.getElementById("report-menu-holder");
const metadatamenu = document.getElementById("metadata-menu");
const addusermenu = document.getElementById("adduser-menu");

const progscreens = [usermenu, lookupmenu, generalmenu, sheetmenu, recordmenu, reportmenu];

const progbtns = [userbtn, lookupbtn, recordbtn, generalbtn, todsbtn, reportbtn];

const topbtns = [savebtn, printbtn, emailbtn];//buttons in topbar that may need to overflow
const topbtnlens = [];
for (var i = 0; i < topbtns.length; i++) {//compute used space for each element
    topbtnlens[i] = parseInt(topbtns[i].getBoundingClientRect().width);//elwidth;
}

const loadspinner = document.getElementById("loadspinner");
const overflowmenu = document.getElementById("topbar-overflow-holder");
const overflower = document.getElementById("topbar-overflow");
const addable_list = document.getElementById("addable-container");
const currenttlist = document.getElementById("current-time-list");

const printmenu = document.getElementById("print-menu");
const emailmenu = document.getElementById("email-menu");

const instlist = document.getElementById("personlist");

const closeoverflowmenu = document.getElementById("topbar-overflow-close");

const worksheet_select_div = document.getElementById("worksheet-multiple-select");

const commentmenu = document.getElementById("comment-menu");

const loaditms = [loadspinner, worksheet_select_div, overflower, printmenu, emailmenu, commentmenu, metadatamenu, addusermenu];//items that should be hidden when showing main blocker

const screenquery = window.matchMedia("(max-width: 700px)");

window.onload = function () {
    document.querySelectorAll('.setting-arrow').forEach(function (arrow) {
        arrow.onclick = function () {
            toggleSettingsSection(arrow);
        };
    });

    toggleSettingsSection(document.getElementById("advancedtabbtn"));

    document.querySelectorAll('.qhelp').forEach(function (qbtn) {
        qbtn.onclick = function () {
            alert(qbtn.getAttribute("data-info"));
        };
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

    function closeMenuBind() {
        resetloader(false, null, null);
    }
    ;

    close_mainmenu.onclick = closeMenuBind;

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

    function resetProgScreens(toShow, initFunction, displayType) {
        if (EditPending === false) {
            internalResetProgScreens(toShow, initFunction, displayType);
        } else {
            if (confirm("Discard changes?")) {
                changeEditPending(false);
                internalResetProgScreens(toShow, initFunction, displayType);
            }
        }
    }

    resetloader(true, null, null);
    resetProgScreens(null, null, null);

    function internalResetProgScreens(toShow, initFunction, displayType) {
        for (var i = 0; i < progscreens.length; i++) {
            progscreens[i].style.display = "none";
        }
        if (toShow !== null) {
            toShow.style.display = displayType ? displayType : "block";
            if (initFunction) {
                initFunction();
            }
        }
    }

    const user_menu_list = document.getElementById("user-menu-list");
    function showUserMenu() {
        clearChildren(user_menu_list);
        if (UsersInfo === null) {
            resetloader(true, null, null);
            getUsers().then((Users) => {
                UsersInfo = JSON.parse(Users);
                displayUserMenu();
                resetloader(false, null, null);
            }).catch((f) => {
                alert("Error getting users");
                console.log(f);
                resetloader(false, null, null);
            });
        } else {
            displayUserMenu();
        }
        async function getUsers() {
            return await send_http_request("2/get/users", "", []);
        }
    }

    document.getElementById("add-user-btn").onclick = function () {
        close_mainmenu.onclick = closeUserMenu;
        clearChildren(adduser_history);
        adduser_input.value = "";
        resetloader(false, addusermenu, "block");
    };

    function closeUserMenu() {
        close_mainmenu.onclick = closeMenuBind;
        resetloader(false, null, null);
        UsersInfo = null;
        showUserMenu();
    }

    const adduser_history = document.getElementById("adduser-history");
    const adduser_input = document.getElementById("adduser-input");

    document.getElementById("adduser-execute").onclick = function () {
        var emailToAdd = adduser_input.value;
        if (emailToAdd && email_pattern.test(emailToAdd) === true) {
            //create record line
            handleUserAdd(emailToAdd);
        } else {
            alert("Invalid email");
        }
    };

    function handleUserAdd(emailToAdd) {
        var holderDiv = document.createElement("div");
        var emailP = document.createElement("p");
        emailP.textContent = emailToAdd;
        var statusLbl = document.createElement("label");
        statusLbl.textContent = "Working";
        holderDiv.appendChild(emailP);
        holderDiv.appendChild(statusLbl);
        adduser_history.appendChild(holderDiv);
        adduser_input.value = "";
        adduser_input.focus();
        addUser(emailToAdd).then(() => {
            statusLbl.textContent = "Success";
            statusLbl.className = "success";
        }).catch((e) => {
            statusLbl.textContent = "Failure";
            statusLbl.className = "fail";
        });
    }

    async function addUser(email) {
        return send_http_request("2/add/user", email, []);
    }

    function displayUserMenu() {
        for (var u = 0; u < UsersInfo.length; u++) {
            var User = UsersInfo[u];
            var div = document.createElement("div");
            var lbl = document.createElement("label");
            lbl.textContent = User.Name ? User.Name : User.Email;
            div.appendChild(lbl);
            var permission = document.createElement("select");
            for (var l = 0; l < Object.keys(lvlmappings).length; l++) {
                var opt = document.createElement("option");
                opt.value = l;
                opt.textContent = lvlmappings[l];
                permission.appendChild(opt);
            }
            permission.value = User.Permission;
            handlePermissionChange(permission, User.Uid, User.Permission);
            if (User.Uid === firebase.auth().currentUser.uid) {
                permission.disabled = true;
            }
            div.appendChild(permission);
            var timediv = document.createElement("div");
            timediv.className = "time";

            if (User.Timeblocks) {
                for (var t = 0; t < User.Timeblocks.length; t++) {
                    var timeset = document.createElement("div");
                    var timetxt = document.createElement("p");
                    timetxt.textContent = convertTimeblockString(User.Timeblocks[t]);
                    timeset.appendChild(timetxt);
                    var timebtn = document.createElement("button");
                    timebtn.textContent = "View Sheets";
                    timeset.appendChild(timebtn);
                    showUserTimeSheets(timebtn, User.Uid, User.Timeblocks[t].split("---")[1], User.Timeblocks[t].split("---")[0]);
                    timediv.appendChild(timeset);
                }
                if (User.Timeblocks.length === 0) {
                    var noTime = document.createElement("p");
                    noTime.className = "notime";
                    noTime.textContent = "No times to display";
                    div.appendChild(noTime);
                }
                div.appendChild(timediv);
            } else {
                var noTime = document.createElement("p");
                noTime.className = "notime";
                noTime.textContent = "No times to display";
                div.appendChild(noTime);
            }
            var btndiv = document.createElement("div");
            btndiv.className = "btnholder";
            if (User.Uid !== firebase.auth().currentUser.uid) {
                var deletebtn = document.createElement("button");
                deletebtn.className = "mainround";
                deletebtn.textContent = "Delete User";
                //if (User.Permission === 2) {
                //deletebtn.disabled = true;
                //}
                handleAccBtns(User, deletebtn);
                btndiv.appendChild(deletebtn);
            } else {
                var p = document.createElement("b");
                p.textContent = "Cannot edit your own account";
                btndiv.appendChild(p);
            }
            div.appendChild(btndiv);
            user_menu_list.appendChild(div);
        }

        function handleAccBtns(User, Delete) {
            Delete.onclick = function () {
                if (confirm("You are about to delete user " + (User.Name ? User.Name : User.Email) + ". This action cannot be undone.")) {
                    resetloader(true, null, null);
                    DeleteUser(User.Uid).then((res) => {
                        UsersInfo = null;
                        showUserMenu();
                    }).catch((err) => {
                        alert("Error deleting user. Please try again later");
                        resetloader(false, null, null);
                    });
                }
            };

            async function DeleteUser(userId) {
                return await send_http_request("2/delete/user", userId, []);
            }
        }

        function handlePermissionChange(select, userId, initialValue) {
            select.onchange = function () {
                var newPermission = select.value;
                if (initialValue !== 2 || (initialValue === 2)) {// && confirm("You are about to downgrade a Programmer. They will be notified by email of this action."))) {
                    resetloader(true, null, null);
                    updatePermission(userId, newPermission).then((result) => {
                        resetloader(false, null, null);
                    }).catch((f) => {
                        resetloader(false, null, null);
                        console.log(f);
                        select.value = initialValue;
                        alert("Error changing permission");
                    });
                } else {
                    select.value = initialValue;
                }
            };

            async function updatePermission(userId, Permission) {
                return await send_http_request("2/update/permission", "", [["uid", userId], ["permission", Permission]]);
            }
        }

        function showUserTimeSheets(button, UID, Timeblock, Facility) {
            button.onclick = function () {
                currentTime = 0;//Facility + "---" + Timeblock;
                setProgrammer(Facility + "---" + Timeblock);
                resetloader(true, null, null);
                getTimeSheets(UID, Timeblock, Facility).then((sheets) => {
                    resetloader(false, null, null);
                    if (sheets !== "[]") {
                        sheets = JSON.parse(sheets);
                        resetProgScreens(sheetmenu, null, "flex");
                        lowbar.style.display = "flex";
                        //InitRenderer(true);
                        documents = [sheets];
                        People[0] = UsersInfo.filter(user => {
                            return user.Uid === UID;
                        });
                        handleresize();
                        renderTable(0);
                        populatebar(0);
                    } else {
                        alert("No sheets to display");
                    }
                }).catch((f) => {
                    resetloader(false, null, null);
                    alert("error");
                    console.log(f);
                });
            };
        }

        async function getTimeSheets(UID, Timeblock, Facility) {
            return await send_http_request("1/get/sheets", "", [["uid", UID], ["facility", Facility], ["timeblock", Timeblock]]);
        }
    }

    userbtn.onclick = function () {
        resetProgScreens(usermenu, showUserMenu, "block");
    };

    const record_time_filter = document.getElementById("record-time-filter");
    const record_action_filter = document.getElementById("record-action-filter");
    const record_location_filter = document.getElementById("record-location-filter");
    const record_search_btn = document.getElementById("record-filter-execute");
    const record_results = document.getElementById("record-menu-results");
    const record_filters = [{Key: "Location", Element: record_location_filter}, {Key: "Time-Sort", Element: record_time_filter}, {Key: "Type", Element: record_action_filter}];
    const record_display_functions = [{Type: "Email", Function: displayEmailResult}, {Type: "Permission", Function: displayPermissionResult}, {Type: "Account", Function: displayAccountResult}];
    var record_cursor = null;
    var cursor_search = null;
    function showRecordMenu() {
        clearChildren(record_results);
        clearChildren(record_location_filter);
        fKeys = Object.keys(Facilities);
        for (var i = 0; i < fKeys.length; i++) {
            var opt = document.createElement("option");
            opt.value = fKeys[i];
            opt.textContent = Facilities[fKeys[i]].Shortform;
            record_location_filter.appendChild(opt);
        }
        record_time_filter.value = "descending";
        record_action_filter.selectedIndex = 0;
        record_location_filter.selectedIndex = 0;
    }

    function search_Records(useCursor) {
        resetloader(true, null, null);
        getRecordResults(useCursor).then((results) => {
            resetloader(false, null, null);
            results = JSON.parse(results);
            if (results.CursorQuery === false) {
                while (record_results.firstChild) {
                    record_results.removeChild(record_results.firstChild);
                }
            }
            record_cursor = results.Cursor;//Set cursor for more results
            results = results.History; //Set to Array
            for (var i = 0; i < results.length; i++) {
                var div = document.createElement("div");
                div.className = "entry";
                var btitle = document.createElement("p");
                btitle.innerHTML = results[i].Type;
                div.appendChild(btitle);
                var uname = document.createElement("p");
                uname.innerHTML = "User: <b>" + results[i].SentBy.split(":::")[1] + "</b>";
                div.appendChild(uname);
                var tname = document.createElement("p");
                tname.innerHTML = "Time: <b>" + timestampToText(results[i].Timestamp) + "</b>";
                div.appendChild(tname);
                record_results.appendChild(div);
                var detailcontainer = document.createElement("div");
                detailcontainer.className = "detail";
                div.appendChild(detailcontainer);
                record_display_functions.filter(entry => {
                    return entry.Type === results[i].Type;
                })[0].Function(detailcontainer, results[i].Data);
            }
            if (results.length > 0) {
                var morediv = document.createElement("div");
                morediv.className = "loadmore";
                morediv.textContent = "Load More";
                morediv.onclick = function () {
                    search_Records(true);
                    morediv.remove();
                };
                record_results.appendChild(morediv);
            }
        }).catch((f) => {
            resetloader(false, null, null);
            alert("error");
            console.log(f);
        });
        async function getRecordResults(useCursor) {
            let search_params = {};
            for (var i = 0; i < record_filters.length; i++) {
                search_params[record_filters[i].Key] = record_filters[i].Element.value;
            }
            if (useCursor && record_cursor !== null) {
                search_params = cursor_search;
                search_params["Cursor"] = record_cursor;
            }
            cursor_search = search_params;
            return await send_http_request("2/get/records", JSON.stringify(search_params), []);
        }
    }
    ;
    record_search_btn.onclick = function () {
        search_Records(false);
    };

    function displayEmailResult(div, result) {
        for (var i = 0; i < result.length; i++) {
            var sheetdiv = document.createElement("div");
            var time = document.createElement("p");
            time.innerHTML = "Timeblock: <b>" + Timeblocks[parseInt(result[i].Timeblock)].Name + " (" + Facilities[parseInt(result[i].Facility)].Shortform + ")</b>";
            sheetdiv.appendChild(time);
            var bcode = document.createElement("button");
            bcode.innerHTML = "Barcode: <b>#" + result[i].Barcode + "</b>";
            bCodeClick(bcode, result[i].Barcode);
            sheetdiv.appendChild(bcode);
            let studiv = document.createElement("div");
            for (var x = 0; x < result[i].Details.Positions.length; x++) {
                var name = document.createElement("p");
                name.textContent = result[i].Details.Names[x];
                name.className = "studentname";
                studiv.appendChild(name);
                for (var e = 0; e < result[i].Details.Emails[x].length; e++) {
                    var email = document.createElement("p");
                    email.textContent = result[i].Details.Emails[x][i];
                    studiv.appendChild(email);
                }
            }
            sheetdiv.appendChild(studiv);
            div.appendChild(sheetdiv);

        }

        function bCodeClick(el, code) {
            el.onclick = function () {
                Lookup_Sheet(code, false);
            };
        }
    }

    function displayPermissionResult(div, result) {
        var OldPermission = document.createElement("p");
        OldPermission.innerHTML = "Old Permission: <b>" + lvlmappings[result.OldPermission] + "</b>";
        var NewPermission = document.createElement("p");
        NewPermission.innerHTML = "New Permission: <b>" + lvlmappings[result.NewPermission] + "</b>";
        var UserName = document.createElement("p");
        UserName.innerHTML = "Name: <b>" + result.Name + "</b>";
        div.appendChild(OldPermission);
        div.appendChild(NewPermission);
        div.appendChild(UserName);
    }

    function displayAccountResult(div, result) {
        var type = document.createElement("p");
        type.innerHTML = "Change Type: <b>" + result.Action + "</b>";
        div.appendChild(type);
        var user = document.createElement("p");
        user.innerHTML = "User Changed: <b>" + result.Name + "</b>";
        div.appendChild(user);
    }

    recordbtn.onclick = function () {
        resetProgScreens(recordmenu, showRecordMenu, "block");
    };

    const lookupinput = document.getElementById("barcodeinput");
    const lookupexecute = document.getElementById("sheet-search-btn");
    const lookuperror = document.getElementById("lookup-error-div");
    function showLookupMenu() {
        lookupinput.value = 0;
        lookuperror.style.display = "none";
    }
    lookupbtn.onclick = function () {
        resetProgScreens(lookupmenu, showLookupMenu, "block");
    };

    document.getElementById("reset-all-btn").onclick = function () {
        if (confirm("Are you sure you want to archive all active sheets?")) {
            resetloader(true, null, null);
            send_http_request("2/reset/all", "", []).then(() => {
                resetloader(false, null, null);
            }).catch((err) => {
                alert("Error clearing sheets, please try again.");
                console.log(err);
                resetloader(false, null, null);
            });
        }
    };

    function showGeneralMenu() {
        showSettings();
        showBilling();
    }

    generalbtn.onclick = function () {
        resetProgScreens(generalmenu, showGeneralMenu, "block");
    };

    document.getElementById("billing-previous-btn").onclick = function () {
        var month = document.getElementById("billing-month-select").value;
        var year = document.getElementById("billing-year-select").value;
        window.open("https://report-cards-6290.appspot.com/billing/generate/invoice?month=" + month + "&year=" + year, '_blank');
    };

    function Lookup_Sheet(Barcode, isArchive) {//run lookup for barcode
        resetloader(true, null, null);
        lookuperror.style.display = "none";
        getWithBarcode(Barcode).then((sheet) => {
            if (JSON.parse(sheet).length > 0) {
                sheet = JSON.parse(sheet);
                lowbar.style.display = "none";
                //InitRenderer(true);
                //Set people
                if (sheet.length === 1) {
                    resetProgScreens(sheetmenu, null, "flex");
                    document.getElementById("tablecontainer").className = "";
                    documents = [[sheet[0]]];
                    displayWorksheet(isArchive);
                    resetloader(false, null, null);
                } else if (sheet.length > 1) {
                    PromptWorksheet(sheet).then((pos) => {
                        resetProgScreens(sheetmenu, null, "flex");
                        document.getElementById("tablecontainer").className = "";
                        resetloader(false, null, null);
                        documents = [[sheet[pos]]];
                        displayWorksheet(isArchive);
                    });
                }
            } else {
                resetloader(false, null, null);
                lookuperror.style.display = "block";
            }
        }).catch((f) => {
            console.log(f);
            resetloader(false, null, null);
            alert("Error getting sheet");
        });
        async function getWithBarcode(barcode) {
            if (isArchive === false) {
                return await send_http_request("1/get/sheet", barcode, []);
            } else {
                return await send_http_request("2/get/sheet/archive", barcode, []);
            }
        }
    }

    function PromptWorksheet(options) {
        return new Promise((resolve) => {
            resetloader(false, worksheet_select_div, "block");
            while (worksheet_select_div.firstChild) {
                worksheet_select_div.removeChild(worksheet_select_div.firstChild);
            }
            var p = document.createElement("p");
            p.textContent = "There are multiple worksheets with the same barcode";
            worksheet_select_div.appendChild(p);
            for (var i = 0; i < options.length; i++) {
                var holder = document.createElement("div");
                var txt = document.createElement("label");
                var Timeblock = getArchiveSheetTimeblockData(Timeblocks, "Timeblock", options[i].Timeblock);
                var Facility = getArchiveSheetTimeblockData(Facilities, "Facility", options[i].Facility);
                txt.textContent = options[i].Level + " - " + Timeblock.Name + " (" + Facility.Shortform + ")";
                holder.appendChild(txt);
                var btn = document.createElement("button");
                function handleClick(btn, i) {
                    btn.onclick = function () {
                        resolve(i);
                    };
                }
                handleClick(btn, i);
                btn.className = "mainround";
                btn.textContent = "View";
                holder.appendChild(btn);
                worksheet_select_div.appendChild(holder);
            }
        });
    }

    function displayWorksheet(isArchive) {
        if (UsersInfo !== null) {
            if (UsersInfo.filter(user => {
                return user.Uid === documents[0][0].InstUID;
            }).length > 0) {
                //User lookup already done
                People[0] = UsersInfo.filter(user => {
                    return user.Uid === documents[0][0].InstUID;
                });
                handleresize();
                lowbar.style.display = "none";
            } else {
                //Lookup required?
            }
        } else {//Null, perform single lookup
            getSingleUser(documents[0][0].InstUID).then((inst) => {
                People[0] = [JSON.parse(inst)];
                handleresize();
            }).catch((err) => {
                //Attempt to create a user object
                if (documents[0][0].DeletedAt !== undefined) {
                    People[0] = [{Uid: documents[0][0].InstUID, PersonalName: documents[0][0].Instructor}];
                    handleresize();
                } else {
                    alert("Unable to load instructor info. Saving, printing and emailing will not work");
                    console.log(err);
                }
            });
        }
        if (isArchive === true) {
            alert("You are viewing an archived worksheet, saving and emailing are disabled");
            savebtn.disabled = true;
            emailbtn.disabled = true;//Archived view, disable email
        } else {
            savebtn.disabled = false;
            emailbtn.disabled = false; //Standard view, enable email
        }
        renderTable(0);
    }

    const TABLE_ROWS = ["Target", "Type", "Finished At", "Status"];
    var report_intervals = {};
    const report_targets = {LEVELS: "Levels", INSTRUCTORS: "Instructors", FACILITIES: "Facilities", TIMEBLOCKS: "Timeblocks", TIMES: "Times"};
    function showReportMenu() {
        clearChildren(report_table);
        report_target_select.value = "LEVELS";
        Object.keys(report_intervals).forEach((reportid) => {
            clearInterval(report_intervals[reportid]);
        });

        function createTable() {
            let thead = document.createElement("tr");
            report_table.appendChild(thead);
            TABLE_ROWS.forEach((name) => {
                let th = document.createElement("th");
                th.textContent = name;
                thead.appendChild(th);
            });
            resetloader(true, null, null);
            send_http_request("2/get/reports", "", [], "report").then((data) => {
                let repdata = JSON.parse(data);
                //repdata = [{Target:"Instructor",Type:"SSummary",Time:23143424,UniqueId:-1},{Target:"Instructor",Type:"SSummary",Time:-1,UniqueId:-1},{Target:"Instructor",Type:"SSummary",Time:23143424,UniqueId:-1}];
                repdata.forEach((data) => {
                    let row = document.createElement("tr");
                    report_table.appendChild(row);
                    let targetd = document.createElement("td");
                    row.appendChild(targetd);
                    targetd.textContent = data.Type === "Summary" ? report_targets[data.Target] : data.Target;
                    let typed = document.createElement("td");
                    row.appendChild(typed);
                    typed.textContent = data.Type;
                    let timed = document.createElement("td");
                    timed.id = data.UniqueId + "-Time";
                    row.appendChild(timed);
                    timed.textContent = data.Time !== -1 ? timestampToText(data.Time / 1000) : "";
                    let statusd = document.createElement("td");
                    row.appendChild(statusd);
                    if (data.Time === -1) {
                        statusd.id = data.UniqueId + "-Status";
                        //statusd.textContent = "Working";
                        let statusw = document.createElement("div");
                        statusw.className = "spinnerexternal";
                        statusd.appendChild(statusw);
                        let statuswinternal = document.createElement("div");
                        statuswinternal.className = "spinnerinternal";
                        statusw.appendChild(statuswinternal);
                        report_intervals[data.UniqueId] = setInterval(checkUpdate, 10000, data.UniqueId, data.Target);
                    } else {//Finished, show button
                        let statusb = document.createElement("button");
                        statusd.appendChild(statusb);
                        statusb.textContent = "View";
                        statusb.className = "mainround";
                        bindReportView(statusb, data.UniqueId, data.Target);
                    }
                });
                resetloader(false, null, null);
            }).catch((err) => {
                resetloader(false, null, null);
                alert("Error getting report information");
                console.log(err);
            });
        }
        function checkUpdate(id, target) {
            let iStatus = document.getElementById(id + "-Status");
            //iStatus.textContent = "Checking...";
            send_http_request("2/get/status", "", [["operationId", id], ["operationTarget", target]], "report").then((status) => {
                if (status !== "false") {
                    document.getElementById(id + "-Time").textContent = timestampToText(status / 1000);
                    clearInterval(report_intervals[id]);//Remove this call
                    clearChildren(iStatus);//Remove loading bar
                    let statusb = document.createElement("button");
                    iStatus.textContent = "";
                    iStatus.appendChild(statusb);
                    statusb.textContent = "View";
                    bindReportView(statusb, id, target);
                }
            });
        }

        createTable();
    }

    function bindReportView(btn, id, target) {
        btn.onclick = function () {
            resetloader(true, null, null);
            var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            window.open("https://report-cards-6290.appspot.com/report?operationId=" + id + "&operationTarget=" + target + "&time=" + timeZone, '_blank');
            resetloader(false, null, null);
        };
    }

    report_run.onclick = function () {
        resetloader(true, null, null);
        send_http_request("2/run/report", "", [["operationTarget", report_target_select.value]], "report").then(() => {
            showReportMenu();
        }).catch((err) => {
            console.log(err);
            resetloader(false, null, null);
            alert("Error running report");
        });
    };

    reportbtn.onclick = function () {
        resetProgScreens(reportmenu, showReportMenu, "block");
    };

    async function getSingleUser(UID) {
        return await send_http_request("1/get/inst", UID, []);
    }

    lookupexecute.onclick = function () {
        Lookup_Sheet(lookupinput.value, false);
    };

    document.getElementById("archive-search-btn").onclick = function () {
        Lookup_Sheet(lookupinput.value, true);
    };

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
        run_card_generation(documents[currentPerson], cardsToPrint, People[0][currentPerson].Name);
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

    async function getUser() {
        resetloader(true, null, null);
        UserData = JSON.parse(await send_http_request("-1/get/user", ""));
        UserData.Timeblocks = [""];
        if (UserData !== null) {
            if (!screenquery.matches) {
                document.getElementById("logout-btn").innerHTML = "Log Out [" + firebase.auth().currentUser.displayName + "]";
            }
            if (UserData.Timeblocks) {
                new_sheet_manual.style.display = "block";
            }
        } else {
            new_sheet_manual.style.display = "none";
            //selectfile.style.display = "none";
            alert("Unexpected error fetching your data - please try again later");
        }
        resetloader(false, null, null);
        //resetProgScreens(usermenu, showUserMenu,"block");
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

    handleresize();

    async function saveCurrentSheets(approved) {
        let result = null;
        if (currentTime !== null && currentPerson !== -1) {
            for (var i = 0; i < People[0].length; i++) {
                if (documents[i] !== undefined) {
                    if (documents[i].length > 0) {
                        var snapshot = JSON.parse(JSON.stringify(documents[i]));
                        for (var s = 0; s < snapshot.length; s++) {
                            if (snapshot[s].DeletedAt === undefined) {
                                delete snapshot[s].InstUID;
                            }
                        }
                        result = await send_http_request("1/save/sheets", JSON.stringify(snapshot), [["facility", documents[0][0].Facility], ["timeblock", documents[0][0].Timeblock], ["uid", People[0][i].Uid], ["approve", JSON.stringify(approved)]]);
                    }
                }
            }
        }
        return result;
    }

    savebtn.onclick = function () {
        saveSheets([]);
    };

    function saveSheets(approved) {
        resetloader(true, null, null);
        saveCurrentSheets(approved).then((f) => {
            if (f) {
                for (var p = 0; p < People[0].length; p++) {
                    if (documents[p]) {
                        for (var sheet = 0; sheet < documents[p].length; sheet++) {
                            if (approved.indexOf(documents[p][sheet].UniqueID) !== -1) {
                                documents[p][sheet].VerifiedBy = firebase.auth().currentUser.uid + ":::" + firebase.auth().currentUser.displayName;
                            }
                        }
                    }
                }
                populatebar(0);
                var Ids = JSON.parse(f);
                for (var i = 0; i < Ids.length; i++) {//TODO: see Google Keep note
                    documents[currentPerson][i].UniqueID = Ids[i];
                }
            }
            changeEditPending(false);
            resetloader(false, null, null);
        }).catch((f) => {
            console.log(f);
            alert("An error occured. Please check your connection and try again");
            resetloader(false, null, null);
        });
    }

    new_sheet_manual.onclick = function () {
        upload_button_div.style.display = "none";
        manual_div.style.display = "block";
    };

    document.getElementById("manual_back_btn").onclick = function () {
        upload_button_div.style.display = "flex";
        manual_div.style.display = "none";
    };

    btnnext.onclick = function () {
        populatebar(-1);
    };

    btnback.onclick = function () {
        populatebar(1);
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

    blocker.onclick = function (target) {
        if (target.target === blocker) {
            blocker.style.display = "none";
            renderTable(blocker_mark.getAttribute("data-id"));
        }
    };

    overflowbtn.onclick = function () {
        resetloader(false, overflower, "block");

    };

    emailbtn.onclick = function () {
        if (EditPending === false) {
            resetloader(false, emailmenu, "flex");
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
            title.textContent = documents[currentPerson][i].Level + " #" + documents[currentPerson][i].Barcode;
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
                        RequestBody.push({Facility: documents[currentPerson][i].Facility, Timeblock: documents[currentPerson][i].Timeblock, Barcode: documents[currentPerson][i].Barcode, UniqueID: documents[currentPerson][i].UniqueID, Details: {Positions: Positions, Emails: Emails, Names: Names}});
                    }
                }
                //Show confirmation screen
                EmailParameters = RequestBody;
                document.getElementById("email-menu-execute").textContent = "Send Emails";
                while (email_maindiv.firstChild) {
                    email_maindiv.removeChild(email_maindiv.firstChild);
                }
                var p = document.createElement("b");
                p.style.display = "block";
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
                        title.textContent = obj.Names[EmailParameters[i].Details.Positions[x]] + " - #" + obj.Barcode;
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
                p.style.borderTop = "1px solid #a9c8c8";
                p.style.display = "block";
                p.textContent = "This send will be logged, timestamped and attributed to your account. Please allow time for delivery before trying resend.";
                email_maindiv.appendChild(p);
            } else {
                alert("Please save before emailing.");
            }
        } else {//Send Emails
            if (confirm("Please confirm")) {
                resetloader(true, null, null);
                async function sendUpdate() {
                    let docstate = JSON.parse(JSON.stringify(documents[currentPerson]));
                    for (var i = 0; i < docstate.length; i++) {
                        if (docstate[i].DeletedAt === undefined) {
                            delete docstate[i].InstUID;
                        }
                    }//EmailParameters is SendData
                    return send_http_request("1/send/emails", JSON.stringify(docstate) + "&&&" + JSON.stringify(EmailParameters), [["instructor", People[0][currentPerson].Uid]]);
                }
                sendUpdate().then(function () {
                    resetloader(false, null, null);
                }).catch((f) => {
                    resetloader(false, null, null);
                    if (f === "409") {
                        alert("One of the classes has been updated by a different user since you loaded this page. Please save to overwrite those changes or refresh to see them. No emails have been sent.");
                    } else {
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

    document.getElementById("todsbtn").onclick = function () {
        window.location.href = "/?prog=false";
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

    window.onbeforeunload = function () {
        return EditPending === true ? "" : null;
    };

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            resetloader(true, null, null);
            initClientDatabase().then(async() => {
                await initCoreData(true);
                startCardGenerator(true, Facilities, Timeblocks);
                getUser().catch((err) => {
                    alert("Error loading user, please try again later");
                    console.log(err);
                });
                InitRenderer(true, false);
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

document.getElementById("advancedbtn").onclick = function () {
    if (confirm("Are you sure you want to view advanced settings? Improper use can permanently corrupt worksheets")) {
        window.open("../../static/inline-html/programmer-settings.html");
    }
};

function toggleSettingsSection(btn, useMargins) {
    var state = "";
    if (btn.textContent === "▲") {//close, otherwise ▼
        btn.textContent = "▼";
        state = "none";
    } else {
        btn.textContent = "▲";
        state = "block";
    }
    //offset by 1 to ignore for toggle bar
    for (i = 1; i < btn.parentElement.parentElement.children.length; i++) {
        btn.parentElement.parentElement.children[i].style.display = state;
    }
    if (useMargins === true || useMargins === undefined) {
        btn.parentElement.parentElement.style.marginBottom = state === "none" ? "0px" : "4px";
        btn.parentElement.style.marginBottom = state === "none" ? "0px" : "4px";
    } else {
        btn.parentElement.parentElement.style.marginBottom = "0px";
        btn.parentElement.style.marginBottom = "0px";
    }
}