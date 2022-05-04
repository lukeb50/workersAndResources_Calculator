/* global LevelConfigs, clientDb, initClientDatabase, firebase, email_pattern */

var GroupingData = null;
var isLevelEdit = false;

var Facilities = {};
var Timeblocks = {};

Levels = {};

const groupmenu = document.getElementById("group-menu");

const loadblocker = document.getElementById("loadblocker");

const mainmenu = document.getElementById("main-menu");

const loaditms = [groupmenu];

document.querySelectorAll('.setting-arrow').forEach(function (arrow) {
    arrow.onclick = function () {
        if (arrow.classList.contains("nomargin")) {
            toggleSettingsSection(arrow, false);
        } else {
            toggleSettingsSection(arrow, true);
        }
    };
});

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


const GroupList = document.getElementById("lvl-list-settings-groups");
async function generateLvlGroupingSettingsList() {
    if (GroupingData === null) {
        GroupingData = await getGroups();
        if (GroupingData === null) {//No data in db, dummy array
            GroupingData = [];
        }
    }
    clearChildren(GroupList);
    for (var i = 0; i < GroupingData.length; i++) {
        var currentGroup = GroupingData[i];
        createListItem(currentGroup, i, GroupingData.length);
    }
    createListNewItem();
    generateLvlSettingsList();
    async function getGroups() {
        return await clientDb.ref("Level-Grouping").once('value').then((snap) => {
            GroupingData = snap.val();
            return snap.val();
        });
    }

    function createListNewItem() {
        var holder = document.createElement("div");
        holder.className = "lvl-settings-sidelist";
        var lbl = document.createElement("label");
        lbl.textContent = "New Group";
        holder.appendChild(lbl);
        var box = document.createElement("div");
        var newBtn = document.createElement("button");
        newBtn.textContent = "Create";
        box.appendChild(newBtn);
        newBtn.onclick = function () {
            var newName = prompt("Enter group name:").escapeJSON();
            if (newName !== "" && newName !== null) {
                GroupingData.push({Name: newName, Color: "#ffffff", Autosort: true, Regex: "", Visible: true});
                setLevelEdit(true);
                generateLvlGroupingSettingsList();
            }
        };
        holder.appendChild(box);
        GroupList.appendChild(holder);
    }

    function createListItem(currentGroup, i, length) {
        var holder = document.createElement("div");
        holder.className = "lvl-settings-sidelist";
        var lbl = document.createElement("label");
        lbl.textContent = currentGroup.Name;
        holder.appendChild(lbl);
        holder.appendChild(createBtns(i, length));
        GroupList.appendChild(holder);
    }

    function createBtns(i, length) {
        var box = document.createElement("div");
        createLvlSettingListBtn("Name", box, bindChangeName, i, null);
        createLvlSettingListBtn("Match", box, bindMatchChange, i, null);
        createLvlSettingListBtn("Color", box, bindColorChange, i, null);
        var visibleTxt = "Visible: " + (GroupingData[i].Visible === true ? "Yes" : "No");
        createLvlSettingListBtn(visibleTxt, box, bindVisibleToggle, i, GroupingData[i].Visible === true ? "shown" : "hidden");
        var autosortTxt = "Autosort: " + (GroupingData[i].Autosort === true ? "On" : "Off");
        createLvlSettingListBtn(autosortTxt, box, bindAutosortToggle, i, "autosort" + (GroupingData[i].Autosort === false ? "off" : ""));
        var upBtn = createLvlSettingListBtn("🠉", box, bindUpArrow, i, null);
        upBtn.disabled = i === 0;
        var downBtn = createLvlSettingListBtn("🠋", box, bindDownArrow, i, null);
        downBtn.disabled = i === length - 1;
        createLvlSettingListBtn("X", box, bindDelete, i, null);
        return box;
    }

    function bindAutosortToggle(btn, i) {
        btn.onclick = function () {
            GroupingData[i].Autosort = !GroupingData[i].Autosort;
            btn.title = "Autosort: " + (GroupingData[i].Autosort === true ? "On" : "Off");
            btn.src = "../images/autosort" + (GroupingData[i].Autosort === true ? "" : "off") + ".png";
            setLevelEdit(true);
        };
    }

    function bindDelete(btn, i) {
        btn.onclick = function () {
            if (confirm("Delete this group?")) {
                GroupingData.splice(i, 1);
                setLevelEdit(true);
                generateLvlGroupingSettingsList();//regenerate data
            }
        };
    }

    function bindVisibleToggle(btn, i) {
        btn.onclick = function () {
            GroupingData[i].Visible = !GroupingData[i].Visible;
            btn.title = "Visible: " + (GroupingData[i].Visible === true ? "Yes" : "No");
            btn.src = "../images/" + (GroupingData[i].Visible === true ? "shown" : "hidden") + ".png";
            setLevelEdit(true);
        };
    }

    function bindUpArrow(btn, i) {
        btn.onclick = function () {
            GroupingData.move(i, i - 1);
            setLevelEdit(true);
            generateLvlGroupingSettingsList();//regenerate data

        };
    }

    function bindDownArrow(btn, i) {
        btn.onclick = function () {
            GroupingData.move(i, i + 1);
            setLevelEdit(true);
            generateLvlGroupingSettingsList();//regenerate data
        };
    }

    function bindColorChange(btn, i) {
        btn.onclick = function () {
            resetloader(false, groupmenu, "block");
            document.getElementById("regex-menu").style.display = "none";
            document.getElementById("group-color-menu").style.display = "block";
            document.getElementById("color-input").value = GroupingData[i].Color;
            getUserInput().then((newVal) => {
                resetloader(false, null, null);
                GroupingData[i].Color = newVal;
                setLevelEdit(true);
            });
        };
        function getUserInput() {
            return new Promise((resolve) => {
                document.getElementById("applyColor").onclick = function () {
                    resolve(document.getElementById("color-input").value);
                };
            });
        }
    }

    function bindMatchChange(btn, i) {
        btn.onclick = function () {
            resetloader(false, groupmenu, "block");
            document.getElementById("regex-menu").style.display = "block";
            document.getElementById("group-color-menu").style.display = "none";
            document.getElementById("regex-input").value = GroupingData[i].Regex;
            getUserInput().then((newVal) => {
                resetloader(false, null, null);
                GroupingData[i].Regex = newVal;
                generateLvlSettingsList();//Regen level list, may change groups
                setLevelEdit(true);
            });
        };

        function getUserInput() {
            return new Promise((resolve) => {
                document.getElementById("applyRegex").onclick = function () {
                    resolve(document.getElementById("regex-input").value.escapeJSON());
                };
            });
        }
    }

    function bindChangeName(btn, i) {
        btn.onclick = function () {
            var newName = prompt("Enter new name for group " + GroupingData[i].Name + ":");
            if (newName !== "" && newName !== null) {
                GroupingData[i].Name = newName.escapeJSON();
                setLevelEdit(true);
                generateLvlGroupingSettingsList();//regenerate data
            }
        };
    }
}

