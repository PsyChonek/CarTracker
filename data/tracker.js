if (!!window.EventSource) {
    console.log("Start event source!");
    var source = new EventSource('/events');
}

source.addEventListener('newReadings', function (e) {
    console.log("newReadings ", e.data);
    newReading(JSON.parse(e.data));
}, false);

source.addEventListener('open', function (e) {
    console.log("Events Connected");
}, false);

source.addEventListener('error', function (e) {
    if (e.target.readyState != EventSource.OPEN) {
        console.log("Events Disconnected");
    }
}, false);

source.addEventListener('message', function (e) {
    console.log("message", e.data);
}, false);


var newReading = function (data) {

}

var players = [];
var readings = [];
