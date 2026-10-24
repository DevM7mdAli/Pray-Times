// Expo config plugin: removes the `aps-environment` entitlement that the
// expo-notifications plugin adds. Pray Times only schedules local
// notifications, so the app does not need the Push Notifications capability,
// and its App ID does not have to carry it before a release build can sign.
//
// Expo runs mods last-registered-first, so this plugin must be listed *before*
// "expo-notifications" in app.json for the delete to happen after the insert.
const { withEntitlementsPlist } = require("expo/config-plugins");

function withIosLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
}

module.exports = withIosLocalNotificationsOnly;
