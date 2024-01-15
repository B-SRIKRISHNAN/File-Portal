// Reciever is local, input/sender is remote because reciever initiates connection
// Local is one who downloads the file, Remote is the one who recieves the file

// const { WebSocket } = require('ws');
// import { crypto } from 'crypto';
import { FileSystemWriter } from './fileWriter.js';
import { WebRtcConnectionLocal, WebRtcConnectionRemote } from './WebRtcConnector.js';
import { SignallingChannel, DefaultWebSocketSignallingChannel } from './signallingChannel.js';
// import {  } from './Pipeline.js';
import { Stream } from 'stream';
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
if (!reciever && !input)
    throw new Error('No valid elements found');

let aws_wss_url = "wss://7fkuyllf72.execute-api.eu-north-1.amazonaws.com/production/";

let config = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }

function printStatus(status) {
    console.log("status " + status);
    logs.innerText += status + "\n"
}

let socket = null;

let uId = '';

let signallingChannel = null;


if (reciever) {
    handleLocal();
}
if (input) {
    handleRemote();
}


/**Handles the case of the downloading person */
function handleLocal() {


    // function updateDownloadStatus(val) {
    //     downloadStatus.innerText = val + "%";
    // }


    socket = new WebSocket(aws_wss_url);
    socket.addEventListener('open', () => {

        signallingChannel = new DefaultWebSocketSignallingChannel(socket);
        let localConnection = new WebRtcConnectionLocal(config, signallingChannel);

        console.log(localConnection);

        let fileWriterObj = null;

        async function createFileWriter() {
            fileWriterObj = new FileSystemWriter();
            console.log(fileWriterObj);
        }

        downloadFile.onclick = () => {


            uId = window.location.href.split("?")[1].split("&")[0].split("=")[1];
            signallingChannel.setUId(uId);
            signallingChannel.send('join', {});

            function updateDownloadStatus(val) {
                downloadStatus.innerText = val + "%";
            }


            localConnection.sendConnection(onConnectionEstablishedLocal, printStatus);


            function onConnectionEstablishedLocal(connection) {
                printStatus('hello local');

                signallingChannel.addEventListener('message', (msg) => {
                    console.log(msg);
                    msg = JSON.parse(msg.data);
                    console.log(msg);
                    let fileSize = msg.size;
                    let sizeDownloaded = 0;
                    let chunkSize = msg.chunkSize;

                    // let queue = new Queue(1000);
                    // let buffer = new ArrayBuffer(1000);
                    // let byteBuffer = new Uint32Array(buffer);
                    // let shouldWrite = false;



                    createWriteLocation(msg.name, msg.type).then(res => {

                        let readable = new Stream.Readable({ read() { console.log("Starting:: ") }, objectMode: true, highWaterMark: 100 });
                        let writable = new Stream.Writable({
                            write(chunk, encoding, callback) {

                                writeChunkToFile(chunk).then(callback());
                            }, objectMode: true
                        });
                        readable.pipe(writable);


                        connection.addEventListener('datachannel', (event) => {
                            let channel = event.channel;
                            channel.addEventListener('open', () => {
                                printStatus('local data channel ready to recieve')
                                updateDownloadStatus(0);
                            })
                            channel.addEventListener('close', () => {
                                console.log("received close signal");
                                // clearInterval(interval);
                                // shouldWrite = false;
                                // console.log("closing write channel");
                                readable.push(null);
                                fileWriterObj.closeWritableStream().then(res => {
                                    updateDownloadStatus(100);
                                    printStatus('file downloaded');
                                })
                            });

                            let messageReceived = false;
                            let attempts = 0;
                            let max_attempts = 10;
                            // let pushToQueue = (data) => {
                            //     console.log("Pushing to queue");
                            //     try {
                            //         attempts++;
                            //         // queue.push(data);
                            //         // console.log("current queue size: " + queue.getCurrentSize());
                            //         let num = byteBuffer.byte;
                            //         byteBuffer.set(data,num-1);
                            //         console.log("current buffer size: " + byteBuffer.byteLength);
                            //         attempts = 0;
                            //         channel.send({ 'ok': true });

                            //     } catch (e) {
                            //         console.log("Error pushing to queue");
                            //         if (attempts <= max_attempts) {
                            //             pushToQueue(data);
                            //         } else {
                            //             // setTimeout(() => {
                            //             //     console.log("resetting attempts");
                            //             //     attempts = 0;
                            //             //     pushToQueue(data);
                            //             // }, 100)
                            //             channel.close();
                            //             // send({ 'ok': false, 'message': 'data cannot be pushed to queue' });
                            //         }
                            //     }

                            // };
                            channel.onmessage = (event) => {
                                console.log("received.");
                                let isMarkReached = readable.push(event.data);
                                if(isMarkReached)
                                {
                                    channel.send({ 'ok': true });
                                }else{
                                    setTimeout(()=>{
                                        channel.send({ 'ok': true });
                                    },1000)
                                }
                                // if (!messageReceived) {
                                //     messageReceived = true;
                                //     shouldWrite = true;
                                //     setTimeout(()=>{ initReaderAndWriter().then(val=>{console.log(val)});},50)

                                // }

                                // pushToQueue(event.data)

                                // fileWriterObj.writeToFile(event.data).then(res => {
                                //     sizeDownloaded += chunkSize;
                                //     if (sizeDownloaded > fileSize)
                                //         sizeDownloaded = fileSize;
                                //     updateDownloadStatus((sizeDownloaded / fileSize) * 100);
                                //     channel.send({ 'ok': true })
                                // })

                            }

                            // let initReaderAndWriter = async () => {
                            //     // let retry = 10;
                            //     // let tries = 0;
                            //     return new Promise(async (res,rej)=>{
                            //         console.log("INIT WRITE: " + shouldWrite);
                            //         while (true) {

                            //             if (shouldWrite) {
                            //                 // if (queue.getCurrentSize()>0) {
                            //                 if(byteBuffer.byteLength>0){
                            //                     try {
                            //                         console.log("Attempting to get data");
                            //                         let data = byteBuffer.at(0);
                            //                         byteBuffer = byteBuffer.slice(1,byteBuffer.byteLength-1);
                            //                         //  queue.get();
                            //                         await writeChunkToFile(new Blob(data));
                            //                     } catch (e) {
                            //                         console.log("Error init: " + e.message);
                            //                     }
                            //                 }else{
                            //                     console.log("queue is empty, retrying");
                            //                 }
                            //             } else {
                            //                 break;
                            //             }
                            //         }
                            //         res("Completed write");
                            //     });

                            // let interval = setInterval(()=>{
                            //     console.log("Running interval!!!");
                            //     if(shouldWrite || queue.getCurrentSize()>0){
                            //         try{
                            //             console.log("Attempting to get data");
                            //             let data = queue.get();
                            //             writeChunkToFile(new Blob(data));
                            //         }catch(e){
                            //             console.log("Error init: "+e.message);
                            //         }
                            //     }else{
                            //         console.log("Clearing interval");
                            //         clearInterval(interval);
                            //     }
                            // },5);
                            // while((shouldWrite || queue.getCurrentSize()>0)&&(tries<=retry)){
                            //     try{                 
                            //         console.log("Attempting Write");                   
                            //         await writeChunkToFile(queue.get());
                            //         tries = 0;
                            //     }catch(e){
                            //         console.log("error writing chunk!!!: "+e.message);
                            //         // console.error(e);
                            //         tries++;
                            //     }
                            // }
                            // }


                        })

                        signallingChannel.send('message', { 'channelCreate': true });

                        let writeChunkToFile = async (chunk) => {
                            // return new Promise((res,rej)=>{
                            console.log("Writing to file");
                            await fileWriterObj.writeToFile(chunk)
                            // .then(res => {
                            sizeDownloaded += chunkSize;
                            if (sizeDownloaded > fileSize)
                                sizeDownloaded = fileSize;
                            updateDownloadStatus((sizeDownloaded / fileSize) * 100);
                            // });
                            // })
                        }
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
            // This is experimental code
            let reconnectAttempts = 5;
            localConnection.connection.oniceconnectionstatechange = (event) => {
                // if(localConnection.connectionState=='connected')
                // {
                //     reconnectAttempts = 5;
                // }else 
                if ((localConnection.connection.iceconnectionState == 'failed')) {
                    localConnection.connection.restartIce();
                    // localConnection.sendConnection(()=>{console.log("Connection Reestablished")}, printStatus);
                    // reconnectAttempts--;
                }
            }
            // This is experimental code

        }
    });


}

/**Handles the case of the uploading person */
function handleRemote() {

    let fileReader = new FileReader();
    let inputFileVal = null;
    let remoteConnection = null;
    let chunkSize = 32000;

    linkGenerator.onclick = () => {
        if (input.files[0]) {
            console.log("Connecting to websocket")
            socket = new WebSocket(aws_wss_url);
            socket.addEventListener('open', () => {
                console.log("connected to remote websocket server");

                signallingChannel = new DefaultWebSocketSignallingChannel(socket);
                uId = crypto.randomUUID();
                link.innerHTML = '<a href="' + apiUrl + '/getFile?uId=' + uId + '" target="blank">' + apiUrl + '/getFile?uId=' + uId + '</a>';
                signallingChannel.setUId(uId);
                signallingChannel.send('join', {});

                inputFileVal = input.files[0];
                if (inputFileVal != null) {
                    console.log(inputFileVal);

                    remoteConnection = new WebRtcConnectionRemote(config, signallingChannel);

                    console.log(remoteConnection);

                    if (remoteConnection != null) {
                        remoteConnection.recieveConnection(onConnectionEstablishedRemote, printStatus);
                    }
                }


                function onConnectionEstablishedRemote(connection) {

                    console.log("hello remotre");
                    if (inputFileVal != null) {
                        let name = inputFileVal.name;
                        let type = inputFileVal.type;
                        let size = inputFileVal.size;
                        let fileDetails = { 'name': name, 'type': type, 'size': size, 'chunkSize': chunkSize }
                        signallingChannel.send('message', fileDetails);
                    }

                    signallingChannel.addEventListener('message', (msg) => {
                        msg = JSON.parse(msg.data);
                        if (msg.channelCreate == true) {
                            let fileTransferChannel = connection.createDataChannel('fileTransfer', { ordered: true });
                            fileTransferChannel.binaryType = 'arraybuffer';
                            fileTransferChannel.bufferedAmountLowThreshold = 32000//65535;//64 kb
                            fileTransferChannel.addEventListener('open', sendData(inputFileVal, fileTransferChannel))

                        }
                    })

                }


                async function sendData(file, sendChannel) {
                    window.onbeforeunload = (event) => {
                        event.preventDefault();
                        // event.returnValue =  window.confirm("This will stop the file transfer process permenantly. Do you wish to continue?")
                    }
                    let bytePoint = 0;
                    let chunkSize = 32000;
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
                        checkBufferSize(sendChannel).then(res => {
                            if (bytePoint <= size) {
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
}




