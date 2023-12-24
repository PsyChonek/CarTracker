var ssid = "ssid";
var password = "password";

var ssidInputField = document.getElementById("ssid");
var passwordInputField = document.getElementById("password");

// Look for wifi.txt
function loadWifiSettingsFile() {
	// Create request to get wifi.txt
	var request = new XMLHttpRequest();
	request.open("GET", "wifi.txt", false);
	request.send(null);
	var returnValue = request.responseText;
    if (request.status === 200) {
        parseWifiSettingsFile(returnValue);
    }

    updateUI();
}

// Create request to get wifi.txt
function saveWifiSettingsFile() {
    var request = new XMLHttpRequest();
    request.open("POST", "saveWifiSettingsFile", true);
    request.send(ssid + "\n" + password);
}

// Parse wifi.txt
function parseWifiSettingsFile(file) {
	var lines = file.split("\n");
	ssid = lines[0];
	password = lines[1];
}

function updateUI() {
    ssidInputField.value = ssid;
    passwordInputField.value = password;
}

ssidInputField.addEventListener("input", function() {
    ssid = this.value;
});

passwordInputField.addEventListener("input", function() {
    password = this.value;
});

loadWifiSettingsFile();