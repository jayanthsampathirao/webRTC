import React, { useEffect, useCallback, useState } from 'react'; 
import ReactPlayer from 'react-player'
import peer from '../service/peer'
import { useSocket } from '../context/SocketProvider';

const RoomPage = () => {
    const socket = useSocket();
    const [remoteSocketId,setRemoteSocketId]= useState(null);  
    const [myStream,setMyStream]= useState(null);
    const [remoteStream,setRemoteStream]= useState(null);

    const handleUserJoined = useCallback(({email,id})=>{
        console.log(`Email ${email} connected to room `)
        setRemoteSocketId(id);
    },[])

    const handleCallUser = useCallback(async()=>{
        const stream = await navigator.mediaDevices.getUserMedia({audio:true, video:true });
        const offer = await peer.getOffer();
        socket.emit("user:call",{to: remoteSocketId,offer})
        setMyStream(stream);
    },[remoteSocketId,socket]);

    const handleIncommingCall = useCallback(async({from,offer})=>{
        setRemoteSocketId(from);
        const stream = await navigator.mediaDevices.getUserMedia({audio:true, video:true });
        setMyStream(stream);
        console.log(`incomming call form ,from,${offer}`);
        const ans = await peer.getAnswer(offer);
        socket.emit("call:accepted",{to:from,ans});
    },[socket]);
    
    const sendStreams = useCallback(()=>{
        for(const track of myStream.getTracks()){
            peer.peer.addTrack(track,myStream);
        }
    },[myStream])
    const handleCallAccepted = useCallback(({from,ans})=>{
        peer.setLocalDescription(ans);
        console.log('call:accepted')
        sendStreams();
    },[sendStreams])
    const handelNegoNeeded = useCallback(async()=>{
        const offer = await peer.getOffer();
        socket.emit('peer:nego:needed',{offer,to:remoteSocketId})
    },[remoteSocketId,socket])
    useEffect(()=>{
        peer.peer.addEventListener('negotiationneeded',handelNegoNeeded)    
        return ()=>{
            peer.peer.removeEventListener('negotiationneeded',handelNegoNeeded)    
        }
    },[handelNegoNeeded])
    const handleNegoIncoming = useCallback(async({from,offer})=>{
        const ans =  await peer.getAnswer(offer);
        socket.emit('peer:nego:done',{to:from,ans})
    },[socket]) 
    const handleNegoFinal = useCallback(async({ans})=>{
        await peer.setLocalDescription(ans)
    },[])
    useEffect(()=>{
        peer.peer.addEventListener('track',async ev=>{
            const remoteStream = ev.streams
            setRemoteStream(remoteStream[0]);
        }) 
    },[])
    useEffect(() => {
        socket.on('user:joined', handleUserJoined);
        socket.on('incomming:call',handleIncommingCall);
        socket.on('call:accepted',handleCallAccepted);
        socket.on('peer:nego:needed',handleNegoIncoming);
        socket.on('peer:nego:final',handleNegoFinal);
        return () => {
            socket.off('user:joined', handleUserJoined);
            socket.off('incomming:call', handleIncommingCall); 
            socket.off('call:accepted',handleCallAccepted);
            socket.off('peer:nego:needed',handleNegoIncoming);
            socket.off('peer:nego:final',handleNegoFinal);
        };
    }, [socket, handleUserJoined,handleIncommingCall,handleCallAccepted,handleNegoIncoming,handleNegoFinal]);

    return (
        <div>
            <h1>Room Page</h1>
            <h4>{remoteSocketId ? `Connected to: ${remoteSocketId}` : 'None inside room'}</h4>
            {myStream && <button onClick={sendStreams}>Send Streams</button>}
            {
                remoteSocketId && <button onClick={handleCallUser}>Call</button>
            }
            {
                myStream &&
                <>
                <h1>My Stream</h1> 
                (<ReactPlayer playing muted
                height="100px" width="200px" url={myStream}/>)
                </>
            }
            {
                remoteStream &&
                <>
                <h1>Remote Stream</h1> 
                (<ReactPlayer playing muted
                height="100px" width="200px" url={remoteStream}/>)
                </>
            }
        </div>
    );
};

export default RoomPage;
