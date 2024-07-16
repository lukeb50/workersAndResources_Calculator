/* global firebase */

const providerdiv = document.getElementById("currentproviders");
const signupdiv = document.getElementById("signupdiv");
const confirmdiv = document.getElementById("logindiv");
const emaildiv = document.getElementById("emailresetdiv");
const passworddiv = document.getElementById("passwordresetdiv");
const providerholder = document.getElementById("providerdiv");
const availablediv = document.getElementById("availableproviders");
const confirmbtn = document.getElementById("confirm-btn");
const confirmemail = document.getElementById("confirm-email");
const confirmpassword = document.getElementById("confirm-password");


const providers = {"google.com": {"Name": "Google", "Image": "../images/768px-Google__G__Logo.png", "Provider": new firebase.auth.GoogleAuthProvider()},
    "microsoft.com": {"Name": "Microsoft", "Image": "../images/microsoft-logo.png", "Provider": new firebase.auth.OAuthProvider('microsoft.com')},
    //"yahoo.com": {"Name": "Yahoo", "Image": "../images/Yahoo-512.png", "Provider": new firebase.auth.OAuthProvider('yahoo.com')} , 
    "password": {"Name": "Email & Password", "Image": "../icos/android-chrome-96x96.png", "Provider": null}};
const provlist = ["google.com", "microsoft.com", "password"];//yahoo.com

document.getElementById("email-btn").onclick = function () {
    confirmbtn.setAttribute("data-action", "email");
    confirmbtn.setAttribute("data-email", document.getElementById("email-email").value);
    emaildiv.style.display = "none";
    confirmdiv.style.display = "block";
};

document.getElementById("password-btn").onclick = function () {
    if (document.getElementById("password-password").value === document.getElementById("password-confirm").value) {
        confirmbtn.setAttribute("data-action", "password");
        confirmbtn.setAttribute("data-password", document.getElementById("password-password").value);
        passworddiv.style.display = "none";
        confirmdiv.style.display = "block";
    } else {
        alert("Passwords do not match");
    }
};

function handleLinkBtn(btn) {
    btn.onclick = function () {
        let prov = btn.getAttribute("data-provider");
        if (prov === "password") {
            providerholder.style.display = "none";
            signupdiv.style.display = "block";
            confirmbtn.setAttribute("data-action", "add");
        } else {//federated login
            firebase.auth().currentUser.linkWithPopup(providers[prov].Provider).then(function (result) {
                GenerateList(result.user);
            }).catch(function (error) {
                console.log("An error occured " + error);
            });
        }
    };
}

function handleUnlinkBtn(btn) {
    btn.onclick = function () {
        let prov = btn.getAttribute("data-provider");
        if (prov !== "password") {
            firebase.auth().currentUser.unlink(prov).then(function () {
                GenerateList(firebase.auth().currentUser);
            }).catch(function () {
                console.log("Error removing");
            });
        } else {
            confirmbtn.setAttribute("data-action", "remove");
            confirmdiv.style.display = "block";
            providerholder.style.display = "none";
        }
    };
}