const LvlList = document.getElementById("lvl-list-settings-levels");

async function generateLvlSettingsList() {
    generateMainLevelConfig(-1, null);
    clearChildren(LvlList);
    var RegexPatterns = [];
    for (var r = 0; r < GroupingData.length; r++) {
        if (GroupingData[r].Regex !== "") {
            RegexPatterns.push({Name: GroupingData[r].Name, Regex: new RegExp(GroupingData[r].Regex)});
        }
    }
    for (const [id, lvl] of Object.entries(Levels)) {
        LvlList.appendChild(generateLevelListing(id, lvl, RegexPatterns));
    }
    LvlList.appendChild(generateNewLevelListing());

    function generateNewLevelListing() {
        var container = document.createElement("div");
        container.className = "lvl-settings-sidelist";
        var lbl = document.createElement("label");
        lbl.textContent = "New Level";
        container.appendChild(lbl);
        var box = document.createElement("div");
        createLvlSettingListBtn("Create", box, ((btn) => {
            btn.onclick = function () {
                var newName = prompt("Enter new level name:").escapeJSON();
                if (newName !== null && newName !== "") {
                    var newLvlId = calculateUniqueObjectID(newName, Levels);
                    Levels[newLvlId] = {Name: newName, Shortform: "", MustSees: {}, Skills: [], Settings: {CommentEnabled: false, WeakLetter: "w", WeakLetterOffset: 0, WeakGrouping: false}, CONSTANT: [], PASS: []};
                    setLevelEdit(true);
                    generateLvlSettingsList();
                }
            };
        }), null, null, null);
        container.appendChild(box);
        return container;
    }

    function generateLevelListing(id, lvl, RegexPatterns) {
        var container = document.createElement("div");
        container.className = "lvl-settings-sidelist";
        var groupName = "No Group";
        for (var x = 0; x < RegexPatterns.length; x++) {
            if (RegexPatterns[x].Regex.test(lvl.Name) === true) {
                groupName = RegexPatterns[x].Name;
                break;
            }
        }
        var lbl = document.createElement("label");
        /*if (isFull && (!NextLvlDetails[i]["PASS"])) {TODO
         //potential alert icon
         var alertholder = document.createElement("div");
         var alertico = document.createElement("img");
         alertico.src = "../images/cross.png";
         alertholder.appendChild(alertico);
         var infotext = document.createElement("label");
         infotext.className = "alerttext";
         infotext.textContent = "Missing Next Level Options";
         infotext.title = "Ensure that 'Passing Options' has at least 1 level selected";
         alertholder.appendChild(infotext);
         container.appendChild(alertholder);
         }*/
        //
        lbl.textContent = lvl.Name;
        container.appendChild(lbl);
        var typelbl = document.createElement("label");
        typelbl.className = "unbold";
        typelbl.textContent = "(" + groupName + ") " + " Level";
        container.appendChild(typelbl);
        container.appendChild(generateBtns(id, lvl));
        container.onclick = function () {
            generateMainLevelConfig(id, lvl);
        };
        return container;
    }

    function generateBtns(id, lvl) {
        var holder = document.createElement("div");
        holder.appendChild(createLvlSettingListBtn("Name", holder, bindChangeName, lvl, null));
        holder.appendChild(createLvlSettingListBtn("X", holder, bindDelete, id, null, null));
        return holder;
    }

    function bindDelete(btn, id) {
        btn.onclick = function () {
            if (confirm("Delete this level?")) {
                delete Levels[id];
                setLevelEdit(true);
                generateLvlSettingsList();
            }
        };
    }

    function bindChangeName(btn, lvl) {
        btn.onclick = function () {
            var newName = prompt("New name for level:").escapeJSON();
            if (newName !== null && newName !== "") {
                lvl.Name = newName;
                setLevelEdit(true);
                generateLvlSettingsList();
            }
        };
    }
}

