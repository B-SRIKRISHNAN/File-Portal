class SignallingChannel {
    // sender = null;
    // reciever = null;
    // constructor(sender, reciever) {
    //     this.sender = sender;
    //     this.reciever = reciever;
    // }

    send = (messageName, message) => {
        // if (this.sender != null) {
        //     this.sender(messageName, message);
        // }
    }

    addEventListener = (messageName, messageReciever) => {

        // if (this.reciever != null) {
        //     this.reciever(messageName, messageReciever);
        // }
    }
}

// export function getSignallingChannel(senderFunction, recieverFunction) {
//     return new SignallingChannel(senderFunction, recieverFunction);
// }

class DefaultWebSocketSignallingChannel extends SignallingChannel {

    socket = null;
    uId = null;
    constructor(socket) {
        // super(null,null);
        super();
        this.socket = socket;
    }
    setUId = (uId)=>{
        this.uId = uId;
    }

    send = (messageName, message) => {
        if (this.socket.readyState === this.socket.OPEN) {
            if (this.uId != null)// only if we have joined room, we can send message
            {
                message['uId'] = this.uId;
                console.log(message);
                this.socket.send("{\"action\":" + "\"" + messageName + "\"" + ",\"message\":" + JSON.stringify(message) + "}");
            }
        }
    }

    addEventListener = (messageName, doOnMessage) => {
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.removeEventListener(messageName, doOnMessage);
            this.socket.addEventListener(messageName, doOnMessage);
        }
    }


}
export {SignallingChannel, DefaultWebSocketSignallingChannel};

// export function getDefaultWebSocketSignallingChannel(socket) {
//     return new DefaultWebSocketSignallingChannel(socket);
// }