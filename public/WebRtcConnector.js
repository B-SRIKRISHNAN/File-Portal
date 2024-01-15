
/**This represents a sender starting connection with remote */
class WebRtcConnectionLocal {

    connection = null;
    signallingChannel = null;

    constructor(config, signallingChannel) {
        this.connection = new RTCPeerConnection(config);
        this.signallingChannel = signallingChannel;
    }


    /**This should be called from sender end to start connection */
    sendConnection = async (onConnectionEstablishedLocal, printStatus) => {

        this.sendLocalDescToRemote(printStatus).then(() => {
            this.getRemoteDescription(printStatus).then(res => {
                this.establishICLocal(printStatus)
                this.checkConnectionEstablished(onConnectionEstablishedLocal, printStatus);
            })

        })

    }


    /** Create an offer and send to remote*/
    sendLocalDescToRemote = async (printStatus) => {
        printStatus('start send Local description to remote')
        // let options = {
        //     iceRestart:true,
        //     offerToReceiveAudio:true
        // }
        this.connection.createDataChannel('dummy');
        const offer = await this.connection.createOffer();
        printStatus('created offer')
        await this.connection.setLocalDescription(offer);
        printStatus('set local description as offer')

        this.signallingChannel.send('message', { 'offer': offer });
        printStatus('send offer to remote')
    }

    /**This is used to get the answer from remote for the cnonection offer  */
    getRemoteDescription = async (printStatus) => {
        return new Promise((res, rej) => {
            this.signallingChannel.addEventListener('message', async message => {
                message = JSON.parse(message.data);
                if (message.answer) {
                    const answer = new RTCSessionDescription(message.answer);
                    await this.connection.setRemoteDescription(answer);
                    console.log(this.connection.canTrickleIceCandidates)
                    printStatus('setting remote description to answer');
                    res();
                }
            })
        })
    }


    /**Check for ic candidates in local and send them to remote */
    establishICLocal = (printStatus) => {
        console.log("setting ice candidate listener");
        console.log("ice gathering state" + this.connection.iceGatheringState);
        this.connection.addEventListener('icecandidate', (event) => {
            console.log("generating ice candidates");
            if (event.candidate && this.connection.iceGatheringState != 'connected') {
                this.signallingChannel.send('message', { 'new_ice_candidate': event.candidate });
                printStatus('sent ice candidate to remote')
            }
        })
        // this.connection.onicecandidate =  (event) => {
        //     console.log("generating ice candidates");
        //     if (event.candidate && this.connection.iceGatheringState!='connected') {
        //         this.signallingChannel.send('message',{'new_ice_candidate': event.candidate});
        //         printStatus('sent ice candidate to remote')
        //     }
        // };

        this.signallingChannel.addEventListener('message', async message => {
            console.log("received message: 84" + message);
            message = JSON.parse(message.data);
            if (message.iceCandidate) {
                try {
                    await this.connection.addIceCandidate(message.iceCandidate);
                    printStatus('recieved ice candidate frm remote')
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });
    }



    checkConnectionEstablished = (onConnectionEstablishedLocal, printStatus) => {
        this.connection.onconnectionstatechange = (event) => {
            console.log(this.connection.connectionState)
            if (this.connection.connectionState === 'connected') {
                // Peers connected!
                printStatus('connected to remote');
                onConnectionEstablishedLocal(this.connection);
            }
        };
    }
}

export function getWebRtcConnectionLocal(config, signallingChannel) {
    let localConnection = new WebRtcConnectionLocal(config, signallingChannel)
    return localConnection;
}
/**This represents a remote awaiting connection from sender */
class WebRtcConnectionRemote {
    connection = null;
    signallingChannel = null;

    constructor(config, signallingChannel) {
        this.connection = new RTCPeerConnection(config);
        this.signallingChannel = signallingChannel;
    }


    /** This should be called from reciever end to get connection */
    recieveConnection = async (onConnectionEstablishedRemote, printStatus) => {

        this.getOfferFromRemote(printStatus).then(val => {
            this.establishICRemote(printStatus);
            this.checkConnectionEstablished(onConnectionEstablishedRemote, printStatus);
        })

    }


    /** This is used by the recieving end to get the connection  offer and send an answer for the offer */
    getOfferFromRemote = async (printStatus) => {
        return new Promise((res, rej) => {
            this.signallingChannel.addEventListener('message', async message => {
                console.log(message);
                message = JSON.parse(message.data);

                // alert("receiving offer from remote");

                if (message.offer) {
                    const offer = new RTCSessionDescription(message.offer);
                    await this.connection.setRemoteDescription(offer);

                    printStatus('setting remote description as offer')

                    const answer = await this.connection.createAnswer();
                    await this.connection.setLocalDescription(answer);
                    this.signallingChannel.send('message', { 'answer': answer });
                    printStatus('send answer to local');

                    res();
                }
            })
        })
    }


    /** Check for recieved ic candidates and add them to connection */
    establishICRemote = (printStatus) => {

        this.connection.addEventListener('icecandidate', event => {
            console.log('ice candidate found');
            console.log(event.candidate);
            console.log("ice Gathering status:" + this.connection.iceGatheringState);
            if (event.candidate) {
                this.signallingChannel.send('message', { 'iceCandidate': event.candidate });
                printStatus('sending ice candidate to local')
            }
        });


        this.signallingChannel.addEventListener('message', async message => {
            message = JSON.parse(message.data);
            if (message.new_ice_candidate) {
                try {
                    await this.connection.addIceCandidate(message.new_ice_candidate);
                    printStatus('adding local ice candidate to remote')
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });
    }


    checkConnectionEstablished = (onConnectionEstablishedRemote, printStatus) => {
        this.connection.addEventListener('connectionstatechange', event => {
            if (this.connection.connectionState === 'connected') {
                // Peers connected!
                printStatus('connected to local');
                onConnectionEstablishedRemote(this.connection);
            }
        });
    }
}

export {WebRtcConnectionLocal,WebRtcConnectionRemote};

// export function getWebRtcConnectionRemote(config, signallingChannel) {
//     let remoteConnection = new WebRtcConnectionRemote(config, signallingChannel)
//     return remoteConnection;
// }