function createLvlSettingListBtn(txt, bindTo, bindFunc, lvl, imgName, posVal) {
    if (imgName === undefined)
        imgName = null;
    var btn = document.createElement(imgName === null ? "button" : "input");
    if (imgName === null) {
        btn.textContent = txt;
    } else {
        btn.title = txt;
    }
    if (imgName !== null) {
        btn.type = "image";
        btn.src = "../images/" + imgName + ".png";
    }
    bindTo.appendChild(btn);
    if (bindFunc) {
        bindFunc(btn, lvl,posVal);
    }
    return btn;
}

const mainLevelConfig = document.getElementById("main-lvl-config-container");
const mainLevelNextLvls = document.getElementById("settings-passing-div");
const mainLevelConstantLvls = document.getElementById("settings-constant-div");
const passingSelect = document.getElementById("Passing-Level-Select");
const constantSelect = document.getElementById("Constant-Level-Select");
const passingAddBtn = document.getElementById("Add-Passing-Level");
const constantAddBtn = document.getElementById("Add-Constant-Level");
const shortform_input = document.getElementById("shortform-input");
const editorBtn = document.getElementById("open-editor-btn");
const SkillChannel = new BroadcastChannel("Skill");
const MustSeeChannel = new BroadcastChannel("MustSee");
for (var c = 0; c < LevelConfigs.length; c++) {//1 time binding
    bindOnLvlSettingChange(LevelConfigs[c].Element);
}
function bindOnLvlSettingChange(item) {//binding function
    item.onchange = function () {
        var id = parseInt(item.getAttribute("data-id"));
        var x = item.getAttribute("data-x");
        Levels[id].Settings[LevelConfigs[x].Name] = item.type === "checkbox" ? item.checked : item.value.escapeJSON();
        setLevelEdit(true);
    };
}
function updateEditBtn(id) {
    editorBtn.onclick = function () {
        var editWindow = window.open("../inline-html/card-editor.html", "Card Editor", 'left=0,top=0,width=' + window.innerWidth + ',height=' + window.innerHeight);
        editWindow.allLvlInfo = Levels;
        editWindow.Id = id;
    };
}
function generateMainLevelConfig(id, lvl) {
    initSettings(id, lvl);
    initNextLevels(lvl);
    initMainConfig(id, lvl);
    editorBtn.disabled = true;
    if (lvl === null) {//Don't render full view if partial level, only next info
        return;
    }
    editorBtn.disabled = false;
    updateEditBtn(id);

    function initMainConfig(id, lvl) {
        clearChildren(mainLevelConfig);
        if (lvl === null) {
            return;
        }
        var lbl = document.createElement("label");
        lbl.textContent = lvl.Name;
        if (!lvl.Skills) {
            lvl.Skills = [];
        }
        for (var c = 0; c < lvl.Skills.length; c++) {
            var div = document.createElement("div");
            var lbl = document.createElement("label");
            lbl.textContent = lvl.Skills[c].Name;
            div.appendChild(lbl);
            var btnholder = document.createElement("div");
            btnholder.className = "btnholder";
            div.appendChild(btnholder);
            var delbtn = createLvlSettingListBtn("X", btnholder, bindDelete, lvl, null, c);
            var upbtn = createLvlSettingListBtn("🠉", btnholder, bindUpArrow, lvl, null, c);
            upbtn.disabled = c === 0;
            var downbtn = createLvlSettingListBtn("🠋", btnholder, bindDownArrow, lvl, null, c);
            downbtn.disabled = c === lvl.Skills.length - 1;
            delbtn.className = "del";
            var addbtn = createLvlSettingListBtn("New Must See", btnholder, bindNewMustSee, lvl, null, c);
            addbtn.className = "green";
            if (lvl.MustSees && lvl.MustSees[c]) {
                for (var t = 0; t < lvl.MustSees[c].length; t++) {
                    var p = document.createElement("p");
                    p.textContent = lvl.MustSees[c][t].Name;
                    bindMustSeeClick(p, lvl, c, t);//Send to card editor
                    div.appendChild(p);
                    var delmsbtn = createLvlSettingListBtn("X", div, bindMustSeeDelete, c, null, t);
                    delmsbtn.className = "del";
                }
            }
            mainLevelConfig.appendChild(div);
            bindSkillClick(lbl, lvl, c);//Send to card editor
        }
        //New Skill
        var div = document.createElement("div");
        mainLevelConfig.appendChild(div);
        var lbl = document.createElement("label");
        lbl.textContent = "New Skill";
        div.appendChild(lbl);
        var btn = document.createElement("button");
        btn.textContent = "Create";
        btn.className = "green";
        btn.onclick = function () {
            var newName = prompt("Enter skill name:").escapeJSON();
            if (newName !== "" && newName !== null) {
                if (!lvl.Skills) {
                    lvl.Skills = [];
                }
                ;
                lvl.Skills.push({Name: newName});
                generateMainLevelConfig(id, lvl);
                setLevelEdit(true);
            }
        };
        div.appendChild(btn);

        function bindSkillClick(div, lvl, c) {
            div.onclick = function () {
                SkillChannel.postMessage(c);
            };
        }

        function bindMustSeeClick(div, lvl, c, m) {
            div.onclick = function () {
                MustSeeChannel.postMessage({Skill: c, MustSee: m});
            };
        }

        function bindNewMustSee(btn, lvl, c) {
            btn.onclick = function () {
                console.log(c);
                var newName = prompt("Must See Name:").escapeJSON();
                if (newName !== null && newName !== "") {
                    console.log(lvl.MustSees);
                    if (!lvl.MustSees) {
                        lvl.MustSees = {};
                    }
                    console.log(lvl.MustSees);
                    if (!lvl.MustSees[c]) {
                        lvl.MustSees[c] = [];
                    }
                    console.log(lvl.MustSees[c]);
                    lvl.MustSees[c].push({Name: newName});
                    generateMainLevelConfig(id, lvl);
                    setLevelEdit(true);
                }
            };
        }

        function bindMustSeeDelete(btn, c, t) {
            btn.onclick = function () {
                if (confirm("Delete this must see?")) {
                    lvl.MustSees[c].splice(t, 1);
                    generateMainLevelConfig(id, lvl);
                    setLevelEdit(true);
                }
            };
        }

        function bindDownArrow(btn, lvl, c) {
            btn.onclick = function () {
                moveSkill(lvl, c, c + 1);
                generateMainLevelConfig(id, lvl);
                setLevelEdit(true);
            };
        }

        function bindUpArrow(btn, lvl, c) {
            btn.onclick = function () {
                moveSkill(lvl, c, c - 1);
                generateMainLevelConfig(id, lvl);
                setLevelEdit(true);
            };
        }

        function moveSkill(lvl, from, to) {
            if (lvl.MustSees) {
                var tmp = Object.keys(lvl.MustSees);
                var newArray = [];//used to resuffle
                for (var v = 0; v < lvl.Skills.length; v++) {
                    if (tmp.indexOf(v.toString()) !== -1) {
                        newArray[v] = lvl.MustSees[v];
                    } else {
                        newArray[v] = null;
                    }
                }
                newArray.move(from, to);
                lvl.Skills.move(from, to);
                var newMustSees = {};
                for (var v = 0; v < newArray.length; v++) {
                    if (newArray[v] !== null) {
                        newMustSees[v.toString()] = newArray[v];
                    }
                }
                lvl.MustSees = newMustSees;
            }
        }

        function bindDelete(btn, lvl, c) {
            btn.onclick = function () {
                if (!confirm("Delete this skill?")) {
                    return;
                }
                lvl.Skills.splice(c, 1);
                generateMainLevelConfig(id, lvl);
                setLevelEdit(true);
            };
        }
    }
    function initNextLevels(lvl) {
        shortform_input.disabled = lvl === null;
        if (lvl !== null) {
            shortform_input.value = lvl.Shortform;
        }
        function initSelector(lvl, type, selector) {
            clearChildren(selector);
            if (lvl === null) {
                setInputsEnabled(false);
                return;
            }
            if (lvl[type] === undefined) {
                lvl[type] = [];
            }
            setInputsEnabled(true);
            var toCreate = [];
            for (const [iterateId, iterateLvl] of Object.entries(Levels)) {
                if (lvl[type].indexOf(parseInt(iterateId)) === -1) {
                    toCreate.push({Name: iterateLvl.Name, Id: iterateId});
                }
            }
            clearChildren(selector);
            for (var lvl of toCreate) {
                var opt = document.createElement("option");
                opt.textContent = lvl.Name;
                opt.value = lvl.Id;
                selector.appendChild(opt);
            }
        }
        initSelector(lvl, "PASS", passingSelect);
        initSelector(lvl, "CONSTANT", constantSelect);

        function initList(type, holder) {
            clearChildren(holder);
            if (lvl === null || lvl[type] === undefined) {
                return;
            }
            for (var c = 0; c < lvl[type].length; c++) {
                holder.appendChild(createItem(c));
            }
            function createItem(pos) {
                var div = document.createElement("div");
                div.className = "next-list-item";
                var lbl = document.createElement("label");
                lbl.textContent = Levels[lvl[type][pos]].Name;
                div.appendChild(lbl);
                var btn = document.createElement("button");
                btn.className = "roundaction listdot";
                btn.textContent = "-";
                bindRemoveItem(btn, type, pos);
                div.appendChild(btn);
                return div;
            }

            function bindRemoveItem(btn, type, pos) {
                btn.onclick = function () {
                    lvl[type].splice(pos, 1);
                    initNextLevels(lvl);
                    setLevelEdit(true);
                };
            }
        }
        initList("PASS", mainLevelNextLvls);
        initList("CONSTANT", mainLevelConstantLvls);
        function setInputsEnabled(state) {
            passingAddBtn.disabled = !state;
            constantAddBtn.disabled = !state;
        }
    }

    shortform_input.onchange = function () {
        lvl.Shortform = shortform_input.value.escapeJSON();
    };

    passingAddBtn.onclick = function () {
        if (passingSelect.value === "") {
            return;
        }
        lvl.PASS.push(parseInt(passingSelect.value));
        initNextLevels(lvl);
        setLevelEdit(true);
    };

    constantAddBtn.onclick = function () {
        if (constantSelect.value === "") {
            return;
        }
        lvl.CONSTANT.push(parseInt(constantSelect.value));
        initNextLevels(lvl);
        setLevelEdit(true);
    };

    function initSettings(id, lvl) {
        for (var x = 0; x < LevelConfigs.length; x++) {
            if (true) {
                var loc = LevelConfigs[x].Element.type === "checkbox" ? "checked" : "value";
                if (lvl === null || lvl.Settings[LevelConfigs[x].Name]) {
                    LevelConfigs[x].Element[loc] = (lvl !== null ? lvl.Settings[LevelConfigs[x].Name] : LevelConfigs[x].Default);
                } else {
                    LevelConfigs[x].Element[loc] = LevelConfigs[x].Default;
                }
                LevelConfigs[x].Element.setAttribute("data-x", x);
                LevelConfigs[x].Element.setAttribute("data-id", id);
                LevelConfigs[x].Element.disabled = (lvl === null ? true : false);
            } else {
                LevelConfigs[x].Element.disabled = true;
                if (LevelConfigs[x].Element.type === "checkbox") {
                    LevelConfigs[x].Element.checked = LevelConfigs[x].Default;
                } else {
                    LevelConfigs[x].Element.value = LevelConfigs[x].Default;
                }
            }
        }
    }
}

