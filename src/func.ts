

export async function send(url: string, data: any, metod: 'GET'|'POST') {
    let dataServer = {
        method: metod ?? 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        }
    }
    if(metod!=='GET') dataServer.body = JSON.stringify(data);

    const request = await fetch('http://localhost:3000/' + url, dataServer);
    return request.json();
}

