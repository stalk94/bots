

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

/**
 * Вычисляет размеры элемента
 * @param {string} selector
 * @returns {height:number, width:number}
 */
export function getSizeElement(selector: string) {
    const container = document.querySelector(selector);
    return {
        height: container.clientHeight, 
        width: container.clientWidth
    }
}