const metadata_list = document.getElementById("metadata-list");
var metadata;
var metadataChanges = [];
function generateMetadataList() {
    document.getElementById("metadata-save-btn").onclick = function () {
        resetloader(true, null, null);
        saveMetadata(metadata).then(() => {
            resetloader(false, null, null);
            generateEmailSelectMetadata();
        }).catch((e) => {
            resetloader(false, null, null);
        });
    };

    async function saveMetadata(Data) {
        return await send_http_request("2/save/customsetting", JSON.stringify(Data), [["location", "Sheet-Metadata"]]);
    }

    clientDb.ref("Settings/Sheet-Metadata").once('value').then((snap) => {
        if (!metadata) {
            metadata = snap.val() === null ? [] : snap.val();
        }
        generateEmailSelectMetadata();
        clearChildren(metadata_list);
        for (var i = 0; i < metadata.length; i++) {
            createListElement(i);
        }
        function createAddBtn() {
            var addbtn = document.createElement("button");
            addbtn.textContent = "New Metadata";
            addbtn.id = "metadata-add";
            metadata_list.appendChild(addbtn);
            addbtn.onclick = function () {
                var newName = prompt("Enter new metadata name:").escapeJSON();
                if (newName && newName !== "") {
                    metadata.push({Name: newName, UniqueID: calculateUniqueID(newName, metadata)});
                    console.log(metadata);
                    metadataChanged();
                    createListElement(metadata.length - 1);
                }
                addbtn.remove();
                createAddBtn();
            };
        }
        createAddBtn();
    }).catch((e) => {
        console.log(e);
    });

    function createListElement(pos) {
        var newDiv = document.createElement("div");
        var txtlbl = document.createElement("label");
        txtlbl.textContent = metadata[pos].Name;
        newDiv.appendChild(txtlbl);
        newDiv.appendChild(createButton("Rename", bindRename, pos));
        newDiv.appendChild(createButton("Delete", bindDelete, pos));
        metadata_list.appendChild(newDiv);
        function createButton(txt, bindFunction, pos) {
            var btn = document.createElement("button");
            btn.textContent = txt;
            if (bindFunction)
                bindFunction(btn, newDiv, pos);
            return btn;
        }
    }

    function bindRename(button, div, pos) {
        button.onclick = function () {
            var newName = prompt("Enter a new metadata name:").escapeJSON();
            if (newName && newName !== "") {
                metadata[pos].Name = newName;
                var lbl = div.getElementsByTagName("LABEL")[0];
                lbl.textContent = newName;
                metadataChanged();
            }
        };
    }

    function bindDelete(button, div, pos) {
        button.onclick = function () {
            if (confirm("Delete this metadata?")) {
                metadata.splice(pos, 1);
                metadataChanged();
                generateMetadataList();
            }
        };
    }
}

