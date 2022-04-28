/* global firebase, clientDb, fbApp, email_pattern, showBilling */

var mainDb;
var Organization;

const org_selector = document.getElementById("org-selector");
const org_name_input = document.getElementById("org-name-input");
const user_list = document.getElementById("user-list-div");
const billing_table = document.getElementById("billing-table");
window.onload = async function () {
    firebase.auth().onAuthStateChanged(async function (user) {
        mainDb = fbApp.database("https://report-cards-6290.firebaseio.com");
        await initClientDatabase();
        await handleLoad();
        showSettings();
        showOrganizationMenu();
        showUserList();
    });

    document.querySelectorAll('.qhelp').forEach(function (qbtn) {
        qbtn.onclick = function () {
            alert(qbtn.getAttribute("data-info"));
        };
    });
    var loadftns = {'general-billing-settings': showBilling};
    var subbtns = document.getElementById("management-subbar").children;
    var mainscreens = [];
    for (var s = 0; s < subbtns.length; s++) {
        var btn = subbtns[s];
        mainscreens.push(document.getElementById(btn.getAttribute("data-screen")));
        bindSubBtnClick(btn);
    }

    function bindSubBtnClick(btn) {
        btn.onclick = function () {
            if (loadftns[btn.getAttribute("data-screen")]) {
                loadftns[btn.getAttribute("data-screen")]();
            }
            mainscreens.forEach((screen) => {
                screen.style.display = "none";
            });
            document.getElementById(btn.getAttribute("data-screen")).style.display = "block";
        };
    }
};

async function handleLoad() {
    return await mainDb.ref("Organizations").once('value', (snapshot) => {
        Organizations = snapshot.val();
        var OrgIds = Object.keys(Organizations);
        for (var o = 0; o < OrgIds.length; o++) {
            var opt = document.createElement("option");
            opt.value = OrgIds[o];
            opt.label = Organizations[OrgIds[o]].Name;
            org_selector.appendChild(opt);
        }
        org_selector.value = Organization;
        return;
    });
}

org_selector.onchange = function () {
    //Change Org & Reload
    org_selector.disabled = true;
    changeOrganization(org_selector.value);
};

function showOrganizationMenu() {
    org_name_input.value = Organizations[Organization].Name;
}

document.getElementById("set-organization-btn").onclick = function () {
    mainDb.ref("Organizations/" + Organization + "/Name").set(org_name_input.value);
};

document.getElementById("create-org-btn").onclick = function () {
    var name = prompt("Enter organization name");
    if (name && name !== "") {
        showLoadingScreen();
        createOrg(name).then((newId) => {
            changeOrganization(newId);
        }).catch(() => {
            hideLoadingScreen();
            alert("Error creating");
        });
    }

    async function createOrg(orgName) {
        return await send_http_request("create/organization", orgName, [], "authentication");
    }
};

document.getElementById("delete-org-btn").onclick = function () {
    if (confirm("Delete this organization? The operation cannot be undone.")) {
        if (confirm("Confirm")) {
            showLoadingScreen();
            deleteOrg("").then(() => {
                delete Organizations[Organization];
                var newOrgs = Object.keys(Organizations);
                changeOrganization(newOrgs[0]);
            }).catch((e) => {
                hideLoadingScreen();
                if (e === 402) {
                    alert("Outstanding financials. Delete cancelled");
                } else {
                    alert("Error deleting");
                }
            });
        }
    }
    async function deleteOrg(Id) {
        return await send_http_request("delete/organization", Id, [], "authentication");
    }
};

function changeOrganization(Org) {
    setOrg(Org).then(() => {
        firebase.auth().currentUser.getIdTokenResult(true).then(() => {
            hideLoadingScreen();
            location.reload();
        });
    });

    async function setOrg(Id) {
        return await send_http_request("set/organization", Id, [], "authentication");
    }
}

const lvlmappings = {0: "Instructor", 1: "Lead Instructor", 2: "Programmer"};
var Users = null;
function showUserList() {
    getUsers().then((data) => {
        Users = data ? JSON.parse(data) : [];
        clearChildren(user_list);
        Users.forEach(user => {
            var userItem = document.createElement("span");
            var userLabel = document.createElement("b");
            userLabel.textContent = user.Name ? user.Name : user.Email;
            userItem.appendChild(userLabel);
            var userPermissionlbl = document.createElement("label");
            userPermissionlbl.textContent = "Permission:";
            var userPermission = document.createElement("select");
            populateSelect(userPermission);
            userPermission.value = user.Permission;
            changePermission(userPermission, user);
            userPermissionlbl.appendChild(userPermission);
            userItem.appendChild(userPermissionlbl);
            var userDelete = document.createElement("button");
            deleteUser(userDelete, user);
            userDelete.textContent = "Delete User";
            userDelete.className = "mainround";
            userItem.appendChild(userDelete);
            user_list.appendChild(userItem);
        });
        var createBtn = document.createElement("button");
        createBtn.className = "mainround";
        createBtn.textContent = "New User";
        createBtn.id = "new-user-btn";
        createBtn.onclick = async function () {
            var email = prompt("Enter email address");
            if (email_pattern.test(email)) {
                showLoadingScreen();
                await addUser(email);
                showUserList();
                hideLoadingScreen();
            } else {
                alert("Invalid Email");
            }
        };
        user_list.appendChild(createBtn);
    });

    async function addUser(email) {
        return send_http_request("2/add/user", email, []);
    }

    function populateSelect(select) {
        var permissionSteps = Object.keys(lvlmappings);
        for (var p = 0; p < permissionSteps.length; p++) {
            var opt = document.createElement("option");
            opt.value = permissionSteps[p];
            opt.textContent = lvlmappings[permissionSteps[p]];
            select.appendChild(opt);
        }
    }

    function deleteUser(button, user) {
        button.onclick = async function () {
            if (confirm("Delete this user? Action cannot be undone")) {
                showLoadingScreen();
                await DeleteUser(user.Uid);
                showUserList();
                hideLoadingScreen();
            }
        };
    }

    async function DeleteUser(userId) {
        return await send_http_request("2/delete/user", userId, []);
    }

    function changePermission(select, user) {
        select.onchange = async function () {
            showLoadingScreen();
            await updatePermission(user.Uid, select.value);
            hideLoadingScreen();
        };
    }

    async function updatePermission(userId, Permission) {
        return await send_http_request("2/update/permission", "", [["uid", userId], ["permission", Permission]]);
    }

    async function getUsers() {
        return await send_http_request("2/get/users", "", []);
    }

    document.getElementById("billing-previous-btn").onclick = function () {
        var month = document.getElementById("billing-month-select").value;
        var year = document.getElementById("billing-year-select").value;
        window.open("https://report-cards-6290.appspot.com/billing/generate/invoice?month=" + month + "&year=" + year, '_blank');
    };
}