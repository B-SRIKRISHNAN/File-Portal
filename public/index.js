// Reciever is local, input/sender is remote because reciever initiates connection
// Local is one who downloads the file, Remote is the one who recieves the file

let input = document.getElementById('fileInput');
let downloadFile = document.getElementById('downloadFile');
let reciever = document.getElementById("reciever");
let linkGenerator = document.getElementById("linkGenerator");
let link = document.getElementById("link");
let logs = document.getElementById('logs');
let downloadStatus = document.getElementById("downloadStatus");
let url = 
"https://cgwubiscl6.execute-api.eu-north-1.amazonaws.com"
// "http://getting-started-app-env.eba-ibg6rqes.eu-north-1.elasticbeanstalk.com" 
// process.env.API_ENDPOINT


let apiUrl = url;// "https://file-portal.eu-north-1.elasticbeanstalk.com";
// "https://g0dtkanc97.execute-api.eu-north-1.amazonaws.com/fileportal_1";
let socketUrl="http://getting-started-app-env.eba-ibg6rqes.eu-north-1.elasticbeanstalk.com" 
//  "wss://ah0svbniye.execute-api.eu-north-1.amazonaws.com/production";
//  url;

// "https://file-portal.eu-north-1.elasticbeanstalk.com";
// "wss://1a31d2dgm6.execute-api.eu-north-1.amazonaws.com/production";
if(!reciever&&!input)
    throw new Error('No valid elements found');




let io = window.io;
let socket = io(socketUrl);
// let socket = new WebSocket(socketUrl);
let config = {'iceServers':[{'urls':'stun:stun.l.google.com:19302'}]}
let signallingChannel = null;
let createSignalClass = async ()=>{
    let signalClass = await import('./signallingChannel.js');
    signallingChannel = signalClass.getSignallingChannel(sendMessage,recieveMessage);
    console.log(signallingChannel);
}
let webRtcClass = null;
import('./WebRtcConnector.js').then(webRtc=>{
    webRtcClass = webRtc;
    createSignalClass().then(res=>{
        if(reciever)
        {
            handleLocal(webRtcClass);
        }
        if(input)
        {
            handleRemote(webRtcClass);
        }
    });
        
});
let uId = null;
function printStatus(status)
{
    console.log("status "+status);
    logs.innerText+=status +"\n"
}
function updateDownloadStatus(val)
{
    downloadStatus.innerText=val+"%";
}
function sendMessage(messageName,message)
{
    if(uId!=null)// only if we have joined room, we can send message
    {    message['uId']=uId;
        console.log(message);
        socket.emit(messageName,message);
        // socket.send({"message":messageName,"data":message});
    }
}

function recieveMessage(messageName, doOnMessage){
    socket.on(messageName,doOnMessage);
    // socket.onmessage=doOnMessage();
}




function handleLocal(webRtcClass)
{
    let localConnection = webRtcClass.getWebRtcConnectionLocal(config,signallingChannel);
    console.log(localConnection);

    let fileWriterObj = null;
    async function createFileWriter(){
        let fileClass = await import('./fileWriter.mjs');
        fileWriterObj = fileClass.getFileWriterObj();
        console.log(fileWriterObj)  
    }
    uId = window.location.href.split("?")[1].split("&")[0].split("=")[1];
    sendMessage('join',{})

    downloadFile.onclick = ()=>{
        localConnection.sendConnection(onConnectionEstablishedLocal,printStatus);
    }
  
    function onConnectionEstablishedLocal(connection)
    {
        printStatus('hello local');
        
        recieveMessage('message',(msg)=>{
            let fileSize = msg.size;
            let sizeDownloaded = 0;
            let chunkSize = msg.chunkSize;
            createWriteLocation(msg.name,msg.type).then(res=>{  

                connection.addEventListener('datachannel',(event)=>{
                    let channel = event.channel;
                    channel.addEventListener('open',()=>{
                        printStatus('local data channel ready to recieve')
                        updateDownloadStatus(0);
                    })
                    channel.addEventListener('close',()=>{
                        let checkComplete = setInterval(()=>{
                            if(sizeDownloaded>=fileSize)
                            {
                                fileWriterObj.closeWritableStream().then(res=>{
                                    updateDownloadStatus(100);
                                    printStatus('file downloaded');
                                    window.clearInterval(checkComplete);
                                })
                            }
                        },50) 
                        
                    })
                    channel.onmessage= (event)=>{
                        fileWriterObj.writeToFile(event.data).then(res=>{
                            sizeDownloaded+=chunkSize;
                            if(sizeDownloaded>fileSize)
                                sizeDownloaded = fileSize;
                            updateDownloadStatus((sizeDownloaded/fileSize)*100);
                            channel.send({'ok':true})
                        })
                        
                    }
                })
                sendMessage('message',{'channelCreate':true})
            });
        })
        
    }

  

    async function createWriteLocation(fileName,fileType)
    {
        await createFileWriter()
        if(fileWriterObj!=null)
        {
            await fileWriterObj.createWriteable(fileName,fileType);
        }
    }
}

