let express = require('express');
let fs = require('fs');
let http = require('http')
let {Server} = require('socket.io')
let url = process.env.API_ENDPOINT||"http://localhost:3000"
let crypto = require('crypto');
let cors = require('cors');
 let app = express();
//  app.use(express.static('public'));
 app.use(express.static('dist'));

//  app.use(cors());
 app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
 });
let server = http.createServer(app);
 let io = new Server(server,{
   cors:{
      origin: "*:*",
      credentials:false
   },
   maxHttpBufferSize: '1mb'
});


 io.on('connection',(socket)=>{
    console.log("connected");

   socket.on('message',(msg)=>{
      console.log(msg)
      if(msg.uId)
      {
         if(socket.in(msg.uId))
           socket.in(msg.uId).emit('message',msg);
      }else{
         socket.broadcast.emit('message',msg);
      }
         // 
   })
   socket.on('join',(data)=>{
      socket.join(data.uId);
   })
   socket.on('clearRoom',(data)=>{
      socket.in(data.uId).disconnectSockets();
   })
   socket.on('disconnect',()=>{
        console.log("disconnected");    
    })
 })

 app.get('/welcome',(req,res)=>{
    let html = fs.readFileSync('./dist/index.html');
    res.contentType('html');
    res.send(html);
    });

app.get('/getFile',(req,res)=>{
    let html = fs.readFileSync('./dist/Reciever.html');
    res.contentType('html');
    res.send(html);
});

app.get('/dist/bundle.js',(req,res)=>{
   let bundle = fs.readFileSync('./dist/bundle.js');
   res.contentType('text/javascript');
   res.send(bundle);
});

app.get('/getUniqueId',(req,res)=>{

   let uniqueId = generateUniqueRoomId();
   res.send(uniqueId);
})
 app.listen(process.env.PORT||3000,()=>{
    console.log("listening");
 });

 let generateUniqueRoomId = ()=>{
   return crypto.randomUUID();
 }
