const request = require('request');
// var app = require('express');
//var io = require('socket.io')(http);

const express = require('express');
const app = express();

//socket.io
// const server_port = 7755;
const dgram = require("dgram");
const server = dgram.createSocket("udp4");

//connect to firebase
const firebase = require("firebase-admin");
const serviceAccount = require("-- Your name file json from firebase --");
firebase.initializeApp({
    apiKey: "-- Your apiKey --",
    authDomain: "-- Your authDomain --",
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "-- Your databaseURL --"
});


//ตัวแปร
var temp = 0.00;
var humid = 0.00;
var abs_temp = 0;
var abs_humid = 0;
var new_port = 3000;


server.on("error", function (err) {
    console.log("server error:\n" + err.stack);
    server.close();
});

server.on("message", async function (msg, rinfo) {

    var d = new Date();

    // set time send to database   
    var utc_offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() + utc_offset);
    var thai_offset = 7 * 60;
    d.setMinutes(d.getMinutes() + thai_offset);

    console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
    var ack = new Buffer(msg);
    server.send(ack, 0, ack.length, rinfo.port, rinfo.address, function (err, bytes) {
        console.log("sent ACK.");
        console.log("msg : " + new Buffer(msg).toString("ascii"));
    });

    //รับค่าจาก NB-IoT แปลงเป็น String
    var split_msg = new Buffer(msg).toString();
    var split_value = split_msg.split(' ');

    console.log("Humidity = " + split_value[1]);
    //console.log("typeH = "+typeof split_msg[1]);
    console.log("Temperature = " + split_value[2]);
    //console.log("typeT = "+typeof split_msg[1]);
    d = d.toString('ascii').substr(0, 24)
    console.log("dateTime = " + d)
    console.log(typeof split_msg);

    //การส่งการแจ้งเตือน
    //split ส่งขึ้น firebase
    await firebase.database().ref('/valueNB').orderByKey().limitToLast(1).once("value", function (snap) {
        temp = parseFloat(split_value[2]);
        humid = parseFloat(split_value[1]);
        let vals = snap.val();
        let humidity;
        let temp2;
        for (var i in vals) {
            val = vals[i];
            console.log(val);

            humidity = val.Humidity;
            temp2 = val.Temperature;
        };
        console.log(humid);
        console.log(humidity);
        abs_temp = Math.abs(temp - temp2);
        abs_humid = Math.abs(humid - humidity);

        // console.log(abs_temp);
        console.log(abs_humid);
        if ((split_value[2] < 50 || split_value[2] > 60 || split_value[1] > 50) && (abs_temp > 1 || abs_humid > 1)) {
            
            temp = split_value[2];
            humid = split_value[1];

            request({
                method: 'POST',
                uri: '-- Your uri --',
                header: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                auth: {
                    bearer: '-- Your token key --', //token
                },
                form: {
                    message: "ค่าอุณหภูมิและค่าความชื้นของคุณผิดปกติ" + "\n" + "อุณหภูมิ : " + split_value[2] + " องศา" + "\n" + "ความชื้น : " + split_value[1] + "%" + "\n" + "ต้องการควบคุม กรุณาคลิ๊ก " + "URL : " + "www.thaisunco.com" + "\n",//ข้อความที่จะส่ง
                },
            }, (err, httpResponse, body) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log(body)
                }
            });
        }
    });


    //split ส่งขึ้น firebase
    await firebase.database().ref('/valueNB').push({
        Humidity: parseFloat(split_value[1]),
        Temperature: parseFloat(split_value[2]),
        dateTime: d
    });

});


server.on("listening", function () {
    var address = server.address();
    console.log("server listening " + address.address + ":" + address.port);
});


server.bind({
    address: '0.0.0.0',
    port: -- Your port --,
    exclusive: true
});
