// Reciever is local, input/sender is remote because reciever initiates connection
// Local is one who downloads the file, Remote is the one who recieves the file

// const { WebSocket } = require('ws');
// import { crypto } from 'crypto';
import { FileSystemWriter } from './fileWriter.js';
import { WebRtcConnectionLocal, WebRtcConnectionRemote } from './WebRtcConnector.js';
import { SignallingChannel, DefaultWebSocketSignallingChannel } from './signallingChannel.js';
import { Stream } from 'stream';
let input = document.getElementById('fileInput');
let downloadFile = document.getElementById('downloadFile');
let reciever = document.getElementById("reciever");
let linkGenerator = document.getElementById("linkGenerator");
let link = document.getElementById("link");
let logs = document.getElementById('logs');
let downloadStatus = document.getElementById("downloadStatus");
let uploadStatus = document.getElementById("uploadStatus");
let time_ele = document.getElementById("time");

let windowLoc = window.location.href;

let url = windowLoc.substring(0, windowLoc.indexOf("/", 8));
console.log(url);

let apiUrl = url;
if (!reciever && !input)
    throw new Error('No valid elements found');
if(window.isSecureContext){

}else{
    alert("secure window needed")
    throw Error("Secure window needed")
}
let aws_wss_url = "wss://"+window.location.host;
// "wss://7fkuyllf72.execute-api.eu-north-1.amazonaws.com/production/";

let config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // {
    //   urls: 'turn:openrelay.metered.ca:80',
    //   username: 'openrelayproject',
    //   credential: 'openrelayproject'
    // }
  ]
}

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
                    msg = msg.message;
                    console.log(msg);
                    let fileSize = msg.size;
                    let sizeDownloaded = 0;
                    let chunkSize = msg.chunkSize;

                    createWriteLocation(msg.name, msg.type).then(res => {

                        let readable = new Stream.Readable({ read() { console.log("Reading from source...") }, objectMode: true, highWaterMark: 1000 });
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
                                // readable.push(null);
                                readable.destroy();
                                fileWriterObj.closeWritableStream().then(res => {
                                    updateDownloadStatus(100);
                                    printStatus('file downloaded');
                                })
                            });

                            let messageReceived = false;
                            let attempts = 0;
                            let max_attempts = 10;

                            channel.onmessage = (event) => {
                                console.log("received.");
                                if(event.data.wait)
                                {
                                    console.log("wait event");
                                    return;
                                }
                                let isMarkReached = readable.push(event.data);
                                if(isMarkReached)
                                {
                                //   channel.send({ 'ok': true });
                                  channel.send({ 'wait': '1' });
                                }else{
                                    console.log("waiting");
                                    setTimeout(()=>{
                                        // channel.send({ 'ok': true });
                                        channel.send({ 'wait': '0'});
                                    },1000)
                                }
                            }
                        })

                        signallingChannel.send('message', { 'channelCreate': true });

                        let writeChunkToFile = async (chunk) => {
                            console.log("Writing to file");
                            await fileWriterObj.writeToFile(chunk)
                            sizeDownloaded += chunkSize;
                            console.log("Written chunk " + (sizeDownloaded / chunkSize) + "to file");
                            if (sizeDownloaded > fileSize)
                                sizeDownloaded = fileSize;
                            updateDownloadStatus((sizeDownloaded / fileSize) * 100);
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
                // if ((localConnection.connection.iceconnectionState == 'failed')) {
                //     localConnection.connection.restartIce();
                // localConnection.sendConnection(()=>{console.log("Connection Reestablished")}, printStatus);
                // reconnectAttempts--;
                // }
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
    let chunkSize = 256000;
    let startTime = 0;

    function trackTime(uploaded, size){
        let time_taken = Math.round(((Date.now()-startTime)/1000))
        let rate = Math.round((uploaded/1024)/time_taken)//kbps
        let time_remain = (Math.round((size/1024)/rate) - time_taken)
        time_ele.innerHTML = "<span>Time Till now: "+time_taken+" sec </span><br>"+"<span> Rate : "+rate+" kb/s </span><br>"+"<span>"+ time_remain+" seconds remaining </span>"
    }


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
                        msg = msg.message;
                        if (msg.channelCreate == true) {
                            let fileTransferChannel = connection.createDataChannel('fileTransfer', { ordered: true });
                            fileTransferChannel.binaryType = 'arraybuffer';
                            fileTransferChannel.bufferedAmountLowThreshold = 512000;//64 kb//32000//256000
                            fileTransferChannel.addEventListener('open', sendData(inputFileVal, fileTransferChannel))
                            startTime = Date.now();
                        }
                    })

                }

                function updateUploadStatus(val) {
                    uploadStatus.innerText = val;
                }

                async function sendData(file, sendChannel) {
                    window.onbeforeunload = (event) => {
                        event.preventDefault();
                        // event.returnValue =  window.confirm("This will stop the file transfer process permenantly. Do you wish to continue?")
                    }
                    let shouldWait = false;
                    let bytePoint = 0;
                    // let chunkSize = 256000;//128000
                    let size = file.size;
                    let chunk = file.slice(bytePoint, bytePoint + chunkSize);
                    sendChannel.onmessage = (event) => {
                        if (event.data) {

                            if (event.data.wait == 1) {
                                shouldWait = true;
                            } else if (event.data.wait == 0) {
                                shouldWait = false;
                                readNextChunk();
                            }



                            // if (!shouldWait) {
                            //     chunk = file.slice(bytePoint, bytePoint + chunkSize)
                            //     readFileData(chunk);
                            // }
                            // if (bytePoint >= size) {    
                            //     // fileReader.close();
                            //     console.log("CLOSING CHANNEL");
                            //     sendChannel.close();
                            //     // signallingChannel.send('clearRoom', {})
                            //     // sendMessage('clearRoom', {});
                            // } else {
                            //     chunk = file.slice(bytePoint, bytePoint + chunkSize)
                            //     readFileData(chunk);
                            // }

                        }
                    }
                    fileReader.onload = async () => {

                        await checkBufferSize(sendChannel)

                        if (bytePoint <= size) {
                            console.log("sent");
                            sendChannel.send(fileReader.result);
                            trackTime(bytePoint, size)
                            bytePoint += chunkSize;
                            updateUploadStatus("sent "+bytePoint+" bytes out of "+size +" = "+((bytePoint/size)*100)+"%")
                        }
                        if (!shouldWait) {
                            readNextChunk();
                        }
                    }

                    function readNextChunk() {
                        if (bytePoint < size) {
                            console.log("sending");
                            chunk = file.slice(bytePoint, bytePoint + chunkSize)
                            try {
                                readFileData(chunk);
                            } catch (error) {
                                console.log(error);
                            }
                        } else {
                            console.log("CLOSING CHANNEL");
                            sendChannel.close();
                            fileReader.close();
                        }
                    }

                    readNextChunk()
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