function metadataChanged() {

}

const facility_holder = document.getElementById("facility-div");
const timeblock_holder = document.getElementById("timeblock-div");
var Identities = [];
async function generateFacilityMenu() {
    await getTimeblocks();
    await getFacilities();
    await getIdentityStatus();
    async function generateTimeblocks() {
        clearChildren(timeblock_holder);
        var lbl = document.createElement("b");
        lbl.textContent = "Timeblocks:";
        timeblock_holder.appendChild(lbl);
        var tKeys = Object.keys(Timeblocks);
        for (var t = 0; t < tKeys.length; t++) {
            createEntry(timeblock_holder, Timeblocks[tKeys[t]].Name, tKeys[t], currentTimeblockBtnCreator);
        }
        createEntry(timeblock_holder, "New Timeblock", -1, newTimeblockBtnCreator);
    }
    generateTimeblocks();

    async function generateFacilities() {
        clearChildren(facility_holder);
        var lbl = document.createElement("b");
        lbl.textContent = "Facilities:";
        facility_holder.appendChild(lbl);
        var fKeys = Object.keys(Facilities);
        for (var f = 0; f < fKeys.length; f++) {
            createEntry(facility_holder, Facilities[fKeys[f]].Name, fKeys[f], currentFacilityBtnCreator);
        }
        createEntry(facility_holder, "New Facility", -1, newFacilityBtnCreator);
    }
    generateFacilities();

    function createEntry(bindTo, text, position, buttonCreator) {
        var div = document.createElement("div");
        var lbl = document.createElement("label");
        lbl.textContent = text;
        div.appendChild(lbl);
        bindTo.appendChild(div);
        if (buttonCreator) {
            var btndiv = document.createElement("div");
            div.appendChild(btndiv);
            btndiv.className = "btnholder";
            buttonCreator(btndiv, position);
        }
        return div;
    }

    function newTimeblockBtnCreator(div) {
        var newBtn = document.createElement("button");
        newBtn.textContent = "Create";
        div.appendChild(newBtn);
        newBtn.onclick = function () {
            newName = prompt("Enter new timeblock name:");
            if (newName && newName !== "") {
                var UniqueID = calculateUniqueObjectID(newName, Timeblocks);
                Timeblocks[UniqueID] = {Name: newName.escapeJSON().replace(/---/g, "-"), UniqueID: UniqueID};
                generateTimeblocks();
            }
        };
    }

    function currentTimeblockBtnCreator(div, id) {
        var renameBtn = document.createElement("button");
        renameBtn.textContent = "Rename";
        div.appendChild(renameBtn);
        function Rename(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new name:").replace(/---/g, "-");
                if (newName && newName !== "") {
                    Timeblocks[id].Name = newName.escapeJSON();
                    generateTimeblocks();
                }
            };
        }
        Rename(renameBtn, id);
        var deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        div.appendChild(deleteBtn);
        function Delete(btn, id) {
            btn.onclick = function () {
                if (confirm("Delete this time?")) {
                    delete Timeblocks[id];
                    generateTimeblocks();
                }
            };
        }
        Delete(deleteBtn, id);
    }

    function createHolderSpan(appendTo) {
        var newSpan = document.createElement("span");
        appendTo.appendChild(newSpan);
        return newSpan;
    }

    function createInfoText(appendTo, InfoText, addExtra) {
        var newBold = document.createElement("b");
        newBold.textContent = InfoText + (addExtra === false ? "" : ":");
        appendTo.appendChild(newBold);
        var newText = document.createElement("label");
        appendTo.appendChild(newText);
        return newText;
    }

    function determineIdentityState(Identity, isText) {
        var IdentityPosition = -1;
        for (var i = 0; i < Identities.length; i++) {
            var Id = Object.keys(Identities[i])[0];
            if (Identity === Id || Identity.split("@")[1] === Id) {
                IdentityPosition = i;
                break;
            }
        }
        if (IdentityPosition === -1) {
            return isText ? "Cannot use" : "unauthorized";
        } else {
            return Identities[IdentityPosition][Object.keys(Identities[IdentityPosition])[0]];
        }
    }

    function currentFacilityBtnCreator(div, id) {
        var holderSpan = createHolderSpan(div);
        createInfoText(holderSpan, "Rename Facility", false);
        var nameChange = document.createElement("button");
        nameChange.textContent = "Rename";
        holderSpan.appendChild(nameChange);
        function Rename(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new name:").replace(/---/g, "-");
                if (newName && newName !== "") {
                    Facilities[id].Name = newName.escapeJSON();
                    generateFacilities();
                }
            };
        }
        Rename(nameChange, id);
        var holderSpan = createHolderSpan(div);
        var shortformText = createInfoText(holderSpan, "Shortform");
        shortformText.textContent = Facilities[id].Shortform;
        var shortform = document.createElement("button");
        shortform.textContent = "Change";
        holderSpan.appendChild(shortform);
        function shortRename(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new shortform:").replace(/---/g, "-");
                if (newName && newName !== "") {
                    Facilities[id].Shortform = newName.escapeJSON();
                    shortformText.textContent = Facilities[id].Shortform;
                }
            };
        }
        shortRename(shortform, id);
        holderSpan = createHolderSpan(div);
        var emailText = createInfoText(holderSpan, "Email");
        emailText.textContent = Facilities[id].Email;
        var emailChange = document.createElement("button");
        emailChange.textContent = "Change";
        holderSpan.appendChild(emailChange);
        var emailVerificationStatus = document.createElement("label");
        holderSpan.appendChild(emailVerificationStatus);
        emailVerificationStatus.textContent = determineIdentityState(Facilities[id].Email, true);
        emailVerificationStatus.className = determineIdentityState(Facilities[id].Email, false);
        function emailChangeF(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new email:");
                if (newName && newName !== "" && email_pattern.test(newName)) {
                    Facilities[id].Email = newName.escapeJSON();
                    emailText.textContent = Facilities[id].Email;
                    if (determineIdentityState(Facilities[id].Email, false) !== "unauthorized") {
                        emailVerificationStatus.textContent = determineIdentityState(Facilities[id].Email, true);
                        emailVerificationStatus.className = determineIdentityState(Facilities[id].Email, false);

                    } else {
                        emailVerificationStatus.textContent = "Refreshed on Save";
                        emailVerificationStatus.className = "pending";
                    }
                }
            };
        }
        emailChangeF(emailChange, id);
        holderSpan = createHolderSpan(div);
        var nameText = createInfoText(holderSpan, "Sender Name");
        nameText.textContent = Facilities[id].EmailName;
        var emailNameChange = document.createElement("button");
        emailNameChange.textContent = "Change";
        holderSpan.appendChild(emailNameChange);
        function emailNameChangeF(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new email name:");
                if (newName && newName !== "") {
                    Facilities[id].EmailName = newName.escapeJSON();
                    nameText.textContent = Facilities[id].EmailName;
                }
            };
        }
        emailNameChangeF(emailNameChange, id);
        holderSpan = createHolderSpan(div);
        var replyText = createInfoText(holderSpan, "Reply-To Email");
        replyText.textContent = Facilities[id].ReplyToEmail;
        var replyEmailChange = document.createElement("button");
        replyEmailChange.textContent = "Change";
        holderSpan.appendChild(replyEmailChange);
        function replyEmailChangeF(btn, id) {
            btn.onclick = function () {
                var newName = prompt("Enter new reply-to email:");
                if (newName && newName !== "" && email_pattern.test(newName)) {
                    Facilities[id].ReplyToEmail = newName.escapeJSON();
                    replyText.textContent = Facilities[id].ReplyToEmail;
                }
            };
        }
        replyEmailChangeF(replyEmailChange, id);
        holderSpan = createHolderSpan(div);
        createInfoText(holderSpan, "Delete Facility", false);
        var deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        holderSpan.appendChild(deleteBtn);
        function Delete(btn, id) {
            btn.onclick = function () {
                if (confirm("Delete this facility?")) {
                    delete Facilities[id];
                    generateFacilities();
                }
            };
        }
        Delete(deleteBtn, id);
    }

    function newFacilityBtnCreator(div) {
        var newBtn = document.createElement("button");
        newBtn.textContent = "Create";
        newBtn.id = "facilitycreatebtn";
        div.appendChild(newBtn);
        newBtn.onclick = function () {
            newName = prompt("Enter new facility name:").replace(/---/g, "-");
            if (newName && newName !== "") {
                var shortform = "";
                newName.escapeJSON().split(" ").forEach((e) => {
                    shortform += e.substring(0, 1).toUpperCase();
                });
                var UniqueID = calculateUniqueObjectID(newName, Facilities);
                Facilities[UniqueID] = {Name: newName.escapeJSON(), Shortform: shortform, Email: "", EmailName: "", ReplyToEmail: "", UniqueID: UniqueID};
                generateFacilities();
            }
        };
    }

    async function saveData(Data, Loc) {
        var internalData = [];
        var dKeys = Object.keys(Data);
        for (var d = 0; d < dKeys.length; d++) {
            internalData.push(Data[dKeys[d]]);
        }
        return await send_http_request("2/save/customsetting", JSON.stringify(internalData), [["location", Loc]]);
    }

    document.getElementById("facility-save-btn").onclick = function () {
        resetloader(true, null, null);
        saveData(Facilities, "Facilities").then(() => {
            saveData(Timeblocks, "Timeblocks").then(() => {
                resetloader(false, null, null);
                generateFacilityMenu();
            }).catch((e) => {
                resetloader(false, null, null);
                alert("Error saving data");
            });
        }).catch((e) => {
            resetloader(false, null, null);
            alert("Error saving facility data");
        });
    };

    async function getIdentityStatus() {
        Identities = JSON.parse(await send_http_request("2/get/identities", "", []));
        return;
    }
}

