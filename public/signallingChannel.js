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
    constructor(socket) {
        // super(null,null);
        this.socket = socket;
    }

    send = (messageName, message) => {
        if (this.socket.readyState === this.socket.OPEN) {
            if (uId != null)// only if we have joined room, we can send message
            {
                message['uId'] = uId;
                console.log(message);
                socket.send("{\"action\":" + "\"" + messageName + "\"" + ",\"message\":" + JSON.stringify(message) + "}");
            }
        }
    }

    addEventListener = (messageName, doOnMessage) => {
        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.removeEventListener(messageName, doOnMessage);
            socket.addEventListener(messageName, doOnMessage);
        }
    }


}

export function getDefaultWebSocketSignallingChannel(socket) {
    return new DefaultWebSocketSignallingChannel(socket);
}