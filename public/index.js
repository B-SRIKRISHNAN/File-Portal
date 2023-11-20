// Reciever is local, input/sender is remote because reciever initiates connection
// Local is one who downloads the file, Remote is the one who recieves the file

// const { WebSocket } = require('ws');

let input = document.getElementById('fileInput');
let downloadFile = document.getElementById('downloadFile');
let reciever = document.getElementById("reciever");
let linkGenerator = document.getElementById("linkGenerator");
let link = document.getElementById("link");
let logs = document.getElementById('logs');
let downloadStatus = document.getElementById("downloadStatus");
let windowLoc = window.location.href;

let url = windowLoc.substring(0, windowLoc.indexOf("/", 8));
console.log(url);

let apiUrl = url;
// let socketUrl = "wss://7fkuyllf72.execute-api.eu-north-1.amazonaws.com/production/";

if (!reciever && !input)
    throw new Error('No valid elements found');

let aws_wss_url = "wss://7fkuyllf72.execute-api.eu-north-1.amazonaws.com/production/";
// let io = window.io;
// let socket = io(socketUrl);

let config = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }

function printStatus(status) {
    console.log("status " + status);
    logs.innerText += status + "\n"
}

let socket = null;

let uId = '';

let signalClass = null;
let signallingChannel = null;

let createSignalClass = async () => {
    signalClass = await import('./signallingChannel.js');
}

let webRtcClass = null;
import('./WebRtcConnector.js').then(webRtc => {
    webRtcClass = webRtc;
    createSignalClass().then(res => {
        if (reciever) {
            handleLocal(webRtcClass);
        }
        if (input) {
            handleRemote(webRtcClass);
        }
    });
});


// Commented to reorganise code!!
// socket =  new WebSocket(aws_wss_url);




// socket.addEventListener('open', () => {
// console.log("Connected to socket!!");
// let config = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
// let signallingChannel = null;
// let createSignalClass = async () => {
//     let signalClass = await import('./signallingChannel.js');
//     // signallingChannel = signalClass.getSignallingChannel(sendMessage, recieveMessage);
//     signallingChannel = signalClass.getDefaultWebSocketSignallingChannel(socket)
//     console.log(signallingChannel);
// }
// let webRtcClass = null;
// import('./WebRtcConnector.js').then(webRtc => {
//     webRtcClass = webRtc;
//     createSignalClass().then(res => {
//         if (reciever) {
//             handleLocal(webRtcClass);
//         }
//         if (input) {
//             handleRemote(webRtcClass);
//         }
//     });

// });
// let uId = null;



// function printStatus(status) {
//     console.log("status " + status);
//     logs.innerText += status + "\n"
// }

// function updateDownloadStatus(val) {
//     downloadStatus.innerText = val + "%";
// }

// function sendMessage(messageName, message) {
//     // alert("sending message " + messageName)
//     if (uId != null)// only if we have joined room, we can send message
//     {
//         message['uId'] = uId;
//         console.log(message);
//         // socket.emit(messageName,message);
//         // if){
//         //     alert("SOKET OPEN SENDING")
//         //     socket.send("{\"action\":"+"\""+messageName+"\""+",\"message\":"+JSON.stringify(message)+"}");
//         // }
//         // socket.addEventListener('open',()=>{
//         socket.send("{\"action\":" + "\"" + messageName + "\"" + ",\"message\":" + JSON.stringify(message) + "}");
//         // socket.send({"action":messageName,"message":message});
//         // })
//     }
// }

// function recieveMessage(messageName, doOnMessage) {
//     // defualt browser web socket client
//     // socket.addEventListener('open',()=>{socket.addEventListener(messageName,doOnMessage);})
//     // alert("reveiving message");
//     socket.addEventListener('message', doOnMessage);
//     // socket.onmessage=doOnMessage();
// }


// Commented to reorganise code