const email_modifier_select = document.getElementById("email-modifier-select");
const add_email_modifier_btn = document.getElementById("email-add-modifier-btn");
const email_subject = document.getElementById("email-settings-subject");
const email_body = document.getElementById("email-settings-body");
const email_plain_body = document.getElementById("email-settings-plain-body");
const email_plaintext_preview = document.getElementById("email-plaintext-btn");
const email_html_preview = document.getElementById("email-html-btn");
const save_email_btn = document.getElementById("save-email-btn");
const email_preview_replacements = {'Skill List': null, 'Current Level': "CURRENT LEVEL", 'Next Level': "NEXT LEVEL", 'Session': "SESSION", 'Instructor Name': "INSTRUCTOR NAME", 'Student Name': "STUDENT NAME", 'Class Code': "BARCODE #", 'Facility Name': "FACILITY_NAME", 'Facility Shortform': "FACILITY_SHORT_NAME", 'Comment': "COMMENT"};
function get_email_replacement(Key, isHTML) {
    if (email_preview_replacements[Key] !== null) {
        return email_preview_replacements[Key];
    } else if (Key === "Skill List") {
        return create_Email_List(isHTML);
    }

    function create_Email_List(isHTML) {
        if (isHTML === false) {
            return "-Skill 1: Complete\n-Skill 2: Weak\n    -Must See 1\n   -Must See 2\n-Skill 3: Complete";
        } else {
            return "<ul><li>Skill 1: Complete</li><li>Skill 2: Weak<ul><li>Must See 1</li><li>Must See 2</li></ul></li><li>Skill 3: Complete</li></ul>";
        }
    }
}

