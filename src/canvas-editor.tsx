import React from 'react';
import cv from "@techstark/opencv-js";
import { getSizeElement } from "./func";



export default function() {
    const video = document.createElement("video");
    const ref = React.useRef<HTMLCanvasElement>(null);

    const loadVideo =(src: string, crossOrigin?:boolean)=> {
        video.src = src;
        if(crossOrigin) video.crossOrigin = "anonymous";

        video.play();
    }
    const grayFilter =()=> {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
    
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg; // Ч/Б эффект
        }
    
        ctx.putImageData(imageData, 0, 0);
    }
    const addImage =(src: string)=> {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const overlay = new Image();
        overlay.src = src;

        ctx.drawImage(overlay, 10, 10, 150, 100);
    }
    const addText =()=> {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.font = "30px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("Привет, мир!", 50, 50);
    }
    const aplly =()=> {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d");

    }
    React.useEffect(()=> {
        const canvas = ref.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        loadVideo('http://intimalive.com/upload/Pon_15/15.mp4', true);
        
        const renderFrame =()=> {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            //addImage('https://intimalive.com/img/avatar/test12-1737862613143.gif')
            requestAnimationFrame(renderFrame);
        }

        video.onplay = renderFrame;
        video.addEventListener("loadedmetadata", ()=> {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        });
        
    }, []);


    return(
        <div className='CanvasEditor' style={{maxHeight:'95%'}}>
            <canvas
                ref={ref}
                width='100%'
                height='100%'
                style={{background:'#0000007a'}}
            />
        </div>
    );
}