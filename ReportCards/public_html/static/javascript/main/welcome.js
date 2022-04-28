/* global firebase, app, fbApp, send_http_request, email_pattern*/

const signinbtn = document.getElementById("signin-btn");
const siemail = document.getElementById("signin-email");
const sipassword = document.getElementById("signin-password");
const sierror = document.getElementById("signin-error");

const show_login = document.getElementById("show-login");

const acc_hold_div = document.getElementById("sign-div");
const logindiv = document.getElementById("logindiv");

const primary_div = document.getElementById("primary-panel");
const secondary_div = document.getElementById("secondary-panel");
const loginemail_div = document.getElementById("loginemail-panel");
const org_selector = document.getElementById("org-selector");

const loginemail_input = document.getElementById("loginemail-email-input");

const loginemail_password_expanded = document.getElementById("PasswordLinkEmailExpanded");
const loginemail_password_entry = document.getElementById("loginemail-password");
const loginemail_password_confirm = document.getElementById("loginemail-password-confirm");
const loginemail_password_error = document.getElementById("PasswordLinkEmailErrorMsg");
const loginemail_password_name = document.getElementById("loginemail-name");
var isEmailLinkLogin = false;

window.onload = function () {
    siemail.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            emailLogin();
        }
    });

    sipassword.addEventListener("keyup", function (event) {
        if (event.keyCode === 13) {
            emailLogin();
        }
    });

    document.getElementById("newlinkbtn").onclick = function () {
        if (email_pattern.test(loginemail_input.value)) {
            resetloader(true, null, null);
            send_http_request("send/email/link", loginemail_input.value, [], "authentication").then(() => {
                resetloader(false, null, null);
                alert("Please check your inbox for a new link");
            }).catch((err) => {
                console.log(err);
                resetloader(false, null, null);
                alert("Please check the email you entered and try again");
            });
        } else {
            resetloader(false, null, null);
            alert("Please enter a valid email in the box.");
        }
    };

    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        isEmailLinkLogin = true;
        primary_div.style.display = "none";
        loginemail_div.style.display = "block";
        document.getElementById("loginemail-confirmemail-btn").onclick = function () {
            resetloader(true, null, null);
            firebase.auth().signInWithEmailLink(loginemail_input.value, window.location.href).then((result) => {
                resetloader(false, null, null);
                document.getElementById("loginemail-confirmemail-btn").disabled = true;
                document.getElementById("loginemail-provider-panel").style.display = "block";
                loginemail_div.style.display = "none";
            }).catch((err) => {
                resetloader(false, null, null);
                console.log(err);
                if (err.code === "auth/invalid-action-code") {
                    alert("This link has expired. Please click 'Generate New Link' to receive a new login code.");
                } else {
                    alert("Unable to verify email. Please check and try again.");
                }
            });
        };
    }

    const googleprovider = new firebase.auth.GoogleAuthProvider();
    googleprovider.addScope('email');
    googleprovider.addScope('profile');

    const microsoftprovider = new firebase.auth.OAuthProvider('microsoft.com');

    const mainDb = fbApp.database("https://report-cards-6290.firebaseio.com");

    function handleAuthError(code) {
        if (code === "auth/account-exists-with-different-credential") {
            alert("An account already exists with this email. Please use the appropriate login method.");
        } else if (code === "auth/user-disabled") {
            alert("Your account has been disabled");
        } else {
            console.log(code);
        }
    }

    function GoogleLogin() {
        firebase.auth().signInWithPopup(googleprovider).then(function () {
        }).catch(function (error) {//TODO: handler for disabled account
            handleAuthError(error.code);
        });
    }
    document.getElementById("GoogleLogInBtn").onclick = GoogleLogin;

    function MicrosoftLogin() {
        firebase.auth().signInWithPopup(microsoftprovider).then(function () {
        }).catch(function (error) {//TODO: handler for disabled account
            handleAuthError(error.code);
        });
    }
    document.getElementById("MicrosoftLogInBtn").onclick = MicrosoftLogin;

    signinbtn.onclick = function () {
        emailLogin();
    };

    function emailLogin() {
        sierror.textContent = "";
        if (siemail.value.length > 0 && sipassword.value.length > 0) {
            resetloader(true, null, null);
            firebase.auth().signInWithEmailAndPassword(siemail.value, sipassword.value).catch(function (error) {
                resetloader(false, null, null);
                var errorCode = error.code;
                if (errorCode === "auth/internal-error") {
                    sierror.textContent = "Internal error";
                } else if (errorCode === "auth/network-request-failed") {
                    sierror.textContent = "Network error, please try again later";
                } else if (errorCode === "auth/too-many-requests") {
                    sierror.textContent = "Too many requests, try again later";
                } else if (errorCode === "auth/user-not-found") {
                    sierror.textContent = "No user with that email address";
                } else if (errorCode === "auth/user-disabled") {
                    sierror.textContent = "Your account has been disabled";
                } else if (errorCode === "auth/web-storage-unsupported") {
                    sierror.textContent = "Browser unsupported. Please use Chrome for best results";
                } else if (errorCode === "auth/wrong-password") {
                    sierror.textContent = "Wrong password or login method";
                } else if (errorCode === "auth/account-exists-with-different-credential") {
                    sierror.textContent = "Account already exists with OAuth2 provider. Merging will be supported later.";
                } else {
                    sierror.textContent = "An error occured";
                }
            });
        } else {
            sierror.textContent = "Please fill in all fields";
        }
    }
    ;

    document.getElementById("GoogleLoginEmailBtn").onclick = function () {
        firebase.auth().currentUser.linkWithPopup(googleprovider).then((result) => {
            firebase.auth().currentUser.updateProfile({displayName: result.additionalUserInfo.profile.name}).then(() => {
                AuthStateOrgCheck(firebase.auth().currentUser);
            }).catch(() => {

            });
        }).catch((error) => {
            alert("Error linking your account.");
        });
    };

    document.getElementById("MicrosoftLoginEmailBtn").onclick = function () {
        firebase.auth().currentUser.linkWithPopup(microsoftprovider).then((result) => {
            firebase.auth().currentUser.updateProfile({displayName: result.additionalUserInfo.profile.name}).then(() => {
                AuthStateOrgCheck(firebase.auth().currentUser);
            }).catch(() => {
            });
        }).catch((error) => {
            alert("Error linking your account.");
        });
    };

    document.getElementById("loginemail-password-btn").onclick = function () {
        loginemail_password_error.textContent.textContent = "";
        if (loginemail_password_entry.value.length > 0 && loginemail_password_confirm.value.length > 0 && loginemail_password_name.value.length > 0) {
            if (loginemail_password_entry.value === loginemail_password_confirm.value) {
                firebase.auth().currentUser.updateProfile({displayName: loginemail_password_name.value}).then(() => {
                    firebase.auth().currentUser.updatePassword(loginemail_password_entry.value).then(function (e) {
                        AuthStateOrgCheck(firebase.auth().currentUser);
                    }).catch(function (error) {
                        var errorCode = error.code;
                        if (errorCode === "auth/email-already-in-use") {
                            loginemail_password_error.textContent = "Email is already being used";
                        } else if (errorCode === "auth/internal-error") {
                            loginemail_password_error.textContent = "Internal error";
                        } else if (errorCode === "auth/invalid-email") {
                            loginemail_password_error.textContent = "Invalid email format";
                        } else if (errorCode === "auth/network-request-failed") {
                            loginemail_password_error.textContent = "Please check your connection";
                        } else if (errorCode === "auth/too-many-requests") {
                            loginemail_password_error.textContent = "Too many requests, try again later";
                        } else if (errorCode === "auth/weak-password") {
                            loginemail_password_error.textContent = "Please pick a stronger password";
                        } else if (errorCode === "auth/web-storage-unsupported") {
                            loginemail_password_error.textContent = "Browser unsupported. Please use Chrome for best results";
                        } else if (errorCode === "auth/account-exists-with-different-credential") {
                            loginemail_password_error.textContent = "Account already exists with OAuth2 provider. Please use your existing login method.";
                        } else {
                            loginemail_password_error.textContent = "An error occured";
                        }
                    });
                }).catch(() => {
                    alert("Error updating user");
                });
            } else {
                loginemail_password_error.textContent = "Passwords do not match";
            }
        } else {
            loginemail_password_error.textContent = "Please fill in all fields";
        }
    };

    document.getElementById("PasswordLinkEmailBtn").onclick = function () {
        loginemail_password_expanded.style.display = loginemail_password_expanded.style.display === "block" ? "none" : "block";
        loginemail_password_entry.value = "";
        loginemail_password_confirm.value = "";
    };

    document.getElementById("forgotbtn").onclick = function () {
        let email = prompt("Enter your email");
        if (email !== "") {
            firebase.auth().sendPasswordResetEmail(email).then(function () {
                alert("Email sent. Please allow a few minutes before trying again.");
            }).catch(function (error) {
                alert("Error: " + error.code);
            });
        }
    };

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            user.getIdToken().then(function (token) {
                document.cookie = "token=" + token;
                if (isEmailLinkLogin === false) {
                    AuthStateOrgCheck(user);
                }
            });
        }
    }, function (error) {
        resetloader(false, null, null);
        primary_div.style.display = "block";
        secondary_div.style.display = "none";
    });

    async function AuthStateOrgCheck(user) {
        var userOrgs = await getMainDBValue("Users/" + user.uid);
        if (userOrgs && Object.keys(userOrgs.Organizations).length > 1) {
            showSecondary(userOrgs);
            resetloader(false, null, null);
        } else if (userOrgs) {
            send_Claim_Request(Object.keys(userOrgs.Organizations)[0]);
        } else {
            firebase.auth().signOut();
            alert("You do not belong to an organization");
        }
    }

    async function showSecondary(userOrgs) {
        primary_div.style.display = "none";
        secondary_div.style.display = "block";
        clearChildren(org_selector);
        var orgKeys = Object.keys(userOrgs.Organizations);
        for (var o = 0; o < orgKeys.length; o++) {
            var opt = document.createElement("option");
            var name = (await getMainDBValue("Organizations/" + orgKeys[o] + "/Name"));
            opt.value = name;
            opt.textContent = name;
            org_selector.appendChild(opt);
        }
        org_selector.selectedIndex = 0;
        document.getElementById("secondary-accept").onclick = function () {
            send_Claim_Request(orgKeys[org_selector.selectedIndex]);
        };
    }

    async function send_Claim_Request(OrgId) {
        //Request server set custom claim to given ID
        resetloader(true, null, null);
        send_http_request("set/organization", OrgId, [], "authentication").then((res) => {
            firebase.auth().currentUser.getIdTokenResult(true).then((result) => {
                document.cookie = "token=" + result.token;
                window.location.href = window.location.href.split("?")[0];
            }).catch((err) => {
                resetloader(false, null, null);
                console.log("Error updating user. Please try again soon.");
            });
        }).catch((err) => {
            resetloader(false, null, null);
            alert("Error logging in. Please try again soon.");
        });
    }

    document.getElementById("secondary-back").onclick = function () {
        firebase.auth().signOut();
        primary_div.style.display = "block";
        secondary_div.style.display = "none";
    };

    async function getMainDBValue(loc) {
        return await mainDb.ref(loc).once('value').then((snap) => {
            return snap.val();
        });
    }
};

user_agent = navigator.userAgent;
if (user_agent.indexOf("MSIE ") > -1 || user_agent.indexOf("Trident/") > -1) {
    document.getElementById("account-panel").style.display = "none";
    var pEl = document.createElement("p");
    pEl.textContent = "Internet Explorer is not supported. Please use a modern browser. For best results use Google Chrome, Microsoft Edge or another Chromium-based browser";
    document.body.appendChild(pEl);
}