const email_allowed_tags = ["a", "b", "br", "div", "font", "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "img", "label", "li", "ol", "p", "span", "strong", "table", "td", "th", "tr", "u", "ul"];
var email_settings_last_focus = email_subject;
function generateEmailMenu() {
    clientDb.ref("Settings/Email/Subject").once('value').then((subjectSnap) => {
        clientDb.ref("Settings/Email/HTML").once('value').then((bodySnap) => {
            clientDb.ref("Settings/Email/Plain").once('value').then((bodyPlainSnap) => {
                email_subject.value = subjectSnap.val();
                email_body.value = bodySnap.val();
                email_plain_body.value = bodyPlainSnap.val();
            }).catch((err) => {
                console.log(err);
                alert("Error getting email data");
            });
        }).catch((err) => {
            console.log(err);
            alert("Error getting email data");
        });
    }).catch((err) => {
        alert("Error getting email data");
    });
}

email_subject.onfocus = function () {
    email_settings_last_focus = email_subject;
};

email_body.onfocus = function () {
    email_settings_last_focus = email_body;
};

email_plain_body.onfocus = function () {
    email_settings_last_focus = email_plain_body;
};

add_email_modifier_btn.onclick = function () {
    var addText;
    if (email_modifier_select.options[email_modifier_select.selectedIndex].getAttribute("data-metadata") === "true") {
        addText = "%Metadata-" + email_modifier_select.options[email_modifier_select.selectedIndex].value + "%";
    } else {
        addText = "%" + email_modifier_select.options[email_modifier_select.selectedIndex].label + "%";
    }
    if (email_settings_last_focus.selectionStart || email_settings_last_focus.selectionStart === '0') {
        var startPos = email_settings_last_focus.selectionStart;
        var endPos = email_settings_last_focus.selectionEnd;
        email_settings_last_focus.value = email_settings_last_focus.value.substring(0, startPos)
                + addText;
        +email_settings_last_focus.value.substring(endPos, email_settings_last_focus.value.length);
    } else {
        email_settings_last_focus.value += addText;
    }
};

function parseEmailContent(parseElement, isHTML) {
    var Keys = Object.keys(email_preview_replacements);
    var txtContent = parseElement.value;
    for (var i = 0; i < Keys.length; i++) {
        var regex = new RegExp("%" + Keys[i] + "%", "g");
        txtContent = txtContent.replace(regex, (parseElement !== email_subject || email_preview_replacements[Keys[i]] !== null) ? get_email_replacement(Keys[i], isHTML) : "%" + Keys[i] + "%");
    }
    for (var m = 0; m < metadata.length; m++) {
        var regex = new RegExp("%Metadata-" + metadata[m].UniqueID + "%", "g");
        txtContent = txtContent.replace(regex, metadata[m].Name);
    }
    return txtContent;
}

function showEmailPreview(previewSubject, previewBody, isHtml) {
    var previewWindow = window.open("", "", 'left=0,top=0,width=1248,height=3280');
    previewWindow.onload = async function () {
        var doc = previewWindow.document;
        var txtSubjectTitleHolder = doc.createElement("label");
        txtSubjectTitleHolder.innerHTML = "<strong>Subject:</strong>";
        doc.body.appendChild(txtSubjectTitleHolder);
        var txtSubjectHolder = doc.createElement("label");
        txtSubjectHolder.textContent = previewSubject;
        doc.body.appendChild(txtSubjectHolder);
        var txtBodyTitleHolder = doc.createElement("p");
        txtBodyTitleHolder.innerHTML = "<strong>Body:</strong><br>";
        doc.body.appendChild(txtBodyTitleHolder);
        if (isHtml === true) {
            var txtBodyHolder = doc.createElement("p");
            txtBodyHolder.innerHTML = previewBody;
            txtBodyHolder.style.setProperty("white-space", "pre-wrap");
            doc.body.appendChild(txtBodyHolder);
        } else {
            var txtBodyHolder = doc.createElement("p");
            txtBodyHolder.textContent = previewBody;
            txtBodyHolder.style.setProperty("white-space", "pre-wrap");
            doc.body.appendChild(txtBodyHolder);
        }
    };
}

email_html_preview.onclick = function () {
    showEmailPreview(parseEmailContent(email_subject, false), parseEmailContent(email_body, true), true);
};
email_plaintext_preview.onclick = function () {
    showEmailPreview(parseEmailContent(email_subject, false), parseEmailContent(email_plain_body, false), false);
};

function generateEmailSelectMetadata() {
    if (document.getElementById("metadata-email-list")) {
        document.getElementById("metadata-email-list").remove();
    }
    if (metadata && metadata.length > 0) {
        var optg = document.createElement("optgroup");
        optg.id = "metadata-email-list";
        optg.label = "Metadata";
        email_modifier_select.appendChild(optg);
        for (var m = 0; m < metadata.length; m++) {
            var opt = document.createElement("option");
            opt.textContent = metadata[m].Name;
            opt.setAttribute("data-metadata", "true");
            opt.value = metadata[m].UniqueID;
            optg.appendChild(opt);
        }
    }
}

function setLevelEdit(newVal) {
    if (newVal === true) {
        document.getElementById("save-lvl-settings-btn").classList.add("unsaved");
    } else {
        document.getElementById("save-lvl-settings-btn").classList.remove("unsaved");
    }
    isLevelEdit = newVal;
}

save_email_btn.onclick = function () {
    resetloader(true, null, null);
    var saveData = {Subject: email_subject.value, HTML: email_body.value, Plain: email_plain_body.value};
    saveEmailData(saveData).then(function () {
        resetloader(false, null, null);
    }).catch((err) => {
        alert("Error saving data");
        resetloader(false, null, null);
    });

    async function saveEmailData(Data) {
        return await send_http_request("2/save/customsetting", JSON.stringify(Data), [["location", "Email"]]);
    }
};

document.getElementById("save-lvl-settings-btn").onclick = function () {
    resetloader(true, null, null);
    saveLevelData().then(() => {
        setLevelEdit(false);
        resetloader(false, null, null);
    }).catch((err) => {
        alert("Error saving data");
        resetloader(false, null, null);
        console.log(err);
    });
    async function saveLevelData() {
        var sendData = {};
        sendData["Level"] = Levels;
        sendData["Group"] = GroupingData;
        return await send_http_request("2/save/leveldata", JSON.stringify(sendData), []);
    }
};

window.onload = function () {
    resetloader(true, null, null);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            initClientDatabase().then(async() => {
                await initCoreData(true);
                await getCompleteLevels();
                generateLvlGroupingSettingsList();//Level Config
                generateMetadataList();
                generateFacilityMenu();
                generateEmailMenu();
                resetloader(false, null, null);
            }).catch((f) => {
                resetloader(false, null, null);
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