function handleRemote(webRtcClass)
{
    
    let fileReader = new FileReader();
    let inputFileVal = null;
    let remoteConnection =  null;
    let chunkSize = 16000;
    
    linkGenerator.onclick = ()=>{
        if(input.files[0]){
            getUniqueLink().then(res=>{
                link.innerHTML = '<a href="'+apiUrl+'/getFile?uId='+res+'" target="blank">'+apiUrl+'/getFile?uId='+res+'</a>';
                uId = res;
                sendMessage('join',{});
                
                inputFileVal = input.files[0];
                if(inputFileVal!=null)
                {
                    console.log(inputFileVal);

                    remoteConnection =  webRtcClass.getWebRtcConnectionRemote(config,signallingChannel);
                    console.log(remoteConnection);

                    if(remoteConnection!=null)
                    {
                        remoteConnection.recieveConnection(onConnectionEstablishedRemote,printStatus);
                    }
                }
            })
        }
    }
 
    async function getUniqueLink()
    {
        return new Promise((res,rej)=>{

            let xml = new XMLHttpRequest();
            xml.open('get',apiUrl+'/getUniqueId',false);
            xml.onload = ()=>{
                let data = xml.response;
                res(data);
            }
            xml.send();
        })
       
    }
    
    function onConnectionEstablishedRemote(connection){

        console.log("hello remotre");
        if(inputFileVal!=null)
        {
            let name = inputFileVal.name;
            let type = inputFileVal.type;
            let size = inputFileVal.size;
            let fileDetails = {'name':name,'type':type,'size':size,'chunkSize':chunkSize}
            sendMessage('message',fileDetails);
        }

        recieveMessage('message',(msg)=>{
            if(msg.channelCreate==true)
            {
                let fileTransferChannel = connection.createDataChannel('fileTransfer');
                fileTransferChannel.binaryType = 'arraybuffer';
                fileTransferChannel.bufferedAmountLowThreshold = 65535;//64 kb
                fileTransferChannel.addEventListener('open',sendData(inputFileVal,fileTransferChannel))
            
            }
        })
        
    }


    async function sendData(file,sendChannel){
        let bytePoint = 0;
        let chunkSize = 16000;
        let size = file.size;
        let chunk = file.slice(bytePoint,bytePoint+chunkSize);
        sendChannel.onmessage=(event)=>{
            if(event.data)
            {
  
                if(bytePoint>=size)
                {
                    // fileReader.close();
                    sendChannel.close();
                    sendMessage('clearRoom',{});
                }else{
                    chunk = file.slice(bytePoint,bytePoint+chunkSize)
                    readFileData(chunk);
                }

            }
        }
        fileReader.onload =  ()=>{
            // resolve(fileReader.result);
            checkBufferSize(sendChannel).then(res=>{
                console.log("sent");
                sendChannel.send(fileReader.result);
                bytePoint += chunkSize;
            })
        
        }
        readFileData(chunk);
    }

    async function checkBufferSize(dataChannel){
        
        return new Promise((resolve,reject)=>{
            if(dataChannel.bufferedAmount<dataChannel.bufferedAmountLowThreshold)
            {
                resolve('ok');
            }else{
                let intervalCheck = setInterval(()=>{
                    if(dataChannel.bufferedAmount<dataChannel.bufferedAmountLowThreshold)
                    {
                        resolve('ok');
                        window.clearInterval(intervalCheck);
                    }
                },50)
            }
        })
    }

    function readFileData(data){
        fileReader.readAsArrayBuffer(data);   
    }


}