/**Handles the case of the downloading person */
function handleLocal(webRtcClass) {


    // function updateDownloadStatus(val) {
    //     downloadStatus.innerText = val + "%";
    // }


    socket = new WebSocket(aws_wss_url);
    socket.addEventListener('open', () => {

        if (!signalClass || signalClass == null)
            return;

        signallingChannel = signalClass.getDefaultWebSocketSignallingChannel(socket);
        let localConnection = webRtcClass.getWebRtcConnectionLocal(config, signallingChannel);
        console.log(localConnection);

        let fileWriterObj = null;

        async function createFileWriter() {
            let fileClass = await import('./fileWriter.mjs');
            fileWriterObj = fileClass.getFileWriterObj();
            console.log(fileWriterObj)
        }

        // uId = window.location.href.split("?")[1].split("&")[0].split("=")[1];
        // sendMessage('join', {})

        downloadFile.onclick = () => {


            uId = window.location.href.split("?")[1].split("&")[0].split("=")[1];
            // sendMessage('join', {})
            signallingChannel.send('join', {});

            function updateDownloadStatus(val) {
                downloadStatus.innerText = val + "%";
            }


            localConnection.sendConnection(onConnectionEstablishedLocal, printStatus);


            function onConnectionEstablishedLocal(connection) {
                printStatus('hello local');


                // recieveMessage('message', (msg) => {
                signallingChannel.addEventListener('message', (msg) => {
                    console.log(msg);
                    msg = JSON.parse(msg.data);
                    console.log(msg);
                    let fileSize = msg.size;
                    let sizeDownloaded = 0;
                    let chunkSize = msg.chunkSize;
                    createWriteLocation(msg.name, msg.type).then(res => {

                        connection.addEventListener('datachannel', (event) => {
                            let channel = event.channel;
                            channel.addEventListener('open', () => {
                                printStatus('local data channel ready to recieve')
                                updateDownloadStatus(0);
                            })
                            channel.addEventListener('close', () => {
                                console.log("received close signal");

                                // let checkComplete = setInterval(() => {
                                    console.log("closing write channel");
                                    // if (sizeDownloaded >= fileSize) {
                                        // console.log("Size has exceeded")
                                        fileWriterObj.closeWritableStream().then(res => {
                                            updateDownloadStatus(100);
                                            printStatus('file downloaded');
                                            // window.clearInterval(checkComplete);
                                        })
                                    // }else{
                                    //     while(sizeDownloaded < fileSize){
                                    //         console.log("waiting");
                                    //         if (sizeDownloaded >= fileSize) {
                                    //             console.log("Size has exceeded")
                                    //             fileWriterObj.closeWritableStream().then(res => {
                                    //                 updateDownloadStatus(100);
                                    //                 printStatus('file downloaded');
                                    //                 // window.clearInterval(checkComplete);
                                    //             })
                                    //         }
                                    //     }
                                    // }
                                // }, 50)

                            })
                            channel.onmessage = (event) => {
                                fileWriterObj.writeToFile(event.data).then(res => {
                                    sizeDownloaded += chunkSize;
                                    if (sizeDownloaded > fileSize)
                                        sizeDownloaded = fileSize;
                                    updateDownloadStatus((sizeDownloaded / fileSize) * 100);
                                    channel.send({ 'ok': true })
                                })

                            }
                        })
                        signallingChannel.send('message', { 'channelCreate': true });
                        // sendMessage('message', { 'channelCreate': true })
                    }).catch(error => {
                        console.log("error: " + error);
                    });
                })

            }



            async function createWriteLocation(fileName, fileType) {
                if (fileName && fileType) {
                    await createFileWriter()
                    if (fileWriterObj != null) {
                        await fileWriterObj.createWriteable(fileName, fileType);
                    }
                } else {
                    return new Promise((res, rej) => {
                        rej("undefined values entered");
                    })
                }
            }



        }
    });

    // function onConnectionEstablishedLocal(connection) {
    //     printStatus('hello local');

    //     recieveMessage('message', (msg) => {
    //         console.log(msg);
    //         msg = JSON.parse(msg.data);
    //         console.log(msg);
    //         let fileSize = msg.size;
    //         let sizeDownloaded = 0;
    //         let chunkSize = msg.chunkSize;
    //         createWriteLocation(msg.name, msg.type).then(res => {

    //             connection.addEventListener('datachannel', (event) => {
    //                 let channel = event.channel;
    //                 channel.addEventListener('open', () => {
    //                     printStatus('local data channel ready to recieve')
    //                     updateDownloadStatus(0);
    //                 })
    //                 channel.addEventListener('close', () => {
    //                     let checkComplete = setInterval(() => {
    //                         if (sizeDownloaded >= fileSize) {
    //                             fileWriterObj.closeWritableStream().then(res => {
    //                                 updateDownloadStatus(100);
    //                                 printStatus('file downloaded');
    //                                 window.clearInterval(checkComplete);
    //                             })
    //                         }
    //                     }, 50)

    //                 })
    //                 channel.onmessage = (event) => {
    //                     fileWriterObj.writeToFile(event.data).then(res => {
    //                         sizeDownloaded += chunkSize;
    //                         if (sizeDownloaded > fileSize)
    //                             sizeDownloaded = fileSize;
    //                         updateDownloadStatus((sizeDownloaded / fileSize) * 100);
    //                         channel.send({ 'ok': true })
    //                     })

    //                 }
    //             })
    //             sendMessage('message', { 'channelCreate': true })
    //         }).catch(error => {
    //             console.log("error: " + error);
    //         });
    //     })

    // }



    // async function createWriteLocation(fileName, fileType) {
    //     if (fileName && fileType) {
    //         await createFileWriter()
    //         if (fileWriterObj != null) {
    //             await fileWriterObj.createWriteable(fileName, fileType);
    //         }
    //     }else{
    //         return new Promise((res,rej)=>{
    //             rej("undefined values entered");
    //         })
    //     }
    // }
}
// }
/**Handles the case of the uploading person */
function handleRemote(webRtcClass) {

    let fileReader = new FileReader();
    let inputFileVal = null;
    let remoteConnection = null;
    let chunkSize = 16000;

    linkGenerator.onclick = () => {
        if (input.files[0]) {
            socket = new WebSocket(aws_wss_url);
            socket.addEventListener('open', () => {

                if (!signalClass || signalClass == null)
                    return;

                signallingChannel = signalClass.getDefaultWebSocketSignallingChannel(socket);
                uId = crypto.randomUUID();
                // getUniqueLink().then(res => {
                link.innerHTML = '<a href="' + apiUrl + '/getFile?uId=' + uId + '" target="blank">' + apiUrl + '/getFile?uId=' + uId + '</a>';
                // uId = res;
                // sendMessage('join', {});
                signallingChannel.send('join', {});

                inputFileVal = input.files[0];
                if (inputFileVal != null) {
                    console.log(inputFileVal);

                    remoteConnection = webRtcClass.getWebRtcConnectionRemote(config, signallingChannel);
                    console.log(remoteConnection);

                    if (remoteConnection != null) {
                        remoteConnection.recieveConnection(onConnectionEstablishedRemote, printStatus);
                    }
                }
                // })


                function onConnectionEstablishedRemote(connection) {

                    console.log("hello remotre");
                    if (inputFileVal != null) {
                        let name = inputFileVal.name;
                        let type = inputFileVal.type;
                        let size = inputFileVal.size;
                        let fileDetails = { 'name': name, 'type': type, 'size': size, 'chunkSize': chunkSize }
                        // sendMessage('message', fileDetails);
                        signallingChannel.send('message', fileDetails);
                    }

                    // recieveMessage('message', (msg) => {
                    signallingChannel.addEventListener('message', (msg) => {
                        msg = JSON.parse(msg.data);
                        if (msg.channelCreate == true) {
                            let fileTransferChannel = connection.createDataChannel('fileTransfer',{ordered:true});
                            fileTransferChannel.binaryType = 'arraybuffer';
                            fileTransferChannel.bufferedAmountLowThreshold = 65535;//64 kb
                            fileTransferChannel.addEventListener('open', sendData(inputFileVal, fileTransferChannel))

                        }
                    })

                }


                async function sendData(file, sendChannel) {
                    let bytePoint = 0;
                    let chunkSize = 16000;
                    let size = file.size;
                    let chunk = file.slice(bytePoint, bytePoint + chunkSize);
                    sendChannel.onmessage = (event) => {
                        if (event.data) {

                            if (bytePoint >= size) {
                                // fileReader.close();
                                console.log("CLOSING CHANNEL");
                                sendChannel.close();
                                // signallingChannel.send('clearRoom', {})
                                // sendMessage('clearRoom', {});
                            } else {
                                chunk = file.slice(bytePoint, bytePoint + chunkSize)
                                readFileData(chunk);
                            }

                        }
                    }
                    fileReader.onload = () => {
                        // resolve(fileReader.result);
                        checkBufferSize(sendChannel).then(res => {
                            if(bytePoint<=size)
                            {
                                console.log("sent");
                                sendChannel.send(fileReader.result);
                                bytePoint += chunkSize;
                            }
                        })

                    }
                    readFileData(chunk);
                }


                async function checkBufferSize(dataChannel) {

                    return new Promise((resolve, reject) => {
                        if (dataChannel.bufferedAmount < dataChannel.bufferedAmountLowThreshold) {
                            resolve('ok');
                        } else {
                            let intervalCheck = setInterval(() => {
                                if (dataChannel.bufferedAmount < dataChannel.bufferedAmountLowThreshold) {
                                    resolve('ok');
                                    window.clearInterval(intervalCheck);
                                }
                            }, 50)
                        }
                    })
                }

                function readFileData(data) {
                    fileReader.readAsArrayBuffer(data);
                }

            });

        }
    }

    // async function getUniqueLink() {
    //     return new Promise((res, rej) => {
    //         res(crypto.randomUUID())
    //         // let xml = new XMLHttpRequest();
    //         // xml.open('get', apiUrl + '/getUniqueId', false);
    //         // xml.onload = () => {
    //         //     let data = xml.response;
    //         //     res(data);
    //         // }
    //         // xml.send();
    //     })

    // }

    // function onConnectionEstablishedRemote(connection) {

    //     console.log("hello remotre");
    //     if (inputFileVal != null) {
    //         let name = inputFileVal.name;
    //         let type = inputFileVal.type;
    //         let size = inputFileVal.size;
    //         let fileDetails = { 'name': name, 'type': type, 'size': size, 'chunkSize': chunkSize }
    //         sendMessage('message', fileDetails);
    //     }

    //     recieveMessage('message', (msg) => {
    //         msg = JSON.parse(msg.data);
    //         if (msg.channelCreate == true) {
    //             let fileTransferChannel = connection.createDataChannel('fileTransfer');
    //             fileTransferChannel.binaryType = 'arraybuffer';
    //             fileTransferChannel.bufferedAmountLowThreshold = 65535;//64 kb
    //             fileTransferChannel.addEventListener('open', sendData(inputFileVal, fileTransferChannel))

    //         }
    //     })

    // }


    // async function sendData(file, sendChannel) {
    //     let bytePoint = 0;
    //     let chunkSize = 16000;
    //     let size = file.size;
    //     let chunk = file.slice(bytePoint, bytePoint + chunkSize);
    //     sendChannel.onmessage = (event) => {
    //         if (event.data) {

    //             if (bytePoint >= size) {
    //                 // fileReader.close();
    //                 sendChannel.close();
    //                 sendMessage('clearRoom', {});
    //             } else {
    //                 chunk = file.slice(bytePoint, bytePoint + chunkSize)
    //                 readFileData(chunk);
    //             }

    //         }
    //     }
    //     fileReader.onload = () => {
    //         // resolve(fileReader.result);
    //         checkBufferSize(sendChannel).then(res => {
    //             console.log("sent");
    //             sendChannel.send(fileReader.result);
    //             bytePoint += chunkSize;
    //         })

    //     }
    //     readFileData(chunk);
    // }

    // async function checkBufferSize(dataChannel) {

    //     return new Promise((resolve, reject) => {
    //         if (dataChannel.bufferedAmount < dataChannel.bufferedAmountLowThreshold) {
    //             resolve('ok');
    //         } else {
    //             let intervalCheck = setInterval(() => {
    //                 if (dataChannel.bufferedAmount < dataChannel.bufferedAmountLowThreshold) {
    //                     resolve('ok');
    //                     window.clearInterval(intervalCheck);
    //                 }
    //             }, 50)
    //         }
    //     })
    // }

    // function readFileData(data) {
    //     fileReader.readAsArrayBuffer(data);
    // }


}
// })




