class SignallingChannel{
    sender = null;
    reciever = null;
    constructor(sender,reciever)
    {
        this.sender = sender;
        this.reciever = reciever;
    }

    send = (messageName,message)=>{
        if(this.sender!=null)
        {
            this.sender(messageName,message);
        }
    }

    addEventListener = (messageName,messageReciever)=>{

        if(this.reciever!=null)
        {
            this.reciever(messageName,messageReciever);
        }
    }
}

export function getSignallingChannel(senderFunction, recieverFunction)
{
    return new SignallingChannel(senderFunction,recieverFunction);
}