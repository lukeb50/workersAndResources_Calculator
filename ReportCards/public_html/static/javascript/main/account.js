/* global firebase, getFacilities */

const ni = document.getElementById("nameinput");
const ls = document.getElementById("locselect");
const updatebtn = document.getElementById("updatebtn");
const maindiv = document.getElementById("maindiv");
const lvlmappings = {0: "Instructor", 1: "Lead Instructor", 2: "Programmer"};
//All mappings offset by 1 due to non-negative requirement

function getMapping(lvl) {
    return lvlmappings[lvl];
}

var UserData;
var DispFromAcc = "-:1";

function ProvCheck() {
    if (UserData !== undefined && DispFromAcc !== "-:1") {
        //Both data have been set
        if (UserData.PersonalName === "" && DispFromAcc !== "") {//No Personal Name set and provider name exists
            ni.value = DispFromAcc;
            Update();
        }
    }
}

async function getUserData() {
    initClientDatabase();
    UserData = JSON.parse(await send_http_request("-1/get/user", ""));
    if (UserData !== null) {
        await generateFacilities();
        ni.value = firebase.auth().currentUser.displayName;
        ni.disabled = false;
        document.getElementById("emailinput").value = firebase.auth().currentUser.email;
        ls.value = UserData.Home;
        ls.disabled = false;
        document.getElementById("acc-lvl").value = getMapping(UserData.Permission);
        ProvCheck();
    } else {
        //ERROR
    }
}

document.getElementById("logout").onclick = function () {
    firebase.auth().signOut();
    document.cookie = "token=";
    location.reload(true);
};

ni.oninput = function () {
    if (ni.value !== UserData.PersonalName || ls.value !== UserData.Home) {
        updatebtn.disabled = false;
    } else {
        updatebtn.disabled = true;
    }
};

ls.oninput = function () {
    if (ni.value !== UserData.PersonalName || ls.value !== UserData.Home) {
        updatebtn.disabled = false;
    } else {
        updatebtn.disabled = true;
    }
};

updatebtn.onclick = Update;
function Update() {
    var req = {};
    if (ls.value !== UserData.Home) {
        req.Home = ls.value;
    }
    if(ni.value !== firebase.auth().currentUser.displayName){
        firebase.auth().currentUser.updateProfile({displayName: ni.value});
    }
    async function sendUpdate() {
        return send_http_request("-1/update/user", JSON.stringify(req));
    }
    if (sendUpdate() !== null) {
        UserData.Home = ls.value;
        updatebtn.disabled = true;
    }
}
;

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        getUserData();
        DispFromAcc = user.displayName;
        ProvCheck();
        user.getIdToken().then(function (token) {
            document.cookie = "token=" + token;
        });
    } else {
        location.reload(true);
    }
}, function (error) {
    alert('Unable to log in: ' + error.toString());//TODO:change
    console.log(error);
});

document.getElementById("acc-pref-btn").onclick = function () {
    var accbtn = window.open("../../static/inline-html/login-preferences.html", "Account", 'left=0,top=0,width=500,height=500');
};

function generateFacilities() {
    getFacilities().then((data) => {
        console.log(data);
        var fKeys = Object.keys(data);
        for (var f = 0; f < fKeys.length; f++) {
            var currentOpt = document.createElement("option");
            currentOpt.textContent = data[fKeys[f]].Name;
            currentOpt.value = data[fKeys[f]].UniqueID;
            ls.appendChild(currentOpt);
        }
        ls.value = UserData.Home;
    }).catch(() => {
        //?
    });
}