function GenerateList(user) {
    //Remove all elements
    while (providerdiv.firstChild) {
        providerdiv.removeChild(providerdiv.firstChild);
    }
    while (availablediv.firstChild) {
        availablediv.removeChild(availablediv.firstChild);
    }
    let usedprovs = [];
    user.providerData.forEach(function (providerData) {
        usedprovs.push(providerData.providerId);
        let div = document.createElement("div");
        let ico = document.createElement("img");
        ico.src = providers[providerData.providerId].Image;
        ico.alt = "Provider Icon";
        let lbl = document.createElement("label");
        lbl.textContent = providers[providerData.providerId].Name;
        div.appendChild(ico);
        div.appendChild(lbl);
        if (providerData.providerId === "password") {//change email / password
            let passwordbtn = document.createElement("button");
            passwordbtn.className = "mainround";
            passwordbtn.textContent = "Reset Password";
            passwordbtn.onclick = function () {
                providerholder.style.display = "none";
                passworddiv.style.display = "block";
            };
            let emailbtn = document.createElement("button");
            emailbtn.className = "mainround";
            emailbtn.textContent = "Change Email";
            emailbtn.onclick = function () {
                providerholder.style.display = "none";
                emaildiv.style.display = "block";
            };
            div.appendChild(emailbtn);
            div.appendChild(passwordbtn);
        }
        if (user.providerData.length > 1) {//allow unlinking
            let removebtn = document.createElement("button");
            removebtn.className = "mainround";
            removebtn.textContent = "Remove";
            removebtn.setAttribute("data-provider", providerData.providerId);
            div.appendChild(removebtn);
            handleUnlinkBtn(removebtn);
        }
        providerdiv.appendChild(div);
    });
    for (var i = 0; i < provlist.length; i++) {
        if (usedprovs.indexOf(provlist[i]) === -1) {//provider not being used
            let div = document.createElement("div");
            let ico = document.createElement("img");
            ico.src = providers[provlist[i]].Image;
            ico.alt = "Provider Icon";
            let lbl = document.createElement("label");
            lbl.textContent = providers[provlist[i]].Name;
            let addbtn = document.createElement("button");
            addbtn.className = "mainround";
            addbtn.textContent = "Add";
            addbtn.setAttribute("data-provider", provlist[i]);
            handleLinkBtn(addbtn);
            div.appendChild(ico);
            div.appendChild(lbl);
            div.appendChild(addbtn);
            availablediv.appendChild(div);
        }
    }
}

function handleconfirm() {
    if (confirmbtn.getAttribute("data-action") !== "add") {
        firebase.auth().currentUser.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(confirmemail.value, confirmpassword.value)).then(function () {
            if (confirmbtn.getAttribute("data-action") === "email") {//email change
                firebase.auth().currentUser.updateEmail(confirmbtn.getAttribute("data-email")).then(function () {
                    GenerateList(firebase.auth().currentUser);
                    send_http_request("-1/update/user",JSON.stringify({Email:confirmbtn.getAttribute("data-email")}));
                }, function (error) {
                    alert("An error occured. Please try again later");
                    console.log("Email linking error", error);
                });
            } else if (confirmbtn.getAttribute("data-action") === "remove") {
                firebase.auth().currentUser.unlink("password").then(function () {
                    GenerateList(firebase.auth().currentUser);
                }).catch(function () {
                    alert("Error removing");
                });
            } else {//password change
                firebase.auth().currentUser.updatePassword(confirmbtn.getAttribute("data-password")).then(function (usercred) {
                    GenerateList(firebase.auth().currentUser);
                }, function (error) {
                    alert("An error occured. Please try again later");
                    console.log("Password linking error", error);
                });
            }
        }, function (err) {
            alert("Error confirming credentials");
        });
    } else {
        if (document.getElementById("signup-password").value === document.getElementById("signup-password-confirm").value) {
            firebase.auth().currentUser.reauthenticateWithPopup(providers[firebase.auth().currentUser.providerData[0].providerId].Provider).then(function () {
                firebase.auth().currentUser.linkWithCredential(firebase.auth.EmailAuthProvider.credential(document.getElementById("signup-email").value, document.getElementById("signup-password").value)).then(function (usercred) {
                    GenerateList(usercred.user);
                }, function (error) {
                    alert("An error occured. Please try again later");
                    console.log("Account linking error", error);
                });
            }, function (err) {
                alert("Error confirming credentials");
                console.log(err);
            });
        } else {
            alert("Passwords do not match");
        }
    }

    confirmdiv.style.display = "none";
    signupdiv.style.display = "none";
    providerholder.style.display = "block";
}
;

function cancelAction() {
    confirmdiv.style.display = "none";
    signupdiv.style.display = "none";
    emaildiv.style.display = "none";
    passworddiv.style.display = "none";
    providerholder.style.display = "block";
}

confirmbtn.onclick = handleconfirm;
document.getElementById("add-email-btn").onclick = handleconfirm;

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        GenerateList(user);
        user.getIdToken().then(function (token) {
            document.cookie = "token=" + token;
        });
    } else {
        alert("Error logining in");
        window.close();
    }
}, function (error) {
    alert('Unable to log in: ' + error.toString());//TODO:change
});