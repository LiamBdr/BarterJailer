 // PhoneGap event handler
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
    console.log("PhoneGap is ready!!");
}

document.getElementById(button).addEventListener("click", myScript);


// function getPosition() {
//     navigator.geolocation.getCurrentPosition(onSuccess, onError);
// }


// var onSuccess = function(position) {
//     // alert(
//     //     'Latitude: '          + position.coords.latitude          + '\n' +
//     //     'Longitude: '         + position.coords.longitude         + '\n' +
//     //     'Altitude: '          + position.coords.altitude          + '\n' +
//     //     'Accuracy: '          + position.coords.accuracy          + '\n' +
//     //     'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
//     //     'Heading: '           + position.coords.heading           + '\n' +
//     //     'Speed: '             + position.coords.speed             + '\n' +
//     //     'Timestamp: '         + position.timestamp                + '\n'
//     // );
//     $("#menu").append(
//         `<li>
//             <ul>
//                 <li>Latitude : `+ position.coords.latitude + `</li>
//                 <li>Longitude : ` + position.coords.longitude + `</li>
//             </ul>
//         </li><hr>`
//         );
// };

// // onError Callback receives a PositionError object
// //
// function onError(error) {
//     alert(
//         'code: '    + error.code    + '\n' +
//         'message: ' + error.message + '\n'
//     );
// }


