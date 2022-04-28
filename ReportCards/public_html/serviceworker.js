/* global self, clients */

self.addEventListener('push', event => event.waitUntil(handlePushEvent(event)));

function handlePushEvent(eve) {
    var NotifData = eve.data.json();
    var notif = self.registration.showNotification('Worksheet Updated', {
        body: (NotifData.User + " has saved their worksheets for " + NotifData.Time+" ("+NotifData.Facility+")"),
        icon: "https://report-cards-6290.appspot.com/static/icos/notif-icon.png"